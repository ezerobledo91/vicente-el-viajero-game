import Phaser from "phaser";
import fontUrl from "@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2?url";
import { ASSETS, FONT_NAME, SCENES } from "../config/constants.js";

// Carga lo mínimo para arrancar: la fuente (antes de crear cualquier texto)
// y los manifests de sprites, animales y fondos (para saber qué más cargar).
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  preload() {
    this.load.font(FONT_NAME, fontUrl, "woff2");
    this.load.json(ASSETS.SPRITES_MANIFEST, `${ASSETS.SPRITES_PATH}manifest.json`);
    for (const ruta of ASSETS.HOJAS) this.load.json(ASSETS.HOJA(ruta), ruta);
    this.load.json(ASSETS.FONDOS_MANIFEST, `${ASSETS.FONDOS_PATH}fondos.json`);
    this.load.json(ASSETS.AJUSTES, "assets/ajustes.json");
    this.load.json(ASSETS.CLIMA, "assets/clima/clima.json");
  }

  create() {
    this.scene.start(SCENES.PRELOAD);
  }
}
