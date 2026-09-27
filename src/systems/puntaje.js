// Puntaje general de Vicente (como en los juegos de Mario): suma todo lo que juntó en los viajes.
// Se calcula a partir de lo guardado (colección, animales vistos y preguntas), así nunca se desfasa.
import { COLECCIONABLES } from "../data/animales.js";
import { animalesVistos, getPerfil } from "./progress.js";

// Puntos por cada cosa: los coleccionables según su rareza.
export const PUNTOS = {
  común: 10, // estrella
  especial: 100,
  rara: 250,
  tesoro: 1000,
  animal: 200, // cada animal descubierto (una sola vez)
  pajaro: 100, // cada pájaro o abeja volteado (pisándolo, con la mochila o tirándole algo)
  acierto: 50, // cada pregunta acertada (el mejor resultado de cada ciudad)
};

export const puntosDe = (tipo) => PUNTOS[COLECCIONABLES.info[tipo]?.rareza] ?? PUNTOS.común;

// Puntos de una colección { estrella: 12, mate: 1, ... }.
export const puntosColeccion = (coleccion = {}) =>
  Object.entries(coleccion).reduce((s, [tipo, n]) => s + n * puntosDe(tipo), 0);

export function puntajeTotal() {
  const perfil = getPerfil();
  const aciertos = Object.values(perfil.preguntas ?? {})
    .flatMap((pais) => Object.values(pais))
    .reduce((s, c) => s + c.aciertos, 0);
  return (
    puntosColeccion(perfil.coleccion) +
    animalesVistos().length * PUNTOS.animal +
    aciertos * PUNTOS.acierto +
    (perfil.pajaros ?? 0) * PUNTOS.pajaro
  );
}

// "001230": seis cifras, como en los juegos de antes.
export const formatoPuntos = (n) => String(Math.max(0, Math.round(n))).padStart(6, "0");
