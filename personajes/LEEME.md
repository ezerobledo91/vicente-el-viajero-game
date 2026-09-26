# Carpeta de arte

Acá va todo el arte original (láminas, fondos, stickers). El juego **no** usa estos archivos directamente:
las herramientas de `tools/` los recortan y los dejan listos en `public/assets/`.
Después de agregar o cambiar algo, corré el comando de la última columna (o `npm run assets` para todo).

| Carpeta                   | Qué va                                                                                                                            | Config                                                    | Comando              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------- |
| `familia/`                | Láminas de Vicente, Mamá, Papá y Anita. `sprites-v3.png` es la que se usa; `vicente-caminar.png` reemplaza la caminata de Vicente | `tools/sprites.config.json`                               | `npm run sprites`    |
| `familia/referencias/`    | Ilustraciones de referencia de la familia (no se usan en el juego)                                                                | —                                                         | —                    |
| `fotos/`                  | Fotos reales de la familia. **No se suben a GitHub** (están en `.gitignore`)                                                      | —                                                         | —                    |
| `mapa/`                   | `mundo.png`, el planisferio                                                                                                       | `tools/build-map.mjs`                                     | `npm run map`        |
| `animales/`               | Láminas de animales y objetos coleccionables                                                                                      | `tools/animales*.config.json`                             | `npm run animales`   |
| `decoracion/`             | Rocas, troncos y adornos del camino (dibujos sueltos sobre fondo liso)                                                            | `tools/decoracion.config.json` + `src/data/decoracion.js` | `npm run decoracion` |
| `premios/`                | Stickers del álbum                                                                                                                | `tools/stickers.config.json` + `src/data/stickers.js`     | `npm run stickers`   |
| `paises/<pais>/tramos/`   | Panoramas 3:1 para los tramos (camino abajo, paisaje arriba)                                                                      | `tools/fondos.config.json`                                | `npm run fondos`     |
| `paises/<pais>/ciudades/` | Fondos de llegada a cada ciudad: panorama 3:1 o postal 4:3                                                                        | `tools/fondos.config.json`                                | `npm run fondos`     |
| `paises/<pais>/extras/`   | Arte que todavía no se usa (calles, rutas, objetos de ciudad)                                                                     | —                                                         | —                    |

## Vicente: un PNG por acción

`familia/vicente/` tiene un archivo por animación, con fondo transparente y los cuadros uno al lado del otro:
`caminar.png`, `pensar.png`, `victoria.png`, `interactuar.png`, `salto.png`, `festejo.png`, `descanso.png`,
`enojado.png`, `aburrido.png`, `agachar.png`. Para cambiar una animación, reemplazá su archivo (con la misma
cantidad de cuadros, o cambiá `frames` en `tools/sprites.config.json`) y corré `npm run sprites`.
No importa el tamaño de la imagen: cada acción se escala para que Vicente mida siempre lo mismo.
Para sumar una acción nueva, agregá el PNG y una línea en `animations` de Vicente en la config.

## Nombres

Usá nombres cortos en minúscula y con guiones: `bosque-fueguino.png`, `rosario-centro.png`,
`stickers-argentina.png`. Si agregás una versión nueva de una lámina, sumale el número (`sprites-v4.png`)
y cambiá `source` en la config.

## Cómo pedir las láminas (para que se recorten bien)

- **Personajes y animales**: grilla de cuadros del mismo tamaño, con 8-10 px de separación, fondo liso,
  sin textos adentro de los cuadros y el dibujo sin salirse del cuadro.
- **Dibujos sueltos** (rocas, stickers): sobre fondo liso de un solo color, separados entre sí.
- **Tramos**: panorama de 2172×724 (3:1), con el camino en la franja de abajo, a la misma altura en todo el ancho.
- **Ciudades**: panorama 3:1 (calle a la altura del piso) o ilustración 4:3.
