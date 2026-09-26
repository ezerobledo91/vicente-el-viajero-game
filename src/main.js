import Phaser from "phaser";
import { gameConfig } from "./config/gameConfig.js";

const game = new Phaser.Game(gameConfig);

// En desarrollo, accesible desde la consola del navegador para depurar (window.__game).
if (import.meta.env.DEV) window.__game = game;
