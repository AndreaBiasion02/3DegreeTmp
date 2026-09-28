// Explicitly billed integration smoke test. No network calls without --generate.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { generateArtworks } from '../server/coaster-art-api.mjs';
import { vectorizeCoasterComposition } from '../server/coaster-image-vectorizer.mjs';
import { getCoasterCategory } from '../src/lib/coaster-categories.mjs';
import { validateArtworks } from '../src/lib/coaster-art.mjs';

const reprocessIndex = process.argv.indexOf('--reprocess');
const reprocessDirectory = reprocessIndex >= 0 ? process.argv[reprocessIndex + 1] : undefined;
const completeIndex = process.argv.indexOf('--complete');
const completeDirectory = completeIndex >= 0 ? process.argv[completeIndex + 1] : undefined;
if (!process.argv.includes('--generate') && !reprocessDirectory && !completeDirectory) throw new Error('Pass --generate, --complete <directory>, or --reprocess <directory>.');
if (!reprocessDirectory) {
  for (const file of ['.env.local', '.env']) {
    try { process.loadEnvFile(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing from server configuration.');
}
const palette = JSON.parse(await fs.readFile('src/lib/filament-palette.json', 'utf8'));
const directory = reprocessDirectory || completeDirectory ? path.resolve(reprocessDirectory || completeDirectory) : path.resolve('outputs', `coaster-samples-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const previousResults = reprocessDirectory || completeDirectory ? JSON.parse(await fs.readFile(path.join(directory, 'report.json'), 'utf8')) : [];
await fs.mkdir(directory, { recursive: true });
console.log(`Output: ${directory}`);
const cases = [
  { id: 'neo-disoccupato', category: 'meme', example: 0 },
  { id: 'riqualificazione', category: 'meme', example: 1 },
  { id: '110-vodka', category: 'party', example: 0 },
  { id: 'achievement', category: 'gaming', example: 0 },
  { id: 'prima-il-titolo', category: 'party', example: 1 },
  { id: 'dottore-in-teoria', category: 'faculty', example: 0 },
  { id: 'primo-curriculum', category: 'faculty', example: 1 },
  { id: 'caffe-e-ansia', category: 'student', example: 0 },
  { id: 'fuori-corso', category: 'student', example: 1 },
  { id: 'game-over', category: 'gaming', example: 1 },
  { id: 'grazie-mamma', category: 'personal', example: 0 },
  { id: 'missione-compiuta', category: 'personal', example: 1 },
];
const results = [];
for (const sample of cases) {
  if (completeDirectory && previousResults.some(result => result.id === sample.id && result.paths > 0)) {
    results.push(previousResults.find(result => result.id === sample.id));
    console.log(`Reusing ${sample.id}`);
    continue;
  }
  const brief = getCoasterCategory(sample.category).examples[sample.example].brief;
  const input = { brief, category: sample.category, colorMode: 'duotone' };
  let requestBody;
  const started = Date.now();
  console.log(`${reprocessDirectory ? 'Reprocessing' : 'Generating'} ${sample.id}...`);
  const response = reprocessDirectory ? Response.json({ data: [{ b64_json: (await fs.readFile(path.join(directory, `${sample.id}.png`))).toString('base64') }] }) : await generateArtworks(input, { env: { ...process.env, COASTER_IMAGE_ENABLED: '1' }, palette,
    fetcher: (url, init) => { requestBody = JSON.parse(init.body); return fetch(url, init); },
  });
  const result = reprocessDirectory ? { ...previousResults.find(r => r.id === sample.id) } : { id: sample.id, input, request: requestBody, status: response.status, seconds: Math.round((Date.now() - started) / 1000) };
  delete result.conversionError;
  const payload = await response.json();
  if (response.ok && payload.data?.[0]?.b64_json) {
    const base64 = payload.data[0].b64_json;
    await fs.writeFile(path.join(directory, `${sample.id}.png`), Buffer.from(base64, 'base64'));
    if (payload.usage) result.usage = payload.usage;
    try {
      const paths = await vectorizeCoasterComposition(base64, 'duotone');
      const art = validateArtworks([{ title: sample.id, concept: 'Test API reale', background: '#facc15', foreground: '#222222',
        ...(paths.some(p => p.role === 'accent') ? { accent: '#dc2626' } : {}), texts: [], paths, imageComposition: true }], palette)[0];
      await fs.writeFile(path.join(directory, `${sample.id}.json`), JSON.stringify(art, null, 2));
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 1 96 96" width="70mm" height="70mm"><defs><clipPath id="disk"><circle cx="50" cy="49" r="48"/></clipPath></defs><circle cx="50" cy="49" r="48" fill="${art.background}"/><g clip-path="url(#disk)">${['foreground', 'accent'].map(role => `<g id="${role}" fill="${art[role] || art.foreground}">${paths.filter(p => p.role === role).map(p => `<path d="${p.d}"/>`).join('')}</g>`).join('')}</g></svg>`;
      await fs.writeFile(path.join(directory, `${sample.id}.svg`), svg);
      await sharp(Buffer.from(svg)).resize(700, 700).png().toFile(path.join(directory, `${sample.id}-preview.png`));
      result.paths = paths.length;
      result.accentPaths = paths.filter(p => p.role === 'accent').length;
    } catch (error) { result.conversionError = error.message; }
  } else { result.error = payload.error || 'Missing image'; }
  results.push(result);
  await fs.writeFile(path.join(directory, 'report.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ id: result.id, status: result.status, seconds: result.seconds, paths: result.paths, accentPaths: result.accentPaths, error: result.error || result.conversionError }));
}
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
await fs.writeFile(path.join(directory, 'index.html'), `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Prove reali sottobicchieri</title><style>body{font:16px system-ui;margin:32px;background:#f4f2eb;color:#222}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}article{background:white;padding:20px;border-radius:16px}img{width:100%}a{color:#176332}p{line-height:1.5}</style><h1>Prove API reali · base + due colori</h1><p>Giallo, nero e rosso dalla palette. Le anteprime mostrano lo SVG vettorializzato; il PNG originale è disponibile per confronto.</p><main>${results.map(r => `<article><h2>${escape(r.id)}</h2>${r.paths ? `<img src="${r.id}-preview.png" alt="Anteprima SVG"><p><a href="${r.id}.svg">SVG 70 mm</a> · <a href="${r.id}.png">PNG originale</a></p>` : `<p>${escape(r.error || r.conversionError)}</p>`}<p>${escape(r.input.brief)}</p><p>${r.seconds} s · ${r.paths || 0} tracciati · ${r.accentPaths || 0} rossi</p></article>`).join('')}</main></html>`);
console.log(`Gallery: ${path.join(directory, 'index.html')}`);
