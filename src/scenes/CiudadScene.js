import Phaser from "phaser";
import { MUSICA_CIUDAD, efecto, musica } from "../systems/audio.js";
import { ASSETS, COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, PX_PER_CM, SCENES } from "../config/constants.js";
import { Character } from "../entities/Character.js";
import { Button } from "../ui/Button.js";
import { QuizPanel } from "../ui/QuizPanel.js";
import { SpeechBubble } from "../ui/SpeechBubble.js";
import { getViaje } from "../data/viajes/index.js";
import { PAISAJES } from "../data/paisajes.js";
import { createParallax } from "../systems/parallax.js";
import {
  actualizarViaje,
  ganarSticker,
  getPerfil,
  getProgresoViaje,
  guardarUltimasPreguntas,
  hitoPreguntas,
  registrarPreguntas,
} from "../systems/progress.js";
import { RAREZAS, STICKERS, stickersDeCiudad } from "../data/stickers.js";
import { hasCharacter } from "../systems/characters.js";
import { modoPrueba } from "../systems/dev.js";
import { houseTexture } from "../systems/placeholders.js";
import { NPCS, NPC_CIUDAD } from "../data/npcs.js";
import { GROUND_Y } from "./ViajeScene.js";

const PREGUNTAS_POR_CIUDAD = 5;
// Siempre se sigue viaje; si se erran todas, el tramo siguiente arranca con una vida menos.
const QUIZ_POS = { x: 900, y: 360 };
// Monumentos que aparecen en la llegada a ciertas ciudades (sprites de la lámina de animales/objetos).
// Lugares importantes (personajes/premios/…lugares importantes…png, npm run lugares) parados en la vereda.
// (Rosario ya trae el Monumento a la Bandera en su portada.)
const MONUMENTOS = {};
const HOGAR = {
  casaX: 800, // la puerta de la casa en la portada de Reconquista
  familia: [
    { id: "mama", x: 700, dice: "¡Vicente! ¡Llegaste a casa!" },
    { id: "papa", x: 880, dice: "¡Qué viajero! Contanos todo lo que viste." },
    { id: "anita", x: 1020, dice: "¡Yo también quiero viajar! ¿Me llevás?" },
  ],
  vicente: "¡Sí! ¡Vamos juntos hasta la Triple Frontera!",
};

// Llegada a una ciudad: dato, evento especial (casa, frontera) y preguntas para poder seguir.
export class CiudadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.CIUDAD);
  }

  init({ paisId, ciudad }) {
    this.paisId = paisId;
    this.ciudadIndex = ciudad;
    // Phaser reutiliza la misma escena en cada ciudad: hay que limpiar lo que quedó de la anterior.
    this.saltado = false;
    this.quiz = null;
    this.npc = null;
  }

  create() {
    this.viaje = getViaje(this.paisId);
    this.ciudad = this.viaje.ciudades[this.ciudadIndex];
    musica(MUSICA_CIUDAD[this.ciudad.id] ?? "tema");
    this.progreso = getProgresoViaje(this.paisId);
    this.pisoY = GROUND_Y;
    this.paradaX = 290;
    this.fondoIlustrado = this.dibujarFondo();
    this.dibujarMonumento();
    this.cameras.main.fadeIn(400);

    // Encabezado
    this.add.graphics().fillStyle(0x0b1a2a, 0.6).fillRect(0, 0, GAME_WIDTH, 76);
    this.add
      .text(24, 26, this.ciudad.nombre, { fontFamily: FONT, fontSize: "22px", color: "#ffb83d" })
      .setOrigin(0, 0.5);
    this.add
      .text(24, 56, this.ciudad.provincia, { fontFamily: FONT, fontSize: "10px", color: COLORS.ink })
      .setOrigin(0, 0.5);
    new Button(this, GAME_WIDTH - 130, 38, "Mapa del viaje", () => this.irAlMapa(), {
      width: 220,
      variant: "secondary",
    });

    if (modoPrueba())
      new Button(this, GAME_WIDTH - 380, 38, "Saltar preguntas", () => this.saltarPreguntas(), {
        width: 240,
        variant: "secondary",
      }).setDepth(60);

    const opts = { pxPerCm: PX_PER_CM.viaje };
    this.vicente = new Character(this, -60, this.pisoY, "vicente", opts).setDepth(10);
    this.companeros = this.progreso.companeros.map((id, i) =>
      new Character(this, -140 - i * 70, this.pisoY, id, opts).setDepth(9)
    );

    this.secuencia();
  }

  // Fondo de la ciudad: ilustración propia si hay (npm run fondos); si no, el paisaje del tramo.
  dibujarFondo() {
    const info = this.cache.json.get(ASSETS.FONDOS_MANIFEST)?.ciudades?.[this.ciudad.id];
    const key = ASSETS.FONDO_CIUDAD(this.ciudad.id);
    if (info && this.textures.exists(key)) {
      this.cameras.main.setBackgroundColor(info.cielo);
      // En los panoramas, la vereda dibujada queda a la altura del piso del juego.
      const y = info.tipo === "panorama" ? GROUND_Y - info.piso : 0;
      // En algunas postales el lugar para pararse no está a la altura normal (el mirador del glaciar).
      if (info.pie) this.pisoY = info.pie;
      if (info.parada) this.paradaX = info.parada;
      this.add.image(0, y, key).setOrigin(0).setDepth(-20);
      return true;
    }
    const tramo = this.viaje.tramos[Math.max(0, this.ciudadIndex - 1)];
    createParallax(this, tramo.paisaje, PAISAJES[tramo.paisaje], {
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      groundY: GROUND_Y,
    }).update(0);
    return false;
  }

  dibujarMonumento() {
    const m = MONUMENTOS[this.ciudad.id];
    if (!m) return;
    try {
      // Sombra en el piso para que quede apoyado sobre la vereda y no "pegado" al fondo.
      this.add.ellipse(m.x, this.pisoY + 2, m.alturaPx * 1.05, 22, 0x000000, 0.28).setDepth(1);
      const c = new Character(this, m.x, this.pisoY + 6, m.id).setDepth(1);
      c.setScale(m.alturaPx / c.def.alturaPx);
    } catch {
      // Sin el sprite del monumento, la ciudad se muestra igual.
    }
  }

  wait(ms) {
    return new Promise((r) => this.time.delayedCall(ms, r));
  }

  say(character, texto, ms = 2200) {
    const b = new SpeechBubble(this, character.x, character.getTopCenter().y - 6, texto, {
      maxWidth: 400,
      fontSize: 11,
    }).setDepth(30);
    return this.wait(ms).then(() => b.close());
  }

  async secuencia() {
    this.companeros.forEach((c, i) => c.walkTo(this.paradaX - 90 - i * 80, 200));
    await this.vicente.walkTo(this.paradaX, 200);
    await this.say(this.vicente, this.ciudad.dato, 3200);

    if (this.ciudad.evento === "hogar") await this.hogar();

    if (this.saltado) return;
    // "preguntasOk" vale para la ciudad donde está parado el viaje (progreso.ciudad), no para cualquiera.
    const respondida = this.progreso.preguntasOk && this.progreso.ciudad === this.ciudadIndex;
    if (respondida) this.alTerminarPreguntas();
    else this.preguntas();
  }

  // ---------- Reconquista: la casa, la familia y Anita se suma ----------
  async hogar() {
    // Con la ilustración del barrio de fondo, la casa ya está dibujada; si no, una provisoria.
    if (!this.fondoIlustrado)
      this.add
        .image(HOGAR.casaX, this.pisoY + 4, houseTexture(this))
        .setOrigin(0.5, 1)
        .setDepth(2);
    const yaViaja = this.progreso.companeros.includes("anita");
    const familia = HOGAR.familia
      .filter((f) => !(yaViaja && f.id === "anita"))
      .map((f) => ({
        ...f,
        c: new Character(this, f.x, this.pisoY, f.id, { pxPerCm: PX_PER_CM.viaje }).face("left").setDepth(8),
      }));

    // Cada familiar recibe a Vicente con los brazos abiertos (abrazo) y después lo saluda.
    const recibir = (c) => {
      const saludar = () => c.has("saludar") && c.loop("saludar");
      if (c.has("abrazo")) c.perform("abrazo").then(saludar);
      else saludar();
    };
    if (yaViaja) {
      familia.forEach((f) => recibir(f.c));
      await this.say(familia[0].c, "¡Volvieron! ¡Qué lindo verlos!", 2200);
      familia.forEach((f) => f.c.idle());
      return;
    }
    for (const f of familia) {
      recibir(f.c);
      await this.say(f.c, f.dice, 2400);
      f.c.idle();
    }
    const anita = familia.find((f) => f.id === "anita").c;
    this.vicente.perform("festejo");
    await this.say(this.vicente, HOGAR.vicente, 2400);

    actualizarViaje(this.paisId, (v) => ({ companeros: [...new Set([...v.companeros, "anita"])] }));
    anita.perform("festejo");
    this.banner("¡Anita se suma al viaje!");
    efecto("descubrir");
    await this.wait(1600);
    await anita.walkTo(this.vicente.x - 80, 200);
    anita.face("right");
    this.companeros.push(anita);
  }

  banner(texto) {
    const t = this.add
      .text(GAME_WIDTH / 2, 150, texto, {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#2a1d1a",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 400, ease: "Back.Out" });
    this.tweens.add({ targets: t, alpha: 0, delay: 2600, duration: 500, onComplete: () => t.destroy() });
  }

  // ---------- Preguntas ----------
  // Un personaje de la zona se presenta y es el que hace las preguntas.
  async presentarNpc() {
    const id = NPC_CIUDAD[this.ciudad.id];
    if (this.npc || !id || !hasCharacter(this, id)) return;
    this.npc = new Character(this, this.paradaX + 150, this.pisoY, id, { pxPerCm: PX_PER_CM.viaje })
      .face("left")
      .setDepth(9);
    this.npc.loop("saludar");
    efecto("descubrir");
    await this.say(
      this.npc,
      `¡Hola, Vicente! Soy ${NPCS[id].nombre}. ¿Te animás a unas preguntas sobre ${this.ciudad.nombre}?`,
      2800
    );
    this.npc.loop("quieto");
  }

  async preguntas() {
    await this.presentarNpc();
    musica("pensar");
    this.quiz?.destroy();
    this.quiz = new QuizPanel(this, QUIZ_POS.x, QUIZ_POS.y, {
      onRespuesta: (ok) => {
        efecto(ok ? "correcto" : "error");
        this.vicente.perform(ok ? "festejo" : "aburrido");
        if (ok && this.npc) {
          this.npc.loop("saludar");
          this.time.delayedCall(700, () => this.npc?.active && this.npc.loop("quieto"));
        }
      },
    }).setDepth(20);
    this.vicente.perform("pensar");

    // 5 al azar, priorizando las que no salieron la vez anterior en esta ciudad.
    const perfil = getPerfil();
    perfil.ultimasPreguntas ??= {};
    const vistas = new Set(perfil.ultimasPreguntas[this.ciudad.id] ?? []);
    const nuevas = Phaser.Utils.Array.Shuffle(this.ciudad.preguntas.filter((q) => !vistas.has(q.p)));
    const repetidas = Phaser.Utils.Array.Shuffle(this.ciudad.preguntas.filter((q) => vistas.has(q.p)));
    const elegidas = [...nuevas, ...repetidas].slice(0, PREGUNTAS_POR_CIUDAD);
    guardarUltimasPreguntas(
      this.ciudad.id,
      elegidas.map((q) => q.p)
    );
    const aciertos = await this.quiz.jugar(elegidas);

    const ultima = this.ciudadIndex === this.viaje.ciudades.length - 1;
    registrarPreguntas(this.paisId, this.ciudad.id, aciertos, elegidas.length);
    this.progreso = actualizarViaje(this.paisId, (v) => ({
      ciudad: this.ciudadIndex,
      preguntasOk: true,
      terminado: v.terminado || ultima,
      // Errar todas saca un corazón entero (pero nunca deja en cero: el Game Over es solo en los tramos).
      vida: aciertos === 0 ? Math.max(1, (v.vida ?? 12) - 4) : (v.vida ?? 12),
    }));
    this.quiz.setVisible(false);
    await this.entregarStickers(aciertos, elegidas.length);
    this.quiz.setVisible(true);
    this.alTerminarPreguntas(aciertos);
  }

  // Modo prueba: da las preguntas por respondidas perfectas (con sus stickers) y muestra cómo seguir.
  async saltarPreguntas() {
    if (this.saltado) return;
    this.saltado = true;
    this.quiz?.destroy();
    this.quiz = null;
    const total = PREGUNTAS_POR_CIUDAD;
    const ultima = this.ciudadIndex === this.viaje.ciudades.length - 1;
    registrarPreguntas(this.paisId, this.ciudad.id, total, total);
    this.progreso = actualizarViaje(this.paisId, {
      ciudad: this.ciudadIndex,
      preguntasOk: true,
      terminado: this.progreso.terminado || ultima,
    });
    await this.entregarStickers(total, total);
    this.alTerminarPreguntas(total);
  }

  // ---------- Stickers de premio ----------
  async entregarStickers(aciertos, total) {
    const estrellas = getPerfil().coleccion.estrella ?? 0;
    const candidatos = [
      ...stickersDeCiudad(this.ciudad.id, aciertos, total),
      ...STICKERS.filter(
        (st) =>
          (st.gana === "viaje" && this.progreso.terminado) || (st.gana === "estrellas" && estrellas >= st.cantidad)
      ),
    ];
    const nuevos = candidatos.filter((st) => hasCharacter(this, st.id) && ganarSticker(st.id));
    for (const st of nuevos) await this.mostrarSticker(st);
  }

  // Sticker que aparece girando en el centro, con su rareza. Se cierra tocando o solo a los 3 s.
  mostrarSticker(st) {
    efecto("sticker");
    const r = RAREZAS[st.rareza];
    return new Promise((resolve) => {
      const velo = this.add
        .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b1a2a, 0.75)
        .setOrigin(0)
        .setDepth(50)
        .setInteractive();
      const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10).setDepth(51);
      const brillo = this.add.circle(0, 0, 190, r.color, 0.25);
      const img = this.add.image(0, -10, st.id, 0);
      img.setScale(300 / Math.max(img.width, img.height));
      const t1 = this.add
        .text(0, -215, "¡Nuevo sticker!", {
          fontFamily: FONT,
          fontSize: "20px",
          color: "#ffffff",
          stroke: "#2a1d1a",
          strokeThickness: 6,
        })
        .setOrigin(0.5);
      const t2 = this.add
        .text(0, 175, st.nombre, {
          fontFamily: FONT,
          fontSize: "14px",
          color: "#ffffff",
          stroke: "#2a1d1a",
          strokeThickness: 5,
        })
        .setOrigin(0.5);
      const t3 = this.add
        .text(0, 205, st.rareza.toUpperCase(), {
          fontFamily: FONT,
          fontSize: "11px",
          color: r.texto,
          stroke: "#2a1d1a",
          strokeThickness: 4,
        })
        .setOrigin(0.5);
      c.add([brillo, img, t1, t2, t3]).setScale(0).setAngle(-20);
      this.tweens.add({ targets: c, scale: 1, angle: 0, duration: 500, ease: "Back.Out" });
      this.tweens.add({ targets: brillo, scale: 1.15, alpha: 0.1, duration: 700, yoyo: true, repeat: -1 });
      this.vicente.perform("festejo");
      let cerrado = false;
      const cerrar = () => {
        if (cerrado) return;
        cerrado = true;
        this.tweens.add({
          targets: [c, velo],
          alpha: 0,
          duration: 250,
          onComplete: () => (c.destroy(), velo.destroy(), resolve()),
        });
      };
      velo.on("pointerdown", cerrar);
      this.time.delayedCall(3000, cerrar);
    });
  }

  alTerminarPreguntas(aciertos) {
    musica(MUSICA_CIUDAD[this.ciudad.id] ?? "tema");
    this.quiz ??= new QuizPanel(this, QUIZ_POS.x, QUIZ_POS.y).setDepth(20);
    const ultima = this.ciudadIndex === this.viaje.ciudades.length - 1;
    const titulos = ["¡Uy! Ninguna esta vez", "¡Bien!", "¡Bien!", "¡Muy bien!", "¡Muy bien!", "¡Perfecto!"];
    const titulo = aciertos != null ? titulos[Math.min(aciertos, 5)] : this.ciudad.nombre;
    const hito = hitoPreguntas(this.paisId);
    const total = this.viaje.ciudades.length * PREGUNTAS_POR_CIUDAD;
    let mensaje =
      aciertos != null
        ? `Acertaste ${aciertos} de ${PREGUNTAS_POR_CIUDAD}.`
        : "Ya respondiste las preguntas de esta ciudad.";
    if (aciertos === 0) mensaje += "\nPerdiste un corazón.";
    mensaje += `\nEn ${this.viaje.nombre}: ${hito.aciertos} de ${total} preguntas.`;

    if (this.ciudad.evento === "triple-frontera" || ultima) {
      actualizarViaje(this.paisId, { terminado: true });
      this.quiz.mostrarFinal(titulo, `${mensaje}\n¡Llegaste a la Triple Frontera! ¿Hacia dónde seguimos?`, [
        { texto: "Brasil", onClick: () => this.proximamente("Brasil") },
        { texto: "Paraguay", onClick: () => this.proximamente("Paraguay") },
        { texto: "Volver al planisferio", onClick: () => this.scene.start(SCENES.MAPA) },
      ]);
      return;
    }
    const siguiente = this.viaje.ciudades[this.ciudadIndex + 1];
    this.quiz.mostrarFinal(titulo, `${mensaje}\nPróxima parada: ${siguiente.nombre}.`, [
      {
        texto: `Viajar a ${siguiente.nombre}`,
        onClick: () => this.scene.start(SCENES.VIAJE, { paisId: this.paisId, tramo: this.ciudadIndex }),
      },
      { texto: "Mapa del viaje", onClick: () => this.irAlMapa() },
    ]);
  }

  proximamente(pais) {
    this.vicente.perform("pensar");
    this.banner(`¡Pronto vamos a poder viajar a ${pais}!`);
  }

  irAlMapa() {
    this.scene.start(SCENES.VIAJE_MAPA, { paisId: this.paisId });
  }
}
