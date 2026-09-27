import sharp from 'sharp';
import path from 'node:path';

async function main() {
  const [source, destination] = process.argv.slice(2);
  if (!source || !destination) throw new Error('Usage: node tools/chroma-key-generated.js <source> <destination>');
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const magenta = r > 120 && b > 110 && r > g * 1.5 && b > g * 1.3;
    if (magenta) data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
  }
  await sharp(data, { raw: info }).png().toFile(destination);
  const meta = await sharp(destination).metadata();
  console.log(`${path.basename(destination)}|${meta.width}x${meta.height}|${meta.channels}ch`);
}

main().catch(error => { console.error(error); process.exit(1); });
