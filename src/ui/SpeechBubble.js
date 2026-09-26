import Phaser from "phaser";
import { COLORS, FONT } from "../config/constants.js";

const PAD = 14;
const TAIL = 12;

// Globo de diálogo cuya colita apunta al punto (x, y), por ejemplo la cabeza de un personaje.
// Si el globo se sale de la pantalla se corre hacia adentro, pero la colita sigue apuntando a (x, y).
export class SpeechBubble extends Phaser.GameObjects.Container {
  constructor(scene, x, y, text, { maxWidth = 320, fontSize = 12 } = {}) {
    super(scene, x, y);
    const label = scene.add.text(0, 0, text, {
      fontFamily: FONT,
      fontSize: `${fontSize}px`,
      color: COLORS.inkDark,
      lineSpacing: 6,
      align: "center",
      wordWrap: { width: maxWidth - PAD * 2 },
    });
    const w = label.width + PAD * 2;
    const h = label.height + PAD * 2;

    // Dentro de lo que ve la cámara (en escenas que se desplazan, el mundo es más ancho que la pantalla).
    const cam = scene.cameras.main;
    const left = cam.scrollX,
      right = cam.scrollX + cam.width;
    this.x = Phaser.Math.Clamp(x, left + w / 2 + 8, right - w / 2 - 8);
    const tailX = x - this.x;
    const top = -h - TAIL;

    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2 + 3, top + 4, w, h, 10);
    g.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, top, w, h, 10);
    g.fillTriangle(tailX - 10, -TAIL - 1, tailX + 10, -TAIL - 1, tailX, 0);
    label.setPosition(-label.width / 2, top + PAD);
    this.add([g, label]);

    this.setScale(0);
    scene.add.existing(this);
    scene.tweens.add({ targets: this, scale: 1, duration: 180, ease: "Back.Out" });
  }

  close() {
    this.scene.tweens.add({ targets: this, scale: 0, duration: 120, onComplete: () => this.destroy() });
  }
}
