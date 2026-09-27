// Ajustes hechos a mano con el editor de tramos (?editor), guardados en public/assets/ajustes.json:
//   escalas:  { "<textura>": 1.1 }            tamaño de un tipo de adorno (en todos los tramos)
//   paisajes: { "<paisaje>": { fondoDy, sueloDy, aguaDy, orillaDx, orillaDy } }   px
//   objetos:  { "<tramo>": { "<id>": { dx, dy, oculto } } }   adornos movidos u ocultos en un tramo
import { ASSETS } from "../config/constants.js";

export function getAjustes(scene) {
  let a = scene.cache.json.get(ASSETS.AJUSTES);
  if (!a || typeof a !== "object") {
    a = {};
    scene.cache.json.add(ASSETS.AJUSTES, a);
  }
  a.escalas ??= {};
  a.paisajes ??= {};
  a.objetos ??= {};
  return a;
}

export const ajustePaisaje = (scene, id) => getAjustes(scene).paisajes[id] ?? {};
export const escalaDe = (scene, key) => getAjustes(scene).escalas[key] ?? 1;
export const ajusteObjeto = (scene, tramo, id) => getAjustes(scene).objetos[tramo]?.[id] ?? {};

// Editor activo: ?editor en la dirección (?editor=3 abre ese tramo).
export function editorActivo() {
  try {
    return new URLSearchParams(location.search).has("editor");
  } catch {
    return false;
  }
}
export const tramoDelEditor = () => Number(new URLSearchParams(location.search).get("editor")) || 0;

export async function guardarAjustes(scene) {
  try {
    const r = await fetch("/__ajustes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getAjustes(scene)),
    });
    return r.ok;
  } catch {
    return false;
  }
}
