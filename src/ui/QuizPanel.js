import Phaser from "phaser";
import { COLORS, FONT } from "../config/constants.js";
import { Button } from "./Button.js";

const W = 620,
  H = 440,
  PAD = 28;
const VERDE = 0x5fd068,
  ROJO = 0xf0736a;
const PAUSA_MS = 1600;

// Panel de preguntas de opción múltiple. `jugar(preguntas)` devuelve una promesa con la cantidad de aciertos.
// `onRespuesta(correcta)` se llama después de cada respuesta (para que Vicente festeje o se aburra).
export class QuizPanel extends Phaser.GameObjects.Container {
  constructor(scene, x, y, { onRespuesta } = {}) {
    super(scene, x, y);
    this.onRespuesta = onRespuesta;
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.3).fillRoundedRect(-W / 2 + 5, -H / 2 + 7, W, H, 16);
    bg.fillStyle(COLORS.panel, 0.97).fillRoundedRect(-W / 2, -H / 2, W, H, 16);
    bg.lineStyle(3, COLORS.accent, 1).strokeRoundedRect(-W / 2, -H / 2, W, H, 16);
    this.add(bg);
    this.contenido = scene.add.container(0, 0);
    this.add(this.contenido);
    scene.add.existing(this);
  }

  texto(y, s, size, color) {
    const t = this.scene.add
      .text(0, y, s, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        color,
        align: "center",
        lineSpacing: 8,
        wordWrap: { width: W - PAD * 2 },
      })
      .setOrigin(0.5, 0);
    this.contenido.add(t);
    return t;
  }

  async jugar(preguntas) {
    let aciertos = 0;
    for (const [i, p] of preguntas.entries()) {
      this.contenido.removeAll(true);
      this.texto(-H / 2 + PAD, `Pregunta ${i + 1} de ${preguntas.length}`, 10, COLORS.muted);
      this.texto(-H / 2 + PAD + 34, p.p, 14, COLORS.ink);

      const opciones = Phaser.Utils.Array.Shuffle(
        p.opciones.map((texto, k) => ({ texto, correcta: k === p.correcta }))
      );
      this.opciones = opciones;
      const elegida = await new Promise((resolve) => {
        this.botones = opciones.map((o, k) => {
          // Hasta 4 opciones: se achica el espacio entre botones para que entren.
          const paso = opciones.length > 3 ? 60 : 74;
          const b = new Button(this.scene, 0, (opciones.length > 3 ? -56 : -10) + k * paso, o.texto, () => resolve(o), {
            width: W - PAD * 2,
            height: opciones.length > 3 ? 50 : 56,
            fontSize: o.texto.length > 34 ? 10 : 12,
          });
          this.contenido.add(b);
          return b;
        });
      });

      // Corrección: la correcta en verde; si eligió otra, esa en rojo.
      this.botones.forEach((b, k) => {
        b.disableInteractive();
        if (opciones[k].correcta) b.setFill(VERDE);
        else if (opciones[k] === elegida) b.setFill(ROJO);
      });
      const ok = elegida.correcta;
      if (ok) aciertos++;
      this.texto(
        H / 2 - PAD - 26,
        ok ? "¡Muy bien!" : "¡Casi! La respuesta está en verde.",
        12,
        ok ? "#8ff09a" : "#ffb3ab"
      );
      this.onRespuesta?.(ok);
      await new Promise((r) => this.scene.time.delayedCall(PAUSA_MS, r));
    }
    return aciertos;
  }

  // Pantalla final con uno o más botones: [{ texto, onClick }].
  mostrarFinal(titulo, mensaje, botones) {
    this.contenido.removeAll(true);
    this.texto(-H / 2 + PAD + 20, titulo, 18, "#ffb83d");
    this.texto(-H / 2 + PAD + 70, mensaje, 12, COLORS.ink);
    botones.forEach((b, k) =>
      this.contenido.add(
        new Button(this.scene, 0, 40 + k * 64, b.texto, b.onClick, { width: 380, height: 50, fontSize: 13 })
      )
    );
  }
}
