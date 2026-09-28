// Clima del tramo (datos en src/data/clima.js): cositas que pasan siempre y, cada tanto, un evento
// (lluvia, niebla, ráfaga...) que dura unos segundos. Todo va fijo a la pantalla, delante del paisaje.
import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/constants.js";
import { CLIMA, CLIMA_TIEMPOS } from "../data/clima.js";
import { sonidoClima } from "./audio.js";

const PROFUNDIDAD = 14; // delante de Vicente (10) y de todo el camino
const APARECE = 1200; // ms que tarda en aparecer / irse un evento
const entre = ([a, b]) => a + Math.random() * (b - a);

export class Clima {
  constructor(scene, paisaje, groundY) {
    this.s = scene;
    this.paisaje = paisaje;
    this.groundY = groundY;
    this.cfg = CLIMA[paisaje];
    this.activo = !!this.cfg;
    if (!this.activo) return;
    this.eventos = this.cfg.eventos.filter((e) => this.existe(e.key ?? e.keys?.[0]));
    this.orden = Phaser.Utils.Array.Shuffle([...this.eventos.keys()]);
    this.ambiente();
    this.programar(entre(CLIMA_TIEMPOS.primero));
  }

  key(nombre) {
    return `clima-${this.paisaje}-${nombre}`;
  }

  existe(nombre) {
    return !!nombre && this.s.textures.exists(this.key(nombre));
  }

  imagen(nombre, x, y, { alto, alpha = 1, blanco = false } = {}) {
    const img = this.s.add.image(x, y, this.key(nombre)).setScrollFactor(0).setDepth(PROFUNDIDAD).setAlpha(alpha);
    if (alto) img.setScale(alto / img.height);
    if (blanco) img.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    return img;
  }

  // ---------- Siempre: cositas que pasan con el viento ----------
  ambiente() {
    const a = this.cfg.ambiente;
    const keys = (a?.keys ?? []).filter((k) => this.existe(k));
    if (!keys.length) return;
    this.s.time.addEvent({
      delay: a.cada,
      loop: true,
      callback: () => {
        if (this.s.terminado) return;
        const y = a.abajo ? entre([this.groundY - 120, this.groundY - 20]) : entre([140, this.groundY - 60]);
        const img = this.imagen(keys[Math.floor(Math.random() * keys.length)], GAME_WIDTH + 80, y, {
          alto: a.alto * entre([0.7, 1.2]),
          alpha: 0,
          blanco: a.blanco,
        });
        const dura = entre([7000, 11000]);
        this.s.tweens.add({ targets: img, alpha: a.alpha ?? 0.7, duration: 800 });
        this.s.tweens.add({
          targets: img,
          x: -100,
          y: y + entre([-60, 60]),
          angle: entre([-40, 40]),
          duration: dura,
          onComplete: () => img.destroy(),
        });
      },
    });
  }

  // ---------- Eventos ----------
  programar(ms) {
    this.s.time.delayedCall(ms, () => {
      if (this.s.terminado || !this.eventos.length) return;
      this.siguiente();
      this.programar(CLIMA_TIEMPOS.dura + entre(CLIMA_TIEMPOS.cada));
    });
  }

  // El próximo evento (van rotando, sin repetir seguido).
  siguiente() {
    if (!this.activo || !this.eventos.length) return;
    const e = this.eventos[this.orden[0]];
    this.orden.push(this.orden.shift());
    this.lanzar(e);
  }

  lanzar(e) {
    const dura = CLIMA_TIEMPOS.dura;
    if (e.sonido) sonidoClima(e.sonido, (dura + APARECE * 2) / 1000);
    this[e.tipo]?.(e, dura);
  }

  // Aparece, queda un rato y se va.
  fundido(obj, alpha, dura) {
    obj.setAlpha(0);
    this.s.tweens.add({
      targets: obj,
      alpha,
      duration: APARECE,
      hold: dura,
      yoyo: true,
      onComplete: () => obj.destroy(),
    });
  }

  cortina(e, dura) {
    const t = this.s.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, this.key(e.key))
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(PROFUNDIDAD);
    t.setTileScale(e.escala ?? 0.8);
    const mover = this.s.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!t.active) return mover.remove();
        t.tilePositionX -= (e.vx * 0.016) / t.tileScaleX;
        t.tilePositionY -= (e.vy * 0.016) / t.tileScaleY;
      },
    });
    this.fundido(t, e.alpha ?? 0.6, dura);
    // Con lluvia el día se pone un poco gris.
    if (e.sonido === "lluvia") {
      const gris = this.s.add
        .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x2a3a4a)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(PROFUNDIDAD - 0.1);
      this.fundido(gris, 0.18, dura);
    }
    if (e.salpica && this.existe(e.salpica)) {
      const salpicar = this.s.time.addEvent({
        delay: 260,
        repeat: Math.floor((dura + APARECE) / 260),
        callback: () => {
          const img = this.imagen(e.salpica, entre([40, GAME_WIDTH - 40]), this.groundY + 6, { alto: 34, alpha: 0.8 });
          img.setOrigin(0.5, 1);
          this.s.tweens.add({
            targets: img,
            alpha: 0,
            scale: img.scale * 1.3,
            duration: 500,
            onComplete: () => img.destroy(),
          });
        },
      });
      t.once("destroy", () => salpicar.remove());
    }
  }

  niebla(e, dura) {
    const n = e.keys.length > 1 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const nombre = e.keys[k % e.keys.length];
      if (!this.existe(nombre)) continue;
      const y = entre([this.groundY - 230, this.groundY - 40]);
      const img = this.imagen(nombre, entre([0, GAME_WIDTH]), y, { alto: entre([300, 420]), blanco: e.blanco });
      this.fundido(img, e.alpha ?? 0.55, dura);
      this.s.tweens.add({ targets: img, x: img.x - entre([120, 260]), duration: dura + APARECE * 2 });
    }
  }

  rafaga(e, dura) {
    const keys = e.keys.filter((k) => this.existe(k));
    const n = 7;
    for (let k = 0; k < n; k++)
      this.s.time.delayedCall((k * dura) / n + entre([0, 400]), () => {
        const y = entre([160, this.groundY - 40]);
        const img = this.imagen(keys[k % keys.length], GAME_WIDTH + 150, y, {
          alto: entre([80, 140]),
          alpha: 0.8,
          blanco: e.blanco,
        });
        this.s.tweens.add({
          targets: img,
          x: -200,
          y: y + entre([-40, 40]),
          duration: entre([1400, 2000]),
          onComplete: () => img.destroy(),
        });
      });
  }

  cruza(e, dura) {
    const alto = 95;
    const img = this.imagen(e.key, GAME_WIDTH + 80, this.groundY - alto / 2, { alto });
    const tiempo = Math.min(dura, 4500);
    this.s.tweens.add({ targets: img, x: -100, angle: -900, duration: tiempo, onComplete: () => img.destroy() });
    // Va dando saltitos.
    this.s.tweens.add({ targets: img, y: img.y - 26, duration: 260, yoyo: true, repeat: -1, ease: "Quad.Out" });
    if (e.estela && this.existe(e.estela))
      this.s.time.addEvent({
        delay: 220,
        repeat: Math.floor(tiempo / 220),
        callback: () => {
          if (!img.active) return;
          const p = this.imagen(e.estela, img.x + 30, this.groundY - 12, { alto: 30, alpha: 0.6 });
          this.s.tweens.add({ targets: p, alpha: 0, x: p.x + 50, duration: 700, onComplete: () => p.destroy() });
        },
      });
  }

  rayos(e, dura) {
    e.keys.forEach((nombre, k) => {
      if (!this.existe(nombre)) return;
      const img = this.imagen(nombre, 200 + k * 520 + entre([0, 200]), 0, { alto: 420 });
      img.setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD);
      this.fundido(img, 0.45, dura);
    });
  }

  arcoiris(e, dura) {
    const img = this.imagen(e.key, GAME_WIDTH * 0.62, 150, { alto: 260 });
    this.fundido(img, 0.55, dura + 2000);
  }
}
