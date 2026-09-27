// Arma un tramo del viaje a partir de sus datos: dónde va cada pájaro, perro, roca, plataforma,
// coleccionable, corazón y animal.
// Es lógica pura (sin Phaser) y usa una semilla: el mismo tramo sale siempre igual.
//
// Alturas: `y` es la distancia en px hacia arriba desde el piso (0 = apoyado en el piso).
// Referencias: un salto normal llega a ~150 px; rebotando en un perro, a ~250 px. Los pájaros bajos
// (y 105) se esquivan saltando por encima o agachándose. Un salto con carrera cruza ~210 px de largo:
// los pozos chicos miden menos que eso; los grandes se cruzan con plataformas que se mueven.

export const LEVEL = {
  inicioLibre: 700, // zona sin obstáculos al arrancar
  finLibre: 600, // zona sin obstáculos antes del cartel de la ciudad
  roca: { w: 180, h: 64 },
  vidaCada: 2600, // px: cada cuánto aparece un corazón
  primerAnimal: 2600, // px desde el inicio: el primer animal aparece después de avanzar un poco
  entreAnimales: 2400, // px mínimos entre un animal y el siguiente (encontrar uno es un hito)
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
      plataforma: 2,
      escalera: 1,
      plataformaMovil: 1,
      trampolin: 1,
      bandada: 0,
      pozo: 1,
      pozoMovil: 0,
      escaleraAlta: 1,
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
      plataforma: 2,
      escalera: 2,
      plataformaMovil: 2,
      trampolin: 1,
      bandada: 1,
      pozo: 2,
      pozoMovil: 1,
      escaleraAlta: 1,
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
      plataforma: 2,
      escalera: 2,
      plataformaMovil: 2,
      trampolin: 2,
      bandada: 2,
      pozo: 3,
      pozoMovil: 2,
      escaleraAlta: 2,
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
  plataforma: (x) => [{ tipo: "plataforma", x, y: 125, w: 220 }, ...fila(x, 3, 125 + 60)],
  escalera: (x) => [
    { tipo: "roca", x: x - 120 },
    { tipo: "plataforma", x: x + 120, y: 190, w: 200 },
    ...fila(x + 120, 3, 190 + 60),
  ],
  plataformaMovil: (x) => [{ tipo: "plataforma", x, y: 115, w: 170, mueve: 200 }, ...fila(x, 2, 115 + 60)],
  // Perro trampolín: la única forma de llegar a la plataforma alta (y a su premio) es rebotar en él.
  // `vida`: si el premio es un corazón en vez de estrellas.
  trampolin: (x, { vida = false } = {}) => [
    { tipo: "perro", x: x - 130 },
    { tipo: "plataforma", x: x + 60, y: 235, w: 180 },
    ...(vida ? [{ tipo: "vida", x: x + 60, y: 235 + 60 }] : fila(x + 60, 3, 235 + 60)),
  ],
  bandada: (x) => [
    { tipo: "pajaro", x: x + 200, y: 105 },
    { tipo: "pajaro", x: x + 520, y: 200 },
    { tipo: "pajaro", x: x + 820, y: 105 },
    ...arco(x + 360, 3, 120, 170),
  ],
  // Pozo chico: se salta con carrera. Las estrellas marcan el salto.
  pozo: (x, { dificultad = 1 } = {}) => [{ tipo: "pozo", x, w: 130 + dificultad * 20 }, ...arco(x, 3, 110, 180)],
  // Pozo grande: hay que ir saltando de una plataforma que se mueve a otra.
  pozoMovil: (x) => [
    { tipo: "pozo", x, w: 600 },
    { tipo: "plataforma", x: x - 150, y: 95, w: 140, mueve: 110 },
    { tipo: "plataforma", x: x + 150, y: 150, w: 140, mueveY: 90 },
    ...fila(x - 150, 2, 95 + 60),
    ...fila(x + 150, 2, 150 + 150),
  ],
  // Escalera de tres plataformas, cada una más alta, con premio arriba de todo.
  escaleraAlta: (x) => [
    { tipo: "plataforma", x: x - 230, y: 120, w: 170 },
    { tipo: "plataforma", x, y: 225, w: 150 },
    { tipo: "plataforma", x: x + 230, y: 330, w: 150 },
    ...fila(x + 230, 3, 330 + 60),
  ],
  descanso: () => [],
};

// Patrones que ocupan más lugar (el bloque siguiente se corre para no caer adentro del pozo).
const ANCHO_EXTRA = { pozoMovil: 380 };

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
  for (let x = desde; x < hasta - 400;) {
    const patron = pick(rnd, cfg.pesos);
    const extra = ANCHO_EXTRA[patron] ?? 0;
    bloques.push({ x: x + extra / 2, patron });
    x += cfg.paso * (0.85 + rnd() * 0.3) + extra;
  }

  // Garantizar un mínimo de cada cosa (el azar solo podría dejar uno o ninguno).
  const minimo = Math.max(2, Math.round(largo / 1800));
  for (const [grupo, reemplazo, cuantos = minimo] of [
    [["pajaroBajo", "pajaroAlto", "bandada"], () => (rnd() < 0.6 ? "pajaroBajo" : "pajaroAlto")],
    [["trampolin"], () => "trampolin", Math.max(2, Math.round(largo / 3000))],
    [["plataforma", "escalera", "plataformaMovil", "trampolin"], () => (rnd() < 0.5 ? "plataforma" : "escalera")],
    // Mínimos de pozos por tramo (opcional en los datos: pozosMin, pozosGrandesMin).
    [["pozoMovil"], () => "pozoMovil", tramo.pozosGrandesMin ?? 0],
    [["pozo", "pozoMovil"], () => "pozo", tramo.pozosMin ?? 0],
  ]) {
    const libres = () => bloques.filter((b) => ["figuritas", "descanso", "roca", "pozo"].includes(b.patron));
    while (bloques.filter((b) => grupo.includes(b.patron)).length < cuantos && libres().length) {
      const l = libres();
      l[Math.floor(rnd() * l.length)].patron = reemplazo();
    }
  }

  // Corazones: arriba de las plataformas de los trampolines (hay que rebotar en el perro para llegar),
  // uno cada ~LEVEL.vidaCada px.
  let ultimaVida = -Infinity;
  for (const b of bloques) {
    const vida = b.patron === "trampolin" && b.x - ultimaVida >= LEVEL.vidaCada;
    if (vida) ultimaVida = b.x;
    items.push(...PATRONES[b.patron](b.x, { vida, dificultad: tramo.dificultad }));
  }

  // Tesoro y especial del tramo: reemplazan una estrella de las más altas (arriba de un trampolín o
  // de una plataforma alta): el especial en la primera mitad y el tesoro en la segunda.
  const altas = items.filter((it) => it.tipo === "figurita" && it.y >= 240);
  const elegir = (desdeX, hastaX) => {
    const zona = altas.filter((it) => it.x >= desdeX && it.x < hastaX && !it.especial);
    return zona[Math.floor(zona.length / 2)] ?? altas.find((it) => !it.especial);
  };
  const conEspecial = tramo.especial && elegir(0, largo / 2);
  if (conEspecial) conEspecial.especial = tramo.especial;
  const conTesoro = tramo.tesoro && elegir(largo / 2, largo);
  if (conTesoro) conTesoro.especial = tramo.tesoro;

  // Animales nativos: pocos, bien separados y sin repetir especie (encontrar uno es un hito).
  // Se corren si caen justo donde hay una roca o un perro.
  const tramoUtil = hasta - LEVEL.primerAnimal;
  const n = Math.max(1, Math.min(tramo.animales.length, 1 + Math.floor(tramoUtil / LEVEL.entreAnimales)));
  const paso = n > 1 ? tramoUtil / (n - 1) : 0;
  const ocupado = (x) =>
    items.some(
      (it) =>
        ((it.tipo === "roca" || it.tipo === "perro") && Math.abs(it.x - x) < 170) ||
        (it.tipo === "pozo" && Math.abs(it.x - x) < it.w / 2 + 140)
    );
  for (let i = 0; i < n; i++) {
    let x = LEVEL.primerAnimal + i * paso - (i === n - 1 && n > 1 ? 200 : 0);
    for (let intento = 0; intento < 8 && ocupado(x); intento++) x += 120;
    items.push({ tipo: "animal", id: tramo.animales[i], x, rango: LEVEL.animalRango });
  }

  items.push({ tipo: "cartel", x: largo - 260 });
  return { largo, items: items.sort((a, b) => a.x - b.x) };
}
