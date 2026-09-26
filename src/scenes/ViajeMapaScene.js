import Phaser from "phaser";
import { ASSETS, COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, SCENES } from "../config/constants.js";
import { Character } from "../entities/Character.js";
import { Button } from "../ui/Button.js";
import { getViaje } from "../data/viajes/index.js";
import { getPais } from "../data/paises.js";
import { actualizarViaje, getProgresoViaje, hitoPreguntas, reiniciarViaje } from "../systems/progress.js";
import { modoPrueba } from "../systems/dev.js";

const REGION = "sudamerica";
const PAIS_EN_PANTALLA = { x: 380, y: 400, alto: 600 }; // dónde y de qué alto se ve el país
const PANEL = { x: 790, y: 96, w: 460, h: 600 };
const COLOR = { hecho: 0x5fd068, actual: COLORS.accent, pendiente: 0x9fb3c8 };
const PX_PER_CM_MARCA = 0.36; // Vicente parado sobre el mapa

// Mapa del país con la ruta del viaje: ciudades hechas, la actual y las que faltan.
// El mapa usa la cámara principal con zoom; la interfaz va en una segunda cámara sin zoom.
export class ViajeMapaScene extends Phaser.Scene {
  constructor() {
    super(SCENES.VIAJE_MAPA);
  }

  init({ paisId }) {
    this.paisId = paisId;
  }

  create() {
    this.viaje = getViaje(this.paisId);
    this.progreso = getProgresoViaje(this.paisId);
    const data = this.cache.json.get(ASSETS.MAP_REGION(REGION));
    const pais = data.countries.find((c) => c.id === this.paisId);
    this.posCiudades = this.viaje.ciudades.map((c) => data.ciudades.find((k) => k.id === c.id).pos);

    // ---------- Mundo (con zoom) ----------
    const world = this.add.layer();
    world.add(this.add.image(0, 0, ASSETS.MAP_IMAGE).setOrigin(0));
    this.textures.get(ASSETS.MAP_IMAGE).setFilter(Phaser.Textures.FilterMode.NEAREST);

    const pts = [...pais.polygons.flat(), ...this.posCiudades];
    const b = {
      x0: Math.min(...pts.map((p) => p[0])),
      x1: Math.max(...pts.map((p) => p[0])),
      y0: Math.min(...pts.map((p) => p[1])),
      y1: Math.max(...pts.map((p) => p[1])),
    };
    this.zoom = PAIS_EN_PANTALLA.alto / (b.y1 - b.y0);
    this.centro = {
      x: (b.x0 + b.x1) / 2 + (GAME_WIDTH / 2 - PAIS_EN_PANTALLA.x) / this.zoom,
      y: (b.y0 + b.y1) / 2 + (GAME_HEIGHT / 2 - PAIS_EN_PANTALLA.y) / this.zoom,
    };
    this.cameras.main.setZoom(this.zoom).centerOn(this.centro.x, this.centro.y).setBackgroundColor(0x0d4ea6);

    const g = this.add.graphics();
    world.add(g);
    g.fillStyle(0x0b1a2a, 0.35).fillRect(0, 0, 1448, 1086); // oscurece el resto del mundo
    for (const poly of pais.polygons) {
      const p = poly.map(([x, y]) => ({ x, y }));
      g.fillStyle(COLORS.accent, 0.18).fillPoints(p, true);
      g.lineStyle(1.2, 0xffffff, 1).strokePoints(p, true);
    }
    this.dibujarRuta(g);

    // ---------- Interfaz (sin zoom) ----------
    const ui = this.add.layer();
    this.cameras.main.ignore(ui);
    const uiCam = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);
    uiCam.ignore(world);
    this.ui = ui;

    this.construirCiudades();
    this.construirPanel();
    this.cameras.main.fadeIn(300);
  }

  // Pantalla ← mundo (la cámara principal no rota, así que es lineal).
  toScreen([x, y]) {
    return [(x - this.centro.x) * this.zoom + GAME_WIDTH / 2, (y - this.centro.y) * this.zoom + GAME_HEIGHT / 2];
  }

  estadoCiudad(i) {
    const p = this.progreso;
    if (i < p.ciudad || (i === p.ciudad && (p.preguntasOk || p.terminado))) return "hecho";
    return i === p.ciudad ? "actual" : "pendiente";
  }

  dibujarRuta(g) {
    const pos = this.posCiudades;
    for (let i = 0; i < pos.length - 1; i++) {
      const [a, b] = [pos[i], pos[i + 1]];
      if (i < this.progreso.ciudad) {
        g.lineStyle(1.4, COLORS.accent, 1).lineBetween(a[0], a[1], b[0], b[1]);
        continue;
      }
      // Tramo pendiente: línea punteada.
      const d = Phaser.Math.Distance.Between(a[0], a[1], b[0], b[1]);
      const n = Math.max(2, Math.floor(d / 2.4));
      g.lineStyle(0.9, 0xffffff, 0.9);
      for (let k = 0; k < n; k += 2) {
        const t0 = k / n,
          t1 = Math.min(1, (k + 1) / n);
        g.lineBetween(
          a[0] + (b[0] - a[0]) * t0,
          a[1] + (b[1] - a[1]) * t0,
          a[0] + (b[0] - a[0]) * t1,
          a[1] + (b[1] - a[1]) * t1
        );
      }
    }
  }

  construirCiudades() {
    this.viaje.ciudades.forEach((c, i) => {
      const [x, y] = this.toScreen(this.posCiudades[i]);
      const estado = this.estadoCiudad(i);
      const punto = this.add.circle(x, y, estado === "actual" ? 9 : 7, COLOR[estado]).setStrokeStyle(3, 0x1b2a3a);
      if (estado === "actual") this.tweens.add({ targets: punto, scale: 1.35, duration: 600, yoyo: true, repeat: -1 });
      // Etiquetas alternando lados para que ciudades cercanas no se encimen (o donde diga el dato).
      const lado = c.etiqueta ?? (i % 2 === 1 ? "der" : "izq");
      const off = { izq: [-14, 0, 1, 0.5], der: [14, 0, 0, 0.5], arriba: [0, -16, 0.5, 1], abajo: [0, 16, 0.5, 0] }[
        lado
      ];
      const label = this.add
        .text(x + off[0], y + off[1], c.nombre, {
          fontFamily: FONT,
          fontSize: "10px",
          color: estado === "pendiente" ? "#d9e3ec" : "#ffffff",
          stroke: "#1b2a3a",
          strokeThickness: 4,
        })
        .setOrigin(off[2], off[3]);
      this.ui.add([punto, label]);
    });

    // Vicente (y quien viaje con él) en la ciudad actual.
    const [x, y] = this.toScreen(this.posCiudades[this.progreso.ciudad]);
    const grupo = ["vicente", ...this.progreso.companeros];
    grupo.forEach((id, k) => {
      const c = new Character(this, x - k * 22 + 4, y - 6, id, { pxPerCm: PX_PER_CM_MARCA }).face(k ? "right" : "left");
      this.ui.add(c);
    });
  }

  construirPanel() {
    const add = (o) => (this.ui.add(o), o);
    const nombrePais = getPais(this.paisId)?.nombre ?? this.viaje.nombre;
    add(this.add.graphics().fillStyle(0x0b1a2a, 0.65).fillRect(0, 0, GAME_WIDTH, 76));
    add(
      this.add
        .text(24, 26, `Viaje por ${nombrePais}`, { fontFamily: FONT, fontSize: "20px", color: "#ffb83d" })
        .setOrigin(0, 0.5)
    );
    add(
      this.add
        .text(
          24,
          56,
          `Figuritas: ${this.progreso.figuritas} · Animales: ${this.progreso.animalesVistos.length} · Preguntas: ${hitoPreguntas(this.paisId).aciertos} de ${this.viaje.ciudades.length * 5}`,
          {
            fontFamily: FONT,
            fontSize: "10px",
            color: COLORS.ink,
          }
        )
        .setOrigin(0, 0.5)
    );
    add(
      new Button(
        this,
        GAME_WIDTH - 330,
        38,
        "Perfil",
        () => this.scene.start(SCENES.PERFIL, { volver: { scene: SCENES.VIAJE_MAPA, data: { paisId: this.paisId } } }),
        {
          width: 180,
          variant: "secondary",
        }
      )
    );
    add(
      new Button(this, GAME_WIDTH - 120, 38, "Planisferio", () => this.scene.start(SCENES.MAPA), {
        width: 200,
        variant: "secondary",
      })
    );

    const p = PANEL;
    const bg = add(this.add.graphics());
    bg.fillStyle(0x000000, 0.3).fillRoundedRect(p.x + 5, p.y + 7, p.w, p.h, 14);
    bg.fillStyle(COLORS.panel, 0.95).fillRoundedRect(p.x, p.y, p.w, p.h, 14);
    bg.lineStyle(3, COLORS.accent, 1).strokeRoundedRect(p.x, p.y, p.w, p.h, 14);
    add(
      this.add
        .text(p.x + 24, p.y + 28, "La ruta", { fontFamily: FONT, fontSize: "14px", color: "#ffb83d" })
        .setOrigin(0, 0.5)
    );

    this.viaje.ciudades.forEach((c, i) => {
      const y = p.y + 66 + i * 36;
      const estado = this.estadoCiudad(i);
      add(this.add.circle(p.x + 34, y, 8, COLOR[estado]).setStrokeStyle(2, 0x1b2a3a));
      add(
        this.add
          .text(p.x + 54, y, c.nombre + (c.evento === "hogar" ? "  (casa)" : ""), {
            fontFamily: FONT,
            fontSize: "11px",
            color: estado === "actual" ? "#ffb83d" : estado === "hecho" ? COLORS.ink : COLORS.muted,
          })
          .setOrigin(0, 0.5)
      );
      if (modoPrueba()) this.atajosPrueba(i, y, add);
    });
    if (modoPrueba()) this.botonAnita(add);

    const accion = this.accionPrincipal();
    add(
      new Button(this, p.x + p.w / 2, p.y + p.h - 62, accion.texto, accion.onClick, {
        width: p.w - 48,
        height: 52,
        fontSize: 12,
      })
    );

    // Reiniciar pide confirmación con un segundo toque.
    let confirmar = false;
    const reiniciar = add(
      new Button(
        this,
        p.x + p.w / 2,
        p.y + p.h - 18,
        "Reiniciar viaje",
        () => {
          if (!confirmar) {
            confirmar = true;
            reiniciar.label.setText("¿Seguro? Tocá otra vez");
            this.time.delayedCall(2500, () => ((confirmar = false), reiniciar.label.setText("Reiniciar viaje")));
            return;
          }
          reiniciarViaje(this.paisId);
          this.scene.restart({ paisId: this.paisId });
        },
        { width: 260, height: 26, fontSize: 9, variant: "secondary" }
      )
    );
  }

  // ---------- Modo prueba ----------
  atajosPrueba(i, y, add) {
    const p = PANEL;
    const chico = { width: 84, height: 26, fontSize: 8, variant: "secondary" };
    add(
      new Button(
        this,
        p.x + p.w - 150,
        y,
        "Ciudad",
        () => {
          actualizarViaje(this.paisId, { ciudad: i, preguntasOk: false, terminado: false });
          this.scene.start(SCENES.CIUDAD, { paisId: this.paisId, ciudad: i });
        },
        chico
      )
    );
    if (i < this.viaje.ciudades.length - 1)
      add(
        new Button(
          this,
          p.x + p.w - 58,
          y,
          "Tramo >",
          () => {
            actualizarViaje(this.paisId, { ciudad: i, preguntasOk: true, terminado: false });
            this.scene.start(SCENES.VIAJE, { paisId: this.paisId, tramo: i });
          },
          chico
        )
      );
  }

  botonAnita(add) {
    const p = PANEL;
    const viaja = this.progreso.companeros.includes("anita");
    add(
      new Button(
        this,
        p.x + p.w - 104,
        p.y + 28,
        `Anita: ${viaja ? "sí" : "no"}`,
        () => {
          actualizarViaje(this.paisId, (v) => ({
            companeros: viaja ? v.companeros.filter((c) => c !== "anita") : [...v.companeros, "anita"],
          }));
          this.scene.restart({ paisId: this.paisId });
        },
        { width: 176, height: 28, fontSize: 9, variant: "secondary" }
      )
    );
  }

  accionPrincipal() {
    const { ciudad, preguntasOk, terminado } = this.progreso;
    const actual = this.viaje.ciudades[ciudad];
    const aCiudad = () => this.scene.start(SCENES.CIUDAD, { paisId: this.paisId, ciudad });
    if (terminado) return { texto: "¡Viaje completo! Ver la Triple Frontera", onClick: aCiudad };
    if (!preguntasOk)
      return { texto: ciudad === 0 ? `Empezar en ${actual.nombre}` : `Entrar a ${actual.nombre}`, onClick: aCiudad };
    const siguiente = this.viaje.ciudades[ciudad + 1];
    return {
      texto: `Viajar a ${siguiente.nombre}`,
      onClick: () => this.scene.start(SCENES.VIAJE, { paisId: this.paisId, tramo: ciudad }),
    };
  }
}
