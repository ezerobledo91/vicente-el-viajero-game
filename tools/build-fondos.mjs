// Prepara los fondos del viaje a partir de las ilustraciones (tools/fondos.config.json).
//
// Uso: npm run fondos
//
// Tramos (panoramas): se cortan en dos capas que el juego mueve a distinta velocidad:
//   <id>-fondo.webp  todo lo que está arriba del camino (paisaje lejano)
//   <id>-suelo.webp  la franja del camino, que se mueve junto con Vicente
// Las ilustraciones no fueron pensadas para repetirse, así que cada tira se arma con la imagen
// y su reflejo: al repetirse, los bordes coinciden.
//
// Ciudades:
//   panorama → una ventana de 1280 px del panorama (con el piso a la altura del juego)
//   postal   → la ilustración agrandada para cubrir 1280×720 (con `foco` vertical)
//
// Salida: public/assets/fondos/*.webp + fondos.json (qué hay y dónde pisa cada fondo).

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const config = JSON.parse(await fs.readFile(path.join(ROOT, "tools/fondos.config.json"), "utf8"));
const OUT = path.join(ROOT, config.output);

const CIUDAD = { w: 1280, h: 720 };
const WEBP = { quality: 88, effort: 5 };

const hex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

async function raw(file) {
  const { data, info } = await sharp(path.join(ROOT, file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

// Recorta filas [y0, y1) y arma una tira repetible: la imagen seguida de su reflejo horizontal.
// Así el borde derecho del reflejo coincide exacto con el izquierdo del original (sin cortes ni fantasmas).
async function franjaRepetible(img, y0, y1) {
  const alto = y1 - y0;
  const crop = await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 3 } })
    .extract({ left: 0, top: y0, width: img.w, height: alto })
    .png()
    .toBuffer();
  const espejo = await sharp(crop).flop().png().toBuffer();
  return sharp({ create: { width: img.w * 2, height: alto, channels: 3, background: "#000" } }).composite([
    { input: crop, left: 0, top: 0 },
    { input: espejo, left: img.w, top: 0 },
  ]);
}

function colorCielo(img) {
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < img.w; x += 7) {
      const i = (y * img.w + x) * 3;
      ((r += img.data[i]), (g += img.data[i + 1]), (b += img.data[i + 2]), n++);
    }
  return hex(r / n, g / n, b / n);
}

// Lámina de piezas con fondo transparente: se detectan los dibujos por filas y se nombran.
const NOMBRES_PIEZAS = [
  ["borde-izq", "centro", "borde-der"],
  ["agua-0", "agua-1", "agua-2", "agua-3", "orilla-izq", "orilla-der"],
  ["tronco"],
];
async function cortarPiezas(id, file) {
  const { data, info } = await sharp(path.join(ROOT, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width,
    H = info.height;
  const seen = new Uint8Array(W * H),
    cajas = [];
  for (let s0 = 0; s0 < W * H; s0++) {
    if (seen[s0] || data[s0 * 4 + 3] <= 40) continue;
    let x0 = W,
      y0 = H,
      x1 = -1,
      y1 = -1,
      n = 0;
    const pila = [s0];
    seen[s0] = 1;
    while (pila.length) {
      const q = pila.pop(),
        x = q % W,
        y = (q / W) | 0;
      n++;
      ((x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y)));
      for (const r of [x > 0 ? q - 1 : -1, x < W - 1 ? q + 1 : -1, y > 0 ? q - W : -1, y < H - 1 ? q + W : -1])
        if (r >= 0 && !seen[r] && data[r * 4 + 3] > 40) ((seen[r] = 1), pila.push(r));
    }
    if (n > 2000) cajas.push({ x0, y0, x1, y1 });
  }
  const filas = [];
  for (const c of cajas.sort((a, b) => a.y0 - b.y0)) {
    const fila = filas.find((f) => Math.abs(f[0].y0 - c.y0) < 60);
    fila ? fila.push(c) : filas.push([c]);
  }
  const salida = path.join(OUT, "piezas", id);
  await fs.mkdir(salida, { recursive: true });
  const piezas = {};
  for (const [k, fila] of filas.entries()) {
    fila.sort((a, b) => a.x0 - b.x0);
    for (const [j, c] of fila.entries()) {
      const nombre = NOMBRES_PIEZAS[k]?.[j];
      if (!nombre) continue;
      const w = c.x1 - c.x0 + 1,
        h = c.y1 - c.y0 + 1;
      await sharp(path.join(ROOT, file))
        .extract({ left: c.x0, top: c.y0, width: w, height: h })
        .png()
        .toFile(path.join(salida, nombre + ".png"));
      piezas[nombre] = { w, h };
    }
  }
  return piezas;
}

// Lámina de piezas sueltas en una fila (piedras, plataformas, troncos): cada dibujo es <tipo>-N,
// de izquierda a derecha. `sup`: primera fila (desde arriba) que ya es "sólida", o sea donde se pisa.
async function cortarSueltas(id, tipo, file) {
  const { data, info } = await sharp(path.join(ROOT, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width,
    H = info.height;
  const col = Array.from({ length: W }, (_, x) => {
    for (let y = 0; y < H; y++) if (data[(y * W + x) * 4 + 3] > 40) return true;
    return false;
  });
  const tramos = [];
  for (let x = 0; x < W; x++) {
    if (!col[x]) continue;
    const u = tramos.at(-1);
    if (u && x - u.x1 <= 6) u.x1 = x;
    else tramos.push({ x0: x, x1: x });
  }
  const salida = path.join(OUT, "piezas", id);
  await fs.mkdir(salida, { recursive: true });
  const piezas = {};
  for (const [k, t] of tramos.filter((t) => t.x1 - t.x0 > 30).entries()) {
    const w = t.x1 - t.x0 + 1;
    let y0 = H,
      y1 = -1;
    for (let y = 0; y < H; y++)
      for (let x = t.x0; x <= t.x1; x++)
        if (data[(y * W + x) * 4 + 3] > 40) ((y0 = Math.min(y0, y)), (y1 = Math.max(y1, y)));
    let sup = 0;
    for (let y = y0; y <= y1; y++) {
      let n = 0;
      for (let x = t.x0; x <= t.x1; x++) if (data[(y * W + x) * 4 + 3] > 40) n++;
      if (n >= w * 0.6) {
        sup = y - y0;
        break;
      }
    }
    const nombre = `${tipo}-${k}`;
    await sharp(path.join(ROOT, file))
      .extract({ left: t.x0, top: y0, width: w, height: y1 - y0 + 1 })
      .png()
      .toFile(path.join(salida, nombre + ".png"));
    piezas[nombre] = { w, h: y1 - y0 + 1, sup };
  }
  return piezas;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const manifest = { tramos: {}, ciudades: {} };

  for (const [id, t] of Object.entries(config.tramos)) {
    if (t.fondo) {
      // Ya vienen cortados y repetibles: se copian tal cual.
      await sharp(path.join(ROOT, t.fondo))
        .webp(WEBP)
        .toFile(path.join(OUT, `${id}-fondo.webp`));
      await sharp(path.join(ROOT, t.suelo))
        .webp(WEBP)
        .toFile(path.join(OUT, `${id}-suelo.webp`));
      const mf = await sharp(path.join(ROOT, t.fondo)).metadata();
      const ms = await sharp(path.join(ROOT, t.suelo)).metadata();
      const fondoRaw = await raw(t.fondo);
      manifest.tramos[id] = {
        piso: t.piso,
        corte: t.corte,
        alto: mf.height + ms.height,
        ancho: mf.width,
        cielo: colorCielo(fondoRaw),
      };
      if (t.piezas) manifest.tramos[id].piezas = await cortarPiezas(id, t.piezas);
      for (const [tipo, file] of Object.entries(t.sueltas ?? {}))
        Object.assign((manifest.tramos[id].piezas ??= {}), await cortarSueltas(id, tipo, file));
      console.log(`✔ tramo ${id} (precortado${t.piezas ? " + piezas" : ""})`);
      continue;
    }
    const img = await raw(t.src);
    await (await franjaRepetible(img, 0, t.corte)).webp(WEBP).toFile(path.join(OUT, `${id}-fondo.webp`));
    await (await franjaRepetible(img, t.corte, img.h)).webp(WEBP).toFile(path.join(OUT, `${id}-suelo.webp`));
    manifest.tramos[id] = { piso: t.piso, corte: t.corte, alto: img.h, ancho: img.w * 2, cielo: colorCielo(img) };
    console.log(`✔ tramo ${id}`);
  }

  for (const [id, c] of Object.entries(config.ciudades)) {
    const file = path.join(OUT, `ciudad-${id}.webp`);
    const img = await raw(c.src);
    if (c.tipo === "panorama") {
      const x = Math.min(c.x ?? 0, img.w - CIUDAD.w);
      await sharp(path.join(ROOT, c.src))
        .extract({ left: x, top: 0, width: CIUDAD.w, height: img.h })
        .webp(WEBP)
        .toFile(file);
      manifest.ciudades[id] = { tipo: "panorama", piso: c.piso, ancho: CIUDAD.w, alto: img.h, cielo: colorCielo(img) };
    } else {
      // Postal: la ilustración agrandada hasta cubrir toda la pantalla (recorta un poco arriba y abajo).
      // `foco` (0 arriba … 1 abajo) elige qué parte se conserva.
      const top = Math.round(((img.h * CIUDAD.w) / img.w - CIUDAD.h) * (c.foco ?? 0.5));
      await sharp(path.join(ROOT, c.src))
        .resize({ width: CIUDAD.w })
        .extract({ left: 0, top, width: CIUDAD.w, height: CIUDAD.h })
        .webp(WEBP)
        .toFile(file);
      // pie: y de pantalla donde pisan los personajes; parada: x donde se frena Vicente (opcionales).
      manifest.ciudades[id] = {
        tipo: "postal",
        ancho: CIUDAD.w,
        alto: CIUDAD.h,
        cielo: colorCielo(img),
        pie: c.pie,
        parada: c.parada,
      };
    }
    console.log(`✔ ciudad ${id} (${c.tipo})`);
  }

  await fs.writeFile(path.join(OUT, "fondos.json"), JSON.stringify(manifest, null, 2));
  const files = await fs.readdir(OUT);
  let total = 0;
  for (const f of files) total += (await fs.stat(path.join(OUT, f))).size;
  console.log(`Listo → ${path.relative(ROOT, OUT)} (${files.length} archivos, ${(total / 1e6).toFixed(1)} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
