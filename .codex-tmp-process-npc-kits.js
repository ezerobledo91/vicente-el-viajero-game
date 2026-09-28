import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const generated = 'C:/Users/ezerr/.codex/generated_images/01a0e14b-72bd-7932-a9a5-8427e44b71dc';
const outputRoot = 'C:/Users/ezerr/OneDrive/Escritorio/Ezequiel/pueba claude games/mejoras/npcs/animaciones';
const files = {
  'guardaparque-patagonia': 'exec-7ed6e4d5-8e74-4735-9072-bcfddd1d49db.png',
  'gaucho-patagonia': 'exec-e451e2f2-63c0-409a-a691-e30dc01b8c1c.png',
  'guia-patagonia': 'exec-7a3cdac1-5838-45be-a2ce-20f31b9be3cc.png',
  'trabajadora-centro': 'exec-758abb4a-7495-4c45-9542-c3608f3bd65a.png',
  'medico-rural': 'exec-3737fc42-07f9-48c2-b6bb-8f8e2b8fe555.png',
  'viajera-mate': 'exec-51b6df19-44eb-4e45-989e-8353f9642081.png',
  'poblador-litoral': 'exec-1c55ebfa-1854-4ce1-8b65-a6c5b5faa02e.png',
  'recolectora-misiones': 'exec-18d035c2-0559-45ff-bf4e-08d0cc152a1b.png',
  'guardaparque-misiones': 'exec-5da1f7e9-40db-401e-bf2f-b251cec6d4c3.png',
};

async function removeConnectedNeutralBackground(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let hasTransparency = false;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 10) { hasTransparency = true; break; }
  if (hasTransparency) return sharp(data, { raw: info }).png().toBuffer();

  const count = info.width * info.height;
  const visited = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0, tail = 0;
  const candidate = index => {
    const i = index * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return Math.max(r, g, b) - Math.min(r, g, b) < 20 && (r + g + b) / 3 > 90;
  };
  const push = index => {
    if (!visited[index] && candidate(index)) {
      visited[index] = 1;
      queue[tail++] = index;
    }
  };
  for (let x = 0; x < info.width; x++) { push(x); push((info.height - 1) * info.width + x); }
  for (let y = 0; y < info.height; y++) { push(y * info.width); push(y * info.width + info.width - 1); }
  while (head < tail) {
    const p = queue[head++];
    const x = p % info.width, y = Math.floor(p / info.width);
    if (x > 0) push(p - 1);
    if (x + 1 < info.width) push(p + 1);
    if (y > 0) push(p - info.width);
    if (y + 1 < info.height) push(p + info.width);
    if (x > 0 && y > 0) push(p - info.width - 1);
    if (x + 1 < info.width && y > 0) push(p - info.width + 1);
    if (x > 0 && y + 1 < info.height) push(p + info.width - 1);
    if (x + 1 < info.width && y + 1 < info.height) push(p + info.width + 1);
  }
  for (let p = 0; p < count; p++) if (visited[p]) {
    const i = p * 4;
    data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

for (const [name, filename] of Object.entries(files)) {
  const clean = await removeConnectedNeutralBackground(path.join(generated, filename));
  const master = await sharp(clean).resize(2048, 2048, { fit: 'fill' }).png().toBuffer();
  const dir = path.join(outputRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'kit-movimientos.png'), master);
  await sharp(master).extract({ left: 0, top: 0, width: 2048, height: 1024 }).png().toFile(path.join(dir, 'caminar.png'));
  await sharp(master).extract({ left: 0, top: 1024, width: 2048, height: 512 }).png().toFile(path.join(dir, 'movimiento-extra.png'));
  await sharp(master).extract({ left: 0, top: 1536, width: 2048, height: 512 }).png().toFile(path.join(dir, 'entregar.png'));
}
