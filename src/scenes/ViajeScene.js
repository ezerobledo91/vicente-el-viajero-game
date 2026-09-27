import Phaser from "phaser";
import { MUSICA_TRAMO, efecto, musica } from "../systems/audio.js";
import { ASSETS, FONT, GAME_HEIGHT, GAME_WIDTH, PX_PER_CM, SCENES } from "../config/constants.js";
import { Player } from "../entities/Player.js";
import { Companion } from "../entities/Companion.js";
import { Character } from "../entities/Character.js";
import { SpeechBubble } from "../ui/SpeechBubble.js";
import { getViaje } from "../data/viajes/index.js";
import { PAISAJES } from "../data/paisajes.js";
import { ANIMALES, CAMINANTES, COLECCIONABLES, CUARTOS, EN_EL_AGUA, PAJAROS, PERRO, VIDAS } from "../data/animales.js";
import { hasCharacter } from "../systems/characters.js";
import { DECORACION } from "../data/decoracion.js";
import { mulberry32 } from "../systems/levelBuilder.js";
import { modoPrueba } from "../systems/dev.js";
import { buildLevel } from "../systems/levelBuilder.js";
import { createParallax } from "../systems/parallax.js";
import { actualizarViaje, gameOver, getProgresoViaje, sumarColeccion } from "../systems/progress.js";
import {
  animalTexture,
  birdTexture,
  dogTexture,
  heartTexture,
  platformTexture,
  rockTexture,
  signTexture,
  sparkTexture,
  puaTexture,
  CARTEL,
  starTexture,
} from "../systems/placeholders.js";

export const GROUND_Y = 600;
const GRAVEDAD = 1600;
const PAJARO_ACTIVACION = 1000; // px: el pájaro empieza a volar cuando Vicente está así de cerca
const PISAR_MARGEN = 24; // px: cuánto puede "entrar" Vicente en el pájaro y que igual cuente como pisada
const ANIMAL_DISTANCIA = 170; // px: distancia para que el animal se frene a charlar
const ANIMAL_VELOCIDAD = [35, 60]; // px/seg (mínimo, máximo) de los animales que caminan
const CHARLA_MS = 4200; // lo que dura el globo con el dato del animal
const PLATAFORMA_VELOCIDAD = 70; // px/seg de las plataformas que se mueven
// Cómo se dibujan las piezas ilustradas (proporciones pensadas para las láminas de Codex).
const PIEZAS = {
  escalaTierra: 0.3, // bloques de las plataformas fijas (lámina de terreno)
  escalaPiedra: 0.52, // piedras sueltas (obstáculos)
  puntaMax: 95, // px máximos de cada punta con raíces
  pastoCentro: 0.16, // parte del bloque del centro que es pasto por encima de donde se pisa
  superficieTronco: 0.3, // parte del tronco por encima de donde se pisa
  escalaAgua: 0.5,
  nivelAgua: -14, // px respecto del piso donde empieza el agua (más negativo = más alto; tapa el camino detrás)
};
const PUA = { cada: 1700, velocidad: 280 }; // abejas: ms entre púa y púa, px/seg
const BALLENA_FACTOR = 0.3;
const FONDO_FACTOR = 0.4; // velocidad del fondo ilustrado (igual que en parallax.js)
// Dónde está el mar en el fondo de la costa (columnas de la textura repetible y altura del agua).
// Mar del fondo de la costa: centros = columnas con mar (null = hay mar en todo el ancho); superficie = y en pantalla.
const MAR_COSTA = { periodo: 4344, centros: null, superficie: 470 }; // la ballena nada "lejos": se mueve como una capa de fondo

// Un tramo del viaje entre dos ciudades: plataformas de costado con obstáculos y animales.
export class ViajeScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.VIAJE, physics: { default: "arcade", arcade: { gravity: { y: GRAVEDAD } } } });
  }

  init({ paisId, tramo }) {
    this.paisId = paisId;
    this.tramoIndex = tramo;
    // La escena se reutiliza entre tramos: se limpia lo que quedó del anterior.
    this.vidasInfinitas = false;
    this.cartel = null;
  }

  create() {
    const viaje = getViaje(this.paisId);
    this.tramo = viaje.tramos[this.tramoIndex];
    musica(MUSICA_TRAMO[this.tramo.paisaje] ?? "tema");
    this.desde = viaje.ciudades[this.tramoIndex];
    this.hasta = viaje.ciudades[this.tramoIndex + 1];
    this.level = buildLevel(this.tramo, this.tramoIndex + 1);
    this.largo = this.level.largo;
    this.progreso = getProgresoViaje(this.paisId);
    this.vistos = new Set(this.progreso.animalesVistos);
    this.terminado = false;
    // Si en la ciudad anterior erró todas las preguntas, arranca con una vida menos.
    // Corazones (en cuartos) y estrellas vienen de la partida.
    this.vida = this.progreso.vida ?? VIDAS.inicio * CUARTOS;
    this.estrellasAntes = this.progreso.estrellas ?? 0;
    this.juntadas = 0; // total de este tramo (para la interfaz)
    this.coleccion = {}; // por tipo: { estrella: 12, mate: 1, ... }

    this.physics.world.setBounds(0, 0, this.largo, GAME_HEIGHT);
    // Sin "piso" en el borde de abajo del mundo: si Vicente cae en un pozo, se cae de verdad.
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.cameras.main.setBounds(0, 0, this.largo, GAME_HEIGHT);
    this.parallax = createParallax(this, this.tramo.paisaje, PAISAJES[this.tramo.paisaje], {
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      groundY: GROUND_Y,
    });

    // El piso es un conjunto de tramos sólidos, cortado donde hay pozos.
    const pozos = this.level.items.filter((it) => it.tipo === "pozo").sort((a, b) => a.x - b.x);
    const piso = this.physics.add.staticGroup();
    let desde = 0;
    for (const p of [...pozos, { x: this.largo + 1000, w: 0 }]) {
      const hasta = Math.min(this.largo, p.x - p.w / 2);
      if (hasta > desde) {
        const z = this.add.zone((desde + hasta) / 2, GROUND_Y + 60, hasta - desde, 120);
        piso.add(z);
        z.body.updateFromGameObject();
      }
      desde = p.x + p.w / 2;
    }
    for (const p of pozos) this.dibujarPozo(p);
    this.solidos = this.physics.add.staticGroup(); // plataformas fijas (se atraviesan desde abajo)
    this.rocas = this.physics.add.staticGroup(); // rocas y troncos: sólidos por todos lados
    this.moviles = []; // plataformas que se mueven
    this.figuritas = [];
    this.corazones = [];
    this.perros = [];
    this.pajaros = [];
    this.animales = [];
    this.nFiguritas = 0;
    this.rnd = mulberry32(this.tramoIndex * 131 + 7);
    for (const item of this.level.items) this.spawn(item);

    this.player = new Player(this, 160, GROUND_Y, "vicente", { pxPerCm: PX_PER_CM.viaje }).setDepth(10);
    this.physics.add.collider(this.player, piso);
    // Rocas y plataformas de un solo sentido: se puede subir desde abajo y pararse arriba.
    const soloDesdeArriba = (p, r) => p.body.prev.y + p.body.height <= r.body.top + 10;
    this.physics.add.collider(this.player, this.solidos, null, soloDesdeArriba);
    this.physics.add.collider(this.player, this.moviles, null, soloDesdeArriba);
    this.physics.add.collider(this.player, this.rocas);

    this.companeros = this.progreso.companeros.map((id) =>
      new Companion(this, this.player, id, { pxPerCm: PX_PER_CM.viaje }).setDepth(9)
    );

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12).setFollowOffset(-220, 0);

    this.keys = this.input.keyboard.addKeys("LEFT,RIGHT,UP,DOWN,SPACE,A,D,W,S");
    this.touch = { left: false, right: false, jump: false, down: false };
    this.puas = [];
    if (modoPrueba()) {
      this.input.keyboard.on(
        "keydown-N",
        () => !this.terminado && this.player.body.reset(this.cartel.x - 20, GROUND_Y - 2)
      );
      // E: +10 estrellas (para probar la vida extra cada 100).
      this.input.keyboard.on("keydown-E", () => {
        for (let k = 0; k < 10; k++) {
          this.juntadas++;
          this.coleccion[COLECCIONABLES.comun] = (this.coleccion[COLECCIONABLES.comun] ?? 0) + 1;
          this.contarEstrella();
        }
      });
      this.input.keyboard.on("keydown-V", () => {
        this.vidasInfinitas = !this.vidasInfinitas;
        this.cartelito(
          this.player.x,
          this.player.getTopCenter().y - 20,
          `Vidas infinitas: ${this.vidasInfinitas ? "sí" : "no"}`
        );
      });
    }

    this.scene.launch(SCENES.VIAJE_HUD, { viaje: this });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop(SCENES.VIAJE_HUD));
    this.time.delayedCall(400, () => this.decir(this.player, `¡Vamos a ${this.hasta.nombre}!`, 2200));
  }

  // ---------- Creación de objetos del nivel ----------
  // Sprite real (láminas recortadas) si existe; si no, null y se usa el dibujo provisorio.
  entidad(id, x, y, { anim, mirando = "left", depth = 5 } = {}) {
    if (!id || !hasCharacter(this, id)) return null;
    const c = new Character(this, x, y, id, { pxPerCm: PX_PER_CM.viaje }).face(mirando).setDepth(depth);
    if (anim && c.has(anim)) c.loop(anim);
    return c;
  }

  flotar(obj, y) {
    this.tweens.add({
      targets: obj,
      y: y - 8,
      duration: 700 + (obj.x % 300),
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  spawn(item) {
    const y = GROUND_Y - (item.y ?? 0);
    switch (item.tipo) {
      case "figurita": {
        const tipo = item.especial ?? COLECCIONABLES.comun;
        const s =
          this.entidad(tipo, item.x, y, { mirando: "right", depth: 8 })?.setOrigin(0.5) ??
          this.add.image(item.x, y, starTexture(this)).setDepth(8);
        s.tipo = tipo;
        // Los tesoros se ven más grandes y brillan, para que den ganas de ir a buscarlos.
        if (tipo.startsWith("tesoro-")) {
          s.setScale(s.scale * 1.4);
          this.tweens.add({
            targets: s,
            angle: { from: -8, to: 8 },
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
          });
        }
        this.flotar(s, y);
        this.figuritas.push(s);
        break;
      }
      case "vida": {
        const h = this.add.image(item.x, y, heartTexture(this)).setDepth(8);
        this.flotar(h, y);
        this.tweens.add({ targets: h, scale: 1.15, duration: 400, yoyo: true, repeat: -1 });
        this.corazones.push(h);
        break;
      }
      case "roca":
        this.ponerRoca(item.x);
        break;
      case "plataforma": {
        const movil = !!(item.mueve || item.mueveY);
        // Con piezas del paisaje: bloque de tierra (fijas) o tronco (las que se mueven). `sup` = px desde
        // arriba de la textura hasta donde se pisa (el pasto y las ramitas sobresalen un poco).
        const ilustrada = movil ? this.texturaTronco(item.w) : this.texturaTierra(item.w);
        const key = ilustrada?.key ?? platformTexture(this, item.w);
        const sup = ilustrada?.sup ?? 0;
        if (!movil) {
          const pl = this.solidos
            .create(item.x, y - sup, key)
            .setOrigin(0.5, 0)
            .setDepth(6)
            .refreshBody();
          if (ilustrada) pl.body.setSize(item.w, 18, false).setOffset((pl.width - item.w) / 2, sup);
          break;
        }
        const p = this.physics.add
          .image(item.x, y - sup, key)
          .setOrigin(0.5, 0)
          .setDepth(6)
          .setImmovable(true);
        if (ilustrada) p.body.setSize(item.w, 18).setOffset((p.width - item.w) / 2, sup);
        p.body.setAllowGravity(false);
        if (item.mueve) {
          p.body.setVelocityX(PLATAFORMA_VELOCIDAD);
          Object.assign(p, { minX: item.x - item.mueve / 2, maxX: item.x + item.mueve / 2 });
        } else {
          p.body.setVelocityY(-PLATAFORMA_VELOCIDAD * 0.8);
          Object.assign(p, { minY: y - sup - item.mueveY, maxY: y - sup });
        }
        this.moviles.push(p);
        break;
      }
      case "perro": {
        // Perro trampolín: se queda en su lugar y no hace daño.
        let d = this.entidad(PERRO.sprite, item.x, GROUND_Y + 2, { anim: PERRO.quieto, depth: 7 });
        if (!d) {
          const key = dogTexture(this);
          this.crearAnimacion(key, 6);
          d = this.add
            .sprite(item.x, GROUND_Y + 2, key)
            .setOrigin(0.5, 1)
            .setDepth(7)
            .play(`${key}-anim`);
        }
        this.perros.push(d);
        break;
      }
      case "pajaro": {
        // Si el tramo tiene varios pájaros, se van alternando (por ejemplo tero en el piso y picaflor volando).
        const lista = [this.tramo.pajaro].flat();
        const pid = lista[(this.nPajaros = (this.nPajaros ?? -1) + 1) % lista.length];
        const def = PAJAROS[pid];
        // Los que corren por el piso (tero) van apoyados; los que vuelan, a la altura del patrón.
        const by = def.suelo ? GROUND_Y + 2 : y;
        let b = this.entidad(def.sprite, item.x, by, { anim: def.anim, depth: 9 });
        if (b && !def.suelo) b.setOrigin(0.5);
        if (!b) {
          const key = birdTexture(this, pid, def);
          this.crearAnimacion(key, 8);
          b = this.add.sprite(item.x, by, key).setDepth(9).play(`${key}-anim`);
        }
        Object.assign(b, {
          pid,
          baseY: by,
          velocidad: def.velocidad,
          activo: false,
          fase: item.x % 7,
          suelo: !!def.suelo,
        });
        this.pajaros.push(b);
        break;
      }
      case "animal":
        this.spawnAnimal(item);
        break;
      case "cartel":
        this.ponerCartel(item.x);
        break;
    }
  }

  // Cartel de llegada con el nombre de la ciudad; se balancea un poco para llamar la atención.
  ponerCartel(x) {
    const { h, tabla: t, w } = CARTEL;
    const base = GROUND_Y + 8;
    const c = this.add.container(x, base).setDepth(4);
    const img = this.add.image(0, 0, signTexture(this)).setOrigin(0.5, 1);
    const cx = t.x + t.w / 2 - w / 2,
      top = -h + t.y;
    const texto = (y, s, size, color) =>
      this.add
        .text(cx, top + y, s, {
          fontFamily: FONT,
          fontSize: `${size}px`,
          color,
          align: "center",
          stroke: "#f6e3c4",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
    const nombre = texto(t.h / 2 + 4, this.hasta.nombre, 20, "#3a2212");
    if (nombre.width > t.w - 40) nombre.setFontSize(Math.floor((20 * (t.w - 40)) / nombre.width));
    c.add([
      img,
      texto(24, "Bienvenidos a", 10, "#5e3a1e"),
      nombre,
      texto(t.h - 22, this.hasta.provincia ?? "", 9, "#5e3a1e"),
    ]);
    this.tweens.add({ targets: c, angle: 1.5, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    this.cartel = c;
  }

  // Roca o tronco real (si está la lámina de decoración): sólido, hay que saltarlo o subirse encima.
  ponerRoca(x) {
    // Piedras propias del paisaje (piezas sueltas), si hay.
    const piedras = this.sueltas("piedra");
    if (piedras.length) {
      const p = piedras[Math.floor(this.rnd() * piedras.length)];
      const img = this.add
        .image(x, GROUND_Y + 8, p.key)
        .setOrigin(0.5, 1)
        .setDepth(6);
      img.setScale(PIEZAS.escalaPiedra).setFlipX(this.rnd() < 0.5);
      // Cuerpo: un poco más angosto que el dibujo y con la parte de arriba un poco por debajo del pico.
      const sc = PIEZAS.escalaPiedra,
        w = img.displayWidth * 0.72,
        arriba = GROUND_Y + 8 - img.displayHeight + p.sup * sc * 0.6,
        h = GROUND_Y + 8 - arriba;
      const cuerpo = this.add.zone(x, arriba + h / 2, w, h);
      this.rocas.add(cuerpo);
      cuerpo.body.updateFromGameObject();
      return;
    }
    const opciones = DECORACION.obstaculos.filter((id) => this.textures.exists(id));
    if (!opciones.length) {
      this.rocas
        .create(x, GROUND_Y + 4, rockTexture(this))
        .setOrigin(0.5, 1)
        .setDepth(6)
        .refreshBody();
      return;
    }
    const id = opciones[Math.floor(this.rnd() * opciones.length)];
    const img = this.add
      .image(x, GROUND_Y + 8, id, 0)
      .setOrigin(0.5, 1)
      .setDepth(6);
    img.setScale(DECORACION.escala).setFlipX(this.rnd() < 0.5);
    // El cuerpo es un poco más chico que el dibujo (las rocas tienen bordes irregulares y pasto).
    const w = img.displayWidth * 0.75,
      h = img.displayHeight * 0.85;
    const cuerpo = this.add.zone(x, GROUND_Y + 8 - h / 2, w, h);
    this.rocas.add(cuerpo);
    cuerpo.body.updateFromGameObject();
  }

  // Laguito bajo los animales de agua (flamenco, garza...): agua con borde de barro, brillos y juncos.
  ponerCharco(x) {
    const g = this.add.graphics().setDepth(4);
    const w = 190,
      h = 30,
      y = GROUND_Y + 8;
    g.fillStyle(0x6b4a2a, 1).fillEllipse(x, y, w + 16, h + 10);
    g.fillStyle(0x3f8fc9, 1).fillEllipse(x, y, w, h);
    g.fillStyle(0x6fb8e6, 1).fillEllipse(x - 10, y - 3, w * 0.7, h * 0.45);
    g.fillStyle(0xd8f0ff, 1);
    for (const [dx, dy, lw] of [
      [-50, -4, 26],
      [20, 2, 18],
      [55, -6, 14],
    ])
      g.fillRect(x + dx, y + dy, lw, 3);
    g.lineStyle(3, 0x4f8a38, 1);
    for (const [dx, alto] of [
      [-w / 2 - 2, 34],
      [-w / 2 + 10, 26],
      [w / 2 - 6, 30],
      [w / 2 + 4, 22],
    ])
      g.lineBetween(x + dx, y, x + dx + 3, y - alto);
  }

  // Pozo: hueco oscuro en el camino, con bordes de tierra y pasto que cuelga.
  // ---------- Piezas ilustradas del paisaje (tools/fondos.config.json → piezas) ----------
  pieza(nombre) {
    const key = ASSETS.PIEZA(this.tramo.paisaje, nombre);
    return this.textures.exists(key) ? this.textures.get(key).getSourceImage() : null;
  }

  // Bloque de tierra para plataformas fijas: punta del borde izq + centro repetido + punta del borde der.
  // Piezas sueltas de un tipo ("piedra", "plataforma", "tronco"): [{ key, img, w, h, sup }].
  sueltas(tipo) {
    const info = this.cache.json.get(ASSETS.FONDOS_MANIFEST)?.tramos?.[this.tramo.paisaje]?.piezas ?? {};
    return Object.entries(info)
      .filter(([n]) => n.startsWith(tipo + "-"))
      .map(([n, d]) => ({ ...d, key: ASSETS.PIEZA(this.tramo.paisaje, n) }))
      .filter((p) => this.textures.exists(p.key));
  }

  // Textura de una pieza suelta escalada para que la parte que se pisa mida `w` (la pieza de largo
  // más parecido a lo que se necesita, para no deformarla).
  texturaSuelta(tipo, w, { escalaIdeal, margen }) {
    const opciones = this.sueltas(tipo);
    if (!opciones.length) return null;
    const p = opciones.reduce((a, b) =>
      Math.abs(b.w * escalaIdeal - w * margen) < Math.abs(a.w * escalaIdeal - w * margen) ? b : a
    );
    const sc = (w * margen) / p.w;
    const ancho = Math.round(p.w * sc),
      alto = Math.ceil(p.h * sc);
    const key = `${p.key}-${w}`;
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, ancho, alto);
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.textures.get(p.key).getSourceImage(), 0, 0, ancho, alto);
      tex.refresh();
    }
    return { key, sup: Math.round(p.sup * sc) };
  }

  texturaTierra(w) {
    const suelta = this.texturaSuelta("plataforma", w, { escalaIdeal: 0.45, margen: 1.12 });
    if (suelta) return suelta;
    const izq = this.pieza("borde-izq"),
      centro = this.pieza("centro"),
      der = this.pieza("borde-der");
    if (!izq || !centro || !der) return null;
    const key = `tierra-${this.tramo.paisaje}-${w}`;
    const sc = PIEZAS.escalaTierra;
    const alto = Math.ceil(izq.height * sc),
      subeBorde = (izq.height - centro.height) * sc;
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, w, alto);
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = false;
      const cap = Math.min(PIEZAS.puntaMax, Math.floor(w * 0.3));
      const cw = centro.width * sc;
      for (let x = cap - 4; x < w - cap + 4; x += cw - 2)
        ctx.drawImage(centro, 0, 0, centro.width, centro.height, x, subeBorde, cw, centro.height * sc);
      ctx.drawImage(izq, 0, 0, cap / sc, izq.height, 0, 0, cap, alto);
      ctx.drawImage(der, der.width - cap / sc, 0, cap / sc, der.height, w - cap, 0, cap, alto);
      tex.refresh();
    }
    return { key, sup: Math.round(subeBorde + centro.height * sc * PIEZAS.pastoCentro) };
  }

  // Tronco para las plataformas que se mueven (un poco más largo que la parte que se pisa).
  texturaTronco(w) {
    const suelto = this.texturaSuelta("tronco", w, { escalaIdeal: 0.6, margen: 1.1 });
    if (suelto) return suelto;
    const t = this.pieza("tronco");
    if (!t) return null;
    const key = `tronco-${this.tramo.paisaje}-${w}`;
    const ancho = Math.round(w * 1.2),
      sc = ancho / t.width,
      alto = Math.ceil(t.height * sc);
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, ancho, alto);
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(t, 0, 0, ancho, alto);
      tex.refresh();
    }
    return { key, sup: Math.round(alto * PIEZAS.superficieTronco) };
  }

  // Pozo con agua animada, orillas de piedra y barrancas de tierra con raíces.
  dibujarPozoIlustrado(p) {
    const agua = [0, 1, 2, 3].map((k) => ASSETS.PIEZA(this.tramo.paisaje, `agua-${k}`));
    if (!this.textures.exists(agua[0])) return false;
    const x0 = p.x - p.w / 2,
      x1 = p.x + p.w / 2;
    const yAgua = GROUND_Y + PIEZAS.nivelAgua;
    const t = this.add
      .tileSprite(x0, yAgua, p.w, GAME_HEIGHT - yAgua, agua[0])
      .setOrigin(0)
      .setDepth(-4);
    t.setTileScale(PIEZAS.escalaAgua);
    let k = 0;
    this.time.addEvent({ delay: 180, loop: true, callback: () => t.active && t.setTexture(agua[(k = (k + 1) % 4)]) });
    // Espuma en la superficie y un corte de tierra en cada borde: se tiene que ver claramente
    // que el camino se termina ahí (sin piedras que parezcan escalones).
    const g = this.add.graphics().setDepth(-3.5);
    g.fillStyle(0xd8f0ff, 0.85).fillRect(x0, yAgua, p.w, 3);
    for (let x = x0 + 8; x < x1 - 20; x += 34) g.fillRect(x, yAgua + 3, 14, 2);
    for (const [bx, dir] of [
      [x0, 1],
      [x1, -1],
    ]) {
      // Sombra de la barranca sobre el agua y pasto que cuelga del borde del camino.
      g.fillStyle(0x0b2f4a, 0.45).fillRect(dir > 0 ? bx : bx - 22, yAgua, 22, GAME_HEIGHT - yAgua);
      g.fillStyle(0x3f7a30, 1).fillRect(dir > 0 ? bx - 4 : bx - 8, yAgua - 4, 12, 6);
      g.fillStyle(0x4f8a38, 1);
      for (let k = 0; k < 5; k++) g.fillRect(bx + dir * (k * 3 - 2) - (dir < 0 ? 3 : 0), yAgua, 3, 6 + ((k * 5) % 11));
    }
    return true;
  }

  dibujarPozo(p) {
    if (this.dibujarPozoIlustrado(p)) return;
    const x0 = p.x - p.w / 2,
      y0 = GROUND_Y - 12;
    const g = this.add.graphics().setDepth(-4);
    g.fillStyle(0x1a120c, 1).fillRect(x0, y0, p.w, GAME_HEIGHT - y0);
    g.fillStyle(0x0d0906, 1).fillRect(x0 + 10, y0 + 40, p.w - 20, GAME_HEIGHT - y0);
    g.fillStyle(0x5a3a22, 1).fillRect(x0 - 4, y0, 10, GAME_HEIGHT - y0);
    g.fillRect(x0 + p.w - 6, y0, 10, GAME_HEIGHT - y0);
    g.fillStyle(0x4f8a38, 1);
    for (const bx of [x0, x0 + p.w - 8])
      for (let k = 0; k < 4; k++) g.fillRect(bx + k * 2, y0 + 10 + ((k * 7) % 12), 3, 10 + k * 4);
  }

  tirarPua(b) {
    const dx = this.player.x - b.x,
      dy = this.player.y - 60 - b.y;
    const d = Math.hypot(dx, dy) || 1;
    const p = this.add.image(b.x - 10, b.y + 6, puaTexture(this)).setDepth(9);
    p.setRotation(Math.atan2(dy, dx));
    Object.assign(p, { vx: (dx / d) * PUA.velocidad, vy: (dy / d) * PUA.velocidad });
    this.puas.push(p);
    efecto("plop");
  }

  // Ballena en el mar del fondo: se mueve como el paisaje (parallax) y cada tanto salta.
  // Se ubica para que aparezca en pantalla cuando Vicente pasa por item.x.
  ponerBallena(item, def) {
    if (!hasCharacter(this, def.sprite)) return false;
    const f = this.parallax.imagen ? FONDO_FACTOR : BALLENA_FACTOR;
    // Con la ballena moviéndose igual que el fondo, su x en el mundo corresponde siempre a la misma
    // columna del dibujo: se elige una que sea mar (franjas de MAR_COSTA), cerca de donde pasa Vicente.
    const ideal = f * (item.x - 360) + 700;
    let x = ideal;
    if (this.parallax.imagen && this.tramo.paisaje === "costa" && MAR_COSTA.centros) {
      const k = Math.floor(ideal / MAR_COSTA.periodo);
      const candidatos = [k - 1, k, k + 1].flatMap((n) => MAR_COSTA.centros.map((c) => n * MAR_COSTA.periodo + c));
      x = candidatos.reduce((a, b) => (Math.abs(b - ideal) < Math.abs(a - ideal) ? b : a));
    }
    const b = new Character(this, x, MAR_COSTA.superficie, def.sprite, { pxPerCm: PX_PER_CM.viaje })
      .setScrollFactor(f, 1)
      .setDepth(-14.5);
    b.setScale(b.scale * 1.3);
    b.loop("nadar");
    // Que la ballena y la orca no salten al mismo tiempo.
    const demora = 3200 + (item.x % 1300);
    const saltar = () => {
      if (!b.active) return;
      b.loop("saltar");
      this.tweens.add({
        targets: b,
        y: MAR_COSTA.superficie - 40,
        duration: 650,
        yoyo: true,
        ease: "Sine.Out",
        onComplete: () => b.active && b.loop("nadar"),
      });
    };
    this.time.addEvent({ delay: demora, loop: true, callback: saltar });
    Object.assign(b, { animalId: item.id, info: def, avisado: false, camina: false });
    this.animales.push(b);
    return true;
  }

  spawnAnimal(item) {
    const def = ANIMALES[item.id];
    const ballena = def.forma === "ballena";
    if (ballena && this.ponerBallena(item, def)) return;

    const enAgua = EN_EL_AGUA.includes(item.id);
    if (enAgua) this.ponerCharco(item.x);
    const vuela = !!def.vuela;
    const real = !ballena && this.entidad(def.sprite, item.x, vuela ? GROUND_Y - 150 : GROUND_Y + (enAgua ? 10 : 3));
    if (real && vuela) {
      real.loop(real.def.animations[0].key);
      this.tweens.add({ targets: real, y: real.y - 30, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    }
    if (real) {
      const camina = CAMINANTES[item.id] && real.has("caminar");
      const [vMin, vMax] = ANIMAL_VELOCIDAD;
      // Ojo: `def` ya es del sprite (sus animaciones); los datos curiosos van en `info`.
      Object.assign(real, {
        animalId: item.id,
        info: def,
        avisado: false,
        charlando: false,
        charlaHasta: 0,
        camina,
        minX: item.x - item.rango,
        maxX: item.x + item.rango,
        vx: camina ? -(vMin + ((item.x * 7) % (vMax - vMin))) : 0,
      });
      if (camina) real.loop("caminar").face("left");
      this.animales.push(real);
      return;
    }

    const key = animalTexture(this, item.id, def);
    // La ballena se ve en el mar del fondo: se ubica para que aparezca cuando Vicente pasa por item.x.
    const x = ballena ? BALLENA_FACTOR * (item.x - 420) + 640 : item.x;
    const a = this.add
      .image(x, ballena ? 400 : GROUND_Y + 3, key)
      .setOrigin(0.5, 1)
      .setDepth(ballena ? -14.5 : 5)
      .setScrollFactor(ballena ? BALLENA_FACTOR : 1, 1);
    if (ballena)
      this.tweens.add({
        targets: a,
        y: 360,
        angle: -8,
        duration: 900,
        yoyo: true,
        repeat: -1,
        repeatDelay: 1400,
        ease: "Sine.InOut",
      });
    Object.assign(a, { animalId: item.id, info: def, avisado: false, camina: false });
    this.animales.push(a);
  }

  crearAnimacion(key, fps) {
    if (this.anims.exists(`${key}-anim`)) return;
    this.anims.create({
      key: `${key}-anim`,
      frames: [
        { key, frame: "0" },
        { key, frame: "1" },
      ],
      frameRate: fps,
      repeat: -1,
    });
  }

  // ---------- Loop ----------
  update(time, delta) {
    const dt = delta / 1000;
    const cam = this.cameras.main;
    this.parallax.update(cam.scrollX);
    if (this.terminado) return;

    const k = this.keys;
    this.player.update(time, {
      left: k.LEFT.isDown || k.A.isDown || this.touch.left,
      right: k.RIGHT.isDown || k.D.isDown || this.touch.right,
      jump: k.UP.isDown || k.W.isDown || k.SPACE.isDown || this.touch.jump,
      down: k.DOWN.isDown || k.S.isDown || this.touch.down,
    });
    for (const c of this.companeros) c.update();

    const pb = this.player.body;
    const cuerpo = new Phaser.Geom.Rectangle(pb.x, pb.y, pb.width, pb.height);
    const toca = (obj, achicar = 0.7) => {
      const r = obj.getBounds();
      Phaser.Geom.Rectangle.Inflate(r, (-r.width * (1 - achicar)) / 2, (-r.height * (1 - achicar)) / 2);
      return Phaser.Geom.Intersects.RectangleToRectangle(cuerpo, r);
    };
    const cayendoSobre = (obj, margen) => pb.velocity.y > 0 && pb.bottom < obj.getBounds().top + margen;

    // Plataformas móviles: van y vienen.
    for (const p of this.moviles) {
      if (p.minX != null) {
        if (p.x < p.minX) p.body.setVelocityX(PLATAFORMA_VELOCIDAD);
        else if (p.x > p.maxX) p.body.setVelocityX(-PLATAFORMA_VELOCIDAD);
      } else if (p.y < p.minY) p.body.setVelocityY(PLATAFORMA_VELOCIDAD * 0.8);
      else if (p.y > p.maxY) p.body.setVelocityY(-PLATAFORMA_VELOCIDAD * 0.8);
    }

    // Caerse en un pozo: se pierde un corazón entero y se vuelve antes del pozo.
    if (this.player.y > GAME_HEIGHT + 80) {
      this.caerEnPozo();
      return;
    }

    // Púas de las abejas
    for (const p of this.puas) {
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < cam.scrollX - 100 || p.x > cam.scrollX + cam.width + 100 || p.y > GAME_HEIGHT) p.destroy();
      else if (toca(p, 1)) {
        p.destroy();
        this.golpear(p.x);
      }
    }
    this.puas = this.puas.filter((p) => p.active);

    // Coleccionables y corazones
    for (const s of this.figuritas) if (s.active && toca(s, 1)) this.juntar(s);
    for (const h of this.corazones) if (h.active && toca(h, 0.9)) this.juntarVida(h);

    // Perros trampolín: si Vicente cae encima, rebota alto. De costado no pasa nada.
    for (const d of this.perros) if (toca(d, 0.8) && cayendoSobre(d, 30)) this.rebotarEnPerro(d);

    // Pájaros: vuelan (o corren) hacia Vicente. Si los pisa, se dan vuelta y caen; si no, lo golpean.
    for (const b of this.pajaros) {
      if (!b.active || b.pisado) continue;
      if (!b.activo && b.x - this.player.x < PAJARO_ACTIVACION) b.activo = true;
      if (!b.activo) continue;
      b.x -= b.velocidad * dt;
      if (!b.suelo) b.y = b.baseY + Math.sin(time * 0.004 + b.fase) * 14;
      // Las abejas tiran una púa hacia Vicente cada tanto, si están en pantalla y más adelante que él.
      if (
        b.pid === "abeja" &&
        b.x > this.player.x + 60 &&
        b.x < cam.scrollX + cam.width &&
        time > (b.proximaPua ?? 0)
      ) {
        b.proximaPua = time + PUA.cada;
        this.tirarPua(b);
      }
      if (b.x < cam.scrollX - 200) b.setActive(false).setVisible(false);
      else if (toca(b, 0.75)) {
        if (cayendoSobre(b, PISAR_MARGEN)) this.pisarPajaro(b);
        else this.golpear(b.x);
      }
    }

    // Animales: caminan; cuando Vicente llega al lado se frenan, lo miran y cuentan su dato.
    const px = this.player.x - cam.scrollX;
    for (const a of this.animales) {
      const ax = a.x - cam.scrollX * a.scrollFactorX;
      const cerca = Math.abs(ax - px) < ANIMAL_DISTANCIA;

      if (cerca && !a.charlando) this.frenarAnimal(a, ax + cam.scrollX, time);
      if (a.charlando) {
        a.face?.(this.player.x > a.x ? "right" : "left");
        if (!cerca && time > a.charlaHasta) this.seguirCaminando(a);
        continue;
      }
      if (!a.camina) continue;
      a.x += a.vx * dt;
      if (a.x < a.minX) a.vx = Math.abs(a.vx);
      else if (a.x > a.maxX) a.vx = -Math.abs(a.vx);
      a.face(a.vx > 0 ? "right" : "left");
    }

    if (this.cartel && this.player.x > this.cartel.x - 30) this.llegar();
  }

  // ---------- Animales ----------
  frenarAnimal(a, bubbleX, time) {
    a.charlando = true;
    a.charlaHasta = time + (a.avisado ? 0 : CHARLA_MS);
    if (a.camina) {
      const pose = CAMINANTES[a.animalId]?.quieto;
      if (pose && a.has(pose)) a.loop(pose);
      else a.anims.pause();
    }
    if (a.avisado) return;
    a.avisado = true;
    // Los animales que ya descubrió en otro tramo no vuelven a contar su dato: solo lo miran.
    // (En modo prueba hablan siempre, para poder probar los tramos varias veces.)
    if (this.vistos.has(a.animalId) && !modoPrueba()) return;
    this.vistos.add(a.animalId);
    this.cartelito(bubbleX, a.getBounds().top - 70, "¡Animal nuevo!", "#8ff09a");
    efecto("descubrir");
    const top = a.getBounds().top - 6;
    this.decir({ x: bubbleX, getTopCenter: () => ({ y: top }) }, `¡${a.info.nombre}!\n${a.info.dato}`, CHARLA_MS, 12);
  }

  seguirCaminando(a) {
    a.charlando = false;
    if (a.camina) a.loop("caminar");
  }

  // ---------- Eventos ----------
  juntar(s) {
    s.setActive(false);
    this.juntadas++;
    this.coleccion[s.tipo] = (this.coleccion[s.tipo] ?? 0) + 1;
    const tesoro = s.tipo.startsWith("tesoro-");
    efecto(tesoro ? "tesoro" : s.tipo !== COLECCIONABLES.comun ? "especial" : "estrella");
    const especial = s.tipo !== COLECCIONABLES.comun;
    this.chispas(s.x, s.y, tesoro ? 26 : especial ? 16 : 7, tesoro ? 0xffd23d : especial ? 0x9fe7ff : 0xfff2a8);
    if (tesoro) this.festejarTesoro(s.tipo);
    else if (especial) this.cartelito(s.x, s.y - 30, `¡${COLECCIONABLES.info[s.tipo]?.nombre ?? s.tipo}!`, "#ffd23d");
    if (s.tipo === COLECCIONABLES.comun) this.contarEstrella();
    this.tweens.killTweensOf(s);
    this.tweens.add({
      targets: s,
      y: s.y - 60,
      alpha: 0,
      scale: s.scale * 1.6,
      duration: 300,
      onComplete: () => s.destroy(),
    });
  }

  // Efecto al agarrar algo: chispitas que salen para todos lados y un anillo que se agranda.
  chispas(x, y, cantidad, color) {
    const key = sparkTexture(this);
    for (let k = 0; k < cantidad; k++) {
      const ang = (k / cantidad) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 40 + Math.random() * (cantidad > 10 ? 90 : 45);
      const p = this.add
        .image(x, y, key)
        .setDepth(21)
        .setTint(color)
        .setScale(0.6 + Math.random() * 0.6);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        alpha: 0,
        scale: 0.1,
        angle: 180,
        duration: 450 + Math.random() * 250,
        ease: "Cubic.Out",
        onComplete: () => p.destroy(),
      });
    }
    const anillo = this.add.circle(x, y, 14).setStrokeStyle(4, color, 1).setDepth(21);
    this.tweens.add({
      targets: anillo,
      scale: cantidad > 10 ? 4 : 2.4,
      alpha: 0,
      duration: 420,
      ease: "Cubic.Out",
      onComplete: () => anillo.destroy(),
    });
  }

  // Cada `estrellasPorVida` estrellas de la partida, un corazón.
  contarEstrella() {
    const total = this.estrellasAntes + (this.coleccion[COLECCIONABLES.comun] ?? 0);
    if (total % COLECCIONABLES.estrellasPorVida !== 0) return;
    this.sumarVida(CUARTOS);
    efecto("vida");
    this.cartelito(this.player.x, this.player.getTopCenter().y - 30, `¡${total} estrellas! +1 vida`, "#ff8a96");
    this.chispas(this.player.x, this.player.y - 60, 18, 0xff8a96);
  }

  // Tesoro: aparece grande en el centro de la pantalla un momento (el juego sigue).
  festejarTesoro(tipo) {
    const cam = this.cameras.main;
    const c = this.add
      .container(cam.width / 2, cam.height / 2 - 40)
      .setScrollFactor(0)
      .setDepth(40);
    const brillo = this.add.circle(0, 0, 110, 0xffd23d, 0.3);
    const img = this.add.image(0, 0, tipo, 0);
    img.setScale(170 / Math.max(img.width, img.height));
    const t1 = this.add
      .text(0, -130, "¡Tesoro encontrado!", {
        fontFamily: FONT,
        fontSize: "18px",
        color: "#ffffff",
        stroke: "#2a1d1a",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    const t2 = this.add
      .text(0, 118, COLECCIONABLES.info[tipo]?.nombre ?? tipo, {
        fontFamily: FONT,
        fontSize: "13px",
        color: "#ffd23d",
        stroke: "#2a1d1a",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    c.add([brillo, img, t1, t2]).setScale(0);
    this.tweens.add({ targets: c, scale: 1, duration: 380, ease: "Back.Out" });
    this.tweens.add({ targets: brillo, scale: 1.25, duration: 500, yoyo: true, repeat: 2 });
    this.tweens.add({ targets: c, alpha: 0, y: c.y - 40, delay: 1900, duration: 400, onComplete: () => c.destroy() });
    this.player.perform?.("festejo");
  }

  juntarVida(h) {
    efecto("vida");
    h.setActive(false);
    this.tweens.killTweensOf(h);
    this.sumarVida(CUARTOS);
    this.cartelito(h.x, h.y - 30, "¡+1 corazón!", "#ff8a96");
    this.tweens.add({ targets: h, y: h.y - 60, alpha: 0, scale: 1.8, duration: 350, onComplete: () => h.destroy() });
  }

  cartelito(x, y, texto, color = "#ffffff") {
    const t = this.add
      .text(x, y, texto, { fontFamily: FONT, fontSize: "12px", color, stroke: "#2a1d1a", strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  rebotarEnPerro(d) {
    efecto("rebote");
    this.player.rebotar();
    if (d.has?.(PERRO.rebote)) {
      d.loop(PERRO.rebote);
      this.time.delayedCall(450, () => d.active && d.loop(PERRO.quieto));
    }
    this.tweens.add({ targets: d, scaleY: d.scaleY * 0.7, duration: 90, yoyo: true });
    this.cartelito(d.x, d.getBounds().top - 10, "¡Boing!");
  }

  pisarPajaro(b) {
    efecto("plop");
    b.pisado = true;
    this.player.rebotar();
    b.anims?.pause();
    b.setFlipY(true);
    this.cartelito(b.x, b.y - 30, "¡Plop!");
    // Cae dando vueltas y desaparece.
    this.tweens.add({
      targets: b,
      y: GAME_HEIGHT + 100,
      angle: 200,
      alpha: 0.4,
      duration: 900,
      ease: "Quad.In",
      onComplete: () => b.destroy(),
    });
  }

  golpear(desdeX) {
    if (!this.player.golpear(this.time.now, desdeX)) return;
    this.perderVida(VIDAS.golpe);
    efecto("golpe");
  }

  sumarVida(cuartos) {
    this.vida = Math.min(VIDAS.maximo * CUARTOS, this.vida + cuartos);
  }

  // Resta cuartos de corazón (con un corazoncito que sale volando). Sin corazones: Game Over.
  perderVida(cuartos, motivo) {
    if (this.vidasInfinitas) return;
    this.vida = Math.max(0, this.vida - cuartos);
    const h = this.add
      .image(this.player.x, this.player.getTopCenter().y, heartTexture(this, Math.min(cuartos, CUARTOS)))
      .setDepth(20);
    this.tweens.add({ targets: h, y: h.y - 70, alpha: 0, scale: 1.6, duration: 700, onComplete: () => h.destroy() });
    if (this.vida <= 0) this.sinVidas(motivo);
  }

  caerEnPozo() {
    const pozo = this.level.items.find((it) => it.tipo === "pozo" && Math.abs(it.x - this.player.x) < it.w / 2 + 60);
    efecto("golpe");
    this.perderVida(VIDAS.pozo, "¡Te caíste en un pozo!");
    if (this.terminado) {
      this.player.body.reset(this.player.x, GAME_HEIGHT + 40);
      this.player.body.setAllowGravity(false);
      return;
    }
    // Vuelve al borde de antes del pozo, parpadeando un rato.
    const x = pozo ? pozo.x - pozo.w / 2 - 70 : this.player.x - 300;
    this.player.body.reset(x, GROUND_Y - 4);
    this.player.invulnerableHasta = this.time.now + 1600;
    this.cartelito(x, GROUND_Y - 170, "¡Cuidado con el pozo!", "#ff8a96");
  }

  // Game Over: se borran las estrellas de la partida y se vuelve al planisferio; hay que repetir las
  // preguntas de la ciudad de donde salió este tramo.
  sinVidas(motivo = "¡Uy! Se acabaron los corazones.") {
    if (this.terminado) return;
    efecto("perder");
    this.terminado = true;
    this.player.frenar();
    this.player.setAlpha(1);
    this.player.perform("enojado");
    const top = Math.min(this.player.getTopCenter().y, GROUND_Y - 150);
    this.decir({ x: this.player.x, getTopCenter: () => ({ y: top }) }, `${motivo}\n¡Game Over!`, 2400);
    this.time.delayedCall(2600, () => {
      this.cameras.main.fadeOut(400);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        gameOver(this.paisId, this.tramoIndex);
        this.scene.start(SCENES.MAPA, { gameOver: true });
      });
    });
  }

  decir(target, texto, ms, fontSize = 12) {
    const b = new SpeechBubble(this, target.x, target.getTopCenter().y - 6, texto, {
      maxWidth: 380,
      fontSize: fontSize - 2,
    }).setDepth(30);
    this.time.delayedCall(ms, () => b.close());
  }

  llegar() {
    efecto("llegada");
    this.terminado = true;
    this.player.frenar();
    this.player.setAlpha(1);
    this.player.perform("festejo");
    for (const c of this.companeros) c.perform("festejo");

    sumarColeccion(this.coleccion);
    actualizarViaje(this.paisId, (v) => ({
      ciudad: this.tramoIndex + 1,
      preguntasOk: false,
      figuritas: v.figuritas + this.juntadas,
      vida: this.vida,
      estrellas: this.estrellasAntes + (this.coleccion[COLECCIONABLES.comun] ?? 0),
      animalesVistos: [...this.vistos],
    }));

    this.decir(this.player, `¡Llegamos a ${this.hasta.nombre}!`, 2000);
    this.time.delayedCall(2200, () => {
      this.cameras.main.fadeOut(400);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.start(SCENES.CIUDAD, { paisId: this.paisId, ciudad: this.tramoIndex + 1 })
      );
    });
  }
}
