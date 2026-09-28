// Personajes regionales (npm run npcs → public/assets/npcs). En cada tramo uno saluda a Vicente, le
// cuenta algo del lugar y le regala el objeto para tirar; en las ciudades, uno le hace las preguntas.
// `frase`: lo que dice en el camino (antes de regalar el objeto).

export const NPCS = {
  guardaparques: {
    nombre: "la guardaparques",
    frase: "¡Hola, Vicente! En el Parque Nacional Tierra del Fuego cuidamos los bosques de lengas.",
  },
  "trabajador-patagonico": {
    nombre: "Don Aníbal",
    frase: "¡Buenas! Acá en la estepa el viento sopla fuerte y las ovejas comen coirón.",
  },
  "guia-costera": {
    nombre: "la guía costera",
    frase: "¡Hola! De junio a diciembre las ballenas francas vienen a tener sus crías al golfo.",
  },
  kiosquera: {
    nombre: "la kiosquera",
    frase: "¡Hola, pibe! ¿Sabías que el colectivo lo inventaron en Buenos Aires?",
  },
  veterinario: {
    nombre: "el veterinario",
    frase: "¡Buen día! En los campos del litoral cuido vacas, caballos y hasta algún carpincho.",
  },
  "visitante-rio": {
    nombre: "la visitante",
    frase: "¡Hola! El Paraná es uno de los ríos más largos de América. ¡Mirá qué ancho!",
  },
  pescador: {
    nombre: "el pescador",
    frase: "¡Hola, Vicente! En estos ríos se pescan dorados y surubíes enormes.",
  },
  yerbatera: {
    nombre: "la tarefera",
    frase: "¡Hola! Las hojas de la yerba mate se cosechan a mano acá en Misiones.",
  },
  "guia-iguazu": {
    nombre: "el guía",
    frase: "¡Bienvenido! Las Cataratas del Iguazú tienen unos 275 saltos de agua.",
  },
};

// Cómo se llama cada objeto para tirar (para el "te regalo…").
export const NOMBRE_OBJETO = {
  "objeto-nieve": "esta bola de nieve",
  "objeto-calafate": "estos calafates",
  "objeto-caracola": "esta caracola",
  "objeto-avion": "este avioncito de papel",
  "objeto-canto-rodado": "este canto rodado",
  "objeto-vaina": "esta vaina",
  "objeto-naranja": "esta naranja",
  "objeto-guayaba": "esta guayaba",
  "objeto-basalto": "esta piedra de basalto",
  "objeto-nuez": "esta nuez",
};

// Quién hace las preguntas en cada ciudad (Reconquista es la casa: ahí está la familia).
export const NPC_CIUDAD = {
  ushuaia: "guardaparques",
  calafate: "trabajador-patagonico",
  madryn: "guia-costera",
  buenosaires: "kiosquera",
  rosario: "visitante-rio",
  santafe: "veterinario",
  corrientes: "pescador",
  posadas: "yerbatera",
  iguazu: "guia-iguazu",
};
