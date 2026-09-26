import Phaser from "phaser";
import { PX_PER_CM, COLORS, FONT, GAME_WIDTH, SCENES } from "../config/constants.js";
import { Character } from "../entities/Character.js";
import { Button } from "../ui/Button.js";
import { getCharacters } from "../systems/characters.js";

const CARD = { w: 290, h: 560, top: 76, gap: 20, feetY: 340 };
const BTN = { w: 126, h: 30, rowGap: 37, colOffset: 68, firstRowY: 422 };

// Demo de sprites: una tarjeta por personaje con botones para cada animación.
export class GalleryScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GALLERY);
  }

  create() {
    this.add
      .text(GAME_WIDTH / 2, 26, "EXPLORADOR DEL MUNDO", { fontFamily: FONT, fontSize: "22px", color: "#ffb83d" })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 56, "Personajes · tocá un botón para ver cada animación", {
        fontFamily: FONT,
        fontSize: "10px",
        color: COLORS.muted,
      })
      .setOrigin(0.5);

    new Button(this, 80, 28, "< Mapa", () => this.scene.start(SCENES.MAPA), { width: 130, variant: "secondary" });

    const defs = getCharacters(this);
    const totalW = defs.length * CARD.w + (defs.length - 1) * CARD.gap;
    const startX = (GAME_WIDTH - totalW) / 2 + CARD.w / 2;
    this.cards = defs.map((def, i) => this.createCard(def, startX + i * (CARD.w + CARD.gap)));

    const bottomY = CARD.top + CARD.h + 44;
    new Button(this, GAME_WIDTH / 2 - 200, bottomY, "Todos caminan", () => this.all("caminar"), { width: 180 });
    new Button(this, GAME_WIDTH / 2, bottomY, "Todos quietos", () => this.all("idle"), { width: 180 });
    new Button(this, GAME_WIDTH / 2 + 220, bottomY, "Ver encuentro >", () => this.scene.start(SCENES.ENCUENTRO), {
      width: 220,
    });
  }

  createCard(def, cx) {
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 1).fillRoundedRect(cx - CARD.w / 2, CARD.top, CARD.w, CARD.h, 12);
    g.lineStyle(2, COLORS.panelBorder, 1).strokeRoundedRect(cx - CARD.w / 2, CARD.top, CARD.w, CARD.h, 12);
    // "Piso" y sombra para ubicar a los personajes.
    g.fillStyle(0x000000, 0.25).fillEllipse(cx, CARD.feetY, 120, 16);

    const character = new Character(this, cx, CARD.feetY + 4, def.id, { pxPerCm: PX_PER_CM.gallery });

    this.add
      .text(cx, CARD.feetY + 22, def.nombre.toUpperCase(), { fontFamily: FONT, fontSize: "14px", color: COLORS.ink })
      .setOrigin(0.5);
    this.add
      .text(cx, CARD.feetY + 46, def.rol, { fontFamily: FONT, fontSize: "9px", color: COLORS.muted })
      .setOrigin(0.5);

    const buttons = new Map();
    const select = (key) => buttons.forEach((b, k) => b.setSelected(k === key));

    const entries = [
      ...character.actions.map((a) => ({
        key: a.key,
        label: a.label,
        onClick: () => {
          if (character.isLoop(a.key)) {
            character.loop(a.key);
            select(a.key);
          } else {
            select(a.key);
            character.perform(a.key).then(() => select(character.idleAction));
          }
        },
      })),
      { key: "_girar", label: "Girar", onClick: () => character.turn(), variant: "secondary" },
    ];

    entries.forEach((e, i) => {
      const col = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const btn = new Button(this, cx + col * BTN.colOffset, BTN.firstRowY + row * BTN.rowGap, e.label, e.onClick, {
        width: BTN.w,
        height: BTN.h,
        fontSize: 9,
        variant: e.variant ?? "primary",
      });
      if (!e.key.startsWith("_")) buttons.set(e.key, btn);
    });
    select(character.idleAction);

    return { character, select };
  }

  all(action) {
    for (const { character, select } of this.cards) {
      const key = character.has(action) ? action : character.idleAction;
      character.loop(key);
      select(key);
    }
  }
}
