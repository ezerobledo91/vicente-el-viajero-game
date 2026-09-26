// Viaje por Argentina: de Ushuaia al norte hasta la Triple Frontera.
//
// ciudades[i] → tramos[i] → ciudades[i + 1]. En cada ciudad hay preguntas (se responden 3 al azar;
// con 2 bien se sigue). `lon`/`lat` se usan para ubicar la ciudad en el mapa (npm run map).
// `correcta` es el índice de la opción correcta (las opciones se mezclan al mostrarlas).
// `etiqueta` (opcional): dónde va el nombre en el mapa del viaje ("izq", "der", "arriba", "abajo").
//
// Tramos: `paisaje` (src/data/paisajes.js), `animales` nativos (src/data/animales.js),
// `pajaro` que hay que esquivar, `largo` en píxeles y `dificultad` de 1 a 3.

export const VIAJE_ARGENTINA = {
  pais: "ar",
  nombre: "Argentina",
  ciudades: [
    {
      id: "ushuaia",
      nombre: "Ushuaia",
      provincia: "Tierra del Fuego",
      lon: -68.3,
      lat: -54.8,
      dato: "¡La ciudad más austral del mundo! De acá sale el Tren del Fin del Mundo.",
      preguntas: [
        { p: "¿En qué provincia está Ushuaia?", opciones: ["Tierra del Fuego", "Mendoza", "Salta"], correcta: 0 },
        {
          p: "Ushuaia es famosa por ser...",
          opciones: ["La ciudad más al sur del mundo", "La ciudad más calurosa", "La ciudad más grande del país"],
          correcta: 0,
        },
        {
          p: "¿Qué animal de traje blanco y negro vive cerca de Ushuaia?",
          opciones: ["El pingüino", "La jirafa", "El oso polar"],
          correcta: 0,
        },
        {
          p: "¿Cómo se llama el tren que sale de Ushuaia?",
          opciones: ["Tren del Fin del Mundo", "Tren de la Costa", "Tren Bala"],
          correcta: 0,
        },
      ],
    },
    {
      id: "calafate",
      nombre: "El Calafate",
      provincia: "Santa Cruz",
      lon: -72.27,
      lat: -50.34,
      dato: "Desde acá se visita el Glaciar Perito Moreno, ¡una pared de hielo gigante!",
      preguntas: [
        {
          p: "¿Qué glaciar famoso se visita desde El Calafate?",
          opciones: ["Perito Moreno", "Aconcagua", "Iguazú"],
          correcta: 0,
        },
        { p: "Un glaciar es...", opciones: ["Un río de hielo enorme", "Un volcán", "Un desierto"], correcta: 0 },
        { p: "¿En qué provincia está El Calafate?", opciones: ["Santa Cruz", "Córdoba", "Misiones"], correcta: 0 },
        {
          p: "¿A qué lago llega el Glaciar Perito Moreno?",
          opciones: ["Lago Argentino", "Lago Titicaca", "Lago Nahuel Huapi"],
          correcta: 0,
        },
      ],
    },
    {
      id: "madryn",
      nombre: "Puerto Madryn",
      provincia: "Chubut",
      lon: -65.04,
      lat: -42.77,
      dato: "Todos los años llegan ballenas francas a jugar cerca de la costa.",
      preguntas: [
        {
          p: "¿Qué animal gigante llega a Puerto Madryn todos los años?",
          opciones: ["La ballena franca", "El elefante", "El cocodrilo"],
          correcta: 0,
        },
        { p: "¿En qué provincia está Puerto Madryn?", opciones: ["Chubut", "Jujuy", "Entre Ríos"], correcta: 0 },
        {
          p: "¿Cómo se llama la península llena de animales que está cerca?",
          opciones: ["Península Valdés", "Península Ibérica", "Península de Yucatán"],
          correcta: 0,
        },
        {
          p: "Puerto Madryn está a orillas del...",
          opciones: ["Océano Atlántico", "Océano Pacífico", "Mar Mediterráneo"],
          correcta: 0,
        },
      ],
    },
    {
      id: "buenosaires",
      nombre: "Buenos Aires",
      provincia: "Ciudad Autónoma de Buenos Aires",
      lon: -58.38,
      lat: -34.6,
      dato: "Es la capital de Argentina. En el centro está el Obelisco.",
      preguntas: [
        { p: "¿Cuál es la capital de Argentina?", opciones: ["Buenos Aires", "Córdoba", "Rosario"], correcta: 0 },
        {
          p: "¿Qué monumento blanco y alto está en el centro de Buenos Aires?",
          opciones: ["El Obelisco", "La Torre Eiffel", "El Cristo Redentor"],
          correcta: 0,
        },
        {
          p: "¿Cómo se llama el río enorme que está frente a Buenos Aires?",
          opciones: ["Río de la Plata", "Río Amazonas", "Río Nilo"],
          correcta: 0,
        },
        { p: "¿Qué baile nació en Buenos Aires?", opciones: ["El tango", "La samba", "El flamenco"], correcta: 0 },
      ],
    },
    {
      id: "rosario",
      nombre: "Rosario",
      provincia: "Santa Fe",
      lon: -60.64,
      lat: -32.95,
      dato: "Acá está el Monumento a la Bandera: Belgrano la izó por primera vez a orillas del Paraná.",
      preguntas: [
        {
          p: "¿Quién creó la bandera argentina?",
          opciones: ["Manuel Belgrano", "José de San Martín", "Domingo Sarmiento"],
          correcta: 0,
        },
        {
          p: "¿Qué monumento hay en Rosario?",
          opciones: ["El Monumento a la Bandera", "El Obelisco", "El Cristo Redentor"],
          correcta: 0,
        },
        {
          p: "¿De qué colores es la bandera argentina?",
          opciones: ["Celeste y blanca, con un sol", "Roja y blanca", "Verde y amarilla"],
          correcta: 0,
        },
        { p: "¿Qué río pasa por Rosario?", opciones: ["El Paraná", "El Colorado", "El Negro"], correcta: 0 },
      ],
    },
    {
      id: "santafe",
      nombre: "Santa Fe",
      provincia: "Santa Fe",
      lon: -60.7,
      lat: -31.63,
      dato: "Es la capital de la provincia. Tiene un puente famoso: el Puente Colgante.",
      preguntas: [
        {
          p: "La ciudad de Santa Fe es la capital de la provincia de...",
          opciones: ["Santa Fe", "Córdoba", "Chaco"],
          correcta: 0,
        },
        {
          p: "¿Qué animal, el roedor más grande del mundo, vive en los ríos de Santa Fe?",
          opciones: ["El carpincho", "El ratón", "El castor"],
          correcta: 0,
        },
        {
          p: "¿Cómo se llama el puente famoso de Santa Fe?",
          opciones: ["Puente Colgante", "Golden Gate", "Puente de Londres"],
          correcta: 0,
        },
      ],
    },
    {
      id: "reconquista",
      nombre: "Reconquista",
      provincia: "Santa Fe",
      lon: -59.65,
      lat: -29.15,
      dato: "¡Acá está la casa de Vicente!",
      evento: "hogar",
      preguntas: [
        {
          p: "Reconquista está en el norte de la provincia de...",
          opciones: ["Santa Fe", "Buenos Aires", "Neuquén"],
          correcta: 0,
        },
        {
          p: "¿Qué río grande pasa cerca de Reconquista?",
          opciones: ["El Paraná", "El Nilo", "El Támesis"],
          correcta: 0,
        },
        {
          p: "¿Quién vive en Reconquista?",
          opciones: ["¡La familia de Vicente!", "Un oso polar", "Nadie"],
          correcta: 0,
        },
      ],
    },
    {
      id: "corrientes",
      nombre: "Corrientes",
      provincia: "Corrientes",
      etiqueta: "izq",
      lon: -58.83,
      lat: -27.47,
      dato: "Es la tierra del chamamé. Cerca están los Esteros del Iberá, llenos de animales.",
      preguntas: [
        {
          p: "¿Qué música es típica de Corrientes?",
          opciones: ["El chamamé", "El reggaetón", "La ópera"],
          correcta: 0,
        },
        {
          p: "¿Qué animal parecido a un cocodrilo vive en los esteros?",
          opciones: ["El yacaré", "El pingüino", "El camello"],
          correcta: 0,
        },
        {
          p: "Los Esteros del Iberá son...",
          opciones: ["Humedales enormes con muchos animales", "Un desierto", "Montañas nevadas"],
          correcta: 0,
        },
        {
          p: "¿A orillas de qué río está Corrientes?",
          opciones: ["El Paraná", "El Colorado", "El Negro"],
          correcta: 0,
        },
      ],
    },
    {
      id: "posadas",
      nombre: "Posadas",
      provincia: "Misiones",
      etiqueta: "abajo",
      lon: -55.9,
      lat: -27.37,
      dato: "La tierra de Misiones es colorada. Cerca están las ruinas de San Ignacio.",
      preguntas: [
        { p: "Posadas es la capital de la provincia de...", opciones: ["Misiones", "Salta", "La Pampa"], correcta: 0 },
        {
          p: "¿De qué color es la tierra en Misiones?",
          opciones: ["Colorada", "Azul", "Violeta"],
          correcta: 0,
        },
        {
          p: "¿Qué planta se cultiva mucho en Misiones para tomar mate?",
          opciones: ["La yerba mate", "El trigo", "La manzana"],
          correcta: 0,
        },
        {
          p: "Las ruinas de San Ignacio las construyeron...",
          opciones: ["Jesuitas junto con guaraníes", "Los romanos", "Los egipcios"],
          correcta: 0,
        },
      ],
    },
    {
      id: "iguazu",
      nombre: "Puerto Iguazú",
      provincia: "Misiones",
      lon: -54.57,
      lat: -25.6,
      dato: "¡Las Cataratas del Iguazú! Acá se juntan Argentina, Brasil y Paraguay: la Triple Frontera.",
      evento: "triple-frontera",
      preguntas: [
        {
          p: "¿Qué maravilla natural está en Puerto Iguazú?",
          opciones: ["Las Cataratas del Iguazú", "El Glaciar Perito Moreno", "El Aconcagua"],
          correcta: 0,
        },
        {
          p: "En la Triple Frontera se juntan Argentina, Brasil y...",
          opciones: ["Paraguay", "Chile", "Uruguay"],
          correcta: 0,
        },
        {
          p: "¿Cómo se llama el salto más grande de las Cataratas?",
          opciones: ["La Garganta del Diablo", "El Salto Ángel", "La Boca del Lobo"],
          correcta: 0,
        },
        {
          p: "¿Qué animal de cola con anillos ves en las Cataratas?",
          opciones: ["El coatí", "El pingüino", "El oso panda"],
          correcta: 0,
        },
      ],
    },
  ],
  tramos: [
    { paisaje: "bosque-fueguino", animales: ["pinguino", "zorro"], pajaro: "gaviota", largo: 9400, dificultad: 1 },
    {
      paisaje: "estepa",
      animales: ["guanaco", "choique", "flamenco", "tatu"],
      pajaro: "condor",
      largo: 10100,
      dificultad: 1,
    },
    { paisaje: "costa", animales: ["pinguino", "choique", "guanaco"], pajaro: "gaviota", largo: 10400, dificultad: 2 },
    { paisaje: "pampa", animales: ["hornero", "tatu"], pajaro: "tero", largo: 10400, dificultad: 2 },
    { paisaje: "rio", animales: ["carpincho", "garza"], pajaro: "tero", largo: 9400, dificultad: 2 },
    { paisaje: "humedal", animales: ["carpincho", "garza", "yacare"], pajaro: "mosquito", largo: 9400, dificultad: 2 },
    { paisaje: "humedal", animales: ["yacare", "carpincho", "mono"], pajaro: "mosquito", largo: 10100, dificultad: 3 },
    { paisaje: "selva", animales: ["tucan", "coati", "mono"], pajaro: "tucan", largo: 10400, dificultad: 3 },
    { paisaje: "cataratas", animales: ["coati", "jaguarete", "tucan"], pajaro: "tucan", largo: 10800, dificultad: 3 },
  ],
};
