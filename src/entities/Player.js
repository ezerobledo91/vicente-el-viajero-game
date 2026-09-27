import { efecto } from "../systems/audio.js";
import { Character } from "./Character.js";

export const PLAYER = {
  velocidad: 240, // px/seg caminando
  salto: 700, // velocidad inicial del salto
  saltoCorto: 0.45, // si se suelta el botón antes, el salto se corta (salto más bajo)
  rebote: 900, // al caer arriba de un perro
  empujon: { x: 260, y: 360 }, // al chocar un pájaro o un perro de costado
  invulnerable: 1400, // ms después de un golpe
  aturdido: 450, // ms sin control después de un golpe
  agachado: 0.42, // alto del cuerpo agachado (proporción del parado)
};

// Vicente jugable: un Character con cuerpo de Arcade Physics y control de plataformas.
// La animación se elige sola según el estado (quieto, caminando, en el aire, golpeado).
export class Player extends Character {
  constructor(scene, x, y, id, opts) {
    super(scene, x, y, id, opts);
    scene.physics.add.existing(this);

    // Cuerpo: más angosto que el cuadro, del alto del personaje dibujado, apoyado en los pies.
    this.bodyW = this.def.alturaPx * 0.38;
    this.bodyH = this.def.alturaPx * 0.92;
    this.ajustarCuerpo(1);
    this.body.setCollideWorldBounds(true);

    this.estado = null;
    this.saltando = false;
    this.golpeadoHasta = 0;
    this.invulnerableHasta = 0;
    this.accion = null; // "arrojar" o "mochila" mientras dura (ver hacer())
    this.accionHasta = 0;
    this.face("right");
  }

  // Alto del cuerpo físico (1 = parado); siempre apoyado en los pies.
  ajustarCuerpo(proporcion) {
    const h = this.bodyH * proporcion;
    this.body.setSize(this.bodyW, h);
    this.body.setOffset((this.def.frameWidth - this.bodyW) / 2, this.def.frameHeight - 3 - h);
  }

  get enElPiso() {
    return this.body.blocked.down || this.body.touching.down;
  }

  get dir() {
    return this.facing === "left" ? -1 : 1;
  }

  // Empieza una acción (tirar o revolear la mochila) que dura ms. En el piso se frena mientras tanto.
  hacer(accion, time, ms) {
    if (!this.has(accion) || time < this.golpeadoHasta || this.agachado) return false;
    this.accion = accion;
    this.accionHasta = time + ms;
    this.estado = null; // que vuelva a arrancar la animación aunque repita la misma acción
    return true;
  }

  update(time, controls) {
    const aturdido = time < this.golpeadoHasta;
    if (this.accion && time >= this.accionHasta) this.accion = null;
    // Agacharse: solo en el piso; mientras está agachado no camina.
    const agachar = !aturdido && controls.down && this.enElPiso && this.has("agachado");
    if (agachar !== !!this.agachado) {
      this.agachado = agachar;
      this.ajustarCuerpo(agachar ? PLAYER.agachado : 1);
    }
    if (this.agachado || (this.accion && this.enElPiso)) this.body.setVelocityX(0);
    else if (!aturdido) {
      const dir = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
      this.body.setVelocityX(dir * PLAYER.velocidad);
      if (dir) this.face(dir > 0 ? "right" : "left");

      if (controls.jump && this.enElPiso && !this.saltando) {
        this.body.setVelocityY(-PLAYER.salto);
        efecto("salto");
        this.saltando = true;
      }
      if (!controls.jump) {
        if (this.saltando && this.body.velocity.y < 0) this.body.setVelocityY(this.body.velocity.y * PLAYER.saltoCorto);
        this.saltando = false;
      }
    }

    // Parpadeo mientras es invulnerable.
    this.setAlpha(time < this.invulnerableHasta ? (Math.floor(time / 90) % 2 ? 0.35 : 1) : 1);
    this.setEstado(this.estadoActual(aturdido));
  }

  estadoActual(aturdido) {
    if (aturdido) return this.golpeAtras && this.has("golpe-atras") ? "golpe-atras" : "golpe";
    if (this.accion) return this.accion;
    if (this.agachado) return "agachado";
    if (!this.enElPiso) return "aire";
    return Math.abs(this.body.velocity.x) > 10 ? "caminar" : "idle";
  }

  setEstado(estado) {
    if (estado === this.estado) return;
    this.estado = estado;
    this.loop(this.has(estado) ? estado : this.idleAction);
  }

  rebotar() {
    this.body.setVelocityY(-PLAYER.rebote);
    this.saltando = false; // el rebote no se corta al soltar el botón
  }

  // Devuelve false si no le hizo nada (estaba invulnerable).
  golpear(time, desdeX) {
    if (time < this.invulnerableHasta) return false;
    const dir = this.x < desdeX ? -1 : 1;
    // Si el golpe viene de atrás (le pegan en la mochila) tiene su propia animación.
    this.golpeAtras = dir === this.dir;
    this.accion = null;
    this.body.setVelocity(dir * PLAYER.empujon.x, -PLAYER.empujon.y);
    this.golpeadoHasta = time + PLAYER.aturdido;
    this.invulnerableHasta = time + PLAYER.invulnerable;
    return true;
  }

  frenar() {
    this.body.setVelocityX(0);
    this.setEstado("idle");
  }
}
