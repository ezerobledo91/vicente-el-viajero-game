// Editor de tramos (?editor, ?editor=N para abrir el tramo N): se recorre el tramo sin jugar y se
// ajusta a mano lo que el generador no deja bien. Todo se guarda solo en public/assets/ajustes.json.
//   · Flechas o rueda: moverse por el tramo.
//   · Arrastrar un adorno o cartel: moverlo. Shift + flechas: moverlo de a 1 px.
//   · + / −: tamaño de ese tipo de adorno (en todos los tramos). Supr: ocultarlo en este tramo.
//     R: volverlo a su lugar.
//   · Botones de arriba: fondo, suelo, agua de los pozos y orillas del paisaje.
//   · Agregar (paleta), Cambiar (otro dibujo en su lugar), Texto (T) y Borrar (Supr).
//   · Modo Recorrido (M): pozos, plataformas, piedras, estrellas, corazones, animales, perros, pájaros y
//     objetos se ven con un marco: se arrastran, se ensanchan (+/-, pozos y plataformas), se ocultan
//     o se agregan nuevos. El tramo se vuelve a armar con los cambios (así la física queda bien).
import Phaser from "phaser";
import { COLORS, FONT, GAME_WIDTH } from "../config/constants.js";
import { Button } from "../ui/Button.js";
import { getViaje } from "../data/viajes/index.js";
import { getAjustes, guardarAjustes } from "./ajustes.js";
import { PALETA, TABLAS } from "../data/decoracion.js";
import { ANIMALES } from "../data/animales.js";
import { NPCS } from "../data/npcs.js";
import { TIPOS_RECORRIDO, idNuevo } from "./recorrido.js";

// Modo del editor (queda al redibujar el tramo): "adornos" o "recorrido".
let modo = "adornos";
// Los que van siempre apoyados en el piso (solo se mueven para los costados).
const EN_EL_PISO = ["pozo", "roca", "perro", "animal", "npc"];
const ICONOS = {
  figurita: "⭐",
  vida: "❤️",
  objeto: "🎯",
  roca: "🪨",
  plataforma: "🟫",
  pozo: "🕳️",
  perro: "🐶",
  pajaro: "🐦",
  animal: "🐾",
  npc: "🧑",
};

const VELOCIDAD = 900; // px/seg con las flechas
const PASO = 4; // px por toque en los botones del paisaje
const ZOOM_TAMANO = 1.05;
const REINICIO_MS = 350; // espera antes de redibujar el tramo (por si se tocan varios botones seguidos)

// Botones del paisaje: [texto, campo, cuánto suma].
const BOTONES_PAISAJE = [
  ["Fondo ^", "fondoDy", -PASO],
  ["Fondo v", "fondoDy", PASO],
  ["Suelo ^", "sueloDy", -PASO],
  ["Suelo v", "sueloDy", PASO],
  ["Agua ^", "aguaDy", -PASO],
  ["Agua v", "aguaDy", PASO],
  ["Barranca +", "orillaDx", PASO],
  ["Barranca -", "orillaDx", -PASO],
  ["Barranca ^", "orillaDy", -PASO],
  ["Barranca v", "orillaDy", PASO],
];

const ESTILO_BOTON =
  "background:#22384d;color:#fff;border:2px solid #35536f;border-radius:8px;cursor:pointer;font-family:inherit;font-size:9px;";

const limpiar = (obj) => {
  for (const [k, v] of Object.entries(obj)) if (!v) delete obj[k];
};

export class Editor {
  constructor(scene, groundY = 600) {
    this.s = scene;
    this.groundY = groundY;
    this.marcas = [];
    this.aj = getAjustes(scene);
    this.paisaje = scene.tramo.paisaje;
    this.sel = null;

    scene.physics.pause();
    scene.player.body.enable = false;
    const cam = scene.cameras.main;
    cam.stopFollow();
    cam.setScroll(Phaser.Math.Clamp(scene.editorX, 0, scene.largo - cam.width), 0);

    // Línea del piso (donde apoyan los pies de Vicente) y marco del adorno elegido.
    scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(90)
      .fillStyle(0xff2244, 0.95)
      .fillRect(0, groundY - 2, GAME_WIDTH, 3);
    this.marco = scene.add.graphics().setDepth(91);

    this.panel(scene);
    this.adornos(scene);
    if (modo === "recorrido") this.ponerMarcas(scene);
    this.teclas(scene);
    scene.events.once("shutdown", () => this.cerrar());
    // Al redibujar sigue elegido lo que estaba elegido (o lo recién agregado).
    if (scene.editorSel)
      this.elegir([...scene.editables, ...this.marcas].find((e) => e.editId === scene.editorSel) ?? null);
  }

  // ---------- Interfaz ----------
  panel(scene) {
    const fijo = (o) => o.setScrollFactor(0, 0, true).setDepth(100);
    fijo(scene.add.graphics().fillStyle(0x0b1a2a, 0.85).fillRect(0, 0, GAME_WIDTH, 116));
    const texto = (x, y, s, size, color = COLORS.ink) =>
      fijo(scene.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color }).setOrigin(0, 0.5));

    BOTONES_PAISAJE.forEach(([label, campo, delta], k) =>
      fijo(
        new Button(scene, 66 + k * 124, 22, label, () => this.cambiarPaisaje(campo, delta), {
          width: 118,
          height: 28,
          fontSize: 8,
        })
      )
    );

    const tramos = getViaje(scene.paisId).tramos.length;
    const ir = (d) => this.reiniciar(Phaser.Math.Clamp(scene.tramoIndex + d, 0, tramos - 1), 0);
    fijo(
      new Button(scene, 66, 58, "< Tramo", () => ir(-1), { width: 118, height: 28, fontSize: 8, variant: "secondary" })
    );
    fijo(
      new Button(scene, 190, 58, "Tramo >", () => ir(1), { width: 118, height: 28, fontSize: 8, variant: "secondary" })
    );
    fijo(
      new Button(scene, 314, 58, modo === "adornos" ? "Modo: Adornos" : "Modo: Recorrido", () => this.cambiarModo(), {
        width: 118,
        height: 28,
        fontSize: 7,
      })
    );
    const acciones = [
      ["Agregar", () => this.paleta("agregar")],
      ["Cambiar", () => this.paleta("cambiar")],
      ["Texto", () => this.editarTexto()],
      ["Borrar", () => this.borrar()],
    ];
    acciones.forEach(([label, fn], k) =>
      fijo(
        new Button(scene, 716 + k * 124, 58, label, fn, { width: 118, height: 28, fontSize: 8, variant: "secondary" })
      )
    );
    fijo(
      new Button(scene, GAME_WIDTH - 70, 58, "Jugar", () => (location.href = `${location.pathname}?prueba`), {
        width: 118,
        height: 28,
        fontSize: 8,
      })
    );
    this.titulo = texto(
      386,
      50,
      `Tramo ${scene.tramoIndex}: ${scene.desde.nombre} > ${scene.hasta.nombre}`,
      8,
      "#ffb83d"
    );
    this.valores = texto(386, 68, "", 6);
    this.estado = texto(GAME_WIDTH - 250, 88, "", 8, "#8ff09a");
    this.elegido = texto(16, 88, "", 7, "#ffffff");
    this.ayuda = texto(
      16,
      106,
      modo === "adornos"
        ? "Flechas/rueda: moverse · Arrastrar: mover · +/-: tamaño (todos de ese tipo) · T: texto · Supr: borrar/ocultar · R: a su lugar · M: modo"
        : "Flechas/rueda: moverse · Arrastrar: mover · +/-: ancho (pozos y plataformas) · Supr: sacar/volver a poner · R: como estaba · M: modo",
      7,
      COLORS.muted
    );
    this.mostrarValores();
    this.mostrarElegido();
  }

  mostrarValores() {
    const p = this.aj.paisajes[this.paisaje] ?? {};
    const v = (k) => `${p[k] > 0 ? "+" : ""}${p[k] ?? 0}`;
    this.valores.setText(
      `${this.paisaje} · fondo ${v("fondoDy")} · suelo ${v("sueloDy")} · agua ${v("aguaDy")} · barranca ${v("orillaDx")} / ${v("orillaDy")}`
    );
  }

  mostrarElegido() {
    const o = this.sel;
    if (!o) {
      this.elegido.setText(
        modo === "adornos" ? "Tocá un adorno o cartel para elegirlo." : "Tocá un marco para elegirlo."
      );
      return;
    }
    if (o.esMarca) {
      const it = o.item;
      const alto = EN_EL_PISO.includes(it.tipo) ? "" : ` · altura ${Math.round(it.y ?? 0)}`;
      const ancho = it.w ? ` · ancho ${Math.round(it.w)}` : "";
      this.elegido.setText(
        `${this.nombreDe(it)}${it.agregado ? " (agregado)" : ""} · x ${Math.round(it.x)}${alto}${ancho}${it.oculto ? " · SACADO" : ""}`
      );
      return;
    }
    const a = this.aj.objetos[this.s.tramoIndex]?.[o.editId] ?? {};
    const escala = this.aj.escalas[o.texture.key] ?? 1;
    this.elegido.setText(
      `${o.agregado ? "Agregado" : o.editId} · ${o.texture.key} · tamaño x${escala.toFixed(2)} · corrido (${a.dx ?? 0}, ${a.dy ?? 0})${a.oculto ? " · OCULTO" : ""}`
    );
  }

  // ---------- Adornos: elegir, arrastrar, agrandar, ocultar ----------
  adornos(scene) {
    if (modo === "adornos")
      for (const img of scene.editables) {
        img.setInteractive({ useHandCursor: true });
        scene.input.setDraggable(img);
      }
    scene.input.on("dragstart", (_p, obj) => this.elegir(obj));
    scene.input.on("drag", (_p, obj, x, y) => {
      const fijoY = obj.esMarca && EN_EL_PISO.includes(obj.item.tipo);
      this.mover(obj, Math.round(x) - obj.x, fijoY ? 0 : Math.round(y) - obj.y);
    });
    scene.input.on("dragend", (_p, obj) => (obj.esMarca ? this.guardarMarca(obj) : this.guardarObjeto(obj)));
    scene.input.on("pointerdown", (_p, objetos) => {
      if (!objetos.length) this.elegir(null);
    });
  }

  elegir(obj) {
    this.sel = obj && obj.editId ? obj : null;
    this.mostrarElegido();
  }

  mover(obj, dx, dy) {
    obj.x += dx;
    obj.y += dy;
    for (const t of obj.adjuntos) {
      t.x += dx;
      t.y += dy;
    }
  }

  ajusteDe(obj) {
    const tramo = (this.aj.objetos[this.s.tramoIndex] ??= {});
    return (tramo[obj.editId] ??= {});
  }

  guardarObjeto(obj) {
    const a = this.ajusteDe(obj);
    a.dx = obj.x - obj.baseX;
    a.dy = obj.y - obj.baseY;
    this.ordenar();
    this.mostrarElegido();
    this.guardar();
  }

  escalar(factor) {
    const o = this.sel;
    if (!o) return;
    if (o.esMarca) return this.ensanchar(factor > 1 ? 20 : -20);
    const key = o.texture.key;
    const e = Math.round((this.aj.escalas[key] ?? 1) * factor * 1000) / 1000;
    this.aj.escalas[key] = e;
    for (const img of this.s.editables) if (img.texture.key === key) img.setScale((img.altoBase * e) / img.height);
    this.mostrarElegido();
    this.guardar();
    this.reiniciarLuego(); // los textos de los carteles se vuelven a ubicar
  }

  ocultar() {
    const o = this.sel;
    if (!o) return;
    if (o.fijo) return this.avisar("Ese no se puede ocultar (sin cartel no se llega a la ciudad)", "#ff8a96");
    const a = this.ajusteDe(o);
    a.oculto = !a.oculto;
    o.setAlpha(a.oculto ? 0.35 : 1);
    for (const t of o.adjuntos) t.setAlpha(a.oculto ? 0.35 : 1);
    this.ordenar();
    this.mostrarElegido();
    this.guardar();
  }

  aSuLugar() {
    const o = this.sel;
    if (!o) return;
    if (o.esMarca) {
      if (o.item.agregado) return;
      delete this.rec().cambios?.[o.editId];
      this.ordenarRec();
      return this.redibujar(o.editId);
    }
    this.mover(o, o.baseX - o.x, o.baseY - o.y);
    delete this.aj.objetos[this.s.tramoIndex]?.[o.editId];
    o.setAlpha(1);
    this.ordenar();
    this.mostrarElegido();
    this.guardar();
  }

  // Saca lo que quedó en cero (así el archivo solo tiene los cambios de verdad).
  ordenar() {
    const tramo = this.aj.objetos[this.s.tramoIndex];
    if (!tramo) return;
    for (const [id, a] of Object.entries(tramo)) {
      limpiar(a);
      if (!Object.keys(a).length) delete tramo[id];
    }
    if (!Object.keys(tramo).length) delete this.aj.objetos[this.s.tramoIndex];
  }

  // ---------- Agregar, cambiar, texto y borrar ----------
  agregados() {
    return ((this.aj.agregados ??= {})[this.s.tramoIndex] ??= []);
  }

  redibujar(sel) {
    this.guardar();
    this.reiniciar(this.s.tramoIndex, this.s.cameras.main.scrollX, sel);
  }

  borrar() {
    const o = this.sel;
    if (!o) return;
    if (o.esMarca) return this.sacarMarca(o);
    if (!o.agregado) return this.ocultar();
    const lista = this.agregados();
    const i = lista.findIndex((a) => `nuevo#${a.n}` === o.editId);
    if (i >= 0) lista.splice(i, 1);
    if (!lista.length) delete this.aj.agregados[this.s.tramoIndex];
    delete this.aj.objetos[this.s.tramoIndex]?.[o.editId];
    this.ordenar();
    this.redibujar(null);
  }

  // Paleta con todos los adornos: para agregar uno nuevo (en el medio de la pantalla) o para poner
  // otro dibujo en lugar del elegido.
  paleta(modoPaleta) {
    if (modo === "recorrido")
      return modoPaleta === "agregar"
        ? this.paletaRecorrido()
        : this.avisar("En el recorrido solo se agrega", "#ffd27a");
    if (modoPaleta === "cambiar" && !this.sel) return this.avisar("Primero elegí qué cambiar", "#ffd27a");
    const botones = PALETA.map(
      (k) =>
        `<button data-k="${k}" style="${ESTILO_BOTON}width:112px;height:112px;margin:4px;vertical-align:top">` +
        `<img src="assets/decoracion/${k}.png" style="max-width:92px;max-height:76px;display:block;margin:0 auto 6px">` +
        `<span style="font-size:7px;color:#cfe3ef">${k}</span></button>`
    ).join("");
    const titulo = modoPaleta === "agregar" ? "Agregar un adorno" : "Cambiar por…";
    this.abrir(
      `<div style="margin-bottom:10px;color:#ffb83d">${titulo}</div>${botones}` +
        `<div style="margin-top:10px"><button data-k="" style="${ESTILO_BOTON}padding:8px 14px">Cancelar</button></div>`,
      (d) =>
        d.querySelectorAll("button[data-k]").forEach((b) =>
          b.addEventListener("click", () => {
            const k = b.dataset.k;
            if (!k) return this.cerrar();
            if (modoPaleta === "agregar") this.agregar(k);
            else this.cambiar(k);
          })
        )
    );
  }

  agregar(key) {
    const lista = this.agregados();
    const n = lista.reduce((m, a) => Math.max(m, a.n), 0) + 1;
    lista.push({ n, key, x: Math.round(this.s.cameras.main.scrollX + GAME_WIDTH / 2) });
    this.redibujar(`nuevo#${n}`);
  }

  cambiar(key) {
    const o = this.sel;
    if (o.agregado) {
      const a = this.agregados().find((a) => `nuevo#${a.n}` === o.editId);
      if (a) a.key = key;
    } else {
      const a = this.ajusteDe(o);
      if (o.editId.startsWith(`${key}#`))
        delete a.key; // volvió a ser lo que era
      else a.key = key;
    }
    this.ordenar();
    this.redibujar(o.editId);
  }

  editarTexto() {
    const o = this.sel;
    if (!o || o.esMarca) return this.avisar("Primero elegí un cartel", "#ffd27a");
    if (!TABLAS[o.texture.key]) return this.avisar("Ese adorno no tiene dónde escribir", "#ffd27a");
    const escapar = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const boton = (a, texto) =>
      `<button data-a="${a}" style="${ESTILO_BOTON}padding:8px 14px;margin:0 4px">${texto}</button>`;
    this.abrir(
      `<div style="margin-bottom:10px;color:#ffb83d">Texto del cartel (un renglón por línea)</div>` +
        `<textarea rows="4" style="width:420px;font-family:inherit;font-size:13px;padding:8px;border-radius:6px">${escapar(
          (o.lineas ?? []).join("\n")
        )}</textarea>` +
        `<div style="margin-top:12px">${boton("ok", "Listo")}${boton("original", "El de siempre")}${boton("no", "Cancelar")}</div>`,
      (d) => {
        const area = d.querySelector("textarea");
        area.focus();
        d.querySelectorAll("button[data-a]").forEach((b) =>
          b.addEventListener("click", () => {
            if (b.dataset.a === "no") return this.cerrar();
            const a = this.ajusteDe(o);
            if (b.dataset.a === "original") delete a.texto;
            else {
              const lineas = area.value.split("\n").map((l) => l.trim());
              while (lineas.length && !lineas.at(-1)) lineas.pop();
              a.texto = lineas;
            }
            this.ordenar();
            this.redibujar(o.editId);
          })
        );
      }
    );
  }

  // Ventanita HTML encima del juego (mientras está abierta, el teclado es de la ventanita).
  abrir(html, armar) {
    this.cerrar();
    const d = document.createElement("div");
    d.style.cssText =
      "position:fixed;inset:0;background:rgba(5,12,20,.65);display:flex;align-items:center;" +
      'justify-content:center;z-index:1000;font-family:"Press Start 2P",monospace';
    d.innerHTML =
      '<div style="background:#16283a;border:3px solid #ffb83d;border-radius:12px;padding:18px;max-width:920px;' +
      `max-height:82vh;overflow:auto;color:#fff;font-size:11px;text-align:center">${html}</div>`;
    d.addEventListener("pointerdown", (e) => e.target === d && this.cerrar());
    document.body.appendChild(d);
    this.dom = d;
    this.s.input.keyboard.manager.enabled = false;
    armar(d);
  }

  cerrar() {
    if (!this.dom) return;
    this.dom.remove();
    this.dom = null;
    this.s.input.keyboard.manager.enabled = true;
  }

  // ---------- Recorrido: pozos, plataformas, premios, animales... ----------
  cambiarModo() {
    modo = modo === "adornos" ? "recorrido" : "adornos";
    this.reiniciar(this.s.tramoIndex, this.s.cameras.main.scrollX);
  }

  nombreDe(it) {
    if (it.tipo === "animal") return `Animal: ${ANIMALES[it.id]?.nombre ?? it.id}`;
    if (it.tipo === "npc") return `Personaje: ${NPCS[it.id]?.nombre ?? it.id}${it.regala ? " (regala el objeto)" : ""}`;
    if (it.tipo === "figurita" && it.especial)
      return it.especial.startsWith("tesoro-") ? "Tesoro" : `Especial (${it.especial})`;
    return TIPOS_RECORRIDO[it.tipo]?.nombre ?? it.tipo;
  }

  // Marco de cada cosa del recorrido, en el lugar del mundo donde está (coordenadas del tramo).
  ponerMarcas(scene) {
    const g = this.groundY;
    for (const it of scene.level.items) {
      const t = TIPOS_RECORRIDO[it.tipo];
      if (!t) continue;
      const y = g - (it.y ?? 0);
      const [cy, w, h] = {
        pozo: [g + 30, it.w, 60],
        plataforma: [y + 12, it.w, 26],
        roca: [g - 35, 80, 70],
        perro: [g - 30, 70, 60],
        animal: [g - 50, 90, 100],
        npc: [g - 70, 70, 140],
        pajaro: [y, 60, 40],
      }[it.tipo] ?? [y, 40, 40];
      const m = scene.add
        .rectangle(Math.round(it.x), Math.round(cy), w, h, t.color, 0.18)
        .setStrokeStyle(2, t.color, 1)
        .setDepth(92)
        .setAlpha(it.oculto ? 0.4 : 1);
      const etiqueta = scene.add
        .text(m.x, m.y - h / 2 - 8, this.nombreDe(it), {
          fontFamily: FONT,
          fontSize: "7px",
          color: "#ffffff",
          stroke: "#0b1a2a",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1)
        .setDepth(93)
        .setAlpha(m.alpha);
      Object.assign(m, { esMarca: true, item: it, editId: it.editId, adjuntos: [etiqueta], x0: m.x, y0: m.y });
      m.setInteractive({ useHandCursor: true });
      scene.input.setDraggable(m);
      this.marcas.push(m);
    }
  }

  rec() {
    return ((this.aj.recorrido ??= {})[this.s.tramoIndex] ??= {});
  }

  cambioDe(it) {
    const r = this.rec();
    return ((r.cambios ??= {})[it.editId] ??= {});
  }

  nuevoDe(it) {
    return (this.rec().nuevos ?? []).find((a) => idNuevo(a) === it.editId);
  }

  ordenarRec() {
    const t = this.s.tramoIndex;
    const r = this.aj.recorrido?.[t];
    if (!r) return;
    for (const [id, c] of Object.entries(r.cambios ?? {})) {
      limpiar(c);
      if (!Object.keys(c).length) delete r.cambios[id];
    }
    if (r.cambios && !Object.keys(r.cambios).length) delete r.cambios;
    if (r.nuevos && !r.nuevos.length) delete r.nuevos;
    if (!Object.keys(r).length) delete this.aj.recorrido[t];
  }

  guardarMarca(m) {
    const it = m.item;
    const dx = Math.round(m.x - m.x0),
      sube = EN_EL_PISO.includes(it.tipo) ? 0 : Math.round(m.y0 - m.y);
    if (!dx && !sube) return;
    if (it.agregado) {
      const a = this.nuevoDe(it);
      a.x += dx;
      if (sube) a.y = Math.round((it.y ?? 0) + sube);
    } else {
      const c = this.cambioDe(it);
      c.dx = (c.dx ?? 0) + dx;
      c.dy = (c.dy ?? 0) + sube;
    }
    this.ordenarRec();
    this.redibujar(it.editId);
  }

  ensanchar(d) {
    const it = this.sel.item;
    if (!it.w) return this.avisar("Solo los pozos y las plataformas cambian de ancho", "#ffd27a");
    if (it.agregado) {
      const a = this.nuevoDe(it);
      a.w = Math.max(40, Math.round(it.w + d));
    } else {
      const c = this.cambioDe(it);
      c.dw = (c.dw ?? 0) + d;
    }
    this.ordenarRec();
    this.redibujar(it.editId);
  }

  sacarMarca(m) {
    const it = m.item;
    if (it.agregado) {
      const r = this.rec();
      r.nuevos = (r.nuevos ?? []).filter((a) => idNuevo(a) !== it.editId);
      this.ordenarRec();
      return this.redibujar(null);
    }
    const c = this.cambioDe(it);
    c.oculto = !c.oculto;
    this.ordenarRec();
    this.redibujar(it.editId);
  }

  paletaRecorrido() {
    const opciones = [
      ...Object.entries(TIPOS_RECORRIDO)
        .filter(([tipo]) => tipo !== "animal" && tipo !== "npc")
        .map(([tipo, t]) => ({ tipo, texto: t.nombre, icono: ICONOS[tipo] })),
      ...[...new Set(this.s.tramo.animales)].map((especie) => ({
        tipo: "animal",
        especie,
        texto: ANIMALES[especie]?.nombre ?? especie,
        icono: ICONOS.animal,
      })),
      ...Object.entries(NPCS).map(([especie, p]) => ({ tipo: "npc", especie, texto: p.nombre, icono: ICONOS.npc })),
    ];
    const botones = opciones
      .map(
        (o, k) =>
          `<button data-i="${k}" style="${ESTILO_BOTON}width:132px;height:92px;margin:4px;vertical-align:top">` +
          `<div style="font-size:28px;margin-bottom:8px">${o.icono}</div><span style="font-size:8px">${o.texto}</span></button>`
      )
      .join("");
    this.abrir(
      `<div style="margin-bottom:10px;color:#ffb83d">Agregar al recorrido (aparece en el medio de la pantalla)</div>${botones}` +
        `<div style="margin-top:10px"><button data-i="-1" style="${ESTILO_BOTON}padding:8px 14px">Cancelar</button></div>`,
      (d) =>
        d.querySelectorAll("button[data-i]").forEach((b) =>
          b.addEventListener("click", () => {
            const o = opciones[Number(b.dataset.i)];
            if (!o) return this.cerrar();
            const r = this.rec();
            r.nuevos ??= [];
            const n = r.nuevos.reduce((mx, a) => Math.max(mx, a.n), 0) + 1;
            const nuevo = { n, tipo: o.tipo, x: Math.round(this.s.cameras.main.scrollX + GAME_WIDTH / 2) };
            if (o.especie) nuevo.especie = o.especie;
            r.nuevos.push(nuevo);
            this.redibujar(idNuevo(nuevo));
          })
        )
    );
  }

  // ---------- Paisaje ----------
  cambiarPaisaje(campo, delta) {
    const p = (this.aj.paisajes[this.paisaje] ??= {});
    p[campo] = (p[campo] ?? 0) + delta;
    limpiar(p);
    if (!Object.keys(p).length) delete this.aj.paisajes[this.paisaje];
    this.mostrarValores();
    this.guardar();
    this.reiniciarLuego();
  }

  // ---------- Guardar y redibujar ----------
  async guardar() {
    this.avisar("Guardando…", "#ffd27a");
    const ok = await guardarAjustes(this.s);
    if (this.estado.active)
      this.avisar(ok ? "Guardado" : "No se pudo guardar (¿está andando npm run dev?)", ok ? "#8ff09a" : "#ff8a96");
  }

  avisar(texto, color) {
    if (this.estado.active) this.estado.setText(texto).setColor(color);
  }

  reiniciarLuego() {
    this.timer?.remove();
    this.timer = this.s.time.delayedCall(REINICIO_MS, () =>
      this.reiniciar(this.s.tramoIndex, this.s.cameras.main.scrollX, this.sel?.editId)
    );
  }

  reiniciar(tramo, x, sel = null) {
    this.cerrar();
    try {
      history.replaceState(null, "", `${location.pathname}?editor=${tramo}`);
    } catch {
      // Sin historial: no pasa nada, solo no queda recordado al recargar.
    }
    this.s.scene.restart({ paisId: this.s.paisId, tramo, editorX: x, editorSel: sel });
  }

  // ---------- Teclado y cámara ----------
  teclas(scene) {
    this.shift = scene.input.keyboard.addKey("SHIFT");
    scene.input.on("wheel", (_p, _o, dx, dy) => this.desplazar(dx + dy));
    scene.input.keyboard.on("keydown", (e) => {
      if (this.dom) return; // escribiendo en un cuadro de texto
      if (e.key === "+" || e.key === "=") this.escalar(ZOOM_TAMANO);
      else if (e.key === "-") this.escalar(1 / ZOOM_TAMANO);
      else if (e.key === "Delete" || e.key === "Backspace") this.borrar();
      else if (e.key === "t" || e.key === "T") this.editarTexto();
      else if (e.key === "m" || e.key === "M") this.cambiarModo();
      else if (e.key === "r" || e.key === "R") this.aSuLugar();
      else if (e.shiftKey && this.sel && e.key.startsWith("Arrow")) {
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        this.mover(this.sel, ...d);
        this.guardarObjeto(this.sel);
      }
    });
  }

  desplazar(dx) {
    const cam = this.s.cameras.main;
    cam.setScroll(Phaser.Math.Clamp(cam.scrollX + dx, 0, this.s.largo - cam.width), 0);
  }

  update(delta) {
    const k = this.s.keys;
    if (!this.shift.isDown) {
      const dir = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
      if (dir) this.desplazar(dir * VELOCIDAD * (delta / 1000));
    }
    const cam = this.s.cameras.main;
    this.s.parallax.update(cam.scrollX);
    // Vicente queda parado en pantalla como referencia de tamaño.
    const p = this.s.player;
    p.setPosition(cam.scrollX + 60, 600).setAlpha(0.85); // en el borde, para no tapar nada
    this.marco.clear();
    if (this.sel?.active) {
      const b = this.sel.getBounds();
      this.marco.lineStyle(2, 0xffd23d, 1).strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
    }
  }
}
