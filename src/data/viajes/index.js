import { VIAJE_ARGENTINA } from "./argentina.js";

// Viajes disponibles por país (código ISO). Sumar un país = agregar su archivo acá.
export const VIAJES = {
  ar: VIAJE_ARGENTINA,
};

export const getViaje = (paisId) => VIAJES[paisId] ?? null;
