// Rocas y troncos de personajes/decoracion/rocas-troncos.png (npm run decoracion → deco-1 … deco-31).
// Para ver cuál es cuál, mirá public/assets/decoracion/ (cada uno es un PNG).

export const DECORACION = {
  // Una sola escala para toda la lámina (px del juego por px de la lámina): así una piedra chica
  // sigue siendo chica al lado de una grande, y todo combina con el tamaño de Vicente.
  escala: 0.6,
  // Obstáculos: se puede subir encima.
  obstaculos: [
    "deco-1",
    "deco-3",
    "deco-4",
    "deco-6",
    "deco-8",
    "deco-9",
    "deco-10",
    "deco-17",
    "deco-18",
    "deco-19",
    "deco-20",
    "deco-21",
    "deco-25",
  ],
};

// Ambientación regional (Codex, npm run decoracion-regional): adornos al costado del camino, detrás de
// Vicente. `alturas` en px del juego (Vicente mide ~147), `porPaisaje` qué adornos van en cada tramo.
export const AMBIENTACION = {
  cada: 1300, // px aproximados entre adorno y adorno
  alturas: {
    "pa-manga-viento": 150,
    "pa-flecha": 95,
    "pa-tablero": 85,
    "pa-mate": 40,
    "pa-binoculares": 95,
    "pa-lena": 55,
    "pa-soga-boya": 45,
    "pa-cajon": 50,
    "ce-kiosco": 170,
    "ce-mate": 40,
    "ce-alambrado": 70,
    "ce-fardo": 70,
    "ce-tarro": 55,
    "ce-cesto": 60,
    "ce-bicicleta": 62,
    "ce-banco": 62,
    "li-tablero": 85,
    "li-barril": 80,
    "li-cesta-yerba": 48,
    "li-canoa": 45,
    "li-salvavidas": 45,
    "li-cantaro": 45,
    "li-mojon-piedra": 70,
    "li-acordeon": 42,
  },
  porPaisaje: {
    "bosque-fueguino": ["pa-lena", "pa-flecha", "pa-tablero", "pa-mate", "pa-cajon", "pa-binoculares"],
    estepa: ["pa-manga-viento", "pa-flecha", "pa-lena", "pa-mate", "pa-cajon", "pa-binoculares"],
    costa: ["pa-soga-boya", "pa-cajon", "pa-manga-viento", "pa-binoculares", "pa-mate", "pa-flecha"],
    pampa: ["ce-alambrado", "ce-fardo", "ce-tarro", "ce-mate", "ce-bicicleta", "ce-banco"],
    rio: ["ce-banco", "ce-cesto", "ce-bicicleta", "li-canoa", "li-salvavidas", "ce-mate"],
    humedal: ["li-canoa", "li-salvavidas", "li-cantaro", "li-acordeon", "li-barril", "li-tablero"],
    selva: ["li-cesta-yerba", "li-barril", "li-cantaro", "li-mojon-piedra", "li-tablero", "li-acordeon"],
    cataratas: ["li-cesta-yerba", "li-mojon-piedra", "li-barril", "pa-binoculares", "li-tablero", "li-cantaro"],
  },
};

// Entrada y salida de cada tramo: arco o cartel de salida, mojones con los km que faltan y, al llegar,
// cartel de bienvenida con guardarraíl, banco y (en las ciudades grandes) parada de colectivo.
export const TRANSICIONES = {
  alturas: {
    "tr-cartel-madera": 250,
    "tr-cartel-ruta": 170,
    "tr-parada": 175,
    "tr-arco": 290,
    "tr-poste": 150,
    "tr-mojon": 60,
    "tr-guardarrail": 60,
    "tr-banco": 62,
  },
  // Salida: el arco de madera en los parques (Patagonia, Misiones); el cartel de ruta en el resto.
  salida: {
    "bosque-fueguino": "tr-arco",
    estepa: "tr-cartel-ruta",
    costa: "tr-cartel-ruta",
    pampa: "tr-cartel-ruta",
    rio: "tr-cartel-ruta",
    humedal: "tr-cartel-ruta",
    selva: "tr-arco",
    cataratas: "tr-arco",
  },
  mojonCada: 3000, // px entre mojones
  conParada: ["buenosaires", "rosario", "santafe", "corrientes", "posadas"],
};

// Carteles donde se puede escribir (el juego o el editor): parte de la tabla en proporción del alto
// del dibujo [arriba, abajo], color de la letra y del borde, y tamaño de letra por defecto.
const MADERA = { color: "#ffffff", borde: "#3a2212", size: 13 };
export const TABLAS = {
  "tr-cartel-madera": { ...MADERA, tabla: [0.06, 0.44] },
  "tr-arco": { ...MADERA, tabla: [0.03, 0.2] },
  "tr-cartel-ruta": { color: "#ffffff", borde: "#123a78", size: 14, tabla: [0.11, 0.44] },
  "tr-mojon": { color: "#2a1d1a", borde: "#f4efe6", size: 11, tabla: [0.45, 0.8] },
  "tr-poste": { ...MADERA, size: 9, tabla: [0.03, 0.43] },
  "pa-tablero": { ...MADERA, size: 11, tabla: [0.06, 0.54] },
  "li-tablero": { ...MADERA, size: 10, tabla: [0.05, 0.4] },
  "pa-flecha": { ...MADERA, size: 9, tabla: [0.08, 0.36] },
  "li-mojon-piedra": { color: "#2a1d1a", borde: "#f4efe6", size: 10, tabla: [0.2, 0.55] },
};

// Todo lo que se puede agregar o poner en lugar de otra cosa desde el editor.
export const PALETA = [...Object.keys(TRANSICIONES.alturas), ...Object.keys(AMBIENTACION.alturas)];
export const alturaDe = (key) => AMBIENTACION.alturas[key] ?? TRANSICIONES.alturas[key] ?? 80;
