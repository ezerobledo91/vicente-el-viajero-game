import Phaser from "phaser";
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, PX_PER_CM, SCENES } from "../config/constants.js";
import { Player } from "../entities/Player.js";
import { Companion } from "../entities/Companion.js";
import { Character } from "../entities/Character.js";
import { SpeechBubble } from "../ui/SpeechBubble.js";
import { getViaje } from "../data/viajes/index.js";
import { PAISAJES } from "../data/paisajes.js";
import { ANIMALES, CAMINANTES, COLECCIONABLES, PAJAROS, PERRO, VIDAS } from "../data/animales.js";
import { hasCharacter } from "../systems/characters.js";
import { DECORACION } from "../data/decoracion.js";
import { mulberry32 } from "../systems/levelBuilder.js";
import { modoPrueba } from "../systems/dev.js";
import { buildLevel } from "../systems/levelBuilder.js";
import { createParallax } from "../systems/parallax.js";
import { actualizarViaje, getProgresoViaje, sumarColeccion } from "../systems/progress.js";
import {
  animalTexture,
  birdTexture,
  dogTexture,
  heartTexture,
  platformTexture,
  rockTexture,
  signTexture,
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
const BALLENA_FACTOR = 0.3; // la ballena nada "lejos": se mueve como una capa de fondo

// Un tramo del viaje entre dos ciudades: plataformas de costado con obstáculos y animales.
export class ViajeScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.VIAJE, physics: { default: "arcade", arcade: { gravity: { y: GRAVEDAD } } } });
  }

  init({ paisId, tramo }) {
    this.paisId = paisId;
    this.tramoIndex = tramo;
  }

  create() {
    const viaje = getViaje(this.paisId);
    this.tramo = viaje.tramos[this.tramoIndex];
    this.desde = viaje.ciudades[this.tramoIndex];
    this.hasta = viaje.ciudades[this.tramoIndex + 1];
    this.level = buildLevel(this.tramo, this.tramoIndex + 1);
    this.largo = this.level.largo;
    this.progreso = getProgresoViaje(this.paisId);
    this.vistos = new Set(this.progreso.animalesVistos);
    this.terminado = false;
    this.vidas = VIDAS.inicio;
    this.juntadas = 0; // total de este tramo (para la interfaz)
    this.coleccion = {}; // por tipo: { estrella: 12, mate: 1, ... }

    this.physics.world.setBounds(0, 0, this.largo, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, this.largo, GAME_HEIGHT);
    this.parallax = createParallax(this, this.tramo.paisaje, PAISAJES[this.tramo.paisaje], {
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      groundY: GROUND_Y,
    });

    const piso = this.add.zone(this.largo / 2, GROUND_Y + 60, this.largo, 120);
    this.physics.add.existing(piso, true);
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
    this.ponerAdornos();

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
    if (modoPrueba()) {
      this.input.keyboard.on(
        "keydown-N",
        () => !this.terminado && this.player.body.reset(this.cartel.x - 20, GROUND_Y - 2)
      );
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
        const { comun, especiales, cadaCuantos } = COLECCIONABLES;
        const n = this.nFiguritas++;
        const tipo =
          n % cadaCuantos === cadaCuantos - 1 ? especiales[Math.floor(n / cadaCuantos) % especiales.length] : comun;
        const s =
          this.entidad(tipo, item.x, y, { mirando: "right", depth: 8 })?.setOrigin(0.5) ??
          this.add.image(item.x, y, starTexture(this)).setDepth(8);
        s.tipo = tipo;
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
        const key = platformTexture(this, item.w);
        if (!item.mueve) {
          this.solidos.create(item.x, y, key).setOrigin(0.5, 0).setDepth(6).refreshBody();
          break;
        }
        const p = this.physics.add.image(item.x, y, key).setOrigin(0.5, 0).setDepth(6).setImmovable(true);
        p.body.setAllowGravity(false);
        p.body.setVelocityX(PLATAFORMA_VELOCIDAD);
        Object.assign(p, { minX: item.x - item.mueve / 2, maxX: item.x + item.mueve / 2 });
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
        const def = PAJAROS[this.tramo.pajaro];
        // Los que corren por el piso (tero) van apoyados; los que vuelan, a la altura del patrón.
        const by = def.suelo ? GROUND_Y + 2 : y;
        let b = this.entidad(def.sprite, item.x, by, { anim: def.anim, depth: 9 });
        if (b && !def.suelo) b.setOrigin(0.5);
        if (!b) {
          const key = birdTexture(this, this.tramo.pajaro, def);
          this.crearAnimacion(key, 8);
          b = this.add.sprite(item.x, by, key).setDepth(9).play(`${key}-anim`);
        }
        Object.assign(b, { baseY: by, velocidad: def.velocidad, activo: false, fase: item.x % 7, suelo: !!def.suelo });
        this.pajaros.push(b);
        break;
      }
      case "animal":
        this.spawnAnimal(item);
        break;
      case "cartel": {
        const c = this.add
          .image(item.x, GROUND_Y + 4, signTexture(this))
          .setOrigin(0.5, 1)
          .setDepth(4);
        this.add
          .text(item.x + 12, GROUND_Y - 145, this.hasta.nombre, {
            fontFamily: FONT,
            fontSize: "14px",
            color: COLORS.inkDark,
            align: "center",
            wordWrap: { width: 190 },
          })
          .setOrigin(0.5)
          .setDepth(4);
        this.cartel = c;
        break;
      }
    }
  }

  // Roca o tronco real (si está la lámina de decoración): sólido, hay que saltarlo o subirse encima.
  ponerRoca(x) {
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

  // Adornos sin colisión a lo largo del camino (piedritas, troncos, tocones...).
  ponerAdornos() {
    const opciones = DECORACION.adornos.filter((id) => this.textures.exists(id));
    if (!opciones.length) return;
    const [min, max] = DECORACION.adornoCada;
    for (let x = 400; x < this.largo - 300; x += min + this.rnd() * (max - min)) {
      const id = opciones[Math.floor(this.rnd() * opciones.length)];
      this.add
        .image(x, GROUND_Y + 10 + this.rnd() * 14, id, 0)
        .setOrigin(0.5, 1)
        .setDepth(4)
        .setScale(DECORACION.escala)
        .setFlipX(this.rnd() < 0.5);
    }
  }

  spawnAnimal(item) {
    const def = ANIMALES[item.id];
    const ballena = def.forma === "ballena";
    // Con fondo ilustrado de la costa, la ballena ya está pintada en el mar.
    if (ballena && this.parallax.imagen) return;

    const real = !ballena && this.entidad(def.sprite, item.x, GROUND_Y + 3);
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
      if (p.x < p.minX) p.body.setVelocityX(PLATAFORMA_VELOCIDAD);
      else if (p.x > p.maxX) p.body.setVelocityX(-PLATAFORMA_VELOCIDAD);
    }

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
    this.vistos.add(a.animalId);
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
    if (s.tipo !== COLECCIONABLES.comun)
      this.cartelito(s.x, s.y - 30, `¡${COLECCIONABLES.info[s.tipo]?.nombre ?? s.tipo}!`, "#ffd23d");
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

  juntarVida(h) {
    h.setActive(false);
    this.tweens.killTweensOf(h);
    if (this.vidas < VIDAS.maximo) this.vidas++;
    this.cartelito(h.x, h.y - 30, "¡+1 vida!", "#ff8a96");
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
    this.player.rebotar();
    if (d.has?.(PERRO.rebote)) {
      d.loop(PERRO.rebote);
      this.time.delayedCall(450, () => d.active && d.loop(PERRO.quieto));
    }
    this.tweens.add({ targets: d, scaleY: d.scaleY * 0.7, duration: 90, yoyo: true });
    this.cartelito(d.x, d.getBounds().top - 10, "¡Boing!");
  }

  pisarPajaro(b) {
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
    if (!this.vidasInfinitas) this.vidas--;
    const h = this.add.image(this.player.x, this.player.getTopCenter().y, heartTexture(this)).setDepth(20);
    this.tweens.add({ targets: h, y: h.y - 70, alpha: 0, scale: 1.6, duration: 700, onComplete: () => h.destroy() });
    if (this.vidas <= 0) this.sinVidas();
  }

  sinVidas() {
    this.terminado = true;
    this.player.frenar();
    this.player.setAlpha(1);
    this.player.perform("enojado");
    this.decir(this.player, "¡Uy! Se acabaron las vidas.\n¡Probemos otra vez!", 2400);
    this.time.delayedCall(2600, () => {
      this.cameras.main.fadeOut(400);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.restart({ paisId: this.paisId, tramo: this.tramoIndex })
      );
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
