// Arma un tramo del viaje a partir de sus datos: dónde va cada pájaro, perro, roca, plataforma,
// coleccionable, corazón y animal.
// Es lógica pura (sin Phaser) y usa una semilla: el mismo tramo sale siempre igual.
//
// Alturas: `y` es la distancia en px hacia arriba desde el piso (0 = apoyado en el piso).
// Referencias: un salto normal llega a ~150 px; rebotando en un perro, a ~250 px. Los pájaros bajos
// (y 105) se esquivan saltando por encima o agachándose.

export const LEVEL = {
  inicioLibre: 700, // zona sin obstáculos al arrancar
  finLibre: 600, // zona sin obstáculos antes del cartel de la ciudad
  roca: { w: 180, h: 64 },
  vidaCada: 2600, // px: cada cuánto aparece un corazón
  animalRango: 170, // px que camina cada animal a cada lado de su lugar
};

// Por dificultad: separación entre "bloques" y probabilidad de cada patrón.
const DIFICULTAD = {
  1: {
    paso: 520,
    pesos: {
      figuritas: 3,
      roca: 2,
      pajaroBajo: 2,
      pajaroAlto: 1,
      perro: 2,
      plataforma: 2,
      escalera: 1,
      plataformaMovil: 1,
      perroDoble: 1,
      bandada: 0,
      descanso: 1,
    },
  },
  2: {
    paso: 470,
    pesos: {
      figuritas: 2,
      roca: 2,
      pajaroBajo: 3,
      pajaroAlto: 2,
      perro: 2,
      plataforma: 2,
      escalera: 2,
      plataformaMovil: 2,
      perroDoble: 1,
      bandada: 1,
      descanso: 1,
    },
  },
  3: {
    paso: 430,
    pesos: {
      figuritas: 2,
      roca: 1,
      pajaroBajo: 3,
      pajaroAlto: 3,
      perro: 2,
      plataforma: 2,
      escalera: 2,
      plataformaMovil: 2,
      perroDoble: 2,
      bandada: 2,
      descanso: 0,
    },
  },
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rnd, pesos) {
  const total = Object.values(pesos).reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (const [k, w] of Object.entries(pesos)) if ((r -= w) < 0) return k;
  return Object.keys(pesos)[0];
}

const PATRONES = {
  figuritas: (x) => arco(x, 5, 70, 150),
  roca: (x) => [
    { tipo: "roca", x },
    ...[-50, 0, 50].map((dx) => ({ tipo: "figurita", x: x + dx, y: LEVEL.roca.h + 110 })),
  ],
  pajaroBajo: (x) => [{ tipo: "pajaro", x: x + 200, y: 105 }, ...arco(x - 30, 3, 150, 200)],
  pajaroAlto: (x) => [
    { tipo: "pajaro", x: x + 200, y: 210 },
    { tipo: "figurita", x, y: 50 },
  ],
  perro: (x) => [{ tipo: "perro", x }, ...[-40, 40].map((dx) => ({ tipo: "figurita", x: x + dx, y: 250 }))],
  plataforma: (x) => [{ tipo: "plataforma", x, y: 125, w: 220 }, ...fila(x, 3, 125 + 60)],
  escalera: (x) => [
    { tipo: "roca", x: x - 120 },
    { tipo: "plataforma", x: x + 120, y: 190, w: 200 },
    ...fila(x + 120, 3, 190 + 60),
  ],
  plataformaMovil: (x) => [{ tipo: "plataforma", x, y: 115, w: 170, mueve: 200 }, ...fila(x, 2, 115 + 60)],
  // Dos perros seguidos: rebotando en el primero se llega a una plataforma alta con premios.
  perroDoble: (x) => [
    { tipo: "perro", x: x - 130 },
    { tipo: "perro", x: x + 250 },
    { tipo: "plataforma", x: x + 60, y: 235, w: 180 },
    ...fila(x + 60, 3, 235 + 60),
  ],
  bandada: (x) => [
    { tipo: "pajaro", x: x + 200, y: 105 },
    { tipo: "pajaro", x: x + 520, y: 200 },
    { tipo: "pajaro", x: x + 820, y: 105 },
    ...arco(x + 360, 3, 120, 170),
  ],
  descanso: () => [],
};

function fila(x, n, y) {
  return Array.from({ length: n }, (_, i) => ({ tipo: "figurita", x: x + (i - (n - 1) / 2) * 55, y }));
}

function arco(x, n, alturaMin, alturaMax) {
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return { tipo: "figurita", x: x - 120 + t * 240, y: alturaMin + Math.sin(t * Math.PI) * (alturaMax - alturaMin) };
  });
}

export function buildLevel(tramo, seed = 1) {
  const rnd = mulberry32(seed * 7919);
  const cfg = DIFICULTAD[tramo.dificultad] ?? DIFICULTAD[1];
  const largo = tramo.largo;
  const items = [];

  const desde = LEVEL.inicioLibre,
    hasta = largo - LEVEL.finLibre;
  const bloques = [];
  for (let x = desde; x < hasta; x += cfg.paso * (0.85 + rnd() * 0.3))
    bloques.push({ x, patron: pick(rnd, cfg.pesos) });

  // Garantizar un mínimo de pájaros y perros (el azar solo podría dejar uno).
  const minimo = Math.max(2, Math.round(largo / 1800));
  for (const [grupo, reemplazo] of [
    [["pajaroBajo", "pajaroAlto", "bandada"], () => (rnd() < 0.6 ? "pajaroBajo" : "pajaroAlto")],
    [["perro", "perroDoble"], () => "perro"],
    [["plataforma", "escalera", "plataformaMovil", "perroDoble"], () => (rnd() < 0.5 ? "plataforma" : "escalera")],
  ]) {
    const libres = () => bloques.filter((b) => ["figuritas", "descanso", "roca"].includes(b.patron));
    while (bloques.filter((b) => grupo.includes(b.patron)).length < minimo && libres().length) {
      const l = libres();
      l[Math.floor(rnd() * l.length)].patron = reemplazo();
    }
  }
  for (const b of bloques) items.push(...PATRONES[b.patron](b.x));

  // Corazones para recuperar vidas, a una altura que pide saltar.
  for (let x = desde + LEVEL.vidaCada * 0.6; x < hasta; x += LEVEL.vidaCada) items.push({ tipo: "vida", x, y: 140 });

  // Animales nativos repartidos a lo largo del tramo (cada uno aparece al menos una vez),
  // corridos si caen justo donde hay una roca o un perro.
  const n = Math.max(tramo.animales.length, Math.round(largo / 1400));
  const ocupado = (x) => items.some((it) => (it.tipo === "roca" || it.tipo === "perro") && Math.abs(it.x - x) < 170);
  for (let i = 0; i < n; i++) {
    let x = desde + ((i + 0.5) / n) * (hasta - desde);
    for (let intento = 0; intento < 4 && ocupado(x); intento++) x += 120;
    items.push({ tipo: "animal", id: tramo.animales[i % tramo.animales.length], x, rango: LEVEL.animalRango });
  }

  items.push({ tipo: "cartel", x: largo - 260 });
  return { largo, items: items.sort((a, b) => a.x - b.x) };
}
