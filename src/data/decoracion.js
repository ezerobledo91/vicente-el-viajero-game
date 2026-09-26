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
