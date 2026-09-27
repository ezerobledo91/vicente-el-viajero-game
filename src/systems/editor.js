// Editor de tramos (?editor, ?editor=N para abrir el tramo N): se recorre el tramo sin jugar y se
// ajusta a mano lo que el generador no deja bien. Todo se guarda solo en public/assets/ajustes.json.
//   · Flechas o rueda: moverse por el tramo.
//   · Arrastrar un adorno o cartel: moverlo. Shift + flechas: moverlo de a 1 px.
//   · + / −: tamaño de ese tipo de adorno (en todos los tramos). Supr: ocultarlo en este tramo.
//     R: volverlo a su lugar.
//   · Botones de arriba: fondo, suelo, agua de los pozos y orillas del paisaje.
import Phaser from "phaser";
import { COLORS, FONT, GAME_WIDTH } from "../config/constants.js";
import { Button } from "../ui/Button.js";
import { getViaje } from "../data/viajes/index.js";
import { getAjustes, guardarAjustes } from "./ajustes.js";

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
  }

  // ---------- Interfaz ----------
  panel(scene) {
    const fijo = (o) => o.setScrollFactor(0, 0, true).setDepth(100);
    fijo(scene.add.graphics().fillStyle(0x0b1a2a, 0.85).fillRect(0, 0, GAME_WIDTH, 112));
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
    this.valores = texto(262, 68, "", 8);
    this.estado = texto(GAME_WIDTH - 360, 58, "", 8, "#8ff09a");
    this.elegido = texto(16, 94, "", 8, "#ffffff");
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
      this.elegido.setText(
        "Flechas/rueda: moverse · Arrastrá un adorno · +/-: tamaño (todos de ese tipo) · Supr: ocultar · R: a su lugar · Shift+flechas: de a 1 px"
      );
      return;
    }
    const a = this.aj.objetos[this.s.tramoIndex]?.[o.editId] ?? {};
    const escala = this.aj.escalas[o.texture.key] ?? 1;
    this.elegido.setText(
      `${o.editId} · tamaño x${escala.toFixed(2)} · corrido (${a.dx ?? 0}, ${a.dy ?? 0})${a.oculto ? " · OCULTO" : ""}`
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
      this.reiniciar(this.s.tramoIndex, this.s.cameras.main.scrollX)
    );
  }

  reiniciar(tramo, x) {
    try {
      history.replaceState(null, "", `${location.pathname}?editor=${tramo}`);
    } catch {
      // Sin historial: no pasa nada, solo no queda recordado al recargar.
    }
    this.s.scene.restart({ paisId: this.s.paisId, tramo, editorX: x });
  }

  // ---------- Teclado y cámara ----------
  teclas(scene) {
    this.shift = scene.input.keyboard.addKey("SHIFT");
    scene.input.on("wheel", (_p, _o, dx, dy) => this.desplazar(dx + dy));
    scene.input.keyboard.on("keydown", (e) => {
      if (e.key === "+" || e.key === "=") this.escalar(ZOOM_TAMANO);
      else if (e.key === "-") this.escalar(1 / ZOOM_TAMANO);
      else if (e.key === "Delete" || e.key === "Backspace") this.ocultar();
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
    p.setPosition(cam.scrollX + 330, 600);
    this.marco.clear();
    if (this.sel?.active) {
      const b = this.sel.getBounds();
      this.marco.lineStyle(2, 0xffd23d, 1).strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
    }
  }
}
