import Phaser from "phaser";
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, SCENES } from "../config/constants.js";
import { Button } from "../ui/Button.js";
import { botonesSonido } from "../ui/SonidoBotones.js";
import { heartTexture, starTexture } from "../systems/placeholders.js";
import { COLECCIONABLES, CUARTOS, VIDAS } from "../data/animales.js";
import { modoPrueba } from "../systems/dev.js";
import { formatoPuntos } from "../systems/puntaje.js";

const BAR = { x: 250, y: 30, w: 520 };
const PAD_ALPHA = { reposo: 0.35, apretado: 0.7 };

// Interfaz del tramo: progreso entre ciudades, vidas, coleccionables, salir y controles táctiles.
export class ViajeHudScene extends Phaser.Scene {
  constructor() {
    super(SCENES.VIAJE_HUD);
  }

  init({ viaje }) {
    this.viaje = viaje;
  }

  create() {
    const v = this.viaje;
    this.input.addPointer(2); // multitouch: caminar y saltar a la vez

    this.add.graphics().fillStyle(0x0b1a2a, 0.55).fillRect(0, 0, GAME_WIDTH, 60);
    const txt = (x, y, s, size, color, origin = 0) =>
      this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color }).setOrigin(origin, 0.5);

    // Progreso del tramo
    txt(BAR.x - 16, BAR.y, v.desde.nombre, 10, COLORS.ink, 1);
    txt(BAR.x + BAR.w + 16, BAR.y, v.hasta.nombre, 10, "#ffb83d", 0);
    this.add
      .graphics()
      .fillStyle(0x000000, 0.35)
      .fillRoundedRect(BAR.x, BAR.y - 6, BAR.w, 12, 6);
    this.barFill = this.add.graphics();
    this.marker = this.add.circle(BAR.x, BAR.y, 10, 0xffffff).setStrokeStyle(3, COLORS.accent);

    // Figuritas
    const icono = this.textures.exists("estrella")
      ? this.add.image(GAME_WIDTH - 250, BAR.y, "estrella", 0)
      : this.add.image(GAME_WIDTH - 250, BAR.y, starTexture(this));
    icono.setScale(34 / icono.height);
    this.contador = txt(GAME_WIDTH - 228, BAR.y - 6, "0", 14, COLORS.ink);
    // Cuántas estrellas faltan para la próxima vida (cada 100, sumando todos los viajes).
    this.proxVida = txt(GAME_WIDTH - 268, BAR.y + 16, "", 7, "#ff8a96");
    new Button(this, GAME_WIDTH - 80, BAR.y, "Salir", () => this.salir(), {
      width: 120,
      height: 32,
      variant: "secondary",
    });

    botonesSonido(this, GAME_WIDTH - 290, 88, { ancho: 130 });

    // Puntaje general, como en los juegos de Mario.
    txt(GAME_WIDTH / 2, 76, "PUNTOS", 8, "#ffd27a", 0.5).setStroke("#1b2a3a", 4);
    this.puntaje = txt(GAME_WIDTH / 2, 96, "000000", 16, "#ffffff", 0.5).setStroke("#1b2a3a", 5);
    this.puntosMostrados = null;

    // Vidas (debajo de la barra superior)
    this.corazones = Array.from({ length: VIDAS.maximo }, (_, i) =>
      this.add.image(34 + i * 38, 88, heartTexture(this)).setScale(0.8)
    );
    this.vidasMostradas = null;

    // Ayuda inicial
    const ayuda = txt(
      GAME_WIDTH / 2,
      126,
      "Flechas: caminar · Espacio: saltar · Abajo: agacharse · X: tirar · C: mochila",
      11,
      COLORS.inkDark,
      0.5
    );
    this.tweens.add({ targets: ayuda, alpha: 0, delay: 5000, duration: 600 });

    if (modoPrueba())
      txt(
        GAME_WIDTH / 2,
        150,
        "PRUEBA · N: ir al final · V: vidas infinitas · E: +10 estrellas",
        10,
        "#ff6b8a",
        0.5
      ).setStroke("#1b2a3a", 4);

    // Controles táctiles (también funcionan con el mouse)
    this.pad("left", 90, GAME_HEIGHT - 80, "<");
    this.pad("right", 210, GAME_HEIGHT - 80, ">");
    this.pad("jump", GAME_WIDTH - 110, GAME_HEIGHT - 80, "SALTAR", 70);
    this.pad("down", GAME_WIDTH - 250, GAME_HEIGHT - 60, "v", 44);
    // Acciones: tirar el objeto del tramo y revolear la mochila (arriba de saltar y de agacharse).
    this.pad("tirar", GAME_WIDTH - 110, GAME_HEIGHT - 205, "TIRAR", 44);
    this.pad("mochila", GAME_WIDTH - 250, GAME_HEIGHT - 170, "MOCHILA", 44);
  }

  pad(control, x, y, label, radius = 52) {
    const c = this.add.container(x, y).setAlpha(PAD_ALPHA.reposo);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4).fillCircle(0, 4, radius);
    g.fillStyle(0xffffff, 1).fillCircle(0, 0, radius);
    const t = this.add
      .text(0, 0, label, { fontFamily: FONT, fontSize: label.length > 1 ? "12px" : "26px", color: COLORS.inkDark })
      .setOrigin(0.5);
    c.add([g, t]);
    c.setSize(radius * 2, radius * 2).setInteractive(
      new Phaser.Geom.Circle(radius, radius, radius),
      Phaser.Geom.Circle.Contains
    );
    const set = (on) => {
      this.viaje.touch[control] = on;
      c.setAlpha(on ? PAD_ALPHA.apretado : PAD_ALPHA.reposo);
    };
    c.on("pointerdown", () => set(true));
    c.on("pointerup", () => set(false));
    c.on("pointerout", () => set(false));
  }

  update() {
    const v = this.viaje;
    if (!v.player) return;
    const t = Phaser.Math.Clamp(v.player.x / (v.largo - 260), 0, 1);
    this.barFill
      .clear()
      .fillStyle(COLORS.accent, 1)
      .fillRoundedRect(BAR.x, BAR.y - 6, Math.max(12, BAR.w * t), 12, 6);
    this.marker.x = BAR.x + BAR.w * t;
    this.contador.setText(String((v.estrellasAntes ?? 0) + (v.coleccion?.[COLECCIONABLES.comun] ?? 0)));
    const puntos = v.puntos ?? 0;
    if (puntos !== this.puntosMostrados) {
      this.puntosMostrados = puntos;
      this.puntaje.setText(formatoPuntos(puntos));
    }
    const estrellas = (v.estrellasAntes ?? 0) + (v.coleccion?.[COLECCIONABLES.comun] ?? 0);
    this.proxVida.setText(
      `corazón en ${COLECCIONABLES.estrellasPorVida - (estrellas % COLECCIONABLES.estrellasPorVida)}`
    );
    if (v.vida !== this.vidasMostradas) {
      // Latido en el corazón que cambió. Cada corazón muestra de 0 a 4 cuartos.
      const antes = this.vidasMostradas;
      this.vidasMostradas = v.vida;
      const llenos = Math.ceil(v.vida / CUARTOS);
      this.corazones.forEach((h, i) => {
        h.setTexture(heartTexture(this, Math.max(0, Math.min(CUARTOS, v.vida - i * CUARTOS))));
        h.setVisible(i < Math.max(llenos, VIDAS.inicio));
      });
      if (antes != null) {
        const cambio =
          this.corazones[
            Math.min(VIDAS.maximo - 1, Math.floor((Math.min(antes, v.vida) - 1) / CUARTOS + (v.vida > antes ? 1 : 0)))
          ];
        if (cambio) this.tweens.add({ targets: cambio, scale: 1.2, duration: 120, yoyo: true });
      }
    }
  }

  salir() {
    this.scene.stop(SCENES.VIAJE);
    this.scene.start(SCENES.VIAJE_MAPA, { paisId: this.viaje.paisId });
  }
}
