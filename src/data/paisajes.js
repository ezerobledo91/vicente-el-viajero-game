// Paisajes de los tramos. Mientras no haya fondos dibujados se generan en capas (parallax):
// lejos → medio → cerca → suelo. Cada capa tiene un `tipo` de dibujo provisorio y colores.
// Cuando tengas los fondos: public/assets/paisajes/<id>-lejos.png, -medio.png, -cerca.png
// (horizontalmente continuos) y poné `imagenes: true`.

export const PAISAJES = {
  "bosque-fueguino": {
    nombre: "Bosque fueguino",
    cielo: ["#8fc0e8", "#e4f1fb"],
    lejos: { tipo: "montanas", color: "#6f7fa6", nieve: true },
    medio: { tipo: "pinos", color: "#2f5d46" },
    cerca: { tipo: "arbustos", color: "#3e7350" },
    suelo: { color: "#6b5a45", borde: "#eef3f6" },
  },
  estepa: {
    nombre: "Estepa patagónica",
    cielo: ["#86c1ee", "#f2e6c8"],
    lejos: { tipo: "mesetas", color: "#b49a78" },
    medio: { tipo: "colinas", color: "#c7ae7e" },
    cerca: { tipo: "arbustos", color: "#8d8a4e" },
    suelo: { color: "#bfa272", borde: "#9a8a55" },
  },
  costa: {
    nombre: "Costa patagónica",
    cielo: ["#7fbfee", "#e6f3fb"],
    lejos: { tipo: "mar", color: "#2f7fb8" },
    medio: { tipo: "acantilados", color: "#c9ad83" },
    cerca: { tipo: "arbustos", color: "#95914f" },
    suelo: { color: "#e2cb97", borde: "#f1e2bb" },
  },
  pampa: {
    nombre: "Llanura pampeana",
    cielo: ["#79b9ee", "#e8f5fb"],
    lejos: { tipo: "colinas", color: "#9cc47a" },
    medio: { tipo: "arboles", color: "#4e8a3a" },
    cerca: { tipo: "pasto", color: "#5f9d45" },
    suelo: { color: "#7a5a3a", borde: "#79b957" },
  },
  rio: {
    nombre: "Orillas del Paraná",
    cielo: ["#7ab8ec", "#eaf5fb"],
    lejos: { tipo: "ciudad", color: "#91a4ba" },
    medio: { tipo: "agua", color: "#6c9fbe" },
    cerca: { tipo: "juncos", color: "#5e8f3e" },
    suelo: { color: "#735636", borde: "#6fae4c" },
  },
  humedal: {
    nombre: "Humedales del Litoral",
    cielo: ["#74b3e8", "#eef6f0"],
    lejos: { tipo: "colinas", color: "#7fae6c" },
    medio: { tipo: "palmeras", color: "#3f7a3a" },
    cerca: { tipo: "juncos", color: "#4f8a38" },
    suelo: { color: "#5d4a30", borde: "#5f9e45" },
  },
  selva: {
    nombre: "Selva misionera",
    cielo: ["#6fb0e4", "#e2f2e2"],
    lejos: { tipo: "selva", color: "#2f6b3a" },
    medio: { tipo: "selva", color: "#3e8a45" },
    cerca: { tipo: "helechos", color: "#2f7a36" },
    suelo: { color: "#b0512d", borde: "#4c9a3a" },
  },
  cataratas: {
    nombre: "Cataratas del Iguazú",
    cielo: ["#6fb0e4", "#e2f2e2"],
    lejos: { tipo: "selva", color: "#2f6b3a" },
    medio: { tipo: "agua", color: "#8fc9e8" },
    cerca: { tipo: "helechos", color: "#2f7a36" },
    suelo: { color: "#b0512d", borde: "#4c9a3a" },
  },
};
