# Plan: modo Viaje (plataformas 2D por país)

Cada país se juega como un viaje de costado (side-scroller): Vicente camina, salta y esquiva
mientras de fondo pasan los paisajes del país. Entre ciudad y ciudad hay un **tramo** jugable; al
llegar a cada **ciudad** hay preguntas para seguir. El primer país es Argentina.

## Flujo

```
Planisferio ─► ficha de Argentina ─► [Empezar viaje]
      │
      ▼
Mapa del país (ruta con ciudades, progreso)
      │
      ├─► Tramo 1 (plataformas) ─► Ciudad 1 (preguntas) ─► Tramo 2 ─► Ciudad 2 ─► ...
      │
      └─► Reconquista: la casa. Aparece la familia y Anita se suma al viaje
```

- Se puede salir en cualquier momento; el progreso queda guardado (tramo y ciudad alcanzados).
- **Sin game over**: es para un chico de 8. Chocar un pájaro hace que Vicente se enoje, pierda una
  figurita y siga. Las preguntas se pueden reintentar.

## Ruta propuesta: Argentina (de sur a norte)

| #   | Ciudad        | Por qué                                                                  | Tramo hasta la siguiente (paisaje, animales, obstáculos)                  |
| --- | ------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 1   | Ushuaia       | Ciudad más austral del mundo, Tren del Fin del Mundo                     | Bosque fueguino y montañas nevadas · pingüinos, zorro colorado · gaviotas |
| 2   | El Calafate   | Glaciar Perito Moreno                                                    | Estepa patagónica con viento · guanacos, choiques · cóndores              |
| 3   | Puerto Madryn | Ballena franca, lobos marinos                                            | Costa patagónica · ballenas saltando al fondo, maras · gaviotas           |
| 4   | Buenos Aires  | Capital, Obelisco                                                        | Llanura pampeana · vacas, horneros · teros que atacan, perros             |
| 5   | Rosario       | Monumento a la Bandera (¡ideal para el tema banderas!)                   | Pampa y río Paraná · perros, palomas                                      |
| 6   | Santa Fe      | Capital provincial, río Paraná                                           | Litoral y humedales · carpinchos, garzas · mosquitos                      |
| 7   | Reconquista   | **La casa de la familia**: Anita se suma                                 | Humedales · yacarés, carpinchos · mosquitos                               |
| 8   | Corrientes    | Chamamé, Esteros del Iberá                                               | Selva · tucanes, coatíes · loros                                          |
| 9   | Posadas       | Tierra colorada, ruinas de San Ignacio                                   | Selva misionera · coatíes, tucanes · loros                                |
| 10  | Puerto Iguazú | Cataratas, **Triple Frontera**: se elige si seguir a Brasil o a Paraguay | —                                                                         |

Cada tramo dura entre 1 y 2 minutos.

## Mecánicas del tramo

| Elemento                        | Comportamiento                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Vicente                         | Camina/corre solo hacia la derecha o con las flechas; salto (con salto más alto si se mantiene) |
| Pájaros (gaviota, cóndor, tero) | Vuelan en onda o se lanzan en picada: hay que esquivarlos (agacharse o saltar)                  |
| Perros                          | Caminan de un lado a otro; saltar encima hace rebotar más alto (como trampolín)                 |
| Animales nativos                | No hacen daño. Al pasar cerca aparece un dato curioso ("El guanaco es pariente de la llama")    |
| Figuritas / estrellas           | Se juntan en el camino; se canjean o se muestran en un álbum                                    |
| Cartel de ciudad                | Fin del tramo: entra a la ciudad                                                                |
| Anita (después de Reconquista)  | Lo sigue con unos pasos de retraso, imitando sus saltos                                         |

Controles: teclado (flechas/espacio) y **botones en pantalla para tablet**.

## Preguntas por ciudad

3 preguntas de opción múltiple por ciudad. Hay que acertar 2 para seguir; si no, se reintenta con otras.
Vicente usa las animaciones "pensar" mientras se elige, "festejo" al acertar y "aburrido/enojado" al errar.

Ejemplos:

- Ushuaia: "¿En qué provincia está Ushuaia?" (Tierra del Fuego / Mendoza / Salta)
- Ushuaia: "¿Qué animal de traje blanco y negro vive cerca de Ushuaia?" (Pingüino / Jirafa / Oso polar)
- Rosario: "¿Quién creó la bandera argentina?" (Manuel Belgrano / San Martín / Sarmiento)
- Rosario: "¿De qué colores es la bandera argentina?" (celeste y blanca con sol / roja y blanca / verde y amarilla)
- Buenos Aires: "¿Cuál es la capital de Argentina?"
- Santa Fe: "¿Qué río enorme pasa por Santa Fe?" (Paraná / Nilo / Amazonas)

## Arquitectura técnica

Todo sigue la idea actual: **datos separados del código**, para que agregar un país sea sumar datos y assets.

```
src/
├── data/viajes/argentina.js     Ruta: ciudades (lat/lon, preguntas), tramos (paisaje, largo,
│                                 obstáculos, animales, datos), eventos (familia, Anita se suma)
├── scenes/
│   ├── MapaPaisScene.js         Mapa del país con la ruta, ciudades y progreso
│   ├── ViajeScene.js            El tramo jugable (Arcade Physics de Phaser)
│   ├── ViajeHudScene.js         Figuritas, botones táctiles, pausa
│   ├── CiudadScene.js           Llegada + preguntas
│   └── HogarScene.js            Escena especial de la casa (familia, Anita se suma)
├── entities/
│   ├── Player.js                Vicente con física (extiende Character)
│   ├── Companion.js             Anita siguiéndolo
│   └── obstaculos/              Pajaro.js, Perro.js, AnimalNativo.js, Figurita.js
├── systems/
│   ├── progress.js              Progreso guardado (localStorage)
│   ├── levelBuilder.js          Arma el tramo a partir de los datos (con semilla, siempre igual)
│   └── parallax.js              Fondos en capas que se mueven a distinta velocidad
└── ui/QuizPanel.js              Pregunta con opciones
tools/build-map.mjs              + posiciones de ciudades en el mapa (misma calibración que los países)
```

- **Física**: Arcade Physics de Phaser (ya viene incluida): gravedad, colisiones, rebote.
- **Niveles**: sin editor de mapas; cada tramo se describe con datos (largo, densidad de obstáculos,
  qué animales aparecen) y `levelBuilder` los ubica. Así es fácil ajustar la dificultad.
- **Fondos parallax**: 3 capas por paisaje (cielo/lejos, medio, cerca) que se repiten horizontalmente.
- **Progreso**: se guarda en el navegador (tramo, ciudad, figuritas, compañeros).

## Assets a generar (con Gemini)

Para que el recorte automático funcione perfecto, conviene pedir las láminas así:
**grilla fija, mismo tamaño de cuadro, separación de 8-10 px entre cuadros, fondo liso de un solo color,
sin textos adentro de los cuadros, personaje de costado (perfil), sin pasarse del cuadro.**

1. **Vicente, perfil hacia la derecha** (cuadros de al menos 256 px de alto):
   - Caminar: ciclo de 8 cuadros (contacto, bajada, paso, subida × 2 piernas). _Hoy los 11 cuadros son casi iguales; por eso se ve raro._
   - Correr: 6-8 cuadros · Salto: impulso, subida, arriba, bajada, aterrizaje · Golpe (lo toca un pájaro): 2-3 · Agacharse: 1-2
2. **Anita**: caminar (8) y salto (5), mismo estilo. **Mamá**: caminar (8).
3. **Animales** (4-8 cuadros cada uno): pingüino, guanaco, choique, zorro, mara, carpincho, hornero,
   vaca, perro caminando, gaviota volando, cóndor volando, tero volando/en picada.
4. **Fondos por tramo** en 3 capas, horizontalmente continuas (que el borde derecho empalme con el izquierdo),
   1920×1080 aprox.: bosque fueguino, estepa patagónica, costa patagónica, llanura pampeana, ciudad, litoral/humedal.
5. **Ciudades**: una ilustración de llegada por ciudad (Ushuaia con el cartel del fin del mundo, Glaciar
   Perito Moreno, Madryn con ballena, Obelisco, Monumento a la Bandera, costanera de Santa Fe, la casa en Reconquista).

## Fases

| Fase | Qué                                                                                                                                                                                                                                          | Necesita assets nuevos |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 0 ✅ | Motor del viaje con dibujos provisorios: física, los 9 tramos, pájaros, perros, rocas, figuritas, animales con datos, preguntas en las 10 ciudades, casa en Reconquista (Anita se suma), Triple Frontera, mapa de la ruta, progreso guardado | No                     |
| 1    | Primer tramo con arte real (Vicente nuevo, fondos fueguinos, pingüinos, gaviotas)                                                                                                                                                            | Sí (Patagonia)         |
| 2    | Ruta completa de Argentina, mapa del país con ruta, llegada a Reconquista con la familia y Anita                                                                                                                                             | Sí (resto)             |
| 3    | Otros países reutilizando el motor (Uruguay y Chile son buenos candidatos)                                                                                                                                                                   | Por país               |

La fase 0 sirve para probar que el juego sea divertido **antes** de invertir en arte.
