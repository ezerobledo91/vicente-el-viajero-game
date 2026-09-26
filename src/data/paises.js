// Datos de los países jugables. El `id` es el código ISO de 2 letras (coincide con el mapa y las banderas).
//
// `emblema` es el personaje/objeto que va a aparecer parado sobre el país en el mapa.
// Cuando tengas el sprite, guardalo en public/assets/emblemas/<id>.png y completá `sprite`
// con el nombre del archivo (por ejemplo "ar.png"). Mientras sea null, no se muestra nada.
//
// `etiqueta` permite correr el nombre en el mapa (en píxeles de la imagen) si queda encimado.

export const PAISES = [
  {
    id: "ar",
    nombre: "Argentina",
    capital: "Buenos Aires",
    idioma: "Español",
    moneda: "Peso argentino",
    datos: [
      "Tiene el Aconcagua, la montaña más alta de toda América: ¡casi 7.000 metros!",
      "En Argentina se inventaron el colectivo y la birome.",
      "Las Cataratas del Iguazú, en Misiones, tienen más de 250 saltos de agua.",
    ],
    emblema: { nombre: "Hornero, el Obelisco o el glaciar Perito Moreno", tipo: "animal / monumento", sprite: null },
  },
  {
    id: "bo",
    nombre: "Bolivia",
    capital: "Sucre (y La Paz, donde está el gobierno)",
    idioma: "Español, quechua, aimara, guaraní y muchos más",
    moneda: "Boliviano",
    datos: [
      "El Salar de Uyuni es el desierto de sal más grande del mundo. ¡Parece un espejo gigante!",
      "La Paz es una de las ciudades más altas del mundo: está a unos 3.600 metros.",
      "Tiene 37 idiomas oficiales.",
    ],
    emblema: { nombre: "Llama o el Salar de Uyuni", tipo: "animal / paisaje", sprite: null },
  },
  {
    id: "br",
    nombre: "Brasil",
    capital: "Brasilia",
    idioma: "Portugués",
    moneda: "Real",
    datos: [
      "Es el país más grande de Sudamérica.",
      "Gran parte de la selva del Amazonas, la más grande del mundo, está en Brasil.",
      "Ganó 5 Mundiales de fútbol: más que ningún otro país.",
    ],
    emblema: { nombre: "Tucán o el Cristo Redentor", tipo: "animal / monumento", sprite: null },
  },
  {
    id: "cl",
    nombre: "Chile",
    capital: "Santiago",
    idioma: "Español",
    moneda: "Peso chileno",
    datos: [
      "Es larguísimo y angosto: mide más de 4.000 km de norte a sur.",
      "El desierto de Atacama es uno de los lugares más secos del planeta.",
      "La Isla de Pascua, con sus estatuas gigantes llamadas moáis, es de Chile.",
    ],
    emblema: { nombre: "Moái de la Isla de Pascua o un huemul", tipo: "monumento / animal", sprite: null },
  },
  {
    id: "co",
    nombre: "Colombia",
    capital: "Bogotá",
    idioma: "Español",
    moneda: "Peso colombiano",
    datos: [
      "Es el país con más tipos de aves del mundo: ¡más de 1.900!",
      "Tiene costas en dos mares: el océano Pacífico y el mar Caribe.",
      "Caño Cristales es un río que se pone de colores: rojo, amarillo, verde y azul.",
    ],
    emblema: { nombre: "Cóndor andino o una taza de café", tipo: "animal / objeto", sprite: null },
    etiqueta: { dx: 0, dy: 6 },
  },
  {
    id: "ec",
    nombre: "Ecuador",
    capital: "Quito",
    idioma: "Español",
    moneda: "Dólar estadounidense",
    datos: [
      "Se llama así porque lo cruza la línea del Ecuador, que divide la Tierra en dos mitades.",
      "Las Islas Galápagos, famosas por sus tortugas gigantes, son de Ecuador.",
    ],
    emblema: { nombre: "Tortuga gigante de Galápagos", tipo: "animal", sprite: null },
  },
  {
    id: "gy",
    nombre: "Guyana",
    capital: "Georgetown",
    idioma: "Inglés",
    moneda: "Dólar guyanés",
    datos: [
      "Es el único país de Sudamérica donde se habla inglés como idioma oficial.",
      "La cascada Kaieteur cae de un solo salto desde 226 metros: ¡4 veces más alta que el Niágara!",
    ],
    emblema: { nombre: "Jaguar o la cascada Kaieteur", tipo: "animal / paisaje", sprite: null },
  },
  {
    id: "py",
    nombre: "Paraguay",
    capital: "Asunción",
    idioma: "Español y guaraní",
    moneda: "Guaraní",
    datos: [
      "Casi todos hablan guaraní, un idioma de los pueblos originarios, además del español.",
      "No tiene mar, pero comparte con Brasil la represa de Itaipú, una de las más grandes del mundo.",
      "El tereré, que se toma bien frío, es tradición del Paraguay.",
    ],
    emblema: { nombre: "Tereré o la represa de Itaipú", tipo: "objeto / monumento", sprite: null },
  },
  {
    id: "pe",
    nombre: "Perú",
    capital: "Lima",
    idioma: "Español, quechua y aimara",
    moneda: "Sol",
    datos: [
      "Machu Picchu es una ciudad de los incas construida arriba de una montaña.",
      "Comparte con Bolivia el lago Titicaca, uno de los lagos navegables más altos del mundo.",
    ],
    emblema: { nombre: "Machu Picchu o una vicuña", tipo: "monumento / animal", sprite: null },
  },
  {
    id: "sr",
    nombre: "Surinam",
    capital: "Paramaribo",
    idioma: "Neerlandés",
    moneda: "Dólar surinamés",
    datos: [
      "Es el país más chico de Sudamérica.",
      "Casi todo su territorio es selva.",
      "Ahí vive la rana dardo azul, ¡de un azul brillante!",
    ],
    emblema: { nombre: "Rana dardo azul", tipo: "animal", sprite: null },
  },
  {
    id: "uy",
    nombre: "Uruguay",
    capital: "Montevideo",
    idioma: "Español",
    moneda: "Peso uruguayo",
    datos: [
      "Ganó el primer Mundial de fútbol de la historia, en 1930, que se jugó en su país.",
      "Hay más vacas que personas: ¡unas 3 vacas por cada habitante!",
    ],
    emblema: { nombre: "Un mate o la Mano de Punta del Este", tipo: "objeto / monumento", sprite: null },
  },
  {
    id: "ve",
    nombre: "Venezuela",
    capital: "Caracas",
    idioma: "Español",
    moneda: "Bolívar",
    datos: [
      "Tiene el Salto Ángel, la cascada más alta del mundo: ¡casi 1.000 metros!",
      "Tiene tepuyes: montañas con la punta plana, como una mesa gigante.",
    ],
    emblema: { nombre: "Turpial o el Salto Ángel", tipo: "animal / paisaje", sprite: null },
  },
];

export const getPais = (id) => PAISES.find((p) => p.id === id);

// Definiciones para que Vicente aprenda qué significa cada dato.
export const DEFINICIONES = {
  capital: "La ciudad principal de un país. Ahí suele estar el gobierno.",
  idioma: "La lengua que habla la gente para entenderse.",
  moneda: "El dinero que se usa para comprar cosas en ese país.",
  bandera: "El símbolo de un país, con sus colores y dibujos.",
  frontera: "La línea que separa un país de otro.",
  continente: "Una parte enorme de tierra donde hay muchos países. Sudamérica es un continente.",
};
