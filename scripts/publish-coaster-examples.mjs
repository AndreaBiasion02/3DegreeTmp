// Promote reviewed SVG previews to the category cards. Does not call OpenAI.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { coasterCategories } from '../src/lib/coaster-categories.mjs';
import { categoryCoasterColorway } from '../src/lib/coaster-colorways.mjs';

const directory = process.argv[2];
if (!directory) throw new Error('Usage: node scripts/publish-coaster-examples.mjs <sample-directory>');
const source = path.resolve(directory);
const results = JSON.parse(await fs.readFile(path.join(source, 'report.json'), 'utf8'));
const expected = coasterCategories.flatMap(category => category.examples.map((example, index) => ({ category, example, index })));
if (results.length !== expected.length) throw new Error(`Expected ${expected.length} completed examples, got ${results.length}.`);
for (const { category, example, index } of expected) {
  const result = results.find(entry => entry.input?.category === category.id && entry.input?.brief === example.brief);
  if (!result || !result.paths || !result.accentPaths || result.status !== 200) throw new Error(`Missing valid two-color example: ${category.id}/${index}`);
  if (example.image !== `/coaster-inspiration/generated/${result.id}.webp`) throw new Error(`Image path does not match ${result.id}`);
  await fs.access(path.join(source, `${result.id}.svg`));
}
for (const { category, example } of expected) {
  const filename = path.basename(example.image);
  const destination = path.resolve('public', 'coaster-inspiration', 'generated', filename);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const colors = categoryCoasterColorway(category.id);
  const replacements = { '#facc15': colors.structure, '#222222': colors.accent, '#dc2626': colors.detail };
  const svg = (await fs.readFile(path.join(source, `${path.basename(filename, '.webp')}.svg`), 'utf8'))
    .replace(/(fill|stroke)="(#facc15|#222222|#dc2626)"/g, (_, attribute, original) => `${attribute}="${replacements[original]}"`);
  await sharp(Buffer.from(svg), { density: 240 }).resize(700, 700).webp({ quality: 92, effort: 6 }).toFile(destination);
  console.log(`${filename}: ${(await fs.stat(destination)).size} bytes`);
}
