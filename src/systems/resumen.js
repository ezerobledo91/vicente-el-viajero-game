// Lo que Vicente juntó en cada país, contado igual en todas las pantallas (mapa del viaje y perfil):
// stickers del álbum, coleccionables, animales y preguntas, más el puntaje general.
import { ANIMALES, COLECCIONABLES } from "../data/animales.js";
import { STICKERS } from "../data/stickers.js";
import { getViaje } from "../data/viajes/index.js";
import { animalesVistos, getPerfil, hitoPreguntas } from "./progress.js";
import { formatoPuntos, puntajeTotal } from "./puntaje.js";

export const PREGUNTAS_POR_CIUDAD = 5;

// Stickers del álbum del país.
export const stickersDe = (paisId) => STICKERS.filter((s) => s.pais === paisId);

// Coleccionables del país: la estrella, los especiales y los tesoros de sus tramos.
export function coleccionablesDe(viaje) {
  const unicos = [...new Set(viaje.tramos.flatMap((t) => [t.especial, t.tesoro]).filter(Boolean))];
  return [
    COLECCIONABLES.comun,
    ...unicos.filter((t) => !t.startsWith("tesoro-")),
    ...unicos.filter((t) => t.startsWith("tesoro-")),
  ];
}

// Animales que aparecen en los tramos del país (los que tienen dibujo).
export const animalesDe = (viaje) =>
  [...new Set(viaje.tramos.flatMap((t) => t.animales))].filter((id) => ANIMALES[id]?.sprite);

export function resumenPais(paisId) {
  const viaje = getViaje(paisId);
  const perfil = getPerfil();
  const vistos = new Set(animalesVistos());
  const stickers = stickersDe(paisId);
  const coleccionables = coleccionablesDe(viaje);
  const animales = animalesDe(viaje);
  return {
    puntos: puntajeTotal(),
    stickers: { tiene: stickers.filter((s) => perfil.stickers?.[s.id]).length, total: stickers.length },
    coleccionables: {
      tiene: coleccionables.filter((t) => (perfil.coleccion[t] ?? 0) > 0).length,
      total: coleccionables.length,
    },
    animales: { tiene: animales.filter((id) => vistos.has(id)).length, total: animales.length },
    preguntas: { tiene: hitoPreguntas(paisId).aciertos, total: viaje.ciudades.length * PREGUNTAS_POR_CIUDAD },
  };
}

// "Puntos: 006800 · Stickers: 3/20 · Coleccionables: 5/22 · Animales: 9/41 · Preguntas: 8/50"
export function textoResumen(paisId) {
  const r = resumenPais(paisId);
  const de = (x) => `${x.tiene}/${x.total}`;
  return [
    `Puntos: ${formatoPuntos(r.puntos)}`,
    `Stickers: ${de(r.stickers)}`,
    `Coleccionables: ${de(r.coleccionables)}`,
    `Animales: ${de(r.animales)}`,
    `Preguntas: ${de(r.preguntas)}`,
  ].join(" · ");
}
