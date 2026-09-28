// Recorta las láminas de clima de Codex (mejoras/clima/<paisaje>.png, 6 efectos en fila) en
// public/assets/clima/<paisaje>-<efecto>.png y escribe clima.json con el tamaño de cada uno.
// La lluvia, el polvo o la nieve son muchos pedacitos sueltos: se separan por las columnas más vacías
// entre efecto y efecto.
// Uso: npm run clima
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DESDE = path.join(ROOT, "mejoras/clima");
const HACIA = path.join(ROOT, "public/assets/clima");

// Qué es cada uno de los 6 efectos de cada lámina, de izquierda a derecha.
const NOMBRES = {
  "bosque-fueguino": ["hojas", "hojas-2", "niebla", "llovizna", "nieve", "remolino"],
  estepa: ["rafaga", "rafaga-2", "polvo", "mata-rodadora", "piedritas", "rafaga-3"],
  costa: ["espuma", "espuma-2", "viento", "salpicadura", "lluvia", "rocio"],
  pampa: ["polen", "polen-2", "lluvia", "barro", "niebla", "hojas"],
  rio: ["brisa", "brisa-2", "lluvia", "ondas", "niebla", "gotas"],
  humedal: ["neblina", "neblina-2", "lluvia", "ondas", "luces", "semillas"],
  selva: ["rayos", "rayos-2", "lluvia", "gotas", "humedad", "hojas"],
  cataratas: ["rocio", "rocio-2", "vapor", "gotas", "arcoiris", "espuma"],
};

// Corta en n partes: cada división va en la columna más vacía cerca de donde caería si fueran iguales.
async function cortes(data, W, H, n) {
  const cuenta = [];
  for (let x = 0; x < W; x++) {
    let c = 0;
    for (let y = 0; y < H; y++) if (data[(y * W + x) * 4 + 3] > 24) c++;
    cuenta.push(c);
  }
  const bordes = [0];
  for (let k = 1; k < n; k++) {
    const medio = Math.round((k * W) / n),
      rango = Math.round(W / n / 2.5);
    let mejor = medio;
    for (let x = medio - rango; x <= medio + rango; x++)
      if (cuenta[x] < cuenta[mejor] || (cuenta[x] === cuenta[mejor] && Math.abs(x - medio) < Math.abs(mejor - medio)))
        mejor = x;
    bordes.push(mejor);
  }
  bordes.push(W);
  return bordes.slice(0, -1).map((a, k) => [a, bordes[k + 1] - 1]);
}

const manifest = {};
await fs.mkdir(HACIA, { recursive: true });
for (const [paisaje, nombres] of Object.entries(NOMBRES)) {
  const file = path.join(DESDE, `${paisaje}.png`);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cols = await cortes(data, info.width, info.height, nombres.length);
  for (const [k, [x0, x1]] of cols.entries()) {
    const key = `${paisaje}-${nombres[k]}`;
    // (en dos pasos: sharp hace el trim antes que el extract si van juntos)
    const columna = await sharp(file)
      .extract({ left: x0, top: 0, width: x1 - x0 + 1, height: info.height })
      .png()
      .toBuffer();
    const recorte = await sharp(columna).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
    await sharp(recorte.data).toFile(path.join(HACIA, `${key}.png`));
    manifest[key] = { w: recorte.info.width, h: recorte.info.height };
  }
  console.log(`✔ ${paisaje}: ${cols.length} efectos`);
}
await fs.writeFile(path.join(HACIA, "clima.json"), JSON.stringify(manifest, null, 2));
console.log(`Listo → public/assets/clima (${Object.keys(manifest).length} efectos)`);
