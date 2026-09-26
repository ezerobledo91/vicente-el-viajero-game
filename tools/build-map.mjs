// Genera los datos del mapa: contornos reales de los países (Natural Earth, vía world-atlas)
// calibrados para que calcen sobre la ilustración `personajes/mapa/mundo.png`.
//
// Uso: npm run map
//
// La ilustración es artística (no sigue una proyección exacta), así que la calibración es:
//   1. Máscara de la silueta dibujada del continente (lo que no es agua), sin huecos.
//   2. Proyección equirectangular de los países reales + transformación afín (escala,
//      posición, inclinación) que maximiza la superposición con la máscara.
//   3. Deformación radial suave desde el centro del continente para que el contorno real
//      coincida con el borde dibujado. Las fronteras interiores se mueven en proporción.
//
// Salida:
//   public/assets/map/mundo.png            copia de la ilustración
//   public/assets/map/<region>.json        polígonos por país en píxeles de la imagen
//   public/assets/flags/<iso>.svg          banderas (flag-icons, licencia MIT)
//   tools/out/overlay-<region>.png         imagen de control para revisar el calce

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import sharp from "sharp";
import { feature } from "topojson-client";
import { geoArea, geoEquirectangular } from "d3-geo";
import { VIAJES } from "../src/data/viajes/index.js";

const require = createRequire(import.meta.url);
const topo = require("world-atlas/countries-50m.json");

const ROOT = path.resolve(import.meta.dirname, "..");
const MAP_SRC = path.join(ROOT, "personajes/mapa/mundo.png");
const OUT_MAP = path.join(ROOT, "public/assets/map");
const OUT_FLAGS = path.join(ROOT, "public/assets/flags");
const OUT_DEBUG = path.join(ROOT, "tools/out");

// Regiones calibrables. Por ahora solo Sudamérica; el resto del mundo queda bloqueado.
const REGIONS = {
  sudamerica: {
    // Código ISO numérico (world-atlas) → ISO alfa-2 (flag-icons y datos del juego).
    countries: {
      "032": "ar",
      "068": "bo",
      "076": "br",
      152: "cl",
      170: "co",
      218: "ec",
      328: "gy",
      600: "py",
      604: "pe",
      740: "sr",
      858: "uy",
      862: "ve",
    },
    // Territorios que existen en la silueta pero no son jugables (se usan solo para calibrar).
    extra: [{ id: "gf", from: "250", lon: [-55, -51], lat: [2, 6] }], // Guayana Francesa
    window: { x0: 200, y0: 470, x1: 560, y1: 920 }, // recorte de la imagen donde está el continente
    seed: [380, 560], // un punto de tierra seguro (Amazonas)
    cut: [{ x1: 280, y1: 505 }], // rectángulos (desde la esquina de la ventana) a excluir: Centroamérica
    skipLonBelow: -85, // Galápagos: en la ilustración no están
  },
};

const PROJECTION = geoEquirectangular().scale(100).translate([0, 0]);
const MIN_POLYGON_AREA = 1e-4; // estereorradianes: descarta islas chicas
const RIVER_CLOSE = 4; // px: tapa ríos dibujados de hasta ~8 px de ancho
const RAY_GAP = 8; // px de agua seguidos que cortan un rayo (así los ríos no lo cortan)
const RATIO_LIMITS = [0.7, 1.45];
const RATIO_SMOOTH_DEG = 7;

const isWater = (r, g, b) => b > r + 30 && b > g - 10;

async function loadImage() {
  const { data, info } = await sharp(MAP_SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

// ---------- Máscara de la silueta dibujada ----------
function buildMask(img, region) {
  const { x0, y0, x1, y1 } = region.window;
  const W = x1 - x0,
    H = y1 - y0;
  const land = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = ((y + y0) * img.width + x + x0) * 3;
      land[y * W + x] = isWater(img.data[i], img.data[i + 1], img.data[i + 2]) ? 0 : 1;
    }
  for (const c of region.cut)
    for (let y = 0; y < c.y1 - y0; y++) for (let x = 0; x < c.x1 - x0; x++) land[y * W + x] = 0;

  // Los ríos dibujados llegan al mar y parten el continente en pedazos: se tapan con un
  // cierre morfológico (engordar la tierra y volver a adelgazarla) antes de buscar la componente.
  const closed = erode(dilate(land, W, H, RIVER_CLOSE), W, H, RIVER_CLOSE);
  for (let i = 0; i < closed.length; i++) closed[i] |= land[i];

  // Componente conexa del continente.
  const conti = flood(closed, W, H, [(region.seed[1] - y0) * W + (region.seed[0] - x0)], (v) => v === 1);
  // Rellenar huecos: es tierra todo lo que no es agua alcanzable desde el borde de la ventana.
  const borders = [];
  for (let x = 0; x < W; x++) borders.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) borders.push(y * W, y * W + W - 1);
  const notConti = conti.map((v) => 1 - v);
  const ocean = flood(
    notConti,
    W,
    H,
    borders.filter((p) => notConti[p]),
    (v) => v === 1
  );
  return { mask: ocean.map((v) => 1 - v), W, H, x0, y0 };
}

// Dilatación/erosión con un cuadrado de radio r (separable: primero filas, después columnas).
function morph(grid, W, H, r, op) {
  const pass = (src, horizontal) => {
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let v = op === "max" ? 0 : 1;
        for (let k = -r; k <= r; k++) {
          const xx = horizontal ? x + k : x,
            yy = horizontal ? y : y + k;
          const s = xx < 0 || yy < 0 || xx >= W || yy >= H ? 0 : src[yy * W + xx];
          v = op === "max" ? v | s : v & s;
        }
        out[y * W + x] = v;
      }
    return out;
  };
  return pass(pass(grid, true), false);
}
const dilate = (g, W, H, r) => morph(g, W, H, r, "max");
const erode = (g, W, H, r) => morph(g, W, H, r, "min");

function flood(grid, W, H, seeds, ok) {
  const out = new Uint8Array(W * H);
  const stack = [];
  for (const s of seeds) if (ok(grid[s]) && !out[s]) ((out[s] = 1), stack.push(s));
  while (stack.length) {
    const p = stack.pop();
    const x = p % W,
      y = (p / W) | 0;
    for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1])
      if (q >= 0 && !out[q] && ok(grid[q])) ((out[q] = 1), stack.push(q));
  }
  return out;
}

// ---------- Polígonos reales ----------
function realPolygons(region) {
  const features = feature(topo, topo.objects.countries).features;
  const polys = [];
  const avg = (ring, k) => ring.reduce((s, p) => s + p[k], 0) / ring.length;
  for (const f of features) {
    const id = region.countries[f.id];
    const extra = region.extra.find((e) => e.from === f.id);
    if (!id && !extra) continue;
    const list = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of list) {
      const ring = poly[0];
      const lon = avg(ring, 0),
        lat = avg(ring, 1);
      if (extra && !id && !(lon > extra.lon[0] && lon < extra.lon[1] && lat > extra.lat[0] && lat < extra.lat[1]))
        continue;
      if (geoArea({ type: "Polygon", coordinates: [ring] }) < MIN_POLYGON_AREA) continue;
      if (lon < region.skipLonBelow) continue;
      polys.push({ id: id ?? extra.id, playable: !!id, ring });
    }
  }
  return polys.map((p) => ({ ...p, pts: p.ring.map((c) => PROJECTION(c)) }));
}

// ---------- Rasterizado e IoU ----------
function rasterize(polys, W, H) {
  const out = new Uint8Array(W * H);
  const edges = [];
  for (const p of polys) for (let k = 0; k < p.length; k++) edges.push([p[k], p[(k + 1) % p.length]]);
  for (let y = 0; y < H; y++) {
    const yc = y + 0.5,
      xs = [];
    for (const [[x1, y1], [x2, y2]] of edges)
      if (y1 <= yc !== y2 <= yc) xs.push(x1 + ((yc - y1) / (y2 - y1)) * (x2 - x1));
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x < Math.min(W, xs[k + 1] - 0.5); x++) out[y * W + x] = 1;
  }
  return out;
}

function iou(a, b) {
  let i = 0,
    u = 0;
  for (let k = 0; k < a.length; k++) {
    if (a[k] && b[k]) i++;
    if (a[k] || b[k]) u++;
  }
  return i / u;
}

const applyAffine = (T, [x, y]) => [T[0] * x + T[1] * y + T[4], T[2] * x + T[3] * y + T[5]];

function bbox(points) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [x, y] of points)
    ((x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y)));
  return { x0, y0, x1, y1 };
}

// ---------- Paso 2: afín por búsqueda local ----------
function fitAffine(real, M) {
  const mb = bbox(maskPoints(M));
  const rb = bbox(real.flatMap((p) => p.pts));
  const a = (mb.x1 - mb.x0) / (rb.x1 - rb.x0),
    d = (mb.y1 - mb.y0) / (rb.y1 - rb.y0);
  let T = [a, 0, 0, d, mb.x0 - a * rb.x0, mb.y0 - d * rb.y0];
  const score = (t) =>
    iou(
      rasterize(
        real.map((p) => p.pts.map((q) => applyAffine(t, q))),
        M.W,
        M.H
      ),
      M.mask
    );
  let best = score(T);
  const steps = [0.03 * a, 0.03 * a, 0.03 * d, 0.03 * d, 5, 5];
  for (let round = 0; round < 7; round++) {
    for (let improved = true; improved;) {
      improved = false;
      for (let k = 0; k < 6; k++)
        for (const s of [1, -1]) {
          const t = [...T];
          t[k] += s * steps[k];
          const v = score(t);
          if (v > best) ((best = v), (T = t), (improved = true));
        }
    }
    steps.forEach((_, k) => (steps[k] /= 2));
  }
  return { T, score: best };
}

function maskPoints(M) {
  const pts = [];
  for (let i = 0; i < M.mask.length; i++) if (M.mask[i]) pts.push([i % M.W, (i / M.W) | 0]);
  return pts;
}

// ---------- Paso 3: deformación radial ----------
function rayLengths(grid, W, H, [cx, cy]) {
  const out = new Float32Array(360);
  for (let deg = 0; deg < 360; deg++) {
    const dx = Math.cos((deg * Math.PI) / 180),
      dy = Math.sin((deg * Math.PI) / 180);
    let last = 0,
      gap = 0;
    for (let r = 0; r < 2 * (W + H); r += 0.5) {
      const x = Math.round(cx + dx * r),
        y = Math.round(cy + dy * r);
      if (x < 0 || y < 0 || x >= W || y >= H) break;
      if (grid[y * W + x]) ((last = r), (gap = 0));
      else if (++gap > RAY_GAP * 2) break;
    }
    out[deg] = last;
  }
  return out;
}

function radialRatios(real, M, center) {
  const Rm = rayLengths(M.mask, M.W, M.H, center);
  const Rr = rayLengths(
    rasterize(
      real.map((p) => p.pts),
      M.W,
      M.H
    ),
    M.W,
    M.H,
    center
  );
  const raw = Array.from({ length: 360 }, (_, k) =>
    Math.min(RATIO_LIMITS[1], Math.max(RATIO_LIMITS[0], Rr[k] > 1 ? Rm[k] / Rr[k] : 1))
  );
  const sigma = RATIO_SMOOTH_DEG;
  return raw.map((_, k) => {
    let s = 0,
      w = 0;
    for (let j = -3 * sigma; j <= 3 * sigma; j++) {
      const g = Math.exp(-(j * j) / (2 * sigma * sigma));
      s += g * raw[(k + j + 360) % 360];
      w += g;
    }
    return s / w;
  });
}

function warpRadial([x, y], [cx, cy], ratios) {
  const dx = x - cx,
    dy = y - cy;
  const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  const k = Math.floor(deg),
    t = deg - k;
  const ratio = ratios[k] * (1 - t) + ratios[(k + 1) % 360] * t;
  return [cx + dx * ratio, cy + dy * ratio];
}

// ---------- Utilidades de salida ----------
function simplify(points, minDist = 1.2) {
  const out = [points[0]];
  for (const p of points.slice(1)) {
    const q = out[out.length - 1];
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= minDist) out.push(p);
  }
  return out;
}

function pointInPolygon([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToEdges([x, y], poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j],
      [bx, by] = poly[i];
    const vx = bx - ax,
      vy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)));
    best = Math.min(best, Math.hypot(x - (ax + t * vx), y - (ay + t * vy)));
  }
  return best;
}

// Punto "más adentro" del polígono: bueno para etiquetas y para parar un sprite encima.
function interiorPoint(poly) {
  const b = bbox(poly);
  let best = null,
    bestD = -1;
  for (let y = b.y0; y <= b.y1; y += 1.5)
    for (let x = b.x0; x <= b.x1; x += 1.5)
      if (pointInPolygon([x, y], poly)) {
        const d = distToEdges([x, y], poly);
        if (d > bestD) ((bestD = d), (best = [x, y]));
      }
  return best ?? [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
}

const polygonArea = (p) =>
  Math.abs(p.reduce((s, [x, y], i) => s + x * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * y, 0)) / 2;
const round1 = (v) => Math.round(v * 10) / 10;

async function debugOverlay(name, countries, region, ciudades = []) {
  const hue = (i) => `hsl(${(i * 137) % 360} 90% 55%)`;
  const paths =
    countries
      .flatMap((c, i) =>
        c.polygons.map(
          (p) =>
            `<path d="M${p.map((q) => q.join(",")).join("L")}Z" fill="${c.playable ? hue(i) : "#888"}" fill-opacity="0.35" stroke="#000" stroke-width="1"/>`
        )
      )
      .join("") +
    ciudades
      .map(({ pos: [x, y] }) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#ff0" stroke="#000" stroke-width="1"/>`)
      .join("");
  const img = await loadImage();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}">${paths}</svg>`;
  const composed = await sharp(MAP_SRC)
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer();
  const { x0, y0, x1, y1 } = region.window;
  await fs.mkdir(OUT_DEBUG, { recursive: true });
  const file = path.join(OUT_DEBUG, `overlay-${name}.png`);
  await sharp(composed)
    .extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
    .resize({ width: (x1 - x0) * 2, kernel: "nearest" })
    .toFile(file);
  return file;
}

// ---------- Principal ----------
async function buildRegion(name, region, img) {
  const M = buildMask(img, region);
  const real = realPolygons(region);

  const { T, score: affineScore } = fitAffine(real, M);
  let polys = real.map((p) => ({ ...p, pts: p.pts.map((q) => applyAffine(T, q)) }));

  const mp = maskPoints(M);
  const center = [mp.reduce((s, p) => s + p[0], 0) / mp.length, mp.reduce((s, p) => s + p[1], 0) / mp.length];
  const passes = [];
  for (let pass = 0; pass < 2; pass++) {
    const ratios = radialRatios(polys, M, center);
    passes.push(ratios);
    polys = polys.map((p) => ({ ...p, pts: p.pts.map((q) => warpRadial(q, center, ratios)) }));
  }
  // Misma transformación completa para cualquier punto geográfico (ciudades de los viajes).
  const toImage = (lon, lat) => {
    let q = applyAffine(T, PROJECTION([lon, lat]));
    for (const ratios of passes) q = warpRadial(q, center, ratios);
    return [round1(q[0] + M.x0), round1(q[1] + M.y0)];
  };
  const finalScore = iou(
    rasterize(
      polys.map((p) => p.pts),
      M.W,
      M.H
    ),
    M.mask
  );
  console.log(
    `  ${name}: superposición ${(affineScore * 100).toFixed(1)}% (afín) → ${(finalScore * 100).toFixed(1)}% (deformado)`
  );

  // Agrupar por país y pasar a coordenadas de imagen.
  const byId = new Map();
  for (const p of polys) {
    const pts = simplify(p.pts.map(([x, y]) => [round1(x + M.x0), round1(y + M.y0)]));
    if (!byId.has(p.id)) byId.set(p.id, { id: p.id, playable: p.playable, polygons: [] });
    byId.get(p.id).polygons.push(pts);
  }
  const countries = [...byId.values()].map((c) => {
    const main = c.polygons.reduce((a, b) => (polygonArea(b) > polygonArea(a) ? b : a));
    const b = bbox(c.polygons.flat());
    return {
      ...c,
      anchor: interiorPoint(main).map(round1),
      bbox: [b.x0, b.y0, b.x1, b.y1].map(round1),
    };
  });

  const paises = new Set(Object.values(region.countries));
  const ciudades = Object.values(VIAJES)
    .filter((v) => paises.has(v.pais))
    .flatMap((v) => v.ciudades.map((c) => ({ id: c.id, pais: v.pais, pos: toImage(c.lon, c.lat) })));

  const overlay = await debugOverlay(name, countries, region, ciudades);
  return { countries, ciudades, overlay };
}

async function main() {
  const img = await loadImage();
  await fs.mkdir(OUT_MAP, { recursive: true });
  await fs.mkdir(OUT_FLAGS, { recursive: true });
  await fs.copyFile(MAP_SRC, path.join(OUT_MAP, "mundo.png"));

  for (const [name, region] of Object.entries(REGIONS)) {
    const { countries, ciudades, overlay } = await buildRegion(name, region, img);
    const json = {
      image: { width: img.width, height: img.height },
      region: name,
      window: region.window,
      countries,
      ciudades,
    };
    await fs.writeFile(path.join(OUT_MAP, `${name}.json`), JSON.stringify(json));
    for (const c of countries.filter((k) => k.playable))
      await fs.copyFile(require.resolve(`flag-icons/flags/4x3/${c.id}.svg`), path.join(OUT_FLAGS, `${c.id}.svg`));
    console.log(
      `✔ ${name}: ${countries.filter((c) => c.playable).length} países · control: ${path.relative(ROOT, overlay)}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
