// Dibujos provisorios generados con canvas para el modo viaje (fase 0).
// Cada función crea la textura una sola vez y devuelve su clave. Cuando haya arte real,
// las escenas usan el sprite y estas funciones dejan de llamarse.

const OUTLINE = "#2a1d1a";

function canvasTexture(scene, key, w, h, draw, frames = 1) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w * frames, h);
  const ctx = tex.getContext();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (let f = 0; f < frames; f++) {
    ctx.save();
    ctx.translate(f * w, 0);
    draw(ctx, f);
    ctx.restore();
    if (frames > 1) tex.add(String(f), 0, f * w, 0, w, h);
  }
  tex.refresh();
  return key;
}

function shape(ctx, fill, path, stroke = true) {
  ctx.beginPath();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}
const ellipse = (ctx, x, y, rx, ry) => () => ctx.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
const rect =
  (ctx, x, y, w, h, r = 3) =>
  () =>
    ctx.roundRect(x, y, w, h, r);
function eye(ctx, x, y, r = 3) {
  shape(ctx, "#ffffff", ellipse(ctx, x, y, r + 1.5, r + 1.5), false);
  shape(ctx, OUTLINE, ellipse(ctx, x - 1, y, r, r), false);
}
function beak(ctx, x, y, len, color) {
  shape(ctx, color, () => {
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x - len, y + 1);
    ctx.lineTo(x, y + 5);
    ctx.closePath();
  });
}

// ---------- Animales nativos ----------
const FORMAS = {
  erguido(ctx, a, w, h) {
    shape(ctx, a.color, ellipse(ctx, w * 0.5, h * 0.58, w * 0.4, h * 0.4));
    shape(ctx, a.panza, ellipse(ctx, w * 0.44, h * 0.62, w * 0.24, h * 0.3), false);
    shape(ctx, a.color, ellipse(ctx, w * 0.45, h * 0.22, w * 0.3, h * 0.2));
    eye(ctx, w * 0.38, h * 0.2);
    beak(ctx, w * 0.2, h * 0.24, w * 0.3, a.pico ?? "#f2a33a");
    shape(ctx, a.pico ?? "#f2a33a", rect(ctx, w * 0.3, h * 0.92, w * 0.16, h * 0.07, 2));
    shape(ctx, a.pico ?? "#f2a33a", rect(ctx, w * 0.54, h * 0.92, w * 0.16, h * 0.07, 2));
  },
  cuadrupedo(ctx, a, w, h) {
    const legW = w * 0.09,
      legY = h * 0.6,
      legH = h * 0.38;
    for (const lx of [0.22, 0.34, 0.66, 0.78]) shape(ctx, a.color, rect(ctx, w * lx - legW / 2, legY, legW, legH, 2));
    // cola
    shape(ctx, a.color, ellipse(ctx, w * 0.93, h * 0.42, w * 0.07, h * 0.2));
    if (a.anillos)
      for (const t of [0.34, 0.5]) shape(ctx, a.anillos, rect(ctx, w * 0.88, h * t, w * 0.1, h * 0.06, 1), false);
    shape(ctx, a.color, ellipse(ctx, w * 0.54, h * 0.5, w * 0.36, h * 0.24));
    shape(ctx, a.panza, ellipse(ctx, w * 0.54, h * 0.62, w * 0.26, h * 0.1), false);
    if (a.manchas)
      for (const [mx, my] of [
        [0.45, 0.42],
        [0.66, 0.5],
        [0.56, 0.36],
      ])
        shape(ctx, a.manchas, ellipse(ctx, w * mx, h * my, w * 0.06, h * 0.07), false);
    shape(ctx, a.color, ellipse(ctx, w * 0.17, h * 0.34, w * 0.14, h * 0.19));
    shape(ctx, a.color, () => {
      ctx.moveTo(w * 0.12, h * 0.2);
      ctx.lineTo(w * 0.16, h * 0.04);
      ctx.lineTo(w * 0.22, h * 0.2);
    });
    shape(ctx, OUTLINE, ellipse(ctx, w * 0.04, h * 0.38, w * 0.025, h * 0.04), false);
    eye(ctx, w * 0.13, h * 0.3);
  },
  "cuello-largo"(ctx, a, w, h) {
    const legW = w * 0.08;
    for (const lx of [0.36, 0.46, 0.74, 0.84])
      shape(ctx, a.color, rect(ctx, w * lx - legW / 2, h * 0.62, legW, h * 0.37, 2));
    shape(ctx, a.color, ellipse(ctx, w * 0.62, h * 0.55, w * 0.3, h * 0.14));
    shape(ctx, a.panza, ellipse(ctx, w * 0.62, h * 0.62, w * 0.22, h * 0.06), false);
    shape(ctx, a.color, rect(ctx, w * 0.26, h * 0.12, w * 0.12, h * 0.46, 6));
    shape(ctx, a.color, ellipse(ctx, w * 0.24, h * 0.12, w * 0.14, h * 0.08));
    shape(ctx, a.color, ellipse(ctx, w * 0.32, h * 0.04, w * 0.03, h * 0.04));
    eye(ctx, w * 0.2, h * 0.1);
  },
  "ave-corredora"(ctx, a, w, h) {
    for (const lx of [0.46, 0.58]) {
      ctx.beginPath();
      ctx.moveTo(w * lx, h * 0.6);
      ctx.lineTo(w * lx, h * 0.98);
      ctx.strokeStyle = a.pico ?? "#c9a45a";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    shape(ctx, a.color, ellipse(ctx, w * 0.56, h * 0.5, w * 0.34, h * 0.16));
    shape(ctx, a.panza, ellipse(ctx, w * 0.6, h * 0.46, w * 0.2, h * 0.08), false);
    shape(ctx, a.color, rect(ctx, w * 0.24, h * 0.12, w * 0.08, h * 0.38, 4));
    shape(ctx, a.color, ellipse(ctx, w * 0.26, h * 0.12, w * 0.13, h * 0.07));
    eye(ctx, w * 0.22, h * 0.1, 2.5);
    beak(ctx, w * 0.14, h * 0.13, w * 0.16, a.pico ?? "#c9a45a");
  },
  tumbado(ctx, a, w, h) {
    shape(ctx, a.color, ellipse(ctx, w * 0.55, h * 0.68, w * 0.42, h * 0.3));
    shape(ctx, a.panza, ellipse(ctx, w * 0.5, h * 0.78, w * 0.3, h * 0.14), false);
    shape(ctx, a.color, ellipse(ctx, w * 0.16, h * 0.36, w * 0.12, h * 0.26));
    shape(ctx, a.color, ellipse(ctx, w * 0.4, h * 0.94, w * 0.1, h * 0.06));
    eye(ctx, w * 0.12, h * 0.3);
    shape(ctx, OUTLINE, ellipse(ctx, w * 0.05, h * 0.4, w * 0.02, h * 0.05), false);
  },
  reptil(ctx, a, w, h) {
    shape(ctx, a.color, () => {
      ctx.moveTo(w * 0.98, h * 0.7);
      ctx.quadraticCurveTo(w * 0.7, h * 0.35, w * 0.35, h * 0.4);
      ctx.lineTo(w * 0.04, h * 0.55);
      ctx.lineTo(w * 0.04, h * 0.75);
      ctx.lineTo(w * 0.35, h * 0.9);
      ctx.quadraticCurveTo(w * 0.7, h * 0.92, w * 0.98, h * 0.7);
    });
    for (let i = 0; i < 6; i++)
      shape(ctx, "#3a5530", ellipse(ctx, w * (0.35 + i * 0.09), h * 0.45, w * 0.02, h * 0.07), false);
    for (const lx of [0.3, 0.6]) shape(ctx, a.color, rect(ctx, w * lx, h * 0.8, w * 0.05, h * 0.2, 2));
    eye(ctx, w * 0.18, h * 0.45, 2.5);
  },
  ballena(ctx, a, w, h) {
    shape(ctx, a.color, () => {
      ctx.moveTo(w * 0.04, h * 0.6);
      ctx.quadraticCurveTo(w * 0.1, h * 0.1, w * 0.5, h * 0.2);
      ctx.quadraticCurveTo(w * 0.78, h * 0.3, w * 0.86, h * 0.5);
      ctx.lineTo(w * 0.98, h * 0.2);
      ctx.lineTo(w * 0.96, h * 0.8);
      ctx.lineTo(w * 0.86, h * 0.6);
      ctx.quadraticCurveTo(w * 0.5, h * 0.98, w * 0.04, h * 0.6);
    });
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(w * (0.12 + i * 0.04), h * 0.7);
      ctx.lineTo(w * (0.3 + i * 0.04), h * 0.78);
      ctx.strokeStyle = a.panza;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    eye(ctx, w * 0.16, h * 0.5, 2.5);
  },
};

export function animalTexture(scene, id, a) {
  return canvasTexture(scene, `ph-animal-${id}`, a.w + 6, a.h + 6, (ctx) => {
    ctx.translate(3, 3);
    FORMAS[a.forma](ctx, a, a.w, a.h);
  });
}

// ---------- Pájaros (2 cuadros: alas arriba / abajo) ----------
export function birdTexture(scene, id, b) {
  const w = b.w + 8,
    h = b.h * 2 + 8;
  return canvasTexture(
    scene,
    `ph-pajaro-${id}`,
    w,
    h,
    (ctx, f) => {
      const cy = h / 2;
      const up = f === 0;
      shape(ctx, b.ala, () => {
        ctx.moveTo(w * 0.35, cy);
        ctx.lineTo(w * 0.62, up ? cy - b.h * 0.95 : cy + b.h * 0.95);
        ctx.lineTo(w * 0.75, cy);
        ctx.closePath();
      });
      shape(ctx, b.color, ellipse(ctx, w * 0.55, cy, w * 0.34, b.h * 0.3));
      shape(ctx, b.color, ellipse(ctx, w * 0.2, cy - b.h * 0.12, w * 0.13, b.h * 0.26));
      eye(ctx, w * 0.16, cy - b.h * 0.18, 2.5);
      beak(ctx, w * 0.08, cy - b.h * 0.08, w * 0.08, b.pico);
    },
    2
  );
}

// ---------- Perro (2 cuadros caminando) ----------
export function dogTexture(scene) {
  const w = 96,
    h = 66;
  return canvasTexture(
    scene,
    "ph-perro",
    w,
    h,
    (ctx, f) => {
      const color = "#b98a54",
        oscuro = "#8a5f33";
      const legs = f === 0 ? [0.24, 0.36, 0.64, 0.76] : [0.28, 0.32, 0.6, 0.8];
      for (const lx of legs) shape(ctx, oscuro, rect(ctx, w * lx - 4, h * 0.6, 8, h * 0.36, 2));
      shape(ctx, color, () => {
        ctx.moveTo(w * 0.86, h * 0.45);
        ctx.quadraticCurveTo(w * 0.98, h * 0.2, w * 0.94, h * 0.08);
      });
      shape(ctx, color, ellipse(ctx, w * 0.52, h * 0.5, w * 0.34, h * 0.2));
      shape(ctx, color, ellipse(ctx, w * 0.18, h * 0.32, w * 0.15, h * 0.2));
      shape(ctx, oscuro, ellipse(ctx, w * 0.24, h * 0.3, w * 0.06, h * 0.16));
      shape(ctx, OUTLINE, ellipse(ctx, w * 0.04, h * 0.36, 4, 4), false);
      eye(ctx, w * 0.13, h * 0.26);
      shape(ctx, "#d9463a", ellipse(ctx, w * 0.1, h * 0.5, 4, 3), false);
    },
    2
  );
}

// ---------- Objetos ----------
export function starTexture(scene) {
  const s = 40;
  return canvasTexture(scene, "ph-figurita", s, s, (ctx) => {
    shape(ctx, "#ffd23d", () => {
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? s * 0.46 : s * 0.2;
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(s / 2 + Math.cos(ang) * r, s / 2 + Math.sin(ang) * r);
      }
      ctx.closePath();
    });
    shape(ctx, "#fff6c2", ellipse(ctx, s * 0.42, s * 0.38, s * 0.07, s * 0.07), false);
  });
}

export function rockTexture(scene) {
  const w = 180,
    h = 64;
  return canvasTexture(scene, "ph-roca", w, h, (ctx) => {
    // Piedra irregular con sombreado en capas y musgo arriba, para que combine con el arte pixelado.
    const contorno = [
      [6, h - 3],
      [10, 26],
      [34, 10],
      [78, 5],
      [120, 8],
      [156, 16],
      [174, 34],
      [176, h - 3],
    ];
    const poligono = (pts) => () => {
      ctx.moveTo(...pts[0]);
      for (const p of pts.slice(1)) ctx.lineTo(...p);
      ctx.closePath();
    };
    shape(ctx, "#7d7a74", poligono(contorno));
    shape(
      ctx,
      "#66635e",
      poligono([
        [10, h - 4],
        [14, 40],
        [60, 46],
        [120, 42],
        [172, 44],
        [174, h - 4],
      ]),
      false
    );
    shape(
      ctx,
      "#9c988f",
      poligono([
        [30, 16],
        [78, 9],
        [118, 12],
        [100, 22],
        [50, 26],
      ]),
      false
    );
    for (const [x, y, r] of [
      [50, 38, 6],
      [128, 30, 5],
      [96, 50, 4],
    ])
      shape(ctx, "#5a5752", ellipse(ctx, x, y, r * 1.6, r), false);
    shape(
      ctx,
      "#5f9d45",
      poligono([
        [34, 11],
        [78, 6],
        [120, 9],
        [150, 15],
        [120, 15],
        [80, 12],
        [44, 16],
      ]),
      false
    );
  });
}

export function signTexture(scene) {
  const w = 240,
    h = 190;
  return canvasTexture(scene, "ph-cartel", w, h, (ctx) => {
    shape(ctx, "#6b4a2a", rect(ctx, w / 2 - 8, 70, 16, h - 72, 3));
    shape(ctx, "#f4e2b8", rect(ctx, 4, 4, w - 8, 80, 10));
    shape(ctx, "#d9463a", rect(ctx, 14, 14, 26, 26, 4), false);
  });
}

export function houseTexture(scene) {
  const w = 300,
    h = 260;
  return canvasTexture(scene, "ph-casa", w, h, (ctx) => {
    shape(ctx, "#f1e3c8", rect(ctx, 30, 110, w - 60, h - 114, 4));
    shape(ctx, "#c4553a", () => {
      ctx.moveTo(10, 120);
      ctx.lineTo(w / 2, 14);
      ctx.lineTo(w - 10, 120);
      ctx.closePath();
    });
    shape(ctx, "#7a4a2a", rect(ctx, w / 2 - 28, h - 104, 56, 100, 4));
    shape(ctx, "#8fd3ff", rect(ctx, 56, 140, 56, 48, 3));
    shape(ctx, "#8fd3ff", rect(ctx, w - 112, 140, 56, 48, 3));
    shape(ctx, "#f2c23a", ellipse(ctx, w / 2 + 16, h - 54, 4, 4), false);
  });
}

export function heartTexture(scene, lleno = true) {
  const s = 40;
  return canvasTexture(scene, lleno ? "ph-corazon" : "ph-corazon-vacio", s, s, (ctx) => {
    const path = () => {
      ctx.moveTo(s / 2, s * 0.88);
      ctx.bezierCurveTo(s * 0.05, s * 0.55, s * 0.02, s * 0.12, s * 0.3, s * 0.12);
      ctx.bezierCurveTo(s * 0.42, s * 0.12, s * 0.5, s * 0.24, s / 2, s * 0.3);
      ctx.bezierCurveTo(s * 0.5, s * 0.24, s * 0.58, s * 0.12, s * 0.7, s * 0.12);
      ctx.bezierCurveTo(s * 0.98, s * 0.12, s * 0.95, s * 0.55, s / 2, s * 0.88);
      ctx.closePath();
    };
    shape(ctx, lleno ? "#e8374a" : "#4a5563", path);
    if (lleno) shape(ctx, "#ff8a96", ellipse(ctx, s * 0.32, s * 0.3, s * 0.07, s * 0.05), false);
  });
}

// Plataforma flotante: bloque de tierra con pasto arriba. Se genera una por ancho.
export function platformTexture(scene, w) {
  const h = 34;
  return canvasTexture(scene, `ph-plataforma-${w}`, w, h, (ctx) => {
    shape(ctx, "#7a5234", rect(ctx, 2, 8, w - 4, h - 10, 8));
    ctx.fillStyle = "#5e3e27";
    for (let x = 14; x < w - 14; x += 26) ctx.fillRect(x, 20 + ((x / 26) % 2) * 5, 8, 5);
    shape(ctx, "#5fae45", rect(ctx, 0, 2, w, 12, 6));
    ctx.fillStyle = "#86cf5c";
    ctx.fillRect(8, 4, w - 16, 3);
  });
}
