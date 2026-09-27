// Viaje por Argentina: de Ushuaia al norte hasta la Triple Frontera.
//
// ciudades[i] → tramos[i] → ciudades[i + 1]. En cada ciudad hay 5 preguntas de 4 opciones: siempre
// se sigue, pero si se erran todas se pierde una vida en el tramo siguiente.
// `correcta` es el índice de la opción correcta (las opciones se mezclan al mostrarlas).
// `etiqueta` (opcional): dónde va el nombre en el mapa del viaje ("izq", "der", "arriba", "abajo").
//
// Tramos: `paisaje` (src/data/paisajes.js), `animales` nativos (src/data/animales.js),
// `pajaro` que hay que esquivar (uno o una lista: se van alternando), `tesoro` (uno por tramo, bien
// escondido), `especial` (otro coleccionable difícil de alcanzar), `largo` en píxeles y `dificultad` de 1 a 3.

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
        {
          p: "¿En qué provincia está Ushuaia?",
          opciones: ["Tierra del Fuego", "Santa Cruz", "Chubut", "Neuquén"],
          correcta: 0,
        },
        {
          p: "¿Por qué dicen que Ushuaia es “el fin del mundo”?",
          opciones: [
            "Es la ciudad más al sur del mundo",
            "Es la ciudad más fría del mundo",
            "Está arriba de una montaña",
            "Es la última ciudad de Chile",
          ],
          correcta: 0,
        },
        {
          p: "¿Cómo se llama el canal de agua que está frente a Ushuaia?",
          opciones: ["Canal de Beagle", "Estrecho de Magallanes", "Canal de Panamá", "Río de la Plata"],
          correcta: 0,
        },
        {
          p: "¿Qué pingüino vive en las costas de Tierra del Fuego?",
          opciones: ["Pingüino de Magallanes", "Pingüino emperador", "Pingüino de Galápagos", "Pingüino africano"],
          correcta: 0,
        },
        {
          p: "¿Cómo se llama el tren turístico de Ushuaia?",
          opciones: ["Tren del Fin del Mundo", "Tren a las Nubes", "La Trochita", "Tren Patagónico"],
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
          opciones: ["Perito Moreno", "Glaciar Martial", "Cerro Tronador", "Aconcagua"],
          correcta: 0,
        },
        {
          p: "Un glaciar es...",
          opciones: [
            "Un río de hielo que avanza muy despacio",
            "Un lago congelado",
            "Una montaña de nieve",
            "Un témpano en el mar",
          ],
          correcta: 0,
        },
        {
          p: "¿En qué provincia está El Calafate?",
          opciones: ["Santa Cruz", "Tierra del Fuego", "Chubut", "Río Negro"],
          correcta: 0,
        },
        {
          p: "¿A qué lago llega el Glaciar Perito Moreno?",
          opciones: ["Lago Argentino", "Lago Viedma", "Lago Nahuel Huapi", "Lago Buenos Aires"],
          correcta: 0,
        },
        {
          p: "¿De dónde viene el nombre “Calafate”?",
          opciones: [
            "De un arbusto con frutitos azules",
            "De un explorador famoso",
            "De un pez del lago",
            "De un viento muy fuerte",
          ],
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
          p: "¿Qué ballena llega todos los años a Puerto Madryn?",
          opciones: ["La ballena franca austral", "La ballena azul", "La ballena jorobada", "La orca"],
          correcta: 0,
        },
        {
          p: "¿En qué provincia está Puerto Madryn?",
          opciones: ["Chubut", "Río Negro", "Santa Cruz", "La Pampa"],
          correcta: 0,
        },
        {
          p: "¿Cómo se llama la península llena de animales que está cerca?",
          opciones: ["Península Valdés", "Península Mitre", "Península de Magallanes", "Península Ibérica"],
          correcta: 0,
        },
        {
          p: "Puerto Madryn está a orillas del...",
          opciones: ["Golfo Nuevo", "Golfo San Jorge", "Canal de Beagle", "Río de la Plata"],
          correcta: 0,
        },
        {
          p: "En 1865 llegaron en barco los primeros inmigrantes a esta zona. ¿De dónde venían?",
          opciones: ["De Gales", "De Italia", "De Japón", "De Brasil"],
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
        {
          p: "¿Cuál es la capital de Argentina?",
          opciones: ["Buenos Aires", "La Plata", "Córdoba", "Rosario"],
          correcta: 0,
        },
        {
          p: "¿Qué río enorme está frente a Buenos Aires?",
          opciones: ["Río de la Plata", "Río Paraná", "Río Uruguay", "Río Salado"],
          correcta: 0,
        },
        {
          p: "¿Qué baile nació en Buenos Aires?",
          opciones: ["El tango", "El chamamé", "La cueca", "La zamba"],
          correcta: 0,
        },
        {
          p: "¿Cómo se llama la casa donde trabaja el presidente?",
          opciones: ["Casa Rosada", "Cabildo", "Congreso", "Casa Blanca"],
          correcta: 0,
        },
        {
          p: "¿Qué pasó en el Cabildo el 25 de mayo de 1810?",
          opciones: [
            "Se formó el primer gobierno patrio",
            "Se izó la primera bandera",
            "Se declaró la independencia",
            "Se fundó la ciudad",
          ],
          correcta: 0,
        },
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
          opciones: ["Manuel Belgrano", "José de San Martín", "Domingo Sarmiento", "Mariano Moreno"],
          correcta: 0,
        },
        {
          p: "¿Qué monumento famoso hay en Rosario?",
          opciones: ["El Monumento a la Bandera", "El Obelisco", "El Cabildo", "La Casa Rosada"],
          correcta: 0,
        },
        {
          p: "¿Qué día es el Día de la Bandera?",
          opciones: ["20 de junio", "9 de julio", "25 de mayo", "17 de agosto"],
          correcta: 0,
        },
        {
          p: "¿Qué río pasa por Rosario?",
          opciones: ["El Paraná", "El Uruguay", "El Salado", "El Colorado"],
          correcta: 0,
        },
        {
          p: "¿En qué provincia está Rosario?",
          opciones: ["Santa Fe", "Buenos Aires", "Córdoba", "Entre Ríos"],
          correcta: 0,
        },
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
          opciones: ["Santa Fe", "Entre Ríos", "Chaco", "Corrientes"],
          correcta: 0,
        },
        {
          p: "¿Cuál es el roedor más grande del mundo, que vive en los ríos de Santa Fe?",
          opciones: ["El carpincho", "La nutria", "La vizcacha", "El castor"],
          correcta: 0,
        },
        {
          p: "¿Cómo se llama el puente famoso de la ciudad de Santa Fe?",
          opciones: ["Puente Colgante", "Puente de la Mujer", "Puente Rosario-Victoria", "Puente General Belgrano"],
          correcta: 0,
        },
        {
          p: "¿Qué ciudad está enfrente de Santa Fe, cruzando el río?",
          opciones: ["Paraná", "Rosario", "Corrientes", "Posadas"],
          correcta: 0,
        },
        {
          p: "Un humedal es...",
          opciones: [
            "Un lugar con mucha agua y plantas, lleno de animales",
            "Un desierto con dunas",
            "Un bosque de pinos",
            "Una montaña con nieve",
          ],
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
          opciones: ["Santa Fe", "Chaco", "Corrientes", "Formosa"],
          correcta: 0,
        },
        {
          p: "¿Qué río grande pasa cerca de Reconquista?",
          opciones: ["El Paraná", "El Uruguay", "El Bermejo", "El Salado"],
          correcta: 0,
        },
        {
          p: "¿Qué pez grande y dorado vive en el río Paraná?",
          opciones: ["El dorado", "El salmón", "El tiburón", "El pez payaso"],
          correcta: 0,
        },
        {
          p: "Reconquista está en la región del...",
          opciones: ["Litoral", "Cuyo", "Noroeste", "Patagonia"],
          correcta: 0,
        },
        {
          p: "¿Quién vive en Reconquista?",
          opciones: ["¡La familia de Vicente!", "El presidente", "Un pingüino", "Nadie"],
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
          opciones: ["El chamamé", "El tango", "El cuarteto", "La zamba"],
          correcta: 0,
        },
        {
          p: "¿Qué animal parecido a un cocodrilo vive en los esteros?",
          opciones: ["El yacaré", "La iguana", "El lagarto overo", "El carpincho"],
          correcta: 0,
        },
        {
          p: "Los Esteros del Iberá son...",
          opciones: ["Humedales enormes con muchos animales", "Un desierto", "Un glaciar", "Una selva de montaña"],
          correcta: 0,
        },
        {
          p: "¿A orillas de qué río está la ciudad de Corrientes?",
          opciones: ["El Paraná", "El Uruguay", "El Salado", "El Negro"],
          correcta: 0,
        },
        {
          p: "¿Qué puente une Corrientes con Resistencia, en el Chaco?",
          opciones: ["Puente General Belgrano", "Puente Colgante", "Puente Zárate-Brazo Largo", "Puente de la Mujer"],
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
        {
          p: "Posadas es la capital de la provincia de...",
          opciones: ["Misiones", "Corrientes", "Chaco", "Formosa"],
          correcta: 0,
        },
        {
          p: "¿De qué color es la tierra en Misiones?",
          opciones: ["Colorada", "Amarilla", "Negra", "Gris"],
          correcta: 0,
        },
        {
          p: "¿Qué planta se cultiva mucho en Misiones para tomar mate?",
          opciones: ["La yerba mate", "El algodón", "El trigo", "La vid"],
          correcta: 0,
        },
        {
          p: "Las ruinas de San Ignacio las construyeron...",
          opciones: ["Jesuitas junto con guaraníes", "Los incas", "Los romanos", "Los vikingos"],
          correcta: 0,
        },
        {
          p: "¿Qué país está del otro lado del río, frente a Posadas?",
          opciones: ["Paraguay", "Brasil", "Uruguay", "Bolivia"],
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
          opciones: ["Las Cataratas del Iguazú", "El Glaciar Perito Moreno", "El Salto Ángel", "El Aconcagua"],
          correcta: 0,
        },
        {
          p: "En la Triple Frontera se juntan Argentina, Brasil y...",
          opciones: ["Paraguay", "Chile", "Uruguay", "Bolivia"],
          correcta: 0,
        },
        {
          p: "¿Cómo se llama el salto más grande de las Cataratas?",
          opciones: ["La Garganta del Diablo", "El Salto Ángel", "El Salto Grande", "La Boca del Lobo"],
          correcta: 0,
        },
        {
          p: "¿Qué animal de cola con anillos ves en las Cataratas?",
          opciones: ["El coatí", "El mapache", "El zorro", "El hurón"],
          correcta: 0,
        },
        {
          p: "¿Qué felino grande y con manchas vive en la selva misionera?",
          opciones: ["El yaguareté", "El puma", "El león", "El tigre"],
          correcta: 0,
        },
      ],
    },
  ],
  tramos: [
    {
      paisaje: "bosque-fueguino",
      animales: ["pinguino", "zorro", "buho"],
      pajaro: "gaviota",
      largo: 12200,
      dificultad: 1,
      tesoro: "tesoro-pinguino",
      especial: "tesoro-brujula",
    },
    {
      paisaje: "estepa",
      animales: ["guanaco", "choique", "flamenco", "tatu"],
      pajaro: "condor",
      largo: 13100,
      dificultad: 1,
      tesoro: "tesoro-iceberg",
      especial: "mate",
    },
    {
      paisaje: "costa",
      animales: ["ballena", "pinguino", "choique", "guanaco"],
      pajaro: "gaviota",
      largo: 13500,
      dificultad: 2,
      tesoro: "tesoro-ballena",
      especial: "pluma",
    },
    {
      paisaje: "pampa",
      animales: ["hornero", "tatu"],
      pajaro: ["tero", "colibri", "abeja"],
      largo: 13500,
      dificultad: 2,
      tesoro: "tesoro-obelisco",
      especial: "sol",
    },
    {
      paisaje: "rio",
      animales: ["carpincho", "garza", "tortuga"],
      pajaro: ["tero", "gaviota"],
      largo: 12200,
      dificultad: 2,
      tesoro: "tesoro-monumento",
      especial: "bandera",
    },
    {
      paisaje: "humedal",
      animales: ["garza", "carpincho", "yacare", "rana"],
      pajaro: ["mosquito", "libelula"],
      largo: 12200,
      dificultad: 2,
      tesoro: "tesoro-carpincho",
      especial: "huevo",
    },
    {
      paisaje: "humedal",
      animales: ["yacare", "carpincho", "mono"],
      pajaro: ["mosquito", "abeja"],
      largo: 13100,
      dificultad: 3,
      tesoro: "tesoro-hornero",
      especial: "nido",
    },
    {
      paisaje: "selva",
      animales: ["tucan", "coati", "mono", "mariposa"],
      pajaro: ["tucan", "abeja"],
      largo: 13500,
      dificultad: 3,
      tesoro: "tesoro-tucan",
      especial: "hoja",
    },
    {
      paisaje: "cataratas",
      animales: ["coati", "jaguarete", "tucan"],
      pajaro: ["tucan", "abeja"],
      largo: 14000,
      dificultad: 3,
      tesoro: "tesoro-cataratas",
      especial: "huella-yaguarete",
    },
  ],
};
