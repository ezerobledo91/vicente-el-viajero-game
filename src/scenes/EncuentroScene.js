import Phaser from "phaser";
import { PX_PER_CM, COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, SCENES } from "../config/constants.js";
import { Character } from "../entities/Character.js";
import { Button } from "../ui/Button.js";
import { SpeechBubble } from "../ui/SpeechBubble.js";
import { ENCUENTRO } from "../data/dialogos.js";

const GROUND_Y = 610;
const WALK_SPEED = 170;
const GREET_DISTANCE = 150;

// Demo de interacción: Vicente camina, saluda a cada familiar y después se puede mover libremente.
export class EncuentroScene extends Phaser.Scene {
  constructor() {
    super(SCENES.ENCUENTRO);
  }

  init(data) {
    this.startFree = !!data?.free;
  }

  create() {
    this.drawBackground();

    this.family = ENCUENTRO.familia.map((f) => {
      const c = new Character(this, f.x, GROUND_Y, f.id, { pxPerCm: PX_PER_CM.world }).setDepth(1);
      c.face("left");
      return { ...f, character: c, bubble: null };
    });
    this.vicente = new Character(this, this.startFree ? 200 : -80, GROUND_Y, "vicente", {
      pxPerCm: PX_PER_CM.world,
    }).setDepth(2);

    new Button(this, 90, 30, "< Galería", () => this.scene.start(SCENES.GALLERY), { width: 150, variant: "secondary" });
    new Button(this, 250, 30, "Repetir", () => this.scene.restart({ free: false }), {
      width: 150,
      variant: "secondary",
    });
    this.skipBtn = new Button(this, 410, 30, "Saltar >>", () => this.scene.restart({ free: true }), {
      width: 150,
      variant: "secondary",
    });

    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.free = false;
    this.walking = false;

    if (this.startFree) this.enterFreeMode();
    else this.playIntro();
  }

  wait(ms) {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  say(character, text, ms) {
    const bubble = new SpeechBubble(this, character.x, character.getTopCenter().y - 6, text).setDepth(10);
    return this.wait(ms).then(() => bubble.close());
  }

  async playIntro() {
    const v = this.vicente;
    for (const f of this.family) {
      await v.walkTo(f.x - GREET_DISTANCE, WALK_SPEED);
      v.loop("saludar-der");
      await this.say(v, f.saludoVicente, 1100);

      if (f.character.has("saludar")) f.character.loop("saludar");
      if (f.reaccion) f.character.perform(f.reaccion);
      await this.say(f.character, f.respuesta, 1900);
      f.character.idle();
      v.idle();
      await this.wait(250);
    }

    await v.walkTo(GAME_WIDTH - 110, WALK_SPEED);
    v.face("left");
    const thinking = v.perform("pensar");
    await this.say(v, ENCUENTRO.pensar, 1500);
    await thinking;
    const celebrating = v.perform(v.has("festejo") ? "festejo" : "victoria");
    await this.say(v, ENCUENTRO.victoria, 1500);
    await celebrating;

    this.enterFreeMode();
  }

  enterFreeMode() {
    this.free = true;
    this.skipBtn.setVisible(false);
    this.add
      .text(GAME_WIDTH / 2, 90, ENCUENTRO.ayuda, { fontFamily: FONT, fontSize: "12px", color: COLORS.inkDark })
      .setOrigin(0.5);
  }

  update(_time, delta) {
    if (!this.free) return;
    const v = this.vicente;
    const dir =
      (this.keys.right.isDown || this.keys.d.isDown ? 1 : 0) - (this.keys.left.isDown || this.keys.a.isDown ? 1 : 0);

    if (dir !== 0) {
      v.face(dir > 0 ? "right" : "left");
      v.x = Phaser.Math.Clamp(v.x + dir * WALK_SPEED * (delta / 1000), 40, GAME_WIDTH - 40);
      if (!this.walking) v.loop("caminar");
      this.walking = true;
    } else if (this.walking) {
      v.idle();
      this.walking = false;
    }

    // Los familiares saludan cuando Vicente se acerca.
    for (const f of this.family) {
      const near = Math.abs(v.x - f.x) < GREET_DISTANCE - 20;
      if (near && !f.bubble) {
        f.character.face(v.x > f.x ? "right" : "left");
        f.bubble = new SpeechBubble(
          this,
          f.x,
          f.character.getTopCenter().y - 6,
          `¡Hola! Soy ${f.character.nombre}`
        ).setDepth(10);
      } else if (!near && f.bubble) {
        f.bubble.close();
        f.bubble = null;
      }
    }
  }

  drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.sky, COLORS.sky, COLORS.skyLow, COLORS.skyLow, 1);
    g.fillRect(0, 0, GAME_WIDTH, GROUND_Y - 40);

    // Nubes
    g.fillStyle(0xffffff, 0.9);
    for (const [x, y, s] of [
      [180, 150, 1],
      [520, 110, 0.8],
      [900, 170, 1.2],
      [1150, 90, 0.7],
    ]) {
      g.fillEllipse(x, y, 140 * s, 44 * s);
      g.fillEllipse(x + 40 * s, y - 18 * s, 90 * s, 50 * s);
      g.fillEllipse(x - 38 * s, y - 8 * s, 70 * s, 36 * s);
    }

    // Pasto y camino
    g.fillStyle(COLORS.grass, 1).fillRect(0, GROUND_Y - 40, GAME_WIDTH, GAME_HEIGHT - GROUND_Y + 40);
    g.fillStyle(COLORS.grassDark, 1);
    for (let x = 0; x < GAME_WIDTH; x += 36) g.fillRect(x + ((x / 36) % 2) * 12, GROUND_Y - 34 + ((x * 7) % 30), 6, 6);
    g.fillStyle(0xd9b77a, 1).fillRect(0, GROUND_Y - 14, GAME_WIDTH, 30);
    g.fillStyle(0xc4a064, 1).fillRect(0, GROUND_Y + 12, GAME_WIDTH, 4);
  }
}
