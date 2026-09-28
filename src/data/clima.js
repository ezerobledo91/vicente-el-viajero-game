// Clima de cada paisaje (dibujos de Codex: npm run clima → public/assets/clima/<paisaje>-<efecto>.png).
//   ambiente: cositas que pasan todo el tiempo, suaves (hojas, polen, luciérnagas...).
//   eventos:  cada tanto uno, por unos segundos (lluvia, niebla, ráfaga, mata rodadora, arcoíris...).
// Tipos de evento:
//   cortina  → la textura repetida en toda la pantalla, corriendo (vx, vy px/seg). `salpica`: dibujo que
//              aparece en el piso mientras dura.
//   niebla   → dos o tres nubes grandes que cruzan despacio (blanco = se pintan de blanco).
//   rafaga   → varios dibujos que cruzan rápido la pantalla, de derecha a izquierda.
//   cruza    → uno solo que rueda por el piso (la mata rodadora).
//   rayos    → rayos de sol arriba que aparecen y se van.
//   arcoiris → un arcoíris en el cielo.
// `sonido`: "lluvia", "viento" o "rocio" (sintetizados en audio.js).

export const CLIMA_TIEMPOS = {
  primero: [12000, 18000], // ms hasta el primer evento
  cada: [30000, 40000], // ms entre eventos
  dura: 7000, // ms que dura un evento (sin contar cuando aparece y se va)
};

export const CLIMA = {
  "bosque-fueguino": {
    ambiente: { keys: ["hojas", "hojas-2"], cada: 1800, alto: 60 },
    eventos: [
      { tipo: "cortina", key: "nieve", vx: -30, vy: 70, alpha: 0.85, sonido: "viento" },
      { tipo: "cortina", key: "llovizna", vx: -140, vy: 520, alpha: 0.65, sonido: "lluvia" },
      { tipo: "niebla", keys: ["niebla"], blanco: true },
      { tipo: "rafaga", keys: ["remolino", "hojas", "hojas-2"], sonido: "viento" },
    ],
  },
  estepa: {
    ambiente: { keys: ["piedritas"], cada: 3200, alto: 40, alpha: 0.5, abajo: true },
    eventos: [
      { tipo: "cruza", key: "mata-rodadora", estela: "polvo", sonido: "viento" },
      { tipo: "rafaga", keys: ["rafaga", "rafaga-2", "rafaga-3", "piedritas"], sonido: "viento" },
      { tipo: "niebla", keys: ["polvo"], alpha: 0.45 },
    ],
  },
  costa: {
    ambiente: { keys: ["rocio"], cada: 3000, alto: 50, alpha: 0.4, abajo: true, blanco: true },
    eventos: [
      { tipo: "rafaga", keys: ["viento", "rocio", "espuma"], sonido: "viento", blanco: true },
      { tipo: "cortina", key: "lluvia", vx: -160, vy: 560, alpha: 0.65, salpica: "salpicadura", sonido: "lluvia" },
    ],
  },
  pampa: {
    ambiente: { keys: ["polen", "polen-2"], cada: 1600, alto: 55, alpha: 0.8 },
    eventos: [
      { tipo: "cortina", key: "lluvia", vx: -90, vy: 540, alpha: 0.65, salpica: "barro", sonido: "lluvia" },
      { tipo: "rafaga", keys: ["hojas", "polen"], sonido: "viento" },
      { tipo: "niebla", keys: ["niebla"], blanco: true },
    ],
  },
  rio: {
    ambiente: { keys: ["brisa-2"], cada: 3400, alto: 60, alpha: 0.45 },
    eventos: [
      { tipo: "cortina", key: "lluvia", vx: -80, vy: 540, alpha: 0.65, salpica: "ondas", sonido: "lluvia" },
      { tipo: "niebla", keys: ["niebla"], blanco: true },
      { tipo: "rafaga", keys: ["brisa", "brisa-2", "gotas"], sonido: "viento" },
    ],
  },
  humedal: {
    ambiente: { keys: ["luces", "semillas"], cada: 1700, alto: 60, alpha: 0.85 },
    eventos: [
      { tipo: "niebla", keys: ["neblina", "neblina-2"], blanco: true },
      { tipo: "cortina", key: "lluvia", vx: -60, vy: 520, alpha: 0.65, salpica: "ondas", sonido: "lluvia" },
    ],
  },
  selva: {
    ambiente: { keys: ["hojas"], cada: 2400, alto: 60, alpha: 0.85 },
    eventos: [
      { tipo: "rayos", keys: ["rayos", "rayos-2"] },
      { tipo: "cortina", key: "lluvia", vx: -40, vy: 560, alpha: 0.65, salpica: "gotas", sonido: "lluvia" },
      { tipo: "niebla", keys: ["humedad"], blanco: true },
    ],
  },
  cataratas: {
    ambiente: { keys: ["rocio", "rocio-2"], cada: 2600, alto: 70, alpha: 0.3, blanco: true },
    eventos: [
      { tipo: "arcoiris", key: "arcoiris" },
      { tipo: "niebla", keys: ["vapor", "rocio"], blanco: true, sonido: "rocio" },
      { tipo: "cortina", key: "gotas", vx: -120, vy: 480, alpha: 0.5, sonido: "rocio" },
    ],
  },
};
