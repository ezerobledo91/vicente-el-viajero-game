import Phaser from "phaser";
import { ASSETS, COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, SCENES } from "../config/constants.js";
import { loadCharacterSheets, registerCharacters } from "../systems/characters.js";
import { PAISES } from "../data/paises.js";
import { REGIONES } from "../data/regiones.js";

const FLAG_SIZE = { width: 240, height: 180 };

// Carga todos los assets del juego con una barra de progreso.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PRELOAD);
  }

  preload() {
    const cx = GAME_WIDTH / 2,
      cy = GAME_HEIGHT / 2;
    const barW = 420,
      barH = 22;
    this.add
      .text(cx, cy - 50, "Preparando la mochila...", { fontFamily: FONT, fontSize: "16px", color: COLORS.ink })
      .setOrigin(0.5);
    const frame = this.add
      .graphics()
      .lineStyle(3, COLORS.accent)
      .strokeRect(cx - barW / 2, cy - barH / 2, barW, barH);
    const bar = this.add.graphics();
    this.load.on("progress", (p) => {
      bar
        .clear()
        .fillStyle(COLORS.accent)
        .fillRect(cx - barW / 2 + 4, cy - barH / 2 + 4, (barW - 8) * p, barH - 8);
    });
    this.load.once("complete", () => frame.destroy());

    // Personajes, animales y objetos (todos son sprite sheets con el mismo formato de manifest)
    this.manifests = [
      [this.cache.json.get(ASSETS.SPRITES_MANIFEST), ASSETS.SPRITES_PATH],
      ...ASSETS.HOJAS.map((ruta) => [this.cache.json.get(ASSETS.HOJA(ruta)), ruta.slice(0, ruta.lastIndexOf("/") + 1)]),
    ].filter(([m]) => m);
    for (const [m, path] of this.manifests) loadCharacterSheets(this, m, path);

    // Fondos ilustrados de tramos y ciudades
    const fondos = this.cache.json.get(ASSETS.FONDOS_MANIFEST) ?? { tramos: {}, ciudades: {} };
    for (const id of Object.keys(fondos.tramos))
      for (const capa of ["fondo", "suelo"])
        this.load.image(ASSETS.FONDO(id, capa), `${ASSETS.FONDOS_PATH}${id}-${capa}.webp`);
    for (const id of Object.keys(fondos.ciudades))
      this.load.image(ASSETS.FONDO_CIUDAD(id), `${ASSETS.FONDOS_PATH}ciudad-${id}.webp`);

    // Mapa, regiones calibradas, banderas y emblemas
    this.load.image(ASSETS.MAP_IMAGE, `${ASSETS.MAP_PATH}mundo.png`);
    for (const r of REGIONES.filter((reg) => reg.disponible))
      this.load.json(ASSETS.MAP_REGION(r.id), `${ASSETS.MAP_PATH}${r.id}.json`);
    for (const p of PAISES) {
      this.load.svg(ASSETS.FLAG(p.id), `${ASSETS.FLAGS_PATH}${p.id}.svg`, FLAG_SIZE);
      if (p.emblema?.sprite) this.load.image(ASSETS.EMBLEM(p.id), `${ASSETS.EMBLEMS_PATH}${p.emblema.sprite}`);
    }
  }

  create() {
    for (const [m] of this.manifests) registerCharacters(this, m);
    this.scene.start(SCENES.MAPA);
  }
}
