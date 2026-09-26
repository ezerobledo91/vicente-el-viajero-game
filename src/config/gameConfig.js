import Phaser from "phaser";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "./constants.js";
import { BootScene } from "../scenes/BootScene.js";
import { PreloadScene } from "../scenes/PreloadScene.js";
import { GalleryScene } from "../scenes/GalleryScene.js";
import { EncuentroScene } from "../scenes/EncuentroScene.js";
import { MapaScene } from "../scenes/MapaScene.js";
import { MapaHudScene } from "../scenes/MapaHudScene.js";
import { ViajeMapaScene } from "../scenes/ViajeMapaScene.js";
import { ViajeScene } from "../scenes/ViajeScene.js";
import { ViajeHudScene } from "../scenes/ViajeHudScene.js";
import { CiudadScene } from "../scenes/CiudadScene.js";
import { PerfilScene } from "../scenes/PerfilScene.js";

export const gameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    PreloadScene,
    MapaScene,
    MapaHudScene,
    ViajeMapaScene,
    ViajeScene,
    ViajeHudScene,
    CiudadScene,
    PerfilScene,
    GalleryScene,
    EncuentroScene,
  ],
};
