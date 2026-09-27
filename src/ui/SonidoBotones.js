import { Button } from "./Button.js";
import { alternar, audioPrefs } from "../systems/audio.js";

// Dos botoncitos para prender/apagar la música y los efectos. Se recuerda en el navegador.
export function botonesSonido(scene, x, y, { ancho = 150 } = {}) {
  const texto = (tipo) => `${tipo === "musica" ? "Música" : "Sonidos"}: ${audioPrefs()[tipo] ? "sí" : "no"}`;
  const crear = (tipo, bx) => {
    const b = new Button(
      scene,
      bx,
      y,
      texto(tipo),
      () => {
        alternar(tipo);
        b.label.setText(texto(tipo));
      },
      { width: ancho, height: 26, fontSize: 8, variant: "secondary" }
    );
    return b;
  };
  return [crear("musica", x), crear("efectos", x + ancho + 10)];
}
