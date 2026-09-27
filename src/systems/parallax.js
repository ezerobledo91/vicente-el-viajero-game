import { mulberry32 } from "./levelBuilder.js";
import { ASSETS } from "../config/constants.js";

// Velocidad relativa de las capas cuando el paisaje tiene fondo ilustrado (npm run fondos).
const FACTOR_IMAGEN = { fondo: 0.4, suelo: 1 };

// Fondos en capas que se mueven a distinta velocidad (parallax). Con dibujos provisorios
// generados por paisaje (src/data/paisajes.js). Las capas se repiten horizontalmente sin cortes.

const TILE_W = 1024;
const OUTLINE = "rgba(42,29,26,0.35)";

// Posición vertical (borde inferior) y velocidad relativa de cada capa.
export const CAPAS = {
  lejos: { alto: 330, base: 470, factor: 0.15 },
  medio: { alto: 250, base: 565, factor: 0.4 },
  cerca: { alto: 110, base: 612, factor: 0.75 },
};

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Dibuja fn en x y en x ± ancho, para que la capa empalme al repetirse.
const wrap = (w, x, fn) => [x - w, x, x + w].forEach(fn);

function periodicRidge(ctx, w, h, rnd, { base, amp, ondas }) {
  const fases = ondas.map(() => rnd() * Math.PI * 2);
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) {
    const y = ondas.reduce((s, k, i) => s + Math.sin((x / w) * Math.PI * 2 * k + fases[i]) * (amp / (i + 1)), 0);
    ctx.lineTo(x, h * base + y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
}

const DIBUJOS = {
  montanas(ctx, w, h, c, rnd, opt) {
    const picos = 7;
    for (let capa = 0; capa < 2; capa++) {
      const color = capa === 0 ? shade(c, 0.25) : c;
      for (let i = 0; i < picos; i++) {
        const x = ((i + rnd() * 0.6) / picos) * w,
          alto = h * (0.45 + rnd() * 0.45) * (capa ? 0.85 : 1),
          ancho = 170 + rnd() * 150;
        wrap(w, x, (px) => {
          ctx.beginPath();
          ctx.moveTo(px - ancho, h);
          ctx.lineTo(px, h - alto);
          ctx.lineTo(px + ancho, h);
          ctx.fillStyle = color;
          ctx.fill();
          if (opt.nieve) {
            ctx.beginPath();
            ctx.moveTo(px - ancho * 0.28, h - alto * 0.72);
            ctx.lineTo(px, h - alto);
            ctx.lineTo(px + ancho * 0.28, h - alto * 0.72);
            ctx.lineTo(px + ancho * 0.1, h - alto * 0.78);
            ctx.lineTo(px - ancho * 0.08, h - alto * 0.7);
            ctx.fillStyle = "#f6f9fc";
            ctx.fill();
          }
        });
      }
    }
  },
  mesetas(ctx, w, h, c, rnd) {
    for (let i = 0; i < 6; i++) {
      const x = (i / 6) * w + rnd() * 60,
        top = h * (0.35 + rnd() * 0.3),
        ancho = 220 + rnd() * 160;
      wrap(w, x, (px) => {
        ctx.beginPath();
        ctx.moveTo(px - ancho / 2 - 60, h);
        ctx.lineTo(px - ancho / 2, top);
        ctx.lineTo(px + ancho / 2, top);
        ctx.lineTo(px + ancho / 2 + 60, h);
        ctx.fillStyle = i % 2 ? c : shade(c, 0.12);
        ctx.fill();
        ctx.fillStyle = shade(c, -0.12);
        ctx.fillRect(px - ancho / 2, top, ancho, 6);
      });
    }
  },
  colinas(ctx, w, h, c, rnd) {
    periodicRidge(ctx, w, h, rnd, { base: 0.45, amp: 40, ondas: [2, 3, 5] });
    ctx.fillStyle = shade(c, 0.15);
    ctx.fill();
    periodicRidge(ctx, w, h, rnd, { base: 0.62, amp: 30, ondas: [3, 4] });
    ctx.fillStyle = c;
    ctx.fill();
  },
  mar(ctx, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    ctx.strokeStyle = shade(c, 0.35);
    ctx.lineWidth = 3;
    for (let y = h * 0.58; y < h; y += 26)
      for (let x = (y * 7) % 90; x < w; x += 90) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 30, y);
        ctx.stroke();
      }
  },
  acantilados(ctx, w, h, c, rnd) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    let y = h * 0.4;
    for (let x = 0; x <= w; x += 128) {
      const ny = x >= w - 128 ? h * 0.4 : h * (0.3 + rnd() * 0.25);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 20, ny);
      y = ny;
    }
    ctx.lineTo(w, h * 0.4);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.fillStyle = shade(c, -0.15);
    for (let x = 30; x < w; x += 70) ctx.fillRect(x, h * 0.6 + (x % 40), 34, 5);
  },
  ciudad(ctx, w, h, c, rnd) {
    for (let x = 0; x < w;) {
      const bw = 50 + rnd() * 70,
        bh = h * (0.3 + rnd() * 0.6);
      ctx.fillStyle = rnd() < 0.5 ? c : shade(c, 0.15);
      ctx.fillRect(x, h - bh, bw - 6, bh);
      ctx.fillStyle = shade(c, 0.5);
      for (let wy = h - bh + 12; wy < h - 14; wy += 22)
        for (let wx = x + 8; wx < x + bw - 18; wx += 16) ctx.fillRect(wx, wy, 7, 10);
      x += bw;
    }
  },
  pinos(ctx, w, h, c, rnd) {
    for (let i = 0; i < 26; i++) {
      const x = (i / 26) * w + rnd() * 20,
        alto = 110 + rnd() * 120,
        ancho = alto * 0.42;
      wrap(w, x, (px) => {
        ctx.fillStyle = "#4a3624";
        ctx.fillRect(px - 5, h - 26, 10, 26);
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          const y0 = h - 20 - k * alto * 0.26;
          ctx.moveTo(px - ancho * (1 - k * 0.22), y0);
          ctx.lineTo(px, y0 - alto * 0.5);
          ctx.lineTo(px + ancho * (1 - k * 0.22), y0);
          ctx.fillStyle = k % 2 ? shade(c, 0.1) : c;
          ctx.fill();
        }
        ctx.fillStyle = "#f6f9fc";
        ctx.fillRect(px - ancho * 0.5, h - 20 - alto * 0.02, ancho, 4);
      });
    }
  },
  arboles(ctx, w, h, c, rnd) {
    for (let i = 0; i < 9; i++) {
      const x = (i / 9) * w + rnd() * 60,
        r = 40 + rnd() * 30;
      wrap(w, x, (px) => {
        ctx.fillStyle = "#5a3d24";
        ctx.fillRect(px - 8, h - r * 1.6, 16, r * 1.6);
        for (const [dx, dy, k] of [
          [0, -r * 1.9, 1],
          [-r * 0.7, -r * 1.5, 0.75],
          [r * 0.7, -r * 1.5, 0.75],
        ]) {
          ctx.beginPath();
          ctx.arc(px + dx, h + dy, r * k, 0, Math.PI * 2);
          ctx.fillStyle = dx === 0 ? c : shade(c, 0.1);
          ctx.fill();
        }
      });
    }
  },
  palmeras(ctx, w, h, c, rnd) {
    for (let i = 0; i < 10; i++) {
      const x = (i / 10) * w + rnd() * 50,
        alto = 130 + rnd() * 90;
      wrap(w, x, (px) => {
        ctx.strokeStyle = "#7a5a3a";
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(px, h);
        ctx.quadraticCurveTo(px + 20, h - alto / 2, px + 6, h - alto);
        ctx.stroke();
        ctx.fillStyle = c;
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(px + 6 + Math.cos(a) * 30, h - alto + Math.sin(a) * 12, 34, 9, a, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  },
  selva(ctx, w, h, c, rnd) {
    for (let i = 0; i < 40; i++) {
      const x = rnd() * w,
        y = h * (0.3 + rnd() * 0.5),
        r = 36 + rnd() * 40;
      const color = rnd() < 0.5 ? c : shade(c, 0.12); // fuera de wrap: las 3 copias tienen que ser iguales
      wrap(w, x, (px) => {
        ctx.beginPath();
        ctx.arc(px, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    }
    ctx.fillStyle = c;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
  },
  agua(ctx, w, h, c, rnd) {
    periodicRidge(ctx, w, h * 0.55, rnd, { base: 0.9, amp: 10, ondas: [3, 5] });
    ctx.fillStyle = "#6f9a4e";
    ctx.fill();
    ctx.fillStyle = c;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    ctx.fillStyle = shade(c, 0.35);
    for (let y = h * 0.58; y < h; y += 22) for (let x = (y * 5) % 120; x < w; x += 120) ctx.fillRect(x, y, 40, 3);
  },
  arbustos(ctx, w, h, c, rnd) {
    for (let i = 0; i < 22; i++) {
      const x = rnd() * w,
        r = 16 + rnd() * 18;
      wrap(w, x, (px) => {
        ctx.beginPath();
        ctx.arc(px, h - r * 0.6, r, Math.PI, 0);
        ctx.fillStyle = i % 2 ? c : shade(c, 0.12);
        ctx.fill();
      });
    }
  },
  pasto(ctx, w, h, c, rnd) {
    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    for (let x = 0; x < w; x += 7 + rnd() * 6) {
      const alto = 12 + rnd() * 26;
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + (rnd() - 0.5) * 10, h - alto);
      ctx.stroke();
    }
  },
  juncos(ctx, w, h, c, rnd) {
    for (let x = 0; x < w; x += 9 + rnd() * 10) {
      const alto = 30 + rnd() * 60;
      ctx.strokeStyle = rnd() < 0.5 ? c : shade(c, 0.15);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.quadraticCurveTo(x + 6, h - alto / 2, x + (rnd() - 0.5) * 16, h - alto);
      ctx.stroke();
      if (rnd() < 0.15) {
        ctx.fillStyle = "#6b4a2a";
        ctx.fillRect(x - 3, h - alto - 4, 7, 18);
      }
    }
  },
  helechos(ctx, w, h, c, rnd) {
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w,
        r = 26 + rnd() * 24;
      wrap(w, x, (px) => {
        ctx.fillStyle = i % 2 ? c : shade(c, 0.15);
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath();
          ctx.ellipse(px + k * 10, h - r * 0.6, 8, r * 0.7, k * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  },
};

function layerTexture(scene, key, alto, draw) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, TILE_W, alto);
  const ctx = tex.getContext();
  draw(ctx);
  tex.refresh();
  return key;
}

function skyTexture(scene, key, [top, bottom], w, h) {
  return layerTexture(scene, key, h, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

function groundTexture(scene, key, { color, borde }, alto) {
  return layerTexture(scene, key, alto, (ctx) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, TILE_W, alto);
    const rnd = mulberry32(99);
    ctx.fillStyle = shade(color, -0.15);
    for (let i = 0; i < 140; i++) ctx.fillRect(rnd() * TILE_W, 20 + rnd() * (alto - 20), 6, 4);
    ctx.fillStyle = borde;
    ctx.fillRect(0, 0, TILE_W, 14);
    ctx.fillStyle = shade(borde, -0.12);
    for (let x = 0; x < TILE_W; x += 16) ctx.fillRect(x, 12, 8, 5);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(0, 0, TILE_W, 2);
  });
}

// Crea las capas del paisaje en la escena (fijas a la cámara) y devuelve `update(scrollX)`.
// Fondo ilustrado: dos capas (paisaje y camino) ubicadas para que el camino quede bajo los pies.
function createImageParallax(scene, paisajeId, info, { width, groundY }) {
  scene.cameras.main.setBackgroundColor(info.cielo);
  const dy = groundY - info.piso; // corrimiento vertical para alinear el piso de la imagen con el del juego
  const capa = (nombre, y, alto, depth) =>
    scene.add
      .tileSprite(0, y, width, alto, ASSETS.FONDO(paisajeId, nombre))
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(depth);
  const layers = [
    { tile: capa("fondo", dy + (info.fondoDy ?? 0), info.altoFondo ?? info.corte, -15), factor: FACTOR_IMAGEN.fondo },
    // El suelo llega siempre hasta abajo de la pantalla (algunos suelos son más bajos y quedaba una franja).
    {
      tile: capa("suelo", dy + info.corte, Math.max(info.alto - info.corte, 720 - dy - info.corte), -5),
      factor: FACTOR_IMAGEN.suelo,
    },
  ];
  return {
    imagen: true,
    update(scrollX) {
      for (const l of layers) l.tile.tilePositionX = scrollX * l.factor;
    },
  };
}

export function createParallax(scene, paisajeId, paisaje, { width, height, groundY }) {
  const ilustrado = scene.cache.json.get(ASSETS.FONDOS_MANIFEST)?.tramos?.[paisajeId];
  if (ilustrado && scene.textures.exists(ASSETS.FONDO(paisajeId, "fondo")))
    return createImageParallax(scene, paisajeId, ilustrado, { width, groundY });

  const sky = scene.add
    .image(0, 0, skyTexture(scene, `px-${paisajeId}-cielo`, paisaje.cielo, TILE_W, height))
    .setOrigin(0)
    .setDisplaySize(width, height)
    .setScrollFactor(0)
    .setDepth(-20);

  const layers = Object.entries(CAPAS).map(([nombre, cfg], i) => {
    const def = paisaje[nombre];
    const key = layerTexture(scene, `px-${paisajeId}-${nombre}`, cfg.alto, (ctx) =>
      DIBUJOS[def.tipo](ctx, TILE_W, cfg.alto, def.color, mulberry32(nombre.length * 131 + i), def)
    );
    const tile = scene.add
      .tileSprite(0, cfg.base - cfg.alto, width, cfg.alto, key)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-15 + i);
    return { tile, factor: cfg.factor };
  });

  const groundH = height - groundY + 10;
  const ground = scene.add
    .tileSprite(0, groundY - 10, width, groundH, groundTexture(scene, `px-${paisajeId}-suelo`, paisaje.suelo, groundH))
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(-5);
  layers.push({ tile: ground, factor: 1 });

  return {
    sky,
    update(scrollX) {
      for (const l of layers) l.tile.tilePositionX = scrollX * l.factor;
    },
  };
}
