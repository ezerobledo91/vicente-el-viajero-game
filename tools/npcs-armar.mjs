// Arma una tira por personaje regional con sus animaciones de Codex (mejoras/npcs/animaciones/<nombre>/):
// caminar (4×2 celdas de 512), entregar (4) y movimiento-extra (4) → personajes/npcs/<id>.png, 16 cuadros
// en fila. Si una lámina trae el cuadriculado de "transparente" pintado, se lo saca (relleno desde afuera
// por los píxeles grises claros, sin pasar la línea oscura del dibujo).
// Uso: node tools/npcs-armar.mjs && npm run npcs
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DESDE = path.join(ROOT, "mejoras/npcs/animaciones");
const HACIA = path.join(ROOT, "personajes/npcs");
const CELDA = 512;

// Carpeta de Codex → id del personaje en el juego.
export const CARPETAS = {
  "guardaparque-patagonia": "guardaparques",
  "gaucho-patagonia": "trabajador-patagonico",
  "guia-patagonia": "guia-costera",
  "trabajadora-centro": "kiosquera",
  "medico-rural": "veterinario",
  "viajera-mate": "visitante-rio",
  "poblador-litoral": "pescador",
  "recolectora-misiones": "yerbatera",
  "guardaparque-misiones": "guia-iguazu",
};

async function celdas(file, columnas, filas) {
  let { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  data = sacarCuadriculado(data, info.width, info.height);
  const img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  const buf = await img.png().toBuffer();
  const out = [];
  for (let f = 0; f < filas; f++)
    for (let c = 0; c < columnas; c++)
      out.push(
        await sharp(buf)
          .extract({ left: c * CELDA, top: f * CELDA, width: CELDA, height: CELDA })
          .png()
          .toBuffer()
      );
  return out;
}

function sacarCuadriculado(d, W, H) {
  const gris = (i) => {
    const r = d[i],
      g = d[i + 1],
      b = d[i + 2];
    return Math.max(r, g, b) - Math.min(r, g, b) < 14 && r > 110; // (a veces semitransparente)
  };
  const visto = new Uint8Array(W * H);
  const pila = [];
  for (let x = 0; x < W; x++) pila.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) pila.push(y * W, y * W + W - 1);
  // También arranca desde cualquier píxel transparente (el cuadriculado puede estar en el medio).
  for (let p = 0; p < W * H; p++) if (d[p * 4 + 3] < 20) pila.push(p);
  while (pila.length) {
    const p = pila.pop();
    if (visto[p]) continue;
    visto[p] = 1;
    const i = p * 4;
    if (d[i + 3] >= 20 && !gris(i)) continue;
    d[i + 3] = 0;
    const x = p % W;
    if (x > 0) pila.push(p - 1);
    if (x < W - 1) pila.push(p + 1);
    if (p >= W) pila.push(p - W);
    if (p < W * (H - 1)) pila.push(p + W);
  }
  return d;
}

for (const [carpeta, id] of Object.entries(CARPETAS)) {
  const D = path.join(DESDE, carpeta);
  const todos = [
    ...(await celdas(path.join(D, "caminar.png"), 4, 2)),
    ...(await celdas(path.join(D, "entregar.png"), 4, 1)),
    ...(await celdas(path.join(D, "movimiento-extra.png"), 4, 1)),
  ];
  await fs.mkdir(HACIA, { recursive: true });
  await sharp({
    create: { width: CELDA * todos.length, height: CELDA, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(todos.map((input, k) => ({ input, left: k * CELDA, top: 0 })))
    .png()
    .toFile(path.join(HACIA, `${id}.png`));
  console.log(`✔ ${id} (${todos.length} cuadros)`);
}
