// Modo prueba: atajos para probar rápido (elegir ciudad o tramo, saltear preguntas, llegar al final
// del tramo, vidas infinitas). Se activa con ?prueba en la dirección o con el botón del planisferio,
// y queda recordado en el navegador. ?prueba=0 lo apaga.

const KEY = "explorador-del-mundo:prueba";

function leer() {
  try {
    const param = new URLSearchParams(location.search).get("prueba");
    if (param !== null) localStorage.setItem(KEY, param === "0" ? "0" : "1");
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

let activo = leer();

export const modoPrueba = () => activo;

export function setModoPrueba(valor) {
  activo = valor;
  try {
    localStorage.setItem(KEY, valor ? "1" : "0");
  } catch {
    // Sin almacenamiento: dura hasta recargar.
  }
}
