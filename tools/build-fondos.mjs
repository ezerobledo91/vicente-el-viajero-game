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

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const manifest = { tramos: {}, ciudades: {} };

  for (const [id, t] of Object.entries(config.tramos)) {
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
      manifest.ciudades[id] = { tipo: "postal", ancho: CIUDAD.w, alto: CIUDAD.h, cielo: colorCielo(img) };
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
