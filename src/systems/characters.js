// Registro de personajes, animales y objetos: lee los manifests generados por el recortador
// (npm run sprites / npm run animales) y crea las animaciones de Phaser (una por entidad y acción).
// Cada entrada tiene un `grupo` ("familia", "animales") para poder listarlas por separado.

const REGISTRY_KEY = "characters";

export const animKey = (characterId, action) => `${characterId}:${action}`;

export function loadCharacterSheets(scene, manifest, basePath) {
  for (const c of manifest.characters) {
    scene.load.spritesheet(c.id, basePath + c.texture, {
      frameWidth: c.frameWidth,
      frameHeight: c.frameHeight,
    });
  }
}

export function registerCharacters(scene, manifest) {
  for (const c of manifest.characters) {
    for (const a of c.animations) {
      const key = animKey(c.id, a.key);
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(c.id, { frames: a.frames }),
        frameRate: a.fps,
        repeat: a.repeat,
      });
    }
  }
  const otros = (scene.registry.get(REGISTRY_KEY) ?? []).filter((c) => !manifest.characters.some((n) => n.id === c.id));
  scene.registry.set(REGISTRY_KEY, [...otros, ...manifest.characters]);
}

export function getCharacters(scene, grupo = "familia") {
  return (scene.registry.get(REGISTRY_KEY) ?? []).filter((c) => (c.grupo ?? "familia") === grupo);
}

export const hasCharacter = (scene, id) => (scene.registry.get(REGISTRY_KEY) ?? []).some((c) => c.id === id);

export function getCharacter(scene, id) {
  const def = (scene.registry.get(REGISTRY_KEY) ?? []).find((c) => c.id === id);
  if (!def) throw new Error(`Personaje desconocido: ${id}`);
  return def;
}
