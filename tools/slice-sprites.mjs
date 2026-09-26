// Recorta la lámina de sprites original (JPEG con cuadros beige) en sprite sheets
// PNG transparentes, uno por personaje, más un manifest.json que usa el juego.
//
// Uso: npm run sprites                     (usa tools/sprites.config.json)
//      npm run sprites -- otra.config.json  (por ejemplo, la lámina anterior: tools/sprites-v1.config.json)
//
// Pasos:
//   1. Detecta los cuadros (regiones distintas al color de página) por componentes conexas.
//   2. Los ordena en orden de lectura y los asigna a personajes/animaciones según sprites.config.json.
//   3. Quita el fondo de cada cuadro (flood fill desde el borde + huecos encerrados).
//   4. Alinea los cuadros de cada personaje por el piso (abajo-centro) y arma una tira horizontal.

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const configPath = path.resolve(ROOT, process.argv[2] ?? "tools/sprites.config.json");
const config = JSON.parse(await fs.readFile(configPath, "utf8"));

const PAGE_TOLERANCE = 18; // distancia al color de página para considerar "no página"
const MIN_CELL = config.minCell ?? { w: 80, h: 150 }; // lo más chico que se considera un cuadro
const SUELTO_MARGEN = 12; // px de página alrededor de cada dibujo suelto
const ROW_TOLERANCE = 50; // diferencia de "y" para considerar dos cuadros en la misma fila
const SPLIT_SEARCH = 24; // px alrededor del corte nominal donde se busca la separación real
const ROW_CLIP = 6; // px que un cuadro puede sobresalir de su fila antes de recortarlo
const INSET = 3; // píxeles que se descartan del borde de cada cuadro
const BG_HARD = 48; // por debajo: fondo seguro
const BG_SOFT = 90; // entre HARD y SOFT: borde semitransparente
const HOLE_TOLERANCE = config.holeTolerance ?? 30; // huecos encerrados (entre brazos y cuerpo, etc.). En PNG con fondo parejo conviene bajarlo
const HOLE_MIN_PIXELS = 40;
const PADDING = 2;
const SLIVER_MAX_THICKNESS = 3; // px: manchas así de finas se borran (líneas de separación)
const SLIVER_MIN_PIXELS = 10; // manchas con menos píxeles que esto se borran
const NEIGHBOR_MAX_RATIO = 0.3; // manchas en el borde lateral más chicas que 30% del personaje se borran
const PAGE_EDGE = 8; // franja del borde donde se quita también el color de página

const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

async function loadRaw(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function pixel(img, x, y) {
  const i = (y * img.width + x) * 3;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}

// opts.minCell: tamaño mínimo; opts.sueltos: los dibujos están sueltos sobre la página (sin cuadro de fondo),
// así que cada uno se toma con un margen de página alrededor.
function detectCells(img, rowFrames, { minCell = MIN_CELL, sueltos = false } = {}) {
  const { width: W, height: H } = img;
  const page = pixel(img, 5, 5);
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) mask[y * W + x] = dist(pixel(img, x, y), page) > PAGE_TOLERANCE ? 1 : 0;

  const seen = new Uint8Array(W * H);
  const cells = [];
  const stack = [];
  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || seen[s]) continue;
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -1,
      y1 = -1;
    seen[s] = 1;
    stack.push(s);
    while (stack.length) {
      const p = stack.pop();
      const x = p % W,
        y = (p / W) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (x > 0 && mask[p - 1] && !seen[p - 1]) ((seen[p - 1] = 1), stack.push(p - 1));
      if (x < W - 1 && mask[p + 1] && !seen[p + 1]) ((seen[p + 1] = 1), stack.push(p + 1));
      if (y > 0 && mask[p - W] && !seen[p - W]) ((seen[p - W] = 1), stack.push(p - W));
      if (y < H - 1 && mask[p + W] && !seen[p + W]) ((seen[p + W] = 1), stack.push(p + W));
    }
    const w = x1 - x0 + 1,
      h = y1 - y0 + 1;
    if (w > minCell.w && h > minCell.h) {
      if (!sueltos) cells.push({ x: x0, y: y0, w, h });
      else {
        const m = SUELTO_MARGEN;
        const cx0 = Math.max(0, x0 - m),
          cy0 = Math.max(0, y0 - m);
        cells.push({
          x: cx0,
          y: cy0,
          w: Math.min(W, x1 + m + 1) - cx0,
          h: Math.min(H, y1 + m + 1) - cy0,
          suelto: true,
        });
      }
    }
  }

  // Orden de lectura: agrupar por fila (y parecida) y ordenar por x.
  cells.sort((a, b) => a.y - b.y);
  const rows = [];
  for (const c of cells) {
    const row = rows.find((r) => Math.abs(r[0].y - c.y) < ROW_TOLERANCE);
    row ? row.push(c) : rows.push([c]);
  }
  rows.forEach((r) => r.sort((a, b) => a.x - b.x));
  if (rowFrames && rows.length !== rowFrames.length)
    throw new Error(`Se detectaron ${rows.length} filas pero "rows" de la config tiene ${rowFrames.length}.`);

  return rows.flatMap((r, i) => (sueltos ? r : splitMerged(img, clipToRow(r), rowFrames?.[i])));
}

// Un título pegado arriba del primer cuadro de la fila lo agranda: se recorta a la franja típica de la fila.
function clipToRow(row) {
  const top = median(row.map((c) => c.y));
  const bottom = median(row.map((c) => c.y + c.h));
  return row.map((c) => {
    const y0 = c.y < top - ROW_CLIP ? top : c.y;
    const y1 = c.y + c.h > bottom + ROW_CLIP ? bottom : c.y + c.h;
    return { ...c, y: y0, h: y1 - y0 };
  });
}

// Cuadros pegados (separación de ~1px) se detectan como uno solo y hay que partirlos.
// - Si la config dice cuántos cuadros tiene la fila: se parte repetidamente el bloque cuyos
//   pedazos quedarían más anchos, hasta llegar a esa cantidad (los cuadros varían de ancho).
// - Si no: se parte según el ancho típico (mediana) de la fila.
// El corte no es exacto a partes iguales: cerca de cada posición nominal se busca la columna
// con menos dibujo (idealmente la línea de separación), porque los cuadros no miden todos igual.
function splitMerged(img, row, target) {
  let parts;
  if (Array.isArray(target)) {
    // La config dice explícitamente en cuántos cuadros se parte cada bloque (útil con cuadros de anchos muy distintos).
    if (target.length !== row.length)
      throw new Error(`Una fila tiene ${row.length} bloques pero la config describe ${target.length}.`);
    parts = target;
  } else if (target) {
    if (target < row.length)
      throw new Error(`Una fila tiene ${row.length} bloques pero la config espera ${target} cuadros.`);
    parts = row.map(() => 1);
    for (let n = row.length; n < target; n++) {
      let best = 0;
      row.forEach((c, k) => c.w / parts[k] > row[best].w / parts[best] && (best = k));
      parts[best]++;
    }
  } else {
    const typical = median(row.map((c) => c.w));
    parts = row.map((c) => Math.max(1, Math.round(c.w / typical)));
  }
  return row.flatMap((c, k) => {
    if (parts[k] === 1) return [c];
    const cuts = [c.x];
    for (let j = 1; j < parts[k]; j++) cuts.push(bestCut(img, c, Math.round(c.x + (j * c.w) / parts[k])));
    cuts.push(c.x + c.w);
    return cuts.slice(0, -1).map((x, j) => ({ ...c, x, w: cuts[j + 1] - x }));
  });
}

function bestCut(img, cell, nominal) {
  const page = pixel(img, 5, 5);
  const beige = [0, 1, 2].map((k) =>
    median(Array.from({ length: cell.w }, (_, i) => pixel(img, cell.x + i, cell.y + cell.h - 2)).map((p) => p[k]))
  );
  let best = nominal,
    bestScore = Infinity;
  for (let x = nominal - SPLIT_SEARCH; x <= nominal + SPLIT_SEARCH; x++) {
    let ink = 0,
      sep = 0;
    for (let y = cell.y; y < cell.y + cell.h; y++) {
      const p = pixel(img, x, y);
      if (dist(p, page) < PAGE_TOLERANCE) sep++;
      else if (dist(p, beige) > BG_HARD) ink++;
    }
    const score = ink * 10 - sep * 3 + Math.abs(x - nominal) * 0.5;
    if (score < bestScore) ((bestScore = score), (best = x));
  }
  return best;
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  return s[s.length >> 1];
}

// Devuelve un RGBA del cuadro con el fondo transparente.
// Cerca del borde también se quita el color de página: hay sprites que tocan el borde
// del cuadro y dejan pasar filas de página. Solo ahí, porque el blanco de la ropa se le parece.
function cutCell(img, cell) {
  const page = pixel(img, 5, 5);
  const x0 = cell.x + INSET,
    y0 = cell.y + INSET;
  const w = cell.w - INSET * 2,
    h = cell.h - INSET * 2;
  const rgba = Buffer.alloc(w * h * 4);
  const border = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = pixel(img, x0 + x, y0 + y);
      const i = (y * w + x) * 4;
      rgba[i] = p[0];
      rgba[i + 1] = p[1];
      rgba[i + 2] = p[2];
      rgba[i + 3] = 255;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border.push(p);
    }
  // El fondo del cuadro se estima con el borde, sin contar la separación color página
  // (en cuadros partidos puede ser medio borde y arrastrar la mediana).
  // En dibujos sueltos el borde ES la página (que puede tener degradé): se usa tal cual.
  const cellBorder = cell.suelto ? border : border.filter((p) => dist(p, page) >= PAGE_TOLERANCE);
  const bg = [0, 1, 2].map((k) => median((cellBorder.length ? cellBorder : border).map((p) => p[k])));
  const d = new Float32Array(w * h);
  const pageLike = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]];
    d[i] = dist(p, bg);
    const x = i % w,
      y = (i / w) | 0;
    const nearEdge = x < PAGE_EDGE || y < PAGE_EDGE || x >= w - PAGE_EDGE || y >= h - PAGE_EDGE;
    pageLike[i] = nearEdge && dist(p, page) < PAGE_TOLERANCE ? 1 : 0;
  }

  // 1) Flood fill desde el borde.
  const removed = new Uint8Array(w * h);
  const stack = [];
  const push = (i) => {
    if (!removed[i] && (d[i] < BG_HARD || pageLike[i])) {
      removed[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) (push(x), push((h - 1) * w + x));
  for (let y = 0; y < h; y++) (push(y * w), push(y * w + w - 1));
  while (stack.length) {
    const p = stack.pop();
    const x = p % w,
      y = (p / w) | 0;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }

  // 2) Huecos encerrados de color fondo (entre brazo y cuerpo, entre piernas...).
  const visited = new Uint8Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (removed[s] || visited[s] || d[s] >= HOLE_TOLERANCE) continue;
    const comp = [s];
    visited[s] = 1;
    for (let k = 0; k < comp.length; k++) {
      const p = comp[k];
      const x = p % w,
        y = (p / w) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && !visited[q] && !removed[q] && d[q] < HOLE_TOLERANCE) {
          visited[q] = 1;
          comp.push(q);
        }
      }
    }
    if (comp.length >= HOLE_MIN_PIXELS) comp.forEach((p) => (removed[p] = 1));
  }

  // 3) Alfa: fondo transparente y bordes suavizados.
  for (let i = 0; i < w * h; i++) {
    if (removed[i]) {
      rgba[i * 4 + 3] = 0;
      continue;
    }
    const x = i % w,
      y = (i / w) | 0;
    const touches =
      (x > 0 && removed[i - 1]) ||
      (x < w - 1 && removed[i + 1]) ||
      (y > 0 && removed[i - w]) ||
      (y < h - 1 && removed[i + w]);
    if (touches && d[i] < BG_SOFT) rgba[i * 4 + 3] = Math.round(((d[i] - BG_HARD) / (BG_SOFT - BG_HARD)) * 255);
  }

  // 4) Restos sueltos: líneas finitas del cuadro vecino al partir bloques pegados, o motas.
  //    Se conservan elementos chicos pero "gorditos", como el "?" de pensar o las burbujas.
  removeSlivers(rgba, w, h);

  // Caja del contenido visible.
  let bx0 = w,
    by0 = h,
    bx1 = -1,
    by1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (rgba[(y * w + x) * 4 + 3] > 16) {
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
  return { rgba, w, h, box: { x0: bx0, y0: by0, x1: bx1, y1: by1 } };
}

function removeSlivers(rgba, w, h) {
  const seen = new Uint8Array(w * h);
  const visible = (i) => rgba[i * 4 + 3] > 16;
  const comps = [];
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || !visible(s)) continue;
    const comp = [s];
    seen[s] = 1;
    let x0 = w,
      y0 = h,
      x1 = -1,
      y1 = -1;
    for (let k = 0; k < comp.length; k++) {
      const p = comp[k];
      const x = p % w,
        y = (p / w) | 0;
      ((x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y)));
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1])
        if (q >= 0 && !seen[q] && visible(q)) ((seen[q] = 1), comp.push(q));
    }
    comps.push({ pixels: comp, x0, x1, y0, y1 });
  }
  const largest = Math.max(0, ...comps.map((c) => c.pixels.length));
  for (const c of comps) {
    const thin = c.x1 - c.x0 + 1 <= SLIVER_MAX_THICKNESS || c.y1 - c.y0 + 1 <= SLIVER_MAX_THICKNESS;
    // Pedazos del personaje vecino que se meten en el cuadro: tocan el borde lateral y son chicos.
    const neighbor = (c.x0 === 0 || c.x1 === w - 1) && c.pixels.length < largest * NEIGHBOR_MAX_RATIO;
    if (thin || neighbor || c.pixels.length < SLIVER_MIN_PIXELS) for (const p of c.pixels) rgba[p * 4 + 3] = 0;
  }
}

// Recorte manual con máscara (para dibujos sobre un fondo que no es liso): "circulo" o "rect".
function cutShape(img, c) {
  const { w, h } = c;
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = pixel(img, c.x + x, c.y + y),
        i = (y * w + x) * 4;
      ((rgba[i] = p[0]), (rgba[i + 1] = p[1]), (rgba[i + 2] = p[2]));
      const d = Math.hypot((x + 0.5 - w / 2) / (w / 2), (y + 0.5 - h / 2) / (h / 2));
      // Círculo con borde suavizado de ~2 px.
      rgba[i + 3] = c.forma === "circulo" ? Math.round(Math.max(0, Math.min(1, ((1 - d) * w) / 4)) * 255) : 255;
    }
  return { rgba, w, h, box: { x0: 0, y0: 0, x1: w - 1, y1: h - 1 } };
}

// Reescala un cuadro recortado (para mezclar láminas de distinta resolución).
async function scaleFrame(f, factor) {
  const w = Math.max(1, Math.round(f.w * factor)),
    h = Math.max(1, Math.round(f.h * factor));
  const rgba = await sharp(f.rgba, { raw: { width: f.w, height: f.h, channels: 4 } })
    .resize(w, h, { kernel: "lanczos3" })
    .raw()
    .toBuffer();
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (rgba[(y * w + x) * 4 + 3] > 16)
        ((x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y)));
  return { rgba, w, h, box: { x0, y0, x1, y1 } };
}

const boxH = (f) => f.box.y1 - f.box.y0 + 1;

// PNG con fondo transparente y una sola animación, con los cuadros uno al lado del otro.
// Se separan por columnas vacías; si quedan pedazos de más (un "?", una burbuja), se unen al vecino más cercano.
async function sliceAlphaStrip(file, n) {
  const { data, info } = await sharp(path.join(ROOT, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const colLlena = Array.from({ length: W }, (_, x) => {
    for (let y = 0; y < H; y++) if (data[(y * W + x) * 4 + 3] > 16) return true;
    return false;
  });
  let tramos = [];
  for (let x = 0; x < W; x++) {
    if (!colLlena[x]) continue;
    const ult = tramos.at(-1);
    if (ult && x - ult.x1 <= 3) ult.x1 = x;
    else tramos.push({ x0: x, x1: x });
  }
  tramos = tramos.filter((t) => t.x1 - t.x0 > 2);
  while (tramos.length > n) {
    // Unir el tramo más angosto con su vecino más cercano.
    let k = 0;
    tramos.forEach((t, i) => t.x1 - t.x0 < tramos[k].x1 - tramos[k].x0 && (k = i));
    const izq = k > 0 ? tramos[k].x0 - tramos[k - 1].x1 : Infinity;
    const der = k < tramos.length - 1 ? tramos[k + 1].x0 - tramos[k].x1 : Infinity;
    const a = Math.min(k, izq <= der ? k - 1 : k + 1);
    tramos.splice(a, 2, { x0: tramos[a].x0, x1: tramos[a + 1].x1 });
  }
  if (tramos.length !== n) throw new Error(`${file}: se encontraron ${tramos.length} cuadros y se esperaban ${n}`);
  return tramos.map(({ x0, x1 }) => {
    const m = 6,
      cx0 = Math.max(0, x0 - m),
      w = Math.min(W, x1 + m + 1) - cx0;
    const rgba = Buffer.alloc(w * H * 4);
    for (let y = 0; y < H; y++) data.copy(rgba, y * w * 4, (y * W + cx0) * 4, (y * W + cx0 + w) * 4);
    removeSlivers(rgba, w, H);
    let y0 = H,
      y1 = -1,
      bx0 = w,
      bx1 = -1;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < w; x++)
        if (rgba[(y * w + x) * 4 + 3] > 16)
          ((y0 = Math.min(y0, y)), (y1 = Math.max(y1, y)), (bx0 = Math.min(bx0, x)), (bx1 = Math.max(bx1, x)));
    return { rgba, w, h: H, box: { x0: bx0, y0, x1: bx1, y1 } };
  });
}

// Personaje armado con un PNG por animación (char.archivos): cada animación se escala para que el
// personaje mida char.alturaPx. `referencia`: "mediana" (poses paradas) o "max" (salto, agacharse),
// y `ajuste` corrige si la pose de referencia es más alta o más baja que parado.
async function framesDesdeArchivos(char) {
  const groups = [];
  for (const anim of char.animations) {
    const frames = await sliceAlphaStrip(anim.archivo, anim.frames);
    const ref = anim.referencia === "max" ? Math.max(...frames.map(boxH)) : median(frames.map(boxH));
    const factor = (char.alturaPx * (anim.ajuste ?? 1)) / ref;
    groups.push({ anim, frames: await Promise.all(frames.map((fr) => scaleFrame(fr, factor))) });
  }
  return groups;
}

// Animaciones que vienen de otra lámina (config.extras): reemplazan (o agregan) una animación de un
// personaje, escaladas para que el personaje mida lo mismo que en la lámina principal.
async function applyExtras(char, groups) {
  const base = median(groups.flatMap((g) => g.frames).map(boxH));
  for (const ex of (config.extras ?? []).filter((e) => e.character === char.id)) {
    const img = await loadRaw(path.join(ROOT, ex.source));
    const cells = detectCells(img, ex.rows, { minCell: ex.minCell ?? MIN_CELL, sueltos: !!ex.sueltos });
    if (cells.length !== ex.animation.frames)
      throw new Error(`${char.id}: ${ex.source} tiene ${cells.length} cuadros y se esperaban ${ex.animation.frames}`);
    const cut = cells.map((c) => cutCell(img, c));
    const factor = base / median(cut.map(boxH));
    const frames = await Promise.all(cut.map((f) => scaleFrame(f, factor)));
    const i = groups.findIndex((g) => g.anim.key === ex.animation.key);
    const group = { anim: ex.animation, frames };
    if (i >= 0) groups[i] = group;
    else groups.push(group);
    console.log(
      `  + ${char.id}.${ex.animation.key}: ${frames.length} cuadros de ${path.basename(ex.source)} (×${factor.toFixed(2)})`
    );
  }
  return groups;
}

async function buildCharacter(char, frames, outDir) {
  // Coordenadas relativas al ancla abajo-centro de cada cuadro original.
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const f of frames) {
    const ax = f.w / 2,
      ay = f.h;
    minX = Math.min(minX, f.box.x0 - ax);
    maxX = Math.max(maxX, f.box.x1 - ax);
    minY = Math.min(minY, f.box.y0 - ay);
    maxY = Math.max(maxY, f.box.y1 - ay);
  }
  const fw = Math.ceil(maxX - minX) + 1 + PADDING * 2;
  const fh = Math.ceil(maxY - minY) + 1 + PADDING * 2;

  const composites = await Promise.all(
    frames.map(async (f, i) => {
      const crop = await sharp(f.rgba, { raw: { width: f.w, height: f.h, channels: 4 } })
        .extract({ left: f.box.x0, top: f.box.y0, width: f.box.x1 - f.box.x0 + 1, height: f.box.y1 - f.box.y0 + 1 })
        .png()
        .toBuffer();
      return {
        input: crop,
        left: i * fw + PADDING + Math.round(f.box.x0 - f.w / 2 - minX),
        top: PADDING + Math.round(f.box.y0 - f.h - minY),
      };
    })
  );

  const file = `${char.id}.png`;
  await sharp({
    create: { width: fw * frames.length, height: fh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, file));

  let cursor = 0;
  const animations = char.animations.map((a) => {
    const idx = Array.from({ length: a.frames }, (_, k) => cursor + k);
    cursor += a.frames;
    return { key: a.key, label: a.label, frames: idx, fps: a.fps, repeat: a.repeat };
  });
  for (const al of char.alias ?? []) {
    const base = animations.find((a) => a.key === al.from);
    if (!base) throw new Error(`${char.id}: alias "${al.key}" apunta a "${al.from}" que no existe`);
    animations.push({
      key: al.key,
      label: al.label,
      frames: al.frames.map((k) => base.frames[k]),
      fps: al.fps,
      repeat: al.repeat,
      hidden: !!al.hidden,
    });
  }

  if (!char.alturaCm) throw new Error(`${char.id}: falta "alturaCm" en sprites.config.json`);

  return {
    id: char.id,
    grupo: config.grupo ?? "familia",
    nombre: char.nombre,
    rol: char.rol,
    facing: char.facing,
    alturaCm: char.alturaCm,
    // Altura del personaje dibujado (pies a cabeza), en px de la textura. Mediana de todos los
    // cuadros para que íconos sueltos (el "?" de pensar, el pin de victoria) no la inflen.
    alturaPx: median(frames.map((f) => f.box.y1 - f.box.y0 + 1)),
    texture: file,
    frameWidth: fw,
    frameHeight: fh,
    frameCount: frames.length,
    animations,
  };
}

async function main() {
  const img = await loadRaw(path.join(ROOT, config.source));
  let cells = detectCells(img, config.rows, { sueltos: !!config.sueltos });
  // omitir: índices (desde 1) de dibujos detectados que no sirven. manual: recuadros a mano {x, y, w, h, forma?}.
  if (config.omitir) cells = cells.filter((_, i) => !config.omitir.includes(i + 1));
  for (const m of config.manual ?? []) cells.push({ ...m, suelto: !m.forma });
  // Modo automático (config.auto): cada dibujo detectado es un objeto de un cuadro, con id <prefijo>-<n>
  // y altura proporcional a su tamaño en la lámina (así una piedra chica sigue siendo chica).
  if (config.auto) {
    const { prefijo, cmPorPx } = config.auto;
    const ids = config.auto.ids;
    if (ids && ids.length !== cells.length)
      throw new Error(`auto.ids tiene ${ids.length} nombres y hay ${cells.length} dibujos`);
    config.characters = cells.map((c, i) => ({
      id: ids ? ids[i] : `${prefijo}-${i + 1}`,
      nombre: `${prefijo} ${i + 1}`,
      alturaCm: Math.round((c.h - SUELTO_MARGEN * 2) * cmPorPx),
      facing: "right",
      animations: [{ key: "idle", label: "idle", frames: 1, fps: 1, repeat: -1 }],
    }));
  }
  const expected = config.characters.reduce(
    (n, c) => n + (c.archivos ? (c.cuadrosEnLamina ?? 0) : c.animations.reduce((m, a) => m + a.frames, 0)),
    0
  );
  if (cells.length !== expected)
    throw new Error(
      `Se detectaron ${cells.length} cuadros pero la config espera ${expected}. Revisá sprites.config.json.`
    );

  const outDir = path.join(ROOT, config.output);
  await fs.mkdir(outDir, { recursive: true });

  let cursor = 0;
  const characters = [];
  for (const char of config.characters) {
    let groups;
    if (char.archivos) {
      // Sus cuadros de la lámina principal se saltean: usa un PNG por animación.
      cursor += char.cuadrosEnLamina ?? 0;
      groups = await framesDesdeArchivos(char);
    } else
      groups = char.animations.map((anim) => {
        const g = {
          anim,
          frames: cells.slice(cursor, cursor + anim.frames).map((c) => (c.forma ? cutShape(img, c) : cutCell(img, c))),
        };
        cursor += anim.frames;
        return g;
      });
    groups = await applyExtras(char, groups);
    const final = { ...char, animations: groups.map((g) => ({ ...g.anim, frames: g.frames.length })) };
    const entry = await buildCharacter(
      final,
      groups.flatMap((g) => g.frames),
      outDir
    );
    characters.push(entry);
    console.log(`✔ ${entry.id}: ${entry.frameCount} cuadros de ${entry.frameWidth}×${entry.frameHeight}`);
  }

  await fs.writeFile(path.join(outDir, config.manifest ?? "manifest.json"), JSON.stringify({ characters }, null, 2));
  console.log(`Listo → ${path.relative(ROOT, outDir)}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
