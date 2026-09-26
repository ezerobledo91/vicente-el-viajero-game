// Progreso del jugador, guardado en el navegador (localStorage).
// Si el navegador no deja guardar (modo privado, etc.), el juego sigue funcionando en memoria.

const KEY = "explorador-del-mundo:progreso:v1";

const nuevoViaje = () => ({
  ciudad: 0, // índice de la ciudad donde está Vicente
  preguntasOk: false, // si ya respondió las preguntas de esa ciudad
  terminado: false,
  figuritas: 0,
  companeros: [], // por ejemplo ["anita"] después de Reconquista
  animalesVistos: [],
});

let memoria = null;

function leer() {
  if (memoria) return memoria;
  try {
    memoria = JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    memoria = {};
  }
  memoria.viajes ??= {};
  return memoria;
}

function guardar() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memoria));
  } catch {
    // Sin almacenamiento disponible: queda solo en memoria.
  }
}

export function getProgresoViaje(paisId) {
  const data = leer();
  data.viajes[paisId] = { ...nuevoViaje(), ...data.viajes[paisId] };
  return data.viajes[paisId];
}

export function actualizarViaje(paisId, cambios) {
  const viaje = getProgresoViaje(paisId);
  Object.assign(viaje, typeof cambios === "function" ? cambios(viaje) : cambios);
  guardar();
  return viaje;
}

export function reiniciarViaje(paisId) {
  leer().viajes[paisId] = nuevoViaje();
  guardar();
  return leer().viajes[paisId];
}

export const viajeEmpezado = (paisId) => {
  const v = leer().viajes[paisId];
  return !!v && (v.ciudad > 0 || v.preguntasOk);
};

// ---------- Perfil de Vicente (se acumula entre viajes) ----------
// coleccion: cantidad juntada de cada coleccionable (estrella, sol, mate...).
export function getPerfil() {
  const data = leer();
  data.perfil ??= {};
  data.perfil.coleccion ??= {};
  return data.perfil;
}

export function sumarColeccion(cantidades) {
  const perfil = getPerfil();
  for (const [id, n] of Object.entries(cantidades)) perfil.coleccion[id] = (perfil.coleccion[id] ?? 0) + n;
  guardar();
  return perfil;
}

// Animales vistos en todos los viajes (sin repetir).
export function animalesVistos() {
  return [...new Set(Object.values(leer().viajes).flatMap((v) => v.animalesVistos ?? []))];
}

// Stickers del álbum: { id: true }. Devuelve true si es nuevo.
export function ganarSticker(id) {
  const perfil = getPerfil();
  perfil.stickers ??= {};
  if (perfil.stickers[id]) return false;
  perfil.stickers[id] = true;
  guardar();
  return true;
}

export const tieneSticker = (id) => !!getPerfil().stickers?.[id];
