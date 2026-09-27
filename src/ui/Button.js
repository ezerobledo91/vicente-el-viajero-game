import Phaser from "phaser";
import { efecto } from "../systems/audio.js";
import { COLORS, FONT } from "../config/constants.js";

// Botón pixel simple: rectángulo redondeado + texto, con estados hover / presionado / seleccionado.
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, label, onClick, { width = 140, height = 34, fontSize = 10, variant = "primary" } = {}) {
    super(scene, x, y);
    this.w = width;
    this.h = height;
    this.variant = variant;
    this.selected = false;
    this.hovered = false;

    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, label, { fontFamily: FONT, fontSize: `${fontSize}px`, color: COLORS.inkDark })
      .setOrigin(0.5);
    this.add([this.bg, this.label]);

    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });
    this.on("pointerover", () => ((this.hovered = true), this.redraw()));
    this.on("pointerout", () => ((this.hovered = false), this.redraw()));
    // Se dispara al apoyar el dedo: en tablets los toques rápidos a veces no llegan al "pointerup".
    this.on("pointerdown", () => {
      efecto("click");
      scene.tweens.add({ targets: this, scale: 0.94, duration: 60, yoyo: true });
      onClick?.(this);
    });

    this.redraw();
    scene.add.existing(this);
  }

  setSelected(value) {
    this.selected = value;
    this.redraw();
    return this;
  }

  // Color fijo (por ejemplo verde/rojo al corregir una respuesta). null vuelve al color normal.
  setFill(color) {
    this.fillOverride = color;
    this.redraw();
    return this;
  }

  redraw() {
    const primary = this.variant === "primary";
    let fill = primary ? COLORS.accent : COLORS.panelBorder;
    if (this.hovered) fill = primary ? 0xffcf70 : 0x4a6f91;
    if (this.selected) fill = 0xffffff;
    if (this.fillOverride != null) fill = this.fillOverride;
    const shadow = primary ? COLORS.accentDark : 0x1d3144;
    this.label.setColor(primary || this.selected ? COLORS.inkDark : COLORS.ink);

    const { w, h } = this;
    this.bg.clear();
    this.bg.fillStyle(shadow, 1).fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 6);
    this.bg.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 6);
  }
}
