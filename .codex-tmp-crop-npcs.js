import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const root = 'C:/Users/ezerr/OneDrive/Escritorio/Ezequiel/pueba claude games';
const out = path.join(root, '.codex-npc-refs');
fs.mkdirSync(out, { recursive: true });

const sheets = {
  patagonia: ['guardaparque-patagonia', 'gaucho-patagonia', 'guia-patagonia'],
  centro: ['trabajadora-centro', 'medico-rural', 'viajera-mate'],
  'litoral-misiones': ['poblador-litoral', 'recolectora-misiones', 'guardaparque-misiones'],
};

for (const [sheet, names] of Object.entries(sheets)) {
  const input = path.join(root, 'mejoras', 'npcs', `npcs-${sheet}.png`);
  for (let index = 0; index < names.length; index++) {
    await sharp(input)
      .extract({ left: index * 724, top: 0, width: 724, height: 724 })
      .png()
      .toFile(path.join(out, `${names[index]}.png`));
  }
}
