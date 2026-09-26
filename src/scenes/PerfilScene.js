import Phaser from "phaser";
import { COLORS, FONT, GAME_WIDTH, PX_PER_CM, SCENES } from "../config/constants.js";
import { Character } from "../entities/Character.js";
import { Button } from "../ui/Button.js";
import { ANIMALES, COLECCIONABLES } from "../data/animales.js";
import { hasCharacter } from "../systems/characters.js";
import { animalesVistos, getPerfil } from "../systems/progress.js";
import { RAREZAS, STICKERS } from "../data/stickers.js";

const RAREZA = {
  común: { color: 0x9fb3c8, texto: "#9fb3c8" },
  especial: { color: 0x5fd068, texto: "#8ff09a" },
  rara: { color: 0xffb83d, texto: "#ffb83d" },
};
const CARTA = { w: 132, h: 176, gap: 14, x0: 330, y0: 180 };
const ANIMAL = { w: 92, h: 92, gap: 10, x0: 330, y0: 180, porFila: 9 };
const STICKER = { w: 124, h: 150, gap: 10, x0: 330, y0: 140, porFila: 7 };
const PESTANAS = [
  { id: "stickers", label: "Stickers" },
  { id: "coleccion", label: "Coleccionables" },
  { id: "animales", label: "Animales" },
];

// Perfil de Vicente: álbum de stickers, coleccionables juntados en los viajes y animales vistos (en pestañas).
export class PerfilScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PERFIL);
  }

  init(data) {
    this.volver = data?.volver ?? { scene: SCENES.MAPA };
    this.pestana = data?.pestana ?? "stickers";
  }

  create() {
    const perfil = getPerfil();
    const vistos = new Set(animalesVistos());

    this.add.graphics().fillStyle(0x0b1a2a, 0.65).fillRect(0, 0, GAME_WIDTH, 76);
    this.add
      .text(24, 26, "Perfil de Vicente", { fontFamily: FONT, fontSize: "20px", color: "#ffb83d" })
      .setOrigin(0, 0.5);
    const total = Object.values(perfil.coleccion).reduce((a, b) => a + b, 0);
    const stickers = Object.keys(perfil.stickers ?? {}).length;
    this.add
      .text(
        24,
        56,
        `Stickers: ${stickers}/${STICKERS.length} · Coleccionables: ${total} · Animales vistos: ${vistos.size}`,
        {
          fontFamily: FONT,
          fontSize: "10px",
          color: COLORS.ink,
        }
      )
      .setOrigin(0, 0.5);
    new Button(this, GAME_WIDTH - 110, 38, "< Volver", () => this.scene.start(this.volver.scene, this.volver.data), {
      width: 180,
      variant: "secondary",
    });

    // Vicente festejando
    const v = new Character(this, 160, 560, "vicente", { pxPerCm: PX_PER_CM.gallery * 1.2 });
    v.face("right").loop("festejo");
    this.add.text(160, 590, "Vicente", { fontFamily: FONT, fontSize: "14px", color: COLORS.ink }).setOrigin(0.5);
    this.add
      .text(160, 614, "8 años · Explorador", { fontFamily: FONT, fontSize: "9px", color: COLORS.muted })
      .setOrigin(0.5);

    this.datos = { perfil, vistos };
    this.botones = PESTANAS.map(
      (p, k) =>
        new Button(this, STICKER.x0 + 100 + k * 220, 104, p.label, () => this.mostrar(p.id), {
          width: 200,
          height: 34,
          fontSize: 10,
        })
    );
    this.objetosPestana = [];
    this.mostrar(this.pestana);
  }

  // Dibuja el contenido de una pestaña (borrando el de la anterior).
  mostrar(id) {
    this.pestana = id;
    this.botones.forEach((b, k) => b.setSelected(PESTANAS[k].id === id));
    for (const o of this.objetosPestana) o.destroy();
    const antes = new Set(this.children.list);
    const { perfil, vistos } = this.datos;

    if (id === "stickers") {
      STICKERS.forEach((st, k) => {
        const x = STICKER.x0 + (k % STICKER.porFila) * (STICKER.w + STICKER.gap);
        const y = STICKER.y0 + Math.floor(k / STICKER.porFila) * (STICKER.h + STICKER.gap);
        this.sticker(st, !!perfil.stickers?.[st.id], x, y);
      });
    } else if (id === "coleccion") {
      this.titulo(CARTA.x0, CARTA.y0 - 28, "Cartas coleccionables");
      const tipos = [COLECCIONABLES.comun, ...COLECCIONABLES.especiales];
      tipos.forEach((t, k) => this.carta(t, perfil.coleccion[t] ?? 0, CARTA.x0 + k * (CARTA.w + CARTA.gap), CARTA.y0));
    } else {
      const animales = Object.entries(ANIMALES).filter(([, a]) => a.sprite && hasCharacter(this, a.sprite));
      animales.forEach(([aid, a], k) => {
        const x = ANIMAL.x0 + (k % ANIMAL.porFila) * (ANIMAL.w + ANIMAL.gap);
        const y = ANIMAL.y0 + Math.floor(k / ANIMAL.porFila) * (ANIMAL.h + 30);
        this.animal(a, vistos.has(aid), x, y);
      });
    }
    this.objetosPestana = this.children.list.filter((o) => !antes.has(o));
  }

  sticker(st, tiene, x, y) {
    const r = RAREZAS[st.rareza];
    const { w, h } = STICKER;
    const g = this.add.graphics();
    g.fillStyle(tiene ? COLORS.panel : 0x1b2a3a, 1).fillRoundedRect(x, y, w, h, 10);
    g.lineStyle(3, tiene ? r.color : 0x35536f, 1).strokeRoundedRect(x, y, w, h, 10);
    if (hasCharacter(this, st.id)) {
      const img = this.add.image(x + w / 2, y + 60, st.id, 0);
      img.setScale(Math.min((w - 16) / img.width, 104 / img.height));
      if (!tiene) img.setTint(0x16202b);
    }
    if (!tiene)
      this.add.text(x + w / 2, y + 60, "?", { fontFamily: FONT, fontSize: "26px", color: "#9fb3c8" }).setOrigin(0.5);
    this.add
      .text(x + w / 2, y + 124, tiene ? st.nombre : "???", {
        fontFamily: FONT,
        fontSize: "7px",
        color: COLORS.ink,
        align: "center",
        wordWrap: { width: w - 10 },
      })
      .setOrigin(0.5);
    this.add.text(x + w / 2, y + 141, st.rareza, { fontFamily: FONT, fontSize: "7px", color: r.texto }).setOrigin(0.5);
  }

  titulo(x, y, texto) {
    this.add.text(x, y, texto, { fontFamily: FONT, fontSize: "12px", color: "#ffb83d" }).setOrigin(0, 0.5);
  }

  carta(id, cantidad, x, y) {
    const info = COLECCIONABLES.info[id] ?? { nombre: id, rareza: "común" };
    const r = RAREZA[info.rareza] ?? RAREZA.común;
    const tiene = cantidad > 0;
    const { w, h } = CARTA;

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRoundedRect(x + 4, y + 5, w, h, 10);
    g.fillStyle(tiene ? COLORS.panel : 0x1b2a3a, 1).fillRoundedRect(x, y, w, h, 10);
    g.lineStyle(3, tiene ? r.color : 0x35536f, 1).strokeRoundedRect(x, y, w, h, 10);

    if (hasCharacter(this, id)) {
      const img = this.add.image(x + w / 2, y + 66, id, 0);
      img.setScale(Math.min(96 / img.width, 96 / img.height));
      if (!tiene) img.setTint(0x16202b);
    }
    if (!tiene)
      this.add.text(x + w / 2, y + 66, "?", { fontFamily: FONT, fontSize: "26px", color: "#9fb3c8" }).setOrigin(0.5);

    this.add
      .text(x + w / 2, y + 128, tiene ? info.nombre : "???", {
        fontFamily: FONT,
        fontSize: "9px",
        color: COLORS.ink,
        align: "center",
        wordWrap: { width: w - 12 },
      })
      .setOrigin(0.5);
    this.add
      .text(x + w / 2, y + 150, info.rareza, { fontFamily: FONT, fontSize: "8px", color: r.texto })
      .setOrigin(0.5);
    if (tiene) {
      this.add.circle(x + w - 14, y + 14, 16, r.color).setStrokeStyle(2, 0x1b2a3a);
      this.add
        .text(x + w - 14, y + 14, `${cantidad}`, {
          fontFamily: FONT,
          fontSize: cantidad > 99 ? "7px" : "9px",
          color: COLORS.inkDark,
        })
        .setOrigin(0.5);
    }
  }

  animal(a, visto, x, y) {
    const { w, h } = ANIMAL;
    const g = this.add.graphics();
    g.fillStyle(visto ? COLORS.panel : 0x1b2a3a, 1).fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(2, visto ? 0x5fd068 : 0x35536f, 1).strokeRoundedRect(x, y, w, h, 8);
    const img = this.add.image(x + w / 2, y + h / 2, a.sprite, 0);
    img.setScale(Math.min((w - 12) / img.width, (h - 12) / img.height));
    if (!visto) img.setTint(0x16202b);
    this.add
      .text(x + w / 2, y + h + 12, visto ? a.nombre : "???", {
        fontFamily: FONT,
        fontSize: "7px",
        color: visto ? COLORS.ink : COLORS.muted,
        align: "center",
        wordWrap: { width: w + 8 },
      })
      .setOrigin(0.5, 0.5);
  }
}
