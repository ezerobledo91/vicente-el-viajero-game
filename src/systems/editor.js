// Editor de tramos (?editor, ?editor=N para abrir el tramo N): se recorre el tramo sin jugar y se
// ajusta a mano lo que el generador no deja bien. Todo se guarda solo en public/assets/ajustes.json.
//   · Flechas o rueda: moverse por el tramo.
//   · Arrastrar un adorno o cartel: moverlo. Shift + flechas: moverlo de a 1 px.
//   · + / −: tamaño de ese tipo de adorno (en todos los tramos). Supr: ocultarlo en este tramo.
//     R: volverlo a su lugar.
//   · Botones de arriba: fondo, suelo, agua de los pozos y orillas del paisaje.
//   · Agregar (paleta), Cambiar (otro dibujo en su lugar), Texto (T) y Borrar (Supr).
import Phaser from "phaser";
import { COLORS, FONT, GAME_WIDTH } from "../config/constants.js";
import { Button } from "../ui/Button.js";
import { getViaje } from "../data/viajes/index.js";
import { getAjustes, guardarAjustes } from "./ajustes.js";
import { PALETA, TABLAS } from "../data/decoracion.js";

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
  ["Orillas <>", "orillaDx", PASO],
  ["Orillas ><", "orillaDx", -PASO],
  ["Orillas ^", "orillaDy", -PASO],
  ["Orillas v", "orillaDy", PASO],
];

const ESTILO_BOTON =
  "background:#22384d;color:#fff;border:2px solid #35536f;border-radius:8px;cursor:pointer;font-family:inherit;font-size:9px;";

const limpiar = (obj) => {
  for (const [k, v] of Object.entries(obj)) if (!v) delete obj[k];
};

export class Editor {
  constructor(scene, groundY = 600) {
    this.s = scene;
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
    this.teclas(scene);
    scene.events.once("shutdown", () => this.cerrar());
    // Al redibujar sigue elegido lo que estaba elegido (o lo recién agregado).
    if (scene.editorSel) this.elegir(scene.editables.find((e) => e.editId === scene.editorSel) ?? null);
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
      262,
      50,
      `Tramo ${scene.tramoIndex}: ${scene.desde.nombre} > ${scene.hasta.nombre}`,
      10,
      "#ffb83d"
    );
    this.valores = texto(262, 68, "", 7);
    this.estado = texto(GAME_WIDTH - 250, 88, "", 8, "#8ff09a");
    this.elegido = texto(16, 88, "", 8, "#ffffff");
    this.ayuda = texto(
      16,
      106,
      "Flechas/rueda: moverse · Arrastrar: mover · +/-: tamaño (todos de ese tipo) · T: texto · Supr: borrar/ocultar · R: a su lugar · Shift+flechas: 1 px",
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
      `${this.paisaje} · fondo ${v("fondoDy")} · suelo ${v("sueloDy")} · agua ${v("aguaDy")} · orillas ${v("orillaDx")} / ${v("orillaDy")}`
    );
  }

  mostrarElegido() {
    const o = this.sel;
    if (!o) {
      this.elegido.setText("Tocá un adorno o cartel para elegirlo.");
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
    for (const img of scene.editables) {
      img.setInteractive({ useHandCursor: true });
      scene.input.setDraggable(img);
    }
    scene.input.on("dragstart", (_p, obj) => this.elegir(obj));
    scene.input.on("drag", (_p, obj, x, y) => this.mover(obj, Math.round(x) - obj.x, Math.round(y) - obj.y));
    scene.input.on("dragend", (_p, obj) => this.guardarObjeto(obj));
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
  paleta(modo) {
    if (modo === "cambiar" && !this.sel) return this.avisar("Primero elegí qué cambiar", "#ffd27a");
    const botones = PALETA.map(
      (k) =>
        `<button data-k="${k}" style="${ESTILO_BOTON}width:112px;height:112px;margin:4px;vertical-align:top">` +
        `<img src="assets/decoracion/${k}.png" style="max-width:92px;max-height:76px;display:block;margin:0 auto 6px">` +
        `<span style="font-size:7px;color:#cfe3ef">${k}</span></button>`
    ).join("");
    const titulo = modo === "agregar" ? "Agregar un adorno" : "Cambiar por…";
    this.abrir(
      `<div style="margin-bottom:10px;color:#ffb83d">${titulo}</div>${botones}` +
        `<div style="margin-top:10px"><button data-k="" style="${ESTILO_BOTON}padding:8px 14px">Cancelar</button></div>`,
      (d) =>
        d.querySelectorAll("button[data-k]").forEach((b) =>
          b.addEventListener("click", () => {
            const k = b.dataset.k;
            if (!k) return this.cerrar();
            if (modo === "agregar") this.agregar(k);
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
    if (!o) return this.avisar("Primero elegí un cartel", "#ffd27a");
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
