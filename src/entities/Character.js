import Phaser from "phaser";
import { animKey, getCharacter } from "../systems/characters.js";

// Personaje animado de la familia. El origen está en los pies (abajo-centro),
// así se paran todos sobre la misma línea de piso sin importar su altura.
// `pxPerCm` define el tamaño en pantalla a partir de la altura real del personaje.
export class Character extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, id, { pxPerCm = 1 } = {}) {
    super(scene, x, y, id, 0);
    this.def = getCharacter(scene, id);
    this.baseScale = (this.def.alturaCm * pxPerCm) / this.def.alturaPx;
    this.setOrigin(0.5, 1).setScale(this.baseScale);
    scene.add.existing(this);

    this.facing = this.def.facing;
    this.idleAction = this.has("idle") ? "idle" : this.def.animations[0].key;
    this.idle();
  }

  get nombre() {
    return this.def.nombre;
  }

  get actions() {
    return this.def.animations.filter((a) => !a.hidden);
  }

  has(action) {
    return this.def.animations.some((a) => a.key === action);
  }

  isLoop(action) {
    return this.def.animations.find((a) => a.key === action)?.repeat === -1;
  }

  // Mira hacia "left" o "right": espeja el sprite si la lámina original mira al revés.
  face(direction) {
    this.facing = direction;
    this.setFlipX(direction !== this.def.facing);
    return this;
  }

  turn() {
    return this.face(this.facing === "left" ? "right" : "left");
  }

  idle() {
    return this.loop(this.idleAction);
  }

  loop(action) {
    // Cancela el "volver a quieto" de una acción previa que quedó interrumpida.
    this.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
    this.play(animKey(this.def.id, action), true);
    return this;
  }

  // Reproduce una acción una vez (o sus repeticiones) y vuelve a quieto.
  // Si la acción es un loop infinito, queda en loop y la promesa resuelve enseguida.
  perform(action) {
    if (!this.has(action)) return Promise.resolve();
    if (this.isLoop(action)) {
      this.loop(action);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
      this.play(animKey(this.def.id, action));
      this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.idle();
        resolve();
      });
    });
  }

  // Camina hasta x (sobre el mismo piso) a velocidad constante (px/seg) y vuelve a quieto.
  walkTo(x, speed = 180) {
    return this.walkToPoint(x, this.y, speed);
  }

  // Camina en línea recta hasta (x, y). Si ya estaba caminando hacia otro lado, cambia de destino.
  walkToPoint(x, y, speed = 180) {
    this.walkTween?.stop();
    const distance = Math.hypot(x - this.x, y - this.y);
    if (distance < 1) return Promise.resolve();
    if (Math.abs(x - this.x) > 1) this.face(x > this.x ? "right" : "left");
    if (this.has("caminar")) this.loop("caminar");
    return new Promise((resolve) => {
      this.walkTween = this.scene.tweens.add({
        targets: this,
        x,
        y,
        duration: (distance / speed) * 1000,
        onComplete: () => {
          this.idle();
          resolve();
        },
      });
    });
  }
}
