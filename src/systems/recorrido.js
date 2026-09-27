// Cambios hechos con el editor sobre el recorrido que arma el generador (ajustes.recorrido[tramo]):
//   cambios: { "<tipo>#<n>": { dx, dy, dw, oculto } }  dx/dy en px (dy positivo = más alto), dw = ancho
//   nuevos:  [{ n, tipo, x, y, w, especie, oculto }]     cosas agregadas a mano
// Se aplica antes de armar el tramo, así el piso (pozos) y la física salen bien solos.
import { LEVEL } from "./levelBuilder.js";

// Lo que se puede poner o mover: nombre para el editor, color del marco y cómo es uno nuevo.
export const TIPOS_RECORRIDO = {
  figurita: { nombre: "Estrella", color: 0xffd23d, nuevo: { y: 130 } },
  vida: { nombre: "Corazón", color: 0xff5a7a, nuevo: { y: 130 } },
  objeto: { nombre: "Objeto para tirar", color: 0xfff2a8, nuevo: { y: 55 } },
  roca: { nombre: "Piedra", color: 0xb0a090, nuevo: {} },
  plataforma: { nombre: "Plataforma", color: 0x7fd060, nuevo: { y: 140, w: 180 } },
  pozo: { nombre: "Pozo", color: 0x4aa8ff, nuevo: { w: 170 } },
  perro: { nombre: "Perro trampolín", color: 0xe0a060, nuevo: {} },
  pajaro: { nombre: "Pájaro", color: 0xff8a40, nuevo: { y: 120 } },
  animal: { nombre: "Animal", color: 0x5fd068, nuevo: {} },
};

export const idNuevo = (a) => `nuevo-${a.tipo}#${a.n}`;

export function aplicarRecorrido(items, rec, { conOcultos = false } = {}) {
  const cuenta = {};
  const salida = [];
  for (const it of items) {
    if (!TIPOS_RECORRIDO[it.tipo]) {
      salida.push(it);
      continue;
    }
    const n = (cuenta[it.tipo] = (cuenta[it.tipo] ?? -1) + 1);
    const editId = `${it.tipo}#${n}`;
    const c = rec?.cambios?.[editId] ?? {};
    if (c.oculto && !conOcultos) continue;
    const nuevo = { ...it, editId, oculto: !!c.oculto };
    if (c.dx) nuevo.x += c.dx;
    if (c.dy) nuevo.y = (nuevo.y ?? 0) + c.dy;
    if (c.dw && nuevo.w) nuevo.w = Math.max(40, nuevo.w + c.dw);
    salida.push(nuevo);
  }
  for (const a of rec?.nuevos ?? []) {
    if (a.oculto && !conOcultos) continue;
    const base = { ...TIPOS_RECORRIDO[a.tipo]?.nuevo, tipo: a.tipo, x: a.x, editId: idNuevo(a), agregado: true };
    if (a.y != null) base.y = a.y;
    if (a.w != null) base.w = a.w;
    if (a.tipo === "animal") Object.assign(base, { id: a.especie, rango: LEVEL.animalRango });
    salida.push(base);
  }
  return salida.sort((a, b) => a.x - b.x);
}
