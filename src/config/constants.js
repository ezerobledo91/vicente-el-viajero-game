export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const SCENES = {
  BOOT: "boot",
  PRELOAD: "preload",
  GALLERY: "gallery",
  ENCUENTRO: "encuentro",
  MAPA: "mapa",
  MAPA_HUD: "mapa-hud",
  VIAJE_MAPA: "viaje-mapa",
  VIAJE: "viaje",
  VIAJE_HUD: "viaje-hud",
  CIUDAD: "ciudad",
  PERFIL: "perfil",
};

export const ASSETS = {
  SPRITES_PATH: "assets/sprites/",
  SPRITES_MANIFEST: "sprites-manifest",
  MAP_PATH: "assets/map/",
  MAP_IMAGE: "mapa-mundo",
  MAP_REGION: (region) => `mapa-${region}`,
  FLAGS_PATH: "assets/flags/",
  FLAG: (id) => `bandera-${id}`,
  EMBLEMS_PATH: "assets/emblemas/",
  EMBLEM: (id) => `emblema-${id}`,
  // Hojas de sprites extra (npm run animales / decoracion / stickers). Todas usan el mismo formato de manifest.
  HOJAS: [
    "assets/animales/nativos.json",
    "assets/animales/extra.json",
    "assets/animales/mas.json",
    "assets/decoracion/decoracion.json",
    "assets/stickers/stickers.json",
    "assets/stickers/stickers-hd.json",
    "assets/tesoros/tesoros.json",
    "assets/lugares/lugares.json",
  ],
  HOJA: (ruta) => `hoja-${ruta}`,
  // Fondos ilustrados (npm run fondos).
  FONDOS_PATH: "assets/fondos/",
  FONDOS_MANIFEST: "fondos-manifest",
  FONDO: (paisaje, capa) => `fondo-${paisaje}-${capa}`,
  FONDO_CIUDAD: (id) => `fondo-ciudad-${id}`,
  PIEZA: (paisaje, nombre) => `pieza-${paisaje}-${nombre}`,
};

export const FONT_NAME = "Press Start 2P";
// Con respaldo por si falla la carga. Ojo: el subset latino no trae flechas ni símbolos (← ▶), usar ASCII.
export const FONT = `"${FONT_NAME}", monospace`;

export const COLORS = {
  bg: 0x1b2a3a,
  panel: 0x243a50,
  panelBorder: 0x35536f,
  accent: 0xffb83d,
  accentDark: 0xd48f12,
  ink: "#f4f1e8",
  inkDark: "#2a1d1a",
  muted: "#9fb3c8",
  sky: 0x8fd3ff,
  skyLow: 0xd9f1ff,
  grass: 0x5fae4e,
  grassDark: 0x4b9140,
};

// Píxeles de pantalla por cada cm de altura real. Cada personaje se escala según su
// `alturaCm` (en sprites.config.json), así Anita se ve más chica que Vicente, etc.
export const PX_PER_CM = {
  gallery: 1.3,
  world: 1.35,
  map: 0.26, // Vicente caminando sobre el planisferio
  viaje: 1.15, // modo viaje (plataformas) y ciudades
};
