// Continentes del mapa. Las coordenadas son píxeles de la ilustración (personajes/mapa/mundo.png).
// `foco` es a dónde va la cámara al entrar a la región.
export const REGIONES = [
  { id: "sudamerica", nombre: "Sudamérica", disponible: true, marca: [385, 690], foco: { x: 470, y: 690, zoom: 1.36 } },
  { id: "norteamerica", nombre: "Norteamérica", disponible: false, marca: [230, 300] },
  { id: "europa", nombre: "Europa", disponible: false, marca: [690, 250] },
  { id: "africa", nombre: "África", disponible: false, marca: [690, 560] },
  { id: "asia", nombre: "Asia", disponible: false, marca: [1060, 320] },
  { id: "oceania", nombre: "Oceanía", disponible: false, marca: [1265, 740] },
  { id: "antartida", nombre: "Antártida", disponible: false, marca: [1150, 975] },
];
