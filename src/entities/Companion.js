import { Character } from "./Character.js";

const RETRASO = 16; // cuadros de retraso: repite lo que hizo el líder un poquito después
const DISTANCIA = 70; // px detrás del líder

// Compañero de viaje (Anita): sigue al líder repitiendo su recorrido con retraso. Sin física propia.
export class Companion extends Character {
  constructor(scene, leader, id, opts) {
    super(scene, leader.x - DISTANCIA, leader.y, id, opts);
    this.leader = leader;
    this.historial = [];
    this.estado = null;
  }

  update() {
    const l = this.leader;
    this.historial.push({ x: l.x, y: l.y, facing: l.facing, estado: l.estado });
    if (this.historial.length < RETRASO) return;
    const p = this.historial.shift();

    const detras = p.facing === "right" ? -DISTANCIA : DISTANCIA;
    this.x += (p.x + detras - this.x) * 0.25;
    this.y = p.y;
    this.face(p.facing);
    const estado = p.estado === "golpe" ? "idle" : p.estado;
    if (estado !== this.estado) {
      this.estado = estado;
      this.loop(this.has(estado) ? estado : this.idleAction);
    }
  }
}
