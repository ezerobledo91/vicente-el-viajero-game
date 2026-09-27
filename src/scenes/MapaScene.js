import Phaser from "phaser";
import { musica } from "../systems/audio.js";
import { ASSETS, COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, PX_PER_CM, SCENES } from "../config/constants.js";
import { Character } from "../entities/Character.js";
import { getPais } from "../data/paises.js";
import { REGIONES } from "../data/regiones.js";

const MARKER_RADIUS = 30;
const CAMERA_MS = 1400;
const VICENTE_SPEED = 70; // px del mapa por segundo
const EMBLEM_HEIGHT = 30;

// Planisferio. Coordenadas del mundo = píxeles de la ilustración del mapa.
// Modos: "world" (vista general con continentes bloqueados) y "region" (países jugables).
// La interfaz vive en MapaHudScene; esta escena le avisa lo que pasa por `this.events`.
export class MapaScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MAPA);
  }

  init(data) {
    this.vieneDeGameOver = !!data?.gameOver;
  }

  create() {
    musica("tema");
    this.mapImage = this.add.image(0, 0, ASSETS.MAP_IMAGE).setOrigin(0);
    this.mapW = this.mapImage.width;
    this.mapH = this.mapImage.height;
    this.cameras.main.setBackgroundColor(0x0d4ea6);

    this.mode = null;
    this.hovered = null;
    this.selected = null;
    this.markersShown = false;

    this.borders = this.add.graphics().setDepth(2);
    this.highlight = this.add.graphics().setDepth(3);
    this.countries = REGIONES.filter((r) => r.disponible).flatMap((r) => this.buildCountries(r.id));
    this.drawBorders();
    this.markers = REGIONES.map((r) => this.buildMarker(r));

    const start = this.countries.find((c) => c.id === "ar") ?? this.countries[0];
    this.vicente = new Character(this, start.anchor.x, start.anchor.y, "vicente", { pxPerCm: PX_PER_CM.map })
      .setDepth(20)
      .setVisible(false);

    this.input.on("pointermove", (p) => this.onPointerMove(p));
    this.input.on("pointerdown", (p) => this.onPointerDown(p));

    this.scene.launch(SCENES.MAPA_HUD, { mapa: this });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop(SCENES.MAPA_HUD));
    this.showWorld(false);
    if (this.vieneDeGameOver)
      this.time.delayedCall(700, () =>
        this.events.emit(
          "toast",
          "¡Game Over! Se borraron las estrellas. Volvé a Argentina y respondé las preguntas para seguir."
        )
      );
  }

  // ---------- Construcción ----------
  buildCountries(regionId) {
    const data = this.cache.json.get(ASSETS.MAP_REGION(regionId));
    return data.countries
      .filter((c) => c.playable && getPais(c.id))
      .map((c) => {
        const pais = getPais(c.id);
        const polygons = c.polygons.map((pts) => new Phaser.Geom.Polygon(pts.flat()));
        const off = pais.etiqueta ?? { dx: 0, dy: 0 };
        const anchor = { x: c.anchor[0], y: c.anchor[1] };
        const label = this.add
          .text(anchor.x + off.dx, anchor.y + off.dy, pais.nombre, {
            fontFamily: FONT,
            fontSize: "7px",
            color: "#ffffff",
            stroke: "#1b2a3a",
            strokeThickness: 3,
            resolution: 4,
          })
          .setOrigin(0.5)
          .setDepth(10)
          .setAlpha(0);

        let emblem = null;
        if (this.textures.exists(ASSETS.EMBLEM(c.id))) {
          emblem = this.add
            .image(anchor.x, anchor.y - 6, ASSETS.EMBLEM(c.id))
            .setOrigin(0.5, 1)
            .setDepth(12)
            .setAlpha(0);
          emblem.setScale(EMBLEM_HEIGHT / emblem.height);
          this.tweens.add({
            targets: emblem,
            y: emblem.y - 3,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
          });
        }
        return { id: c.id, region: regionId, pais, polygons, anchor, label, emblem };
      });
  }

  drawBorders() {
    this.borders.clear().lineStyle(1, 0xffffff, 0.55);
    for (const c of this.countries) for (const p of c.polygons) this.borders.strokePoints(p.points, true);
  }

  buildMarker(region) {
    const [x, y] = region.marca;
    const c = this.add.container(x, y).setDepth(30);
    const g = this.add.graphics();
    if (region.disponible) {
      g.fillStyle(0x000000, 0.3).fillCircle(3, 4, MARKER_RADIUS);
      g.fillStyle(COLORS.accent, 1).fillCircle(0, 0, MARKER_RADIUS);
      g.lineStyle(4, 0xffffff, 1).strokeCircle(0, 0, MARKER_RADIUS);
      drawStar(g, 0, 0, 16, 7, 0xffffff);
    } else {
      g.fillStyle(0x000000, 0.3).fillCircle(3, 4, MARKER_RADIUS);
      g.fillStyle(0x1b2a3a, 0.9).fillCircle(0, 0, MARKER_RADIUS);
      g.lineStyle(3, 0x9fb3c8, 1).strokeCircle(0, 0, MARKER_RADIUS);
      drawPadlock(g, 0, 2, 0xd9e3ec);
    }
    const text = this.add
      .text(0, MARKER_RADIUS + 16, region.nombre, {
        fontFamily: FONT,
        fontSize: "14px",
        color: region.disponible ? "#ffffff" : "#d9e3ec",
        stroke: "#1b2a3a",
        strokeThickness: 5,
        resolution: 2,
      })
      .setOrigin(0.5);
    c.add([g, text]);
    c.setScale(0);
    if (region.disponible)
      this.tweens.add({ targets: g, scale: 1.12, duration: 600, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    return { region, container: c };
  }

  // ---------- Modos ----------
  showWorld(animate = true) {
    this.mode = "world";
    this.select(null);
    this.setHovered(null);
    this.mapImage.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

    const zoom = Math.min(GAME_WIDTH / this.mapW, GAME_HEIGHT / this.mapH);
    this.moveCamera(this.mapW / 2, this.mapH / 2, zoom, animate);

    const fade = (targets, alpha) => this.tweens.add({ targets, alpha, duration: 400 });
    fade(
      this.countries.map((c) => c.label),
      0
    );
    fade(this.countries.map((c) => c.emblem).filter(Boolean), 0);
    fade(this.borders, 0.4);
    this.vicente.setVisible(false);

    this.markers.forEach((m, i) =>
      this.tweens.add({
        targets: m.container,
        scale: 1,
        delay: (animate ? CAMERA_MS * 0.6 : 500) + (this.markersShown ? 0 : i * 140),
        duration: 350,
        ease: "Back.Out",
      })
    );
    this.markersShown = true;
    this.events.emit("mode", { mode: "world" });
  }

  enterRegion(regionId) {
    const region = REGIONES.find((r) => r.id === regionId);
    if (!region?.disponible) return;
    this.mode = "region";
    this.region = region;
    this.mapImage.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.moveCamera(region.foco.x, region.foco.y, region.foco.zoom, true);

    this.markers.forEach((m) => this.tweens.add({ targets: m.container, scale: 0, duration: 250 }));
    const inRegion = this.countries.filter((c) => c.region === regionId);
    this.tweens.add({ targets: inRegion.map((c) => c.label), alpha: 1, delay: CAMERA_MS * 0.7, duration: 500 });
    this.tweens.add({
      targets: inRegion.map((c) => c.emblem).filter(Boolean),
      alpha: 1,
      delay: CAMERA_MS * 0.8,
      duration: 500,
    });
    this.tweens.add({ targets: this.borders, alpha: 1, duration: 600 });

    this.time.delayedCall(CAMERA_MS * 0.8, () => {
      this.vicente.setVisible(true).setScale(0);
      this.tweens.add({ targets: this.vicente, scale: this.vicente.baseScale, duration: 300, ease: "Back.Out" });
    });
    this.events.emit("mode", { mode: "region", region });
  }

  moveCamera(x, y, zoom, animate) {
    const cam = this.cameras.main;
    if (!animate) {
      cam.setZoom(zoom).centerOn(x, y);
      return;
    }
    cam.pan(x, y, CAMERA_MS, "Sine.easeInOut", true);
    cam.zoomTo(zoom, CAMERA_MS, "Sine.easeInOut", true);
  }

  // ---------- Interacción ----------
  countryAt(x, y) {
    return this.countries.find((c) => c.polygons.some((p) => Phaser.Geom.Polygon.Contains(p, x, y))) ?? null;
  }

  markerAt(x, y) {
    return (
      this.markers.find((m) => Phaser.Math.Distance.Between(x, y, ...m.region.marca) < MARKER_RADIUS * 1.3) ?? null
    );
  }

  // Posición del puntero en coordenadas del mapa. No se usa pointer.worldX: Phaser solo lo
  // actualiza si la escena tiene objetos interactivos, y acá la detección es manual.
  toMap(pointer) {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  onPointerMove(pointer) {
    const { x, y } = this.toMap(pointer);
    if (this.mode === "world") {
      this.input.setDefaultCursor(this.markerAt(x, y) ? "pointer" : "default");
      return;
    }
    const c = this.countryAt(x, y);
    this.input.setDefaultCursor(c ? "pointer" : "default");
    this.setHovered(c);
    this.events.emit("hover", { pais: c?.pais ?? null, x: pointer.x, y: pointer.y });
  }

  onPointerDown(pointer) {
    const { x, y } = this.toMap(pointer);
    if (this.mode === "world") {
      const m = this.markerAt(x, y);
      const c = this.countryAt(x, y);
      if (m && !m.region.disponible) {
        this.events.emit("toast", `${m.region.nombre} todavía está bloqueada. ¡Primero explorá Sudamérica!`);
      } else if (m || c) {
        this.enterRegion(m?.region.id ?? c.region);
      }
      return;
    }
    const c = this.countryAt(x, y);
    this.select(c);
    if (!c) return;
    this.vicente
      .walkToPoint(c.anchor.x - (c.emblem ? 14 : 0), c.anchor.y + 4, VICENTE_SPEED)
      .then(() => this.selected === c && this.vicente.perform("salto"));
  }

  setHovered(c) {
    if (this.hovered === c) return;
    this.hovered = c;
    this.redrawHighlight();
  }

  select(c) {
    this.selected = c;
    this.redrawHighlight();
    this.events.emit("select", { pais: c?.pais ?? null });
  }

  redrawHighlight() {
    const g = this.highlight.clear();
    const paint = (c, color, alpha, stroke) => {
      if (!c) return;
      for (const p of c.polygons) {
        g.fillStyle(color, alpha).fillPoints(p.points, true);
        g.lineStyle(stroke, 0xffffff, 1).strokePoints(p.points, true);
      }
    };
    paint(this.selected, COLORS.accent, 0.45, 2);
    if (this.hovered !== this.selected) paint(this.hovered, 0xffffff, 0.45, 1.5);
  }
}

function drawStar(g, x, y, outer, inner, color) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
  }
  g.fillStyle(color, 1).fillPoints(pts, true);
}

function drawPadlock(g, x, y, color) {
  g.lineStyle(4, color, 1);
  g.beginPath();
  g.arc(x, y - 6, 8, Math.PI, 0);
  g.strokePath();
  g.fillStyle(color, 1).fillRoundedRect(x - 12, y - 6, 24, 18, 3);
  g.fillStyle(0x1b2a3a, 1).fillRect(x - 2, y, 4, 7);
}
