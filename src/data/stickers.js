// Stickers de premio del álbum "Ruta Argentina" (recortados de personajes/premios/stickers-argentina.png).
//
// Cómo se gana cada uno (`gana`):
//   "pasar"     → acertar al menos una pregunta de esa ciudad
//   "perfecto"  → acertar las 5 preguntas de esa ciudad
//   "viaje"     → terminar el viaje (llegar a la Triple Frontera)
//   "estrellas" → juntar `cantidad` estrellas en total (sumando todos los viajes)

export const RAREZAS = {
  común: { color: 0x5fd068, texto: "#8ff09a", orden: 1 },
  rara: { color: 0x4aa8ff, texto: "#9fd0ff", orden: 2 },
  épica: { color: 0xb57bff, texto: "#d6b8ff", orden: 3 },
  bonus: { color: 0xffb83d, texto: "#ffd27a", orden: 4 },
};

export const STICKERS = [
  { id: "ushuaia-pinguino", nombre: "Pingüino", ciudad: "ushuaia", rareza: "común", gana: "pasar" },
  { id: "calafate-guanaco", nombre: "Guanaco", ciudad: "calafate", rareza: "común", gana: "pasar" },
  { id: "madryn-ballena", nombre: "Ballena", ciudad: "madryn", rareza: "común", gana: "pasar" },
  { id: "buenosaires-colectivo", nombre: "Colectivo", ciudad: "buenosaires", rareza: "común", gana: "pasar" },
  { id: "rosario-hornero", nombre: "Hornero", ciudad: "rosario", rareza: "común", gana: "pasar" },
  { id: "santafe-carpincho", nombre: "Carpincho", ciudad: "santafe", rareza: "común", gana: "pasar" },
  { id: "reconquista-garza", nombre: "Garza", ciudad: "reconquista", rareza: "común", gana: "pasar" },
  { id: "posadas-tucan", nombre: "Tucán", ciudad: "posadas", rareza: "común", gana: "pasar" },

  { id: "ushuaia-faro", nombre: "Faro del Fin del Mundo", ciudad: "ushuaia", rareza: "rara", gana: "perfecto" },
  { id: "calafate-glaciar", nombre: "Glaciar Perito Moreno", ciudad: "calafate", rareza: "rara", gana: "perfecto" },
  { id: "madryn-golfo", nombre: "Golfo Nuevo", ciudad: "madryn", rareza: "rara", gana: "perfecto" },
  { id: "buenosaires-obelisco", nombre: "Obelisco", ciudad: "buenosaires", rareza: "rara", gana: "perfecto" },
  { id: "rosario-monumento", nombre: "Monumento a la Bandera", ciudad: "rosario", rareza: "rara", gana: "perfecto" },
  { id: "santafe-puente", nombre: "Puente Colgante", ciudad: "santafe", rareza: "rara", gana: "perfecto" },

  { id: "corrientes-puente", nombre: "Puente General Belgrano", ciudad: "corrientes", rareza: "épica", gana: "pasar" },
  { id: "posadas-costanera", nombre: "Costanera de Posadas", ciudad: "posadas", rareza: "épica", gana: "perfecto" },
  { id: "iguazu-ciudad", nombre: "Puerto Iguazú", ciudad: "iguazu", rareza: "épica", gana: "pasar" },
  { id: "iguazu-cataratas", nombre: "Cataratas del Iguazú", ciudad: "iguazu", rareza: "épica", gana: "perfecto" },

  { id: "bonus-ruta-argentina", nombre: "Insignia Ruta Argentina", rareza: "bonus", gana: "viaje" },
  { id: "bonus-sobre", nombre: "Sobre de figuritas", rareza: "bonus", gana: "estrellas", cantidad: 100 },
];

// Todos estos son del álbum de Argentina (un país nuevo trae los suyos con su `pais`).
for (const s of STICKERS) s.pais ??= "ar";

// Stickers que se ganan en una ciudad según cuántas preguntas se acertaron.
export function stickersDeCiudad(ciudadId, aciertos, total) {
  return STICKERS.filter(
    (s) =>
      s.ciudad === ciudadId && ((s.gana === "pasar" && aciertos > 0) || (s.gana === "perfecto" && aciertos === total))
  );
}

export const getSticker = (id) => STICKERS.find((s) => s.id === id);
