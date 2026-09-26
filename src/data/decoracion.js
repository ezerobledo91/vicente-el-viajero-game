// Rocas y troncos de personajes/decoracion/rocas-troncos.png (npm run decoracion → deco-1 … deco-31).
// Para ver cuál es cuál, mirá public/assets/decoracion/ (cada uno es un PNG).

export const DECORACION = {
  // Obstáculos: se puede subir encima. Se dibujan con `altoObstaculo` px de alto.
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
  altoObstaculo: 70,
  // Adornos del camino: sin colisión, detrás de Vicente, para que el recorrido no se vea vacío.
  adornos: [
    "deco-11",
    "deco-12",
    "deco-13",
    "deco-14",
    "deco-15",
    "deco-22",
    "deco-23",
    "deco-24",
    "deco-26",
    "deco-27",
    "deco-28",
    "deco-29",
    "deco-30",
    "deco-31",
  ],
  adornoCada: [260, 520], // px entre adorno y adorno (mínimo, máximo)
  altoAdorno: [26, 70], // px (mínimo, máximo); se escala según el tamaño original
};
