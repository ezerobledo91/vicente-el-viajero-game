import Phaser from "phaser";
import { ASSETS, COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, SCENES } from "../config/constants.js";
import { Button } from "../ui/Button.js";
import { botonesSonido } from "../ui/SonidoBotones.js";
import { DEFINICIONES } from "../data/paises.js";
import { getViaje } from "../data/viajes/index.js";
import { viajeEmpezado } from "../systems/progress.js";
import { modoPrueba, setModoPrueba } from "../systems/dev.js";

const PANEL = { x: 850, y: 80, w: 412, h: 620, pad: 22 };
const TEXTOS = {
  mundo: { titulo: "El mundo", sub: "¡Vamos a recorrerlo de a poco! Empezamos por Sudamérica." },
  region: { sub: "Tocá un país para viajar y conocerlo" },
  definicionAyuda: "Tocá un ? para saber qué significa cada palabra.",
};

// Interfaz del mapa: va en una escena aparte para que no se agrande con el zoom de la cámara.
export class MapaHudScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MAPA_HUD);
  }

  init({ mapa }) {
    this.mapa = mapa;
  }

  create() {
    this.add.graphics().fillStyle(0x0b1a2a, 0.65).fillRect(0, 0, GAME_WIDTH, 68);
    this.title = this.add.text(24, 22, "", { fontFamily: FONT, fontSize: "18px", color: "#ffb83d" }).setOrigin(0, 0.5);
    this.subtitle = this.add
      .text(24, 50, "", { fontFamily: FONT, fontSize: "10px", color: COLORS.ink })
      .setOrigin(0, 0.5);

    this.btnMundo = new Button(this, GAME_WIDTH - 290, 34, "Ver mundo", () => this.mapa.showWorld(true), {
      width: 170,
      variant: "secondary",
    });
    new Button(
      this,
      GAME_WIDTH - 475,
      34,
      "Perfil",
      () => this.goTo(SCENES.PERFIL, { volver: { scene: SCENES.MAPA } }),
      {
        width: 170,
        variant: "secondary",
      }
    );
    new Button(this, GAME_WIDTH - 105, 34, "Personajes", () => this.goTo(SCENES.GALLERY), {
      width: 170,
      variant: "secondary",
    });
    this.cta = new Button(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 48,
      "Empezar por Sudamérica",
      () => this.mapa.enterRegion("sudamerica"),
      { width: 400, height: 50, fontSize: 14 }
    );

    const prueba = new Button(
      this,
      92,
      GAME_HEIGHT - 22,
      `Prueba: ${modoPrueba() ? "sí" : "no"}`,
      () => {
        setModoPrueba(!modoPrueba());
        prueba.label.setText(`Prueba: ${modoPrueba() ? "sí" : "no"}`);
        this.toast(
          modoPrueba()
            ? "Modo prueba activado: atajos en el mapa del viaje, ciudades y tramos."
            : "Modo prueba desactivado."
        );
      },
      { width: 160, height: 26, fontSize: 9, variant: "secondary" }
    );

    botonesSonido(this, 262, GAME_HEIGHT - 22);

    this.tooltip = this.buildTooltip();
    this.panel = this.buildPanel();

    const handlers = {
      mode: (e) => this.onMode(e),
      hover: (e) => this.onHover(e),
      select: (e) => (e.pais ? this.showPanel(e.pais) : this.hidePanel()),
      toast: (text) => this.toast(text),
    };
    for (const [ev, fn] of Object.entries(handlers)) this.mapa.events.on(ev, fn);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const [ev, fn] of Object.entries(handlers)) this.mapa.events.off(ev, fn);
    });

    this.onMode({ mode: this.mapa.mode, region: this.mapa.region });
  }

  goTo(sceneKey, data) {
    this.scene.stop(SCENES.MAPA);
    this.scene.start(sceneKey, data);
  }

  onMode({ mode, region }) {
    const world = mode === "world";
    // Sin mayúsculas: la fuente no trae todas las vocales acentuadas en mayúscula (falta la É).
    this.title.setText(world ? TEXTOS.mundo.titulo : region.nombre);
    this.subtitle.setText(world ? TEXTOS.mundo.sub : TEXTOS.region.sub);
    this.cta.setVisible(world);
    this.btnMundo.setVisible(!world);
    this.tooltip.setVisible(false);
  }

  // ---------- Tooltip ----------
  buildTooltip() {
    const c = this.add.container(0, 0).setDepth(50).setVisible(false);
    c.bg = this.add.graphics();
    c.flag = this.add.image(10, 0, "__DEFAULT").setOrigin(0, 0.5);
    c.label = this.add.text(52, 0, "", { fontFamily: FONT, fontSize: "11px", color: COLORS.inkDark }).setOrigin(0, 0.5);
    c.add([c.bg, c.flag, c.label]);
    return c;
  }

  onHover({ pais, x, y }) {
    const t = this.tooltip;
    if (!pais) return t.setVisible(false);
    if (t.paisId !== pais.id) {
      t.paisId = pais.id;
      t.flag.setTexture(ASSETS.FLAG(pais.id)).setDisplaySize(32, 24);
      t.label.setText(pais.nombre);
      const w = t.label.x + t.label.width + 12;
      t.bg.clear().fillStyle(0x000000, 0.3).fillRoundedRect(3, -17, w, 36, 8);
      t.bg.fillStyle(0xffffff, 1).fillRoundedRect(0, -20, w, 36, 8);
      t.w = w;
    }
    t.setPosition(Math.min(x + 18, GAME_WIDTH - t.w - 8), Math.max(y - 26, 90)).setVisible(true);
  }

  // ---------- Ficha del país ----------
  buildPanel() {
    const c = this.add
      .container(GAME_WIDTH + 10, PANEL.y)
      .setDepth(40)
      .setVisible(false);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.35).fillRoundedRect(4, 6, PANEL.w, PANEL.h, 14);
    bg.fillStyle(COLORS.panel, 0.97).fillRoundedRect(0, 0, PANEL.w, PANEL.h, 14);
    bg.lineStyle(3, COLORS.accent, 1).strokeRoundedRect(0, 0, PANEL.w, PANEL.h, 14);
    // Bloquea los clics para que no pasen al mapa.
    const blocker = this.add.zone(0, 0, PANEL.w, PANEL.h).setOrigin(0).setInteractive();
    const close = new Button(this, PANEL.w - 26, 26, "X", () => this.mapa.select(null), {
      width: 34,
      height: 30,
      fontSize: 11,
      variant: "secondary",
    });
    c.content = this.add.container(0, 0);
    c.add([bg, blocker, c.content, close]);
    return c;
  }

  showPanel(pais) {
    const { pad, w } = PANEL;
    const inner = w - pad * 2;
    const content = this.panel.content;
    content.removeAll(true);
    const add = (obj) => (content.add(obj), obj);
    const text = (x, y, str, size, color, width = inner) =>
      add(
        this.add.text(x, y, str, {
          fontFamily: FONT,
          fontSize: `${size}px`,
          color,
          lineSpacing: 5,
          wordWrap: { width },
        })
      );

    // Encabezado: bandera + nombre
    let y = pad;
    const frame = add(this.add.graphics());
    frame.fillStyle(0xffffff, 1).fillRect(pad - 3, y - 3, 126, 96);
    add(this.add.image(pad, y, ASSETS.FLAG(pais.id)).setOrigin(0).setDisplaySize(120, 90));
    text(pad + 138, y + 12, pais.nombre, 15, "#ffb83d", inner - 150);
    text(pad + 138, y + 60, "Sudamérica", 9, COLORS.muted, inner - 150);
    y += 112;

    // Capital, idioma, moneda (con "?" para ver la definición)
    for (const [key, label] of [
      ["capital", "Capital"],
      ["idioma", "Idioma"],
      ["moneda", "Moneda"],
    ]) {
      const l = text(pad, y, label, 10, "#ffb83d");
      add(
        new Button(this, pad + l.width + 22, y + 5, "?", () => this.showDefinition(key), {
          width: 24,
          height: 20,
          fontSize: 9,
          variant: "secondary",
        })
      );
      const v = text(pad, y + 20, pais[key], 11, COLORS.ink);
      y += 20 + v.height + 16;
    }

    // Datos curiosos
    text(pad, y, "Datos curiosos", 10, "#ffb83d");
    y += 22;
    for (const dato of pais.datos) {
      text(pad, y, "*", 10, "#ffb83d");
      const d = text(pad + 18, y, dato, 9, COLORS.ink, inner - 18);
      y += d.height + 10;
    }

    if (!pais.emblema?.sprite) text(pad, y + 4, `Próximamente: ${pais.emblema.nombre}`, 8, COLORS.muted);

    // Viaje por el país (si existe)
    if (getViaje(pais.id)) {
      const empezado = viajeEmpezado(pais.id);
      add(
        new Button(
          this,
          w / 2,
          PANEL.h - 112,
          empezado ? "Continuar viaje" : "Empezar viaje",
          () => this.goTo(SCENES.VIAJE_MAPA, { paisId: pais.id }),
          {
            width: inner,
            height: 46,
            fontSize: 13,
          }
        )
      );
    }

    // Definiciones
    this.definition = text(pad, PANEL.h - 62, TEXTOS.definicionAyuda, 8, COLORS.muted);

    if (!this.panel.visible) {
      this.panel.setVisible(true).setX(GAME_WIDTH + 10);
      this.tweens.add({ targets: this.panel, x: PANEL.x, duration: 280, ease: "Cubic.Out" });
    }
  }

  showDefinition(key) {
    const labels = { capital: "Capital", idioma: "Idioma", moneda: "Moneda" };
    this.definition.setText(`${labels[key]}: ${DEFINICIONES[key]}`).setColor(COLORS.ink);
  }

  hidePanel() {
    if (!this.panel.visible) return;
    this.tweens.add({
      targets: this.panel,
      x: GAME_WIDTH + 10,
      duration: 220,
      ease: "Cubic.In",
      onComplete: () => this.panel.setVisible(false),
    });
  }

  toast(message) {
    this.toastBox?.destroy();
    const c = this.add.container(GAME_WIDTH / 2, 110).setDepth(60);
    const t = this.add
      .text(0, 0, message, {
        fontFamily: FONT,
        fontSize: "11px",
        color: COLORS.inkDark,
        align: "center",
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5);
    const g = this.add
      .graphics()
      .fillStyle(0xffffff, 1)
      .fillRoundedRect(-t.width / 2 - 16, -t.height / 2 - 12, t.width + 32, t.height + 24, 10);
    c.add([g, t]);
    this.toastBox = c;
    this.tweens.add({ targets: c, alpha: 0, delay: 2200, duration: 400, onComplete: () => c.destroy() });
  }
}
