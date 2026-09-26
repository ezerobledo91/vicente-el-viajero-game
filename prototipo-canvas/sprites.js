// Sprites pixel-art del juego "Explorador del Mundo".
// Cada sprite mide 16x20 px y se arma con: cabeza (según peinado) + cuerpo + piernas (según frame)
// + un overlay propio de cada personaje (mochila, bigote, pollera, etc.).
//
// Claves de color:
//   .  transparente     O  contorno        S  piel          c  rubor
//   m  boca             E  ojos            H  pelo          T  remera
//   P  pantalón/pollera B  zapatos         X  sombrero      K  mochila
//   M  bigote           G  anteojos
// Una letra minúscula (h, t, x, k...) es la versión sombreada de su mayúscula.

(function () {
  const W = 16;
  const H = 20;

  const HEADS = {
    short: {
      down: [
        "....OOOOOOOO....",
        "...OHHHHHHHHO...",
        "..OHHHHHHHHHHO..",
        "..OHHhHHHHhHHO..",
        "..OHSSSSSSSSHO..",
        "..OSSESSSSESSO..",
        "..OSSESSSSESSO..",
        "..OScSSSSSScSO..",
        "...OSSSmmSSSO...",
        "....OOSSSSOO....",
      ],
      up: [
        "....OOOOOOOO....",
        "...OHHHHHHHHO...",
        "..OHHHHHHHHHHO..",
        "..OHHHHHHHHHHO..",
        "..OHHhHHHHhHHO..",
        "..OHHHHHHHHHHO..",
        "..OHHHHHHHHHHO..",
        "..OhHHHHHHHHhO..",
        "...OhhhhhhhhO...",
        "....OOSSSSOO....",
      ],
      right: [
        ".....OOOOOO.....",
        "....OHHHHHHO....",
        "...OHHHHHHHHO...",
        "...OHHHHHHHHO...",
        "...OHHHHSSSSO...",
        "...OHHHSSSESO...",
        "...OHhSSSSESO...",
        "...OHhSSSScSSO..",
        "....OHSSSSmSO...",
        ".....OOSSSOO....",
      ],
    },
    long: {
      down: [
        "....OOOOOOOO....",
        "...OHHHHHHHHO...",
        "..OHHHHHHHHHHO..",
        "..OHHHHHHHHHHO..",
        "..OHHSSSSSSHHO..",
        "..OHSESSSSESHO..",
        "..OHSESSSSESHO..",
        "..OHcSSSSSScHO..",
        "..OHHSSmmSSHHO..",
        "..OHHOSSSSOHHO..",
      ],
      up: [
        "....OOOOOOOO....",
        "...OHHHHHHHHO...",
        "..OHHHHHHHHHHO..",
        "..OHHHHHHHHHHO..",
        "..OHHHHHHHHHHO..",
        "..OHHHHHHHHHHO..",
        "..OHHHHHHHHHHO..",
        "..OHHHHHHHHHHO..",
        "..OhHHHHHHHHhO..",
        "..OhhhhhhhhhhO..",
      ],
      right: [
        ".....OOOOOO.....",
        "....OHHHHHHO....",
        "...OHHHHHHHHO...",
        "...OHHHHHHHHO...",
        "...OHHHHHSSSO...",
        "...OHHHSSSESO...",
        "...OHHHSSSESO...",
        "...OHHHSSScSSO..",
        "...OHHHSSSmSO...",
        "...OhhhOSSSO....",
      ],
    },
    bun: {
      down: [
        ".....OOOOOO.....",
        "....OHHHHHHO....",
        "..OOHhhhhhhHOO..",
        "..OHHHHHHHHHHO..",
        "..OHSSSSSSSSHO..",
        "..OSGEGSSGEGSO..",
        "..OSSSSSSSSSSO..",
        "..OScSSSSSScSO..",
        "...OSSSmmSSSO...",
        "....OOSSSSOO....",
      ],
      up: [
        ".....OOOOOO.....",
        "....OHHHHHHO....",
        "..OOHhhhhhhHOO..",
        "..OHHHHHHHHHHO..",
        "..OHHHHHHHHHHO..",
        "..OHHHHHHHHHHO..",
        "..OHHHHHHHHHHO..",
        "..OhHHHHHHHHhO..",
        "...OhhhhhhhhO...",
        "....OOSSSSOO....",
      ],
      right: [
        "..OOO.OOOOO.....",
        ".OHHHOHHHHHO....",
        ".OHHhHHHHHHHO...",
        "..OOHHHHHHHHO...",
        "...OHHHHSSSSO...",
        "...OHHSSSGEGO...",
        "...OHhSSSSSSO...",
        "...OHhSSSScSSO..",
        "....OHSSSSmSO...",
        ".....OOSSSOO....",
      ],
    },
    hat: {
      down: [
        ".....OOOOOO.....",
        "....OXXXXXXO....",
        "...OXXXXXXXXO...",
        "...OxxxxxxxxO...",
        ".OOXXXXXXXXXXOO.",
        "..OHHSSSSSSHHO..",
        "..OSSESSSSESSO..",
        "..OScSSSSSScSO..",
        "...OSSSmmSSSO...",
        "....OOSSSSOO....",
      ],
      up: [
        ".....OOOOOO.....",
        "....OXXXXXXO....",
        "...OXXXXXXXXO...",
        "...OxxxxxxxxO...",
        ".OOXXXXXXXXXXOO.",
        "..OHHHHHHHHHHO..",
        "..OHHHHHHHHHHO..",
        "..OhHHHHHHHHhO..",
        "...OhhhhhhhhO...",
        "....OOSSSSOO....",
      ],
      right: [
        ".....OOOOOO.....",
        "....OXXXXXXO....",
        "....OXXXXXXO....",
        "....OxxxxxxO....",
        ".OOOXXXXXXXXOOO.",
        "...OHHHSSSESO...",
        "...OHhSSSSESO...",
        "...OHhSSSScSSO..",
        "....OHSSSSmSO...",
        ".....OOSSSOO....",
      ],
    },
  };

  const BODY_FRONT = [
    "..OTTTTTTTTTTO..",
    ".OTOTTTTTTTTOTO.",
    ".OTOTTTTTTTTOTO.",
    ".OSOttttttttOSO.",
    "..OOPPPPPPPPOO..",
    "...OPPPPPPPPO...",
  ];
  const BODY = {
    down: BODY_FRONT,
    up: BODY_FRONT,
    right: [
      "....OTTTTTTO....",
      "....OTTTOTTO....",
      "....OTTTOTTO....",
      "....OtttSttO....",
      "....OPPPPPPO....",
      "....OPPPPPPO....",
    ],
  };

  const LEGS_FRONT = {
    stand: [
      "...OPPPOOPPPO...",
      "...OPPPOOPPPO...",
      "...OBBBOOBBBO...",
      "...OOOOOOOOOO...",
    ],
    a: [
      "...OPPPOOPPPO...",
      "...OBBBOOPPPO...",
      "...OOOOOOBBBO...",
      "........OOOOO...",
    ],
    b: [
      "...OPPPOOPPPO...",
      "...OPPPOOBBBO...",
      "...OBBBOOOOOO...",
      "...OOOOO........",
    ],
  };
  const LEGS = {
    down: LEGS_FRONT,
    up: LEGS_FRONT,
    right: {
      stand: [
        ".....OPPPPO.....",
        ".....OPPPPO.....",
        ".....OBBBBBO....",
        ".....OOOOOOO....",
      ],
      a: [
        "....OPPOOPPO....",
        "...OPPO..OPPO...",
        "..OBBBO..OBBBO..",
        "..OOOOO..OOOOO..",
      ],
    },
  };

  // Ciclo de caminata de 4 frames por dirección.
  const WALK = {
    down: ["stand", "a", "stand", "b"],
    up: ["stand", "a", "stand", "b"],
    right: ["stand", "a", "stand", "a"],
  };

  const BASE_COLORS = {
    O: "#2a1d1a",
    E: "#1e1a2e",
    m: "#9a3b3b",
    c: "#f19a8f",
  };

  const CHARACTERS = {
    explorador: {
      nombre: "Explorador",
      rol: "Tu hijo (el jugador)",
      head: "hat",
      colors: {
        S: "#f7c9a2", H: "#6b3e1f", T: "#ff8c1a", P: "#3f7fd9",
        B: "#7a4a2a", X: "#e0c07a", x: "#8a6a2f", K: "#3aa655",
      },
      overlay: {
        down: {
          10: "....K......K....",
          11: "....K......K....",
          12: "....K......K....",
        },
        up: {
          10: "....OOOOOOOO....",
          11: "....OKKKKKKO....",
          12: "....OKkkkkKO....",
          13: "....OKKKKKKO....",
          14: "....OOOOOOOO....",
        },
        right: {
          10: ".OOOO...........",
          11: ".OKKO...........",
          12: ".OKKO...........",
          13: ".OkkO...........",
          14: ".OOOO...........",
        },
      },
    },
    papa: {
      nombre: "Papá",
      rol: "Familia",
      head: "short",
      colors: {
        S: "#eab48c", H: "#2e2018", M: "#3b281c", T: "#2f6fb3",
        P: "#3a3a4a", B: "#222222",
      },
      overlay: {
        down: { 8: "...OSSMMMMSSO..." },
        right: { 8: "....OHSSSMMSO..." },
      },
    },
    mama: {
      nombre: "Mamá",
      rol: "Familia",
      head: "long",
      colors: {
        S: "#f5c3a0", H: "#a0521d", T: "#e0468f", P: "#6b3fa0",
        B: "#5a2a1a",
      },
      overlay: {
        down: { 15: "..OPPPPPPPPPPO.." },
        up: { 15: "..OPPPPPPPPPPO.." },
        right: { 10: "...OhhO.........", 15: "...OPPPPPPPPO..." },
      },
    },
    abuela: {
      nombre: "Abuela",
      rol: "Familia",
      head: "bun",
      colors: {
        S: "#f0c4a4", H: "#d9d9e3", G: "#3b3b4f", T: "#9b7bd0",
        P: "#5d4f86", B: "#4a3a3a",
      },
      overlay: {
        down: { 15: "..OPPPPPPPPPPO.." },
        up: { 15: "..OPPPPPPPPPPO.." },
        right: { 15: "...OPPPPPPPPO..." },
      },
    },
  };

  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
    const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function colorFor(ch, char) {
    if (char.colors[ch]) return char.colors[ch];
    if (BASE_COLORS[ch]) return BASE_COLORS[ch];
    const upper = ch.toUpperCase();
    if (upper !== ch && char.colors[upper]) return shade(char.colors[upper], 0.25);
    return null;
  }

  function buildGrid(id, dir, frame) {
    const char = CHARACTERS[id];
    const mirror = dir === "left";
    const d = mirror ? "right" : dir;
    const legKey = WALK[d][frame % 4];
    const rows = [
      ...HEADS[char.head][d],
      ...BODY[d],
      ...LEGS[d][legKey],
    ].map((r) => r.split(""));

    const ov = (char.overlay && char.overlay[d]) || {};
    for (const [y, line] of Object.entries(ov)) {
      line.split("").forEach((ch, x) => {
        if (ch !== ".") rows[y][x] = ch;
      });
    }
    if (mirror) rows.forEach((r) => r.reverse());
    return rows;
  }

  // Cache de frames ya dibujados en canvas (1px = 1px del sprite).
  const cache = new Map();
  function getFrame(id, dir, frame) {
    const key = `${id}|${dir}|${frame % 4}`;
    if (cache.has(key)) return cache.get(key);
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d");
    const char = CHARACTERS[id];
    buildGrid(id, dir, frame).forEach((row, y) =>
      row.forEach((ch, x) => {
        if (ch === ".") return;
        const col = colorFor(ch, char);
        if (!col) return;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      })
    );
    cache.set(key, cv);
    return cv;
  }

  function draw(ctx, id, dir, frame, x, y, scale) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(getFrame(id, dir, frame), Math.round(x), Math.round(y), W * scale, H * scale);
  }

  // Validación rápida: todas las filas deben medir 16.
  function validate() {
    const bad = [];
    const check = (name, rows) =>
      rows.forEach((r, i) => r.length !== W && bad.push(`${name}[${i}] mide ${r.length}`));
    for (const [h, dirs] of Object.entries(HEADS))
      for (const [d, rows] of Object.entries(dirs)) check(`head.${h}.${d}`, rows);
    for (const [d, rows] of Object.entries(BODY)) check(`body.${d}`, rows);
    for (const [d, fr] of Object.entries(LEGS))
      for (const [f, rows] of Object.entries(fr)) check(`legs.${d}.${f}`, rows);
    for (const [id, c] of Object.entries(CHARACTERS))
      for (const [d, ov] of Object.entries(c.overlay || {}))
        for (const [y, r] of Object.entries(ov)) check(`${id}.overlay.${d}.${y}`, [r]);
    return bad;
  }

  const api = { W, H, CHARACTERS, DIRS: ["down", "left", "right", "up"], buildGrid, getFrame, draw, validate };
  if (typeof module !== "undefined") module.exports = api;
  else window.Sprites = api;
})();
