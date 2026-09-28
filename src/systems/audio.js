// Sonido del juego, sintetizado con Web Audio (sin archivos): efectos estilo 8 bits y música
// provisoria por región. Si más adelante hay temas en MP3, `musica()` es el único lugar a cambiar.
//
// Los navegadores no dejan sonar nada hasta que el usuario toca la pantalla o una tecla:
// el audio se "desbloquea" solo en el primer toque.

const KEY = "explorador-del-mundo:audio";
const VOL = { musica: 0.11, efectos: 0.22 };

let ctx = null;
let master = { musica: null, efectos: null };
let prefs = leerPrefs();
let pedida = null; // estilo de música pedido antes del desbloqueo
let actual = null; // { estilo, timer, gain }

function leerPrefs() {
  try {
    return { musica: true, efectos: true, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { musica: true, efectos: true };
  }
}

function guardarPrefs() {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // sin almacenamiento: dura hasta recargar
  }
}

function asegurarContexto() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  for (const k of ["musica", "efectos"]) {
    master[k] = ctx.createGain();
    master[k].gain.value = prefs[k] ? VOL[k] : 0;
    master[k].connect(ctx.destination);
  }
  return ctx;
}

// Desbloqueo con el primer toque o tecla.
function desbloquear() {
  const c = asegurarContexto();
  if (!c) return;
  c.resume();
  if (pedida && !actual) musica(pedida);
}
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", desbloquear);
  window.addEventListener("keydown", desbloquear);
}

const listo = () => ctx && ctx.state === "running";

// ---------- Notas ----------
const SEMITONOS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function frecuencia(nota) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(nota);
  if (!m) return null;
  const n = SEMITONOS[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (+m[3] + 1) * 12;
  return 440 * Math.pow(2, (n - 69) / 12);
}

// Un sonido simple: oscilador con envolvente, y opcionalmente barrido de frecuencia y vibrato.
function tono(destino, t, { f, f2, dur, onda = "square", vol = 1, ataque = 0.005, vibrato = 0 }) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = onda;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  if (vibrato) {
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 5.5;
    lg.gain.value = f * vibrato;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(destino);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function ruido(destino, t, dur, vol = 0.5, filtro = 4000) {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "highpass";
  bp.frequency.value = filtro;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(destino);
  src.start(t);
}

// ---------- Efectos ----------
const arpegio = (notas, paso, opts) => (d, t) =>
  notas.forEach((n, i) => tono(d, t + i * paso, { f: frecuencia(n), dur: paso * 1.6, ...opts }));

const EFECTOS = {
  click: (d, t) => tono(d, t, { f: 900, dur: 0.04, onda: "sine", vol: 0.5 }),
  salto: (d, t) => tono(d, t, { f: 280, f2: 620, dur: 0.14, vol: 0.45 }),
  rebote: (d, t) => {
    tono(d, t, { f: 160, f2: 560, dur: 0.26, vol: 0.5 });
    tono(d, t + 0.02, { f: 520, f2: 360, dur: 0.07, onda: "sawtooth", vol: 0.3 });
    tono(d, t + 0.11, { f: 480, f2: 330, dur: 0.07, onda: "sawtooth", vol: 0.3 });
  },
  plop: (d, t) => tono(d, t, { f: 620, f2: 140, dur: 0.2, vol: 0.5 }),
  tirar: (d, t) => tono(d, t, { f: 420, f2: 900, dur: 0.12, onda: "triangle", vol: 0.4 }),
  mochila: (d, t) => tono(d, t, { f: 260, f2: 90, dur: 0.16, vol: 0.45 }),
  golpe: (d, t) => {
    tono(d, t, { f: 320, f2: 80, dur: 0.32, onda: "sawtooth", vol: 0.45 });
    ruido(d, t, 0.12, 0.35, 1500);
  },
  estrella: (d, t) => {
    tono(d, t, { f: 1320, dur: 0.07, onda: "sine", vol: 0.45 });
    tono(d, t + 0.06, { f: 1760, dur: 0.12, onda: "sine", vol: 0.45 });
  },
  especial: arpegio(["C6", "E6", "G6", "C7"], 0.06, { onda: "triangle", vol: 0.55 }),
  tesoro: (d, t) => {
    arpegio(["G5", "C6", "E6"], 0.09, { vol: 0.35 })(d, t);
    tono(d, t + 0.3, { f: frecuencia("G6"), dur: 0.5, vol: 0.35, vibrato: 0.01 });
    arpegio(["C4", "G4", "C5"], 0.09, { onda: "triangle", vol: 0.5 })(d, t);
  },
  vida: (d, t) =>
    ["C5", "E5", "G5"].forEach((n) => tono(d, t, { f: frecuencia(n), dur: 0.4, onda: "triangle", vol: 0.35 })),
  descubrir: arpegio(["E5", "G5", "B5", "E6"], 0.1, { onda: "triangle", vol: 0.5 }),
  correcto: arpegio(["E5", "A5"], 0.1, { vol: 0.35 }),
  error: (d, t) => {
    tono(d, t, { f: 240, dur: 0.12, onda: "triangle", vol: 0.5 });
    tono(d, t + 0.15, { f: 200, dur: 0.18, onda: "triangle", vol: 0.5 });
  },
  sticker: (d, t) => {
    arpegio(["C5", "E5", "G5", "C6", "E6"], 0.08, { vol: 0.3 })(d, t);
    tono(d, t + 0.42, { f: frecuencia("G6"), dur: 0.6, vol: 0.3, vibrato: 0.012 });
  },
  llegada: arpegio(["C5", "E5", "G5", "E5", "G5", "C6"], 0.11, { onda: "triangle", vol: 0.5 }),
  perder: arpegio(["G4", "F4", "E4", "D4"], 0.16, { onda: "triangle", vol: 0.5 }),
};

export function efecto(nombre) {
  if (!prefs.efectos || !listo() || !EFECTOS[nombre]) return;
  EFECTOS[nombre](master.efectos, ctx.currentTime + 0.01);
}

// ---------- Música ----------
// Cada estilo: duración de cada paso (en segundos) y voces escritas como pasos separados por espacios.
// "." = silencio, "-" = sigue la nota anterior, "|" separa compases (solo para leer mejor).
// bateria: "k" bombo, "h" platillo, "s" redoblante suave.
const ESTILOS = {
  tema: {
    paso: 0.25,
    voces: [
      {
        onda: "square",
        vol: 0.5,
        notas: "C5 . E5 G5 C6 - B5 G5 | A5 . F5 A5 G5 - E5 . | F5 . A5 C6 B5 - G5 B5 | C6 - - . G5 . C5 .",
      },
      {
        onda: "triangle",
        vol: 0.9,
        notas: "C3 . G3 . C3 . G3 . | F3 . C4 . F3 . C4 . | G3 . D4 . G3 . D4 . | C3 . G3 . C3 . . .",
      },
    ],
    bateria: "k h h h k h h h | k h h h k h h h | k h h h k h h h | k h s h k h s h",
  },
  // Patagonia: tranquilo, con aire de viento.
  patagonia: {
    paso: 0.34,
    voces: [
      {
        onda: "triangle",
        vol: 0.8,
        vibrato: 0.006,
        notas: "A4 - - C5 E5 - - D5 | C5 - B4 - A4 - - . | F4 - - A4 C5 - - B4 | A4 - - - E4 - - .",
      },
      { onda: "sine", vol: 0.8, notas: "A2 - - - - - - - | F2 - - - - - - - | D2 - - - - - - - | E2 - - - - - - -" },
    ],
  },
  // Pampa: ritmo de milonga campera.
  pampa: {
    paso: 0.28,
    voces: [
      {
        onda: "square",
        vol: 0.42,
        notas: "F5 E5 D5 . A4 . D5 E5 | F5 . E5 D5 C#5 . A4 . | D5 E5 F5 G5 A5 . F5 . | E5 . C#5 . D5 - - .",
      },
      {
        onda: "triangle",
        vol: 0.9,
        notas: "D3 . . D3 A3 . D3 . | A2 . . A2 E3 . A2 . | D3 . . D3 A3 . D3 . | A2 . . A2 D3 . . .",
      },
    ],
    bateria: "k . . k s . k . | k . . k s . k . | k . . k s . k . | k . . k s . . .",
  },
  // Ciudades grandes: aire de tango, marcado.
  ciudad: {
    paso: 0.26,
    voces: [
      {
        onda: "sawtooth",
        vol: 0.28,
        notas: "E5 . . F5 E5 D#5 E5 . | B4 . . C5 B4 A#4 B4 . | F5 . E5 . D5 . C5 . | B4 . G#4 . A4 - - .",
      },
      {
        onda: "triangle",
        vol: 0.9,
        notas: "A2 . A2 . A2 . A2 . | E2 . E2 . E2 . E2 . | D2 . D2 . D2 . D2 . | E2 . E2 . A2 . . .",
      },
    ],
    bateria: "k . s . k . s . | k . s . k . s . | k . s . k . s . | k . s . k . . .",
  },
  // Litoral: chamamé, en 6/8, con "acordeón".
  litoral: {
    paso: 0.19,
    voces: [
      {
        onda: "square",
        vol: 0.38,
        vibrato: 0.008,
        notas:
          "B4 C5 D5 G5 . D5 | E5 . C5 A4 . C5 | D5 . B4 G4 . B4 | A4 . F#4 D4 - - | B4 C5 D5 G5 . B5 | A5 . F#5 D5 . F#5 | G5 . D5 B4 . D5 | G5 - - . . .",
      },
      {
        onda: "triangle",
        vol: 0.9,
        notas:
          "G2 . . D3 . . | C3 . . G2 . . | G2 . . D3 . . | D3 . . A2 . . | G2 . . D3 . . | D3 . . A2 . . | G2 . . D3 . . | G2 . . . . .",
      },
    ],
    bateria:
      "k . h s . h | k . h s . h | k . h s . h | k . h s . h | k . h s . h | k . h s . h | k . h s . h | k . . . . .",
  },
  // Selva misionera: movido, tipo marimba.
  selva: {
    paso: 0.2,
    voces: [
      {
        onda: "sine",
        vol: 0.8,
        notas: "E5 G5 B5 G5 A5 G5 E5 D5 | E5 . B4 . D5 E5 . . | C5 E5 G5 E5 F#5 E5 D5 B4 | E5 . . B4 E5 . . .",
      },
      {
        onda: "triangle",
        vol: 0.9,
        notas: "E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . | C3 . C3 . D3 . D3 . | E2 . E3 . E2 . . .",
      },
    ],
    bateria: "k h s h k h s h | k h s h k h s h | k h s h k h s h | k h s h k . s .",
  },
  // Preguntas: suave, para pensar.
  pensar: {
    paso: 0.4,
    voces: [
      {
        onda: "sine",
        vol: 0.7,
        notas: "A4 - C5 - F5 - E5 - | D5 - C5 - A4 - - - | Bb4 - D5 - F5 - E5 - | C5 - - - - - - -",
      },
      {
        onda: "triangle",
        vol: 0.7,
        notas: "F2 - - - - - - - | D2 - - - - - - - | Bb2 - - - - - - - | C3 - - - - - - -",
      },
    ],
  },
};

// Qué estilo va en cada paisaje de tramo y en cada ciudad.
export const MUSICA_TRAMO = {
  "bosque-fueguino": "patagonia",
  estepa: "patagonia",
  costa: "patagonia",
  pampa: "pampa",
  rio: "litoral",
  humedal: "litoral",
  selva: "selva",
  cataratas: "selva",
};
export const MUSICA_CIUDAD = {
  ushuaia: "patagonia",
  calafate: "patagonia",
  madryn: "patagonia",
  buenosaires: "ciudad",
  rosario: "ciudad",
  santafe: "litoral",
  reconquista: "litoral",
  corrientes: "litoral",
  posadas: "selva",
  iguazu: "selva",
};

const pasos = (s) => s.replace(/\|/g, " ").trim().split(/\s+/);

function compilar(estilo) {
  const voces = estilo.voces.map((v) => {
    const p = pasos(v.notas);
    return p.map((n, i) => {
      if (n === "." || n === "-") return null;
      let largo = 1;
      while (p[i + largo] === "-") largo++;
      return { f: frecuencia(n), largo };
    });
  });
  const bateria = estilo.bateria ? pasos(estilo.bateria) : null;
  const total = Math.max(...voces.map((v) => v.length), bateria?.length ?? 0);
  return { voces, bateria, total };
}

// Cambia la música (con un fundido corto). null = silencio. Si ya suena ese estilo, sigue igual.
export function musica(nombre) {
  pedida = nombre;
  if (actual?.estilo === nombre) return;
  if (actual) {
    const viejo = actual;
    clearInterval(viejo.timer);
    if (ctx) viejo.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    setTimeout(() => viejo.gain.disconnect(), 600);
    actual = null;
  }
  if (!nombre || !ESTILOS[nombre] || !listo()) return;

  const estilo = ESTILOS[nombre];
  const { voces, bateria, total } = compilar(estilo);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.8);
  gain.connect(master.musica);

  let paso = 0;
  let proximo = ctx.currentTime + 0.05;
  const programar = () => {
    // Se programa un poco por adelantado para que no haya cortes aunque el juego vaya lento.
    while (proximo < ctx.currentTime + 0.25) {
      voces.forEach((v, k) => {
        const n = v[paso % v.length];
        const def = estilo.voces[k];
        if (n)
          tono(gain, proximo, {
            f: n.f,
            dur: n.largo * estilo.paso * 0.95,
            onda: def.onda,
            vol: def.vol * 0.5,
            vibrato: def.vibrato ?? 0,
            ataque: 0.01,
          });
      });
      const b = bateria?.[paso % bateria.length];
      if (b === "k") tono(gain, proximo, { f: 120, f2: 45, dur: 0.14, onda: "sine", vol: 0.8 });
      if (b === "h") ruido(gain, proximo, 0.03, 0.12, 7000);
      if (b === "s") ruido(gain, proximo, 0.08, 0.2, 2000);
      paso = (paso + 1) % total;
      proximo += estilo.paso;
    }
  };
  programar();
  actual = { estilo: nombre, gain, timer: setInterval(programar, 60) };
}

// ---------- Preferencias ----------
export const audioPrefs = () => ({ ...prefs });

export function alternar(tipo) {
  prefs[tipo] = !prefs[tipo];
  guardarPrefs();
  if (master[tipo]) master[tipo].gain.value = prefs[tipo] ? VOL[tipo] : 0;
  return prefs[tipo];
}

// Para depurar: estado del audio y estilo que está sonando.
export const estadoAudio = () => ({ contexto: ctx?.state ?? "sin crear", estilo: actual?.estilo ?? null, pedida });
if (import.meta.env?.DEV && typeof window !== "undefined") window.__audio = { estadoAudio, efecto };

// ---------- Clima ----------
// Ruido filtrado que sube, se queda y baja: "lluvia" (agudo y parejo), "viento" (grave, con ráfagas) o
// "rocio" (el rumor de las cataratas, grave y constante).
const CLIMA_SONIDO = {
  lluvia: { tipo: "bandpass", f: 2600, q: 0.6, vol: 0.5 },
  viento: { tipo: "lowpass", f: 520, q: 1.2, vol: 0.7, barrido: [280, 900] },
  rocio: { tipo: "lowpass", f: 380, q: 0.5, vol: 0.6 },
};

export function sonidoClima(nombre, dur) {
  const c = CLIMA_SONIDO[nombre];
  if (!c || !prefs.efectos || !listo()) return;
  const t = ctx.currentTime + 0.02;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filtro = ctx.createBiquadFilter();
  filtro.type = c.tipo;
  filtro.frequency.value = c.f;
  filtro.Q.value = c.q;
  if (c.barrido)
    for (let s = 0; s < dur; s += 1.3)
      filtro.frequency.linearRampToValueAtTime(c.barrido[Math.round(s / 1.3) % 2], t + s + 1.3);
  const g = ctx.createGain();
  const sube = Math.min(1.2, dur / 3);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(c.vol, t + sube);
  g.gain.setValueAtTime(c.vol, t + dur - sube);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  src.connect(filtro).connect(g).connect(master.efectos);
  src.start(t);
  src.stop(t + dur + 0.1);
}
