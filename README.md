# Explorador del Mundo

Juego educativo para Vicente: recorrer un planisferio, caminar por cada país, adivinar banderas,
aprender datos curiosos y encontrarse con la familia en el camino.

Hecho con **[Phaser 4](https://phaser.io)** (motor 2D) y **Vite** (servidor de desarrollo y build).

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # abrir el juego en http://localhost:5173
npm run build      # build de producción en dist/ (se puede subir a cualquier hosting estático)
npm run sprites    # regenerar los sprites a partir de la lámina original
npm run map        # recalibrar los países sobre la ilustración del mapa
npm run animales   # recortar las láminas de animales y objetos (tools/animales*.config.json)
npm run fondos     # preparar fondos de tramos y ciudades (tools/fondos.config.json)
npm run decoracion # recortar rocas y troncos
npm run stickers   # recortar los stickers del álbum
npm run assets     # todo lo anterior junto
npm run lint       # ESLint
npm run prettier   # formatear código
```

## Estructura

```
├── personajes/                   Arte original (ver personajes/LEEME.md)
├── tools/
│   ├── slice-sprites.mjs          Recorta la lámina → PNG transparentes + manifest.json
│   ├── sprites.config.json        Qué cuadros son de qué personaje/animación, alturas reales
│   ├── sprites-v1.config.json     Config de la lámina anterior (npm run sprites -- tools/sprites-v1.config.json)
│   ├── build-map.mjs              Calibra los contornos reales de los países sobre la ilustración
│   └── out/                       Imágenes de control de la calibración (no se versionan)
├── public/assets/
│   ├── sprites/                   Generado: sprite sheet por personaje + manifest
│   ├── map/                       Generado: mundo.png + polígonos por región (sudamerica.json)
│   ├── flags/                     Generado: banderas SVG (flag-icons)
│   └── emblemas/                  Tus sprites de emblemas por país (ver abajo)
└── src/
    ├── main.js                    Punto de entrada
    ├── config/
    │   ├── constants.js           Tamaños, colores, claves de escenas y assets
    │   └── gameConfig.js          Configuración de Phaser y lista de escenas
    ├── scenes/
    │   ├── BootScene.js           Carga fuente + manifest
    │   ├── PreloadScene.js        Carga sprites, mapa y banderas; registra animaciones
    │   ├── MapaScene.js           Planisferio: cámara, países, marcas de continentes, Vicente
    │   ├── MapaHudScene.js        Interfaz del mapa: barra, tooltip, ficha del país (+ Empezar viaje)
    │   ├── ViajeMapaScene.js      Mapa del país con la ruta del viaje y el progreso
    │   ├── ViajeScene.js          Tramo jugable de plataformas (Arcade Physics)
    │   ├── ViajeHudScene.js       Progreso del tramo, figuritas, controles táctiles
    │   ├── CiudadScene.js         Llegada a una ciudad: dato, casa/frontera, preguntas
    │   ├── PerfilScene.js         Perfil de Vicente: álbum de stickers, coleccionables y animales vistos
    │   ├── GalleryScene.js        Demo: tarjetas de personajes con botones por animación
    │   └── EncuentroScene.js      Demo: Vicente saluda a la familia y después se mueve libre
    ├── entities/
    │   ├── Character.js           Personaje: idle(), perform(), walkTo(), walkToPoint(), face()
    │   ├── Player.js              Vicente con física: caminar, saltar, rebotar, golpes
    │   └── Companion.js           Compañero que sigue a Vicente (Anita)
    ├── systems/
    │   ├── characters.js          Lee el manifest y crea las animaciones de Phaser
    │   ├── levelBuilder.js        Arma cada tramo a partir de sus datos (con semilla)
    │   ├── parallax.js            Fondos en capas por paisaje
    │   ├── placeholders.js        Dibujos provisorios (animales, pájaros, perros...)
    │   └── progress.js            Progreso guardado en el navegador
    ├── ui/
    │   ├── Button.js              Botón reutilizable
    │   ├── QuizPanel.js           Preguntas de opción múltiple
    │   └── SpeechBubble.js        Globo de diálogo
    └── data/
        ├── paises.js              Países: capital, idioma, moneda, datos curiosos, emblema; definiciones
        ├── regiones.js            Continentes: disponible/bloqueado, marca y encuadre de cámara
        ├── viajes/argentina.js    Ruta: ciudades (preguntas, eventos) y tramos (paisaje, animales)
        ├── animales.js            Animales nativos y pájaros a esquivar
        ├── paisajes.js            Paisajes de los tramos
        ├── stickers.js            Stickers del álbum: rareza y cómo se gana cada uno
        ├── decoracion.js          Rocas/troncos: cuáles son obstáculos y cuáles adornos
        └── dialogos.js            Textos de la escena de encuentro
```

### Flujo de escenas

```
Boot ──► Preload ──► Mapa (+ HUD) ◄──► Galería ◄──► Encuentro
                      │
                      ├─ vista "mundo": continentes con candado, Sudamérica disponible
                      └─ vista "región": países con nombre, hover, ficha y Vicente caminando
```

### Pipeline de sprites

La lámina trae los cuadros sobre fondo beige. `npm run sprites`:

1. detecta cada cuadro automáticamente; los que quedaron pegados se separan buscando la línea
   de separación real (con `rows` en la config, que dice cuántos cuadros tiene cada fila),
2. los asigna en orden de lectura según `tools/sprites.config.json`,
3. quita el fondo (relleno desde el borde + huecos encerrados, con bordes suavizados) y borra
   restos del cuadro vecino (líneas finitas o pedazos que tocan el borde),
4. alinea los cuadros de cada personaje por los pies y arma una tira PNG por personaje,
5. mide la altura dibujada de cada personaje y escribe `manifest.json`.

El juego solo lee el manifest, así que **agregar una animación o un personaje** es:
sumar los cuadros a la lámina → describirlos en `sprites.config.json` → `npm run sprites`.
No hay que tocar código: la galería genera los botones sola.

- `alturaCm`: altura real aproximada. Cada sprite se escala con eso (Anita más chica que Vicente, etc.).
- `facing`: hacia dónde mira el personaje en la lámina; `Character.face()` lo espeja cuando hace falta.
- `alias`: reutilizan cuadros de otra animación (por ejemplo, "quieto" = primer cuadro de "descanso").
- `rows`: cuadros por fila de la lámina. Si cambiás la lámina, actualizalo (el script avisa si no coincide).

Para volver a la lámina anterior: `npm run sprites -- tools/sprites-v1.config.json`.

### Pipeline del mapa

La ilustración no tiene fronteras ni sigue una proyección exacta. `npm run map` toma los contornos
reales (Natural Earth, paquete `world-atlas`) y los calibra sobre el dibujo:

1. detecta la silueta dibujada del continente (tapando los ríos que la cortan),
2. ajusta escala/posición/inclinación para maximizar la superposición,
3. aplica una deformación radial suave para que la costa real coincida con la dibujada.

Genera `public/assets/map/sudamerica.json` con los polígonos en píxeles de la imagen, un punto interior
por país (para la etiqueta, Vicente y el emblema) y `tools/out/overlay-sudamerica.png` para revisar el calce.
Para sumar otra región: agregarla en `REGIONS` (tools/build-map.mjs) y en `src/data/regiones.js` con `disponible: true`.

### Emblemas por país

Cada país tiene en `src/data/paises.js` un `emblema` sugerido (animal, monumento u objeto).
Para mostrarlo parado sobre el país:

1. guardá el PNG con fondo transparente en `public/assets/emblemas/` (por ejemplo `ar.png`),
2. en `paises.js`, completá `emblema.sprite: "ar.png"`.

Se dibuja con 30 px de alto (en píxeles del mapa) y flota suavemente. No hace falta tocar código.

## Modo viaje

Arte del viaje: `personajes/paises/argentina/` (ver `personajes/LEEME.md`). Las láminas de animales se recortan con el
mismo recortador que los personajes; los panoramas se cortan en fondo + camino y se continúan con su reflejo
para que se repitan sin corte. Si un paisaje o animal no tiene arte, se usa el dibujo provisorio.

Ver [docs/plan-viaje.md](docs/plan-viaje.md): diseño, ruta de Argentina, mecánicas y assets a generar.

## Próximos pasos

- [x] Planisferio con continentes bloqueados y Sudamérica jugable
- [x] Países con nombre, hover, ficha (bandera, capital, idioma, moneda, datos curiosos) y definiciones
- [ ] Sprites de emblemas por país
- [ ] Escena de pregunta: "¿De qué país es esta bandera?" con opciones y animaciones de pensar/victoria
- [ ] Familiares apareciendo en distintos países con mensajes
- [ ] Progreso guardado (países visitados, banderas acertadas) y desbloqueo del siguiente continente
- [ ] Sonido y música
