import Phaser from "phaser";
import { musica } from "../systems/audio.js";
import { COLORS, FONT, GAME_WIDTH, PX_PER_CM, SCENES } from "../config/constants.js";
import { Character } from "../entities/Character.js";
import { Button } from "../ui/Button.js";
import { ANIMALES, COLECCIONABLES } from "../data/animales.js";
import { hasCharacter } from "../systems/characters.js";
import { animalesVistos, getPerfil, hitoPreguntas } from "../systems/progress.js";
import { formatoPuntos, puntajeTotal, puntosDe } from "../systems/puntaje.js";
import { VIAJES, getViaje } from "../data/viajes/index.js";
import { RAREZAS, STICKERS } from "../data/stickers.js";

const RAREZA = {
  común: { color: 0x9fb3c8, texto: "#9fb3c8" },
  especial: { color: 0x5fd068, texto: "#8ff09a" },
  rara: { color: 0x4aa8ff, texto: "#9fd0ff" },
  tesoro: { color: 0xffb83d, texto: "#ffd27a" },
};
// Zona de la lista (se ve por una cámara propia: lo que no entra se ve con scroll).
const LISTA = { x: 310, y: 128, w: 950, h: 586 };
const CARTA = { w: 124, h: 146, gap: 8, porFila: 7 };
const ANIMAL = { w: 92, h: 92, gap: 10, alto: 124, porFila: 9 };
const STICKER = { w: 124, h: 150, gap: 10, porFila: 7 };
const PESTANAS = [
  { id: "stickers", label: "Stickers" },
  { id: "coleccion", label: "Coleccionables" },
  { id: "animales", label: "Animales" },
];

// Lo de cada país: stickers de su álbum, coleccionables de sus tramos y animales de sus tramos.
const stickersDe = (paisId) => STICKERS.filter((s) => s.pais === paisId);
const coleccionablesDe = (viaje) => {
  const tramos = viaje.tramos.flatMap((t) => [t.especial, t.tesoro]).filter(Boolean);
  const unicos = [...new Set(tramos)];
  return [
    COLECCIONABLES.comun,
    ...unicos.filter((t) => !t.startsWith("tesoro-")),
    ...unicos.filter((t) => t.startsWith("tesoro-")),
  ];
};
const animalesDe = (viaje) => [...new Set(viaje.tramos.flatMap((t) => t.animales))];

// Perfil de Vicente: álbum de stickers, coleccionables juntados y animales vistos (en pestañas y por país).
export class PerfilScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PERFIL);
  }

  init(data) {
    this.volver = data?.volver ?? { scene: SCENES.MAPA };
    this.pestana = data?.pestana ?? "stickers";
  }

  create() {
    musica("tema");
    const perfil = getPerfil();
    const vistos = new Set(animalesVistos());

    this.add.graphics().fillStyle(0x0b1a2a, 0.65).fillRect(0, 0, GAME_WIDTH, 76);
    this.add
      .text(24, 26, "Perfil de Vicente", { fontFamily: FONT, fontSize: "20px", color: "#ffb83d" })
      .setOrigin(0, 0.5);
    const stickers = Object.keys(perfil.stickers ?? {}).length;
    // Hito de preguntas del país (por ahora Argentina): mejor resultado de cada ciudad.
    const hito = hitoPreguntas("ar");
    const hitoTotal = (getViaje("ar")?.ciudades.length ?? 0) * 5;
    this.add
      .text(
        24,
        56,
        `Stickers: ${stickers}/${STICKERS.length} · Animales: ${vistos.size} · Preguntas: ${hito.aciertos}/${hitoTotal}`,
        { fontFamily: FONT, fontSize: "10px", color: COLORS.ink }
      )
      .setOrigin(0, 0.5);
    // Puntaje general (como en Mario).
    this.add
      .text(GAME_WIDTH - 360, 24, "PUNTOS", { fontFamily: FONT, fontSize: "9px", color: "#ffd27a" })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH - 360, 48, formatoPuntos(puntajeTotal()), {
        fontFamily: FONT,
        fontSize: "18px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    new Button(this, GAME_WIDTH - 110, 38, "< Volver", () => this.scene.start(this.volver.scene, this.volver.data), {
      width: 180,
      variant: "secondary",
    });

    // Vicente festejando
    const v = new Character(this, 160, 560, "vicente", { pxPerCm: PX_PER_CM.gallery * 1.2 });
    v.face("right").loop("festejo");
    this.add.text(160, 590, "Vicente", { fontFamily: FONT, fontSize: "14px", color: COLORS.ink }).setOrigin(0.5);
    this.add
      .text(160, 614, "8 años · Explorador", { fontFamily: FONT, fontSize: "9px", color: COLORS.muted })
      .setOrigin(0.5);

    this.datos = { perfil, vistos };
    this.botones = PESTANAS.map(
      (p, k) =>
        new Button(this, LISTA.x + 120 + k * 220, 104, p.label, () => this.mostrar(p.id), {
          width: 200,
          height: 34,
          fontSize: 10,
        })
    );
    this.barra = this.add.graphics();

    // Cámara de la lista: muestra solo esa zona y se mueve para hacer scroll.
    this.cam = this.cameras.add(LISTA.x, LISTA.y, LISTA.w, LISTA.h);
    this.cam.ignore(this.children.list);
    this.scroll = 0;
    this.altoLista = 0;
    this.input.on("wheel", (_p, _o, _dx, dy) => this.moverLista(this.scroll + dy * 0.6));
    // Arrastrar la lista con el dedo o el mouse.
    this.arrastre = null;
    this.input.on("pointerdown", (p) => {
      if (this.enLista(p)) this.arrastre = { y: p.y, scroll: this.scroll, movio: false };
    });
    this.input.on("pointermove", (p) => {
      if (!this.arrastre || !p.isDown) return;
      const dy = p.y - this.arrastre.y;
      if (Math.abs(dy) > 8) this.arrastre.movio = true;
      if (this.arrastre.movio) this.moverLista(this.arrastre.scroll - dy);
    });
    this.input.on("pointerup", () => (this.arrastre = null));

    this.objetosPestana = [];
    this.mostrar(this.pestana);
  }

  enLista(p) {
    return p.x >= LISTA.x && p.x <= LISTA.x + LISTA.w && p.y >= LISTA.y && p.y <= LISTA.y + LISTA.h;
  }

  moverLista(y) {
    this.scroll = Phaser.Math.Clamp(y, 0, Math.max(0, this.altoLista - LISTA.h));
    this.cam.setScroll(0, this.scroll);
    this.cerrarDato();
    // Barrita de scroll a la derecha (solo si la lista no entra).
    this.barra.clear();
    if (this.altoLista <= LISTA.h) return;
    const x = LISTA.x + LISTA.w + 6,
      alto = Math.max(40, (LISTA.h * LISTA.h) / this.altoLista),
      y0 = LISTA.y + (this.scroll / (this.altoLista - LISTA.h)) * (LISTA.h - alto);
    this.barra.fillStyle(0x000000, 0.3).fillRoundedRect(x, LISTA.y, 8, LISTA.h, 4);
    this.barra.fillStyle(0xffb83d, 0.9).fillRoundedRect(x, y0, 8, alto, 4);
  }

  // Dibuja el contenido de una pestaña (borrando el de la anterior), agrupado por país.
  // Las coordenadas son de la lista: (0, 0) es su esquina de arriba a la izquierda.
  mostrar(id) {
    this.pestana = id;
    this.botones.forEach((b, k) => b.setSelected(PESTANAS[k].id === id));
    for (const o of this.objetosPestana) o.destroy();
    this.cerrarDato();
    const antes = new Set(this.children.list);
    const { perfil, vistos } = this.datos;

    let y = 14;
    for (const [paisId, viaje] of Object.entries(VIAJES)) {
      this.titulo(20, y, viaje.nombre);
      y += 26;
      if (id === "stickers") {
        const lista = stickersDe(paisId);
        lista.forEach((st, k) => this.sticker(st, !!perfil.stickers?.[st.id], ...this.celda(k, STICKER, y)));
        y += this.filas(lista.length, STICKER.porFila) * (STICKER.h + STICKER.gap);
      } else if (id === "coleccion") {
        // Estrellas, especiales y tesoros (uno escondido en cada tramo del país).
        const lista = coleccionablesDe(viaje);
        lista.forEach((t, k) => this.carta(t, perfil.coleccion[t] ?? 0, ...this.celda(k, CARTA, y)));
        y += this.filas(lista.length, CARTA.porFila) * (CARTA.h + CARTA.gap);
      } else {
        const lista = animalesDe(viaje).filter(
          (aid) => ANIMALES[aid]?.sprite && hasCharacter(this, ANIMALES[aid].sprite)
        );
        lista.forEach((aid, k) => {
          const [x, yy] = this.celda(k, ANIMAL, y, ANIMAL.alto);
          this.animal(aid, ANIMALES[aid], vistos.has(aid), x, yy);
        });
        y += this.filas(lista.length, ANIMAL.porFila) * ANIMAL.alto;
      }
      y += 20;
    }

    const nuevos = this.children.list.filter((o) => !antes.has(o));
    // Todo lo de la lista se ve solo por su cámara.
    this.cameras.main.ignore(nuevos);
    this.objetosPestana = nuevos;
    this.altoLista = y;
    this.moverLista(0);
  }

  celda(k, tam, y0, alto = tam.h + tam.gap) {
    return [20 + (k % tam.porFila) * (tam.w + tam.gap), y0 + Math.floor(k / tam.porFila) * alto];
  }

  filas(n, porFila) {
    return Math.ceil(n / porFila);
  }

  sticker(st, tiene, x, y) {
    const r = RAREZAS[st.rareza];
    const { w, h } = STICKER;
    const g = this.add.graphics();
    g.fillStyle(tiene ? COLORS.panel : 0x1b2a3a, 1).fillRoundedRect(x, y, w, h, 10);
    g.lineStyle(3, tiene ? r.color : 0x35536f, 1).strokeRoundedRect(x, y, w, h, 10);
    if (hasCharacter(this, st.id)) {
      const img = this.add.image(x + w / 2, y + 60, st.id, 0);
      img.setScale(Math.min((w - 16) / img.width, 104 / img.height));
      if (!tiene) img.setTint(0x16202b);
    }
    if (!tiene)
      this.add.text(x + w / 2, y + 60, "?", { fontFamily: FONT, fontSize: "26px", color: "#9fb3c8" }).setOrigin(0.5);
    this.add
      .text(x + w / 2, y + 124, tiene ? st.nombre : "???", {
        fontFamily: FONT,
        fontSize: "7px",
        color: COLORS.ink,
        align: "center",
        wordWrap: { width: w - 10 },
      })
      .setOrigin(0.5);
    this.add.text(x + w / 2, y + 141, st.rareza, { fontFamily: FONT, fontSize: "7px", color: r.texto }).setOrigin(0.5);
  }

  titulo(x, y, texto) {
    this.add.text(x, y, texto, { fontFamily: FONT, fontSize: "14px", color: "#ffb83d" }).setOrigin(0, 0.5);
  }

  carta(id, cantidad, x, y) {
    const info = COLECCIONABLES.info[id] ?? { nombre: id, rareza: "común" };
    const r = RAREZA[info.rareza] ?? RAREZA.común;
    const tiene = cantidad > 0;
    const { w, h } = CARTA;

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRoundedRect(x + 4, y + 5, w, h, 10);
    g.fillStyle(tiene ? COLORS.panel : 0x1b2a3a, 1).fillRoundedRect(x, y, w, h, 10);
    g.lineStyle(3, tiene ? r.color : 0x35536f, 1).strokeRoundedRect(x, y, w, h, 10);

    if (hasCharacter(this, id)) {
      const img = this.add.image(x + w / 2, y + h * 0.36, id, 0);
      img.setScale(Math.min((h * 0.5) / img.width, (h * 0.5) / img.height));
      if (!tiene) img.setTint(0x16202b);
    }
    if (!tiene)
      this.add
        .text(x + w / 2, y + h * 0.36, "?", { fontFamily: FONT, fontSize: "26px", color: "#9fb3c8" })
        .setOrigin(0.5);

    this.add
      .text(x + w / 2, y + h * 0.72, tiene ? info.nombre : "???", {
        fontFamily: FONT,
        fontSize: "9px",
        color: COLORS.ink,
        align: "center",
        wordWrap: { width: w - 12 },
      })
      .setOrigin(0.5);
    // Cuántos puntos da cada uno (la rareza se ve en el color del borde).
    this.add
      .text(x + w / 2, y + h * 0.9, `${puntosDe(id)} puntos`, {
        fontFamily: FONT,
        fontSize: "7px",
        color: r.texto,
      })
      .setOrigin(0.5);
    if (tiene) {
      this.add.circle(x + w - 14, y + 14, 16, r.color).setStrokeStyle(2, 0x1b2a3a);
      this.add
        .text(x + w - 14, y + 14, `${cantidad}`, {
          fontFamily: FONT,
          fontSize: cantidad > 99 ? "7px" : "9px",
          color: COLORS.inkDark,
        })
        .setOrigin(0.5);
    }
  }

  animal(id, a, visto, x, y) {
    const { w, h } = ANIMAL;
    const g = this.add.graphics();
    g.fillStyle(visto ? COLORS.panel : 0x1b2a3a, 1).fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(2, visto ? 0x5fd068 : 0x35536f, 1).strokeRoundedRect(x, y, w, h, 8);
    const img = this.add.image(x + w / 2, y + h / 2, a.sprite, 0);
    img.setScale(Math.min((w - 12) / img.width, (h - 12) / img.height));
    if (!visto) img.setTint(0x16202b);
    this.add
      .text(x + w / 2, y + h + 12, visto ? a.nombre : "???", {
        fontFamily: FONT,
        fontSize: "7px",
        color: visto ? COLORS.ink : COLORS.muted,
        align: "center",
        wordWrap: { width: w + 8 },
      })
      .setOrigin(0.5, 0.5);

    // Al apoyarse (o tocar) un animal ya visto, se muestra su dato.
    const zona = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: visto });
    const texto = visto ? `${a.nombre}\n\n${a.dato ?? ""}` : "Todavía no lo descubriste.\n¡Buscalo en el viaje!";
    zona.on("pointerover", (p) => !p.isDown && this.mostrarDato(texto, x, y, visto));
    zona.on("pointerout", () => this.cerrarDato());
    zona.on("pointerup", () => !this.arrastre?.movio && this.mostrarDato(texto, x, y, visto));
  }

  // Cartel con el dato del animal, al lado de su tarjeta. Se dibuja en la cámara de la lista
  // (en sus coordenadas) y por encima de las tarjetas, para que no quede tapado.
  mostrarDato(texto, x, y, visto) {
    this.cerrarDato();
    const ancho = 300;
    const t = this.add.text(0, 0, texto, {
      fontFamily: FONT,
      fontSize: "10px",
      color: visto ? COLORS.inkDark : "#4a5a6a",
      align: "center",
      lineSpacing: 4,
      wordWrap: { width: ancho - 28 },
    });
    const alto = t.height + 24;
    // A la derecha de la tarjeta si entra; si no, a la izquierda. Siempre dentro de la parte visible.
    let bx = x + ANIMAL.w + 10;
    if (bx + ancho > LISTA.w - 10) bx = x - ancho - 10;
    const by = Phaser.Math.Clamp(y + ANIMAL.h / 2 - alto / 2, this.scroll + 6, this.scroll + LISTA.h - alto - 10);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRoundedRect(bx + 4, by + 5, ancho, alto, 12);
    g.fillStyle(0xfff8e8, 1).fillRoundedRect(bx, by, ancho, alto, 12);
    g.lineStyle(3, visto ? 0x5fd068 : 0x9fb3c8, 1).strokeRoundedRect(bx, by, ancho, alto, 12);
    t.setPosition(bx + ancho / 2, by + 12).setOrigin(0.5, 0);
    this.dato = [g, t];
    this.cameras.main.ignore(this.dato);
    g.setDepth(50);
    t.setDepth(51); // el texto arriba del cartel
  }

  cerrarDato() {
    this.dato?.forEach((o) => o.destroy());
    this.dato = null;
  }
}
