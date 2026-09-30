// Billed image generation is explicit. --force regenerates only the named product.
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateArtworks } from '../server/coaster-art-api.mjs';
import { vectorizeCoasterComposition } from '../server/coaster-image-vectorizer.mjs';
import { validateArtworks } from '../src/lib/coaster-art.mjs';
import { drawnBorderCoverage } from './coaster-border-audit.mjs';

if (!process.argv.includes('--generate')) throw new Error('Pass --generate to authorize API calls.');
for (const file of ['.env.local', '.env']) {
  try { process.loadEnvFile(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing.');
const palette = JSON.parse(await fs.readFile('src/lib/filament-palette.json', 'utf8'));
const products = JSON.parse(await fs.readFile('src/lib/products.json', 'utf8')).filter(p => p.kind === 'coaster');
const argument = name => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
const only = argument('--only');
const force = process.argv.includes('--force');
const briefFile = argument('--brief-file');
if ((force || briefFile) && (!only || !products.some(product => product.slug === `sottobicchiere-${only}`))) throw new Error('Regeneration requires --only <existing product slug>.');
const customBrief = briefFile ? (await fs.readFile(briefFile, 'utf8')).trim() : undefined;
if (customBrief && (customBrief.length < 10 || customBrief.length > 600)) throw new Error('Brief must be 10–600 characters.');
const destination = path.resolve('scripts/coaster-artworks');
const originals = path.resolve('outputs/coaster-catalog-originals');
const redo = process.argv.includes('--redo-borders');
const redoDirectory = path.resolve('outputs/coaster-border-redo');
const sample = path.resolve('outputs/coaster-samples-2026-09-28T18-38-37-649Z');
await fs.mkdir(destination, { recursive: true });
await fs.mkdir(originals, { recursive: true });
if (redo) await fs.mkdir(path.join(redoDirectory,'backup'), { recursive: true });

const reused = {
  '110-vodka': '110-vodka',
  'dottore-linkedin': 'primo-curriculum',
  'game-over-universita': 'game-over',
  'prima-titolo-poi-spritz': 'prima-il-titolo',
};
const groups = {
  meme: ['laureato-per-sbaglio','finalmente-disoccupato','chatgpt-ce-labbiamo-fatta','3-anni-in-7','brindisi-neo-disoccupato','dottore-giorno-disastro-notte','laurea-presa-dignita','bevi-responsabilmente','vero-esame-domani','proclamazione-pre-serata','tesi-finita-fegato','non-chiedete-tesi','trust-me-dottore','fonte-laureato','sbagliare-con-titolo','mamma-pezzo-carta','costo-laurea','laurea-nessuna-idea','non-domande-difficili','commissione-sopravvissuta','voto-segreto','fuori-corso-dentro-party','brindisi-ai-fuori-corso','laurea-con-riserva','dottore-ora-si-vede'],
  party: ['110-vodka','prima-titolo-poi-spritz','oggi-dottore-domani-hangover','110-lode-amaro','cum-laude-cum-spritz','discussione-superata','non-chiamatemi-domani','sessione-fuori-pericolo','festa-piano-studi'],
  faculty: ['dottore-linkedin','dott-in-teoria','esperienza-titolo','linkedin-prima-proclamazione','dottore-senza-pazienti','chiamatemi-dottore'],
  student: ['sotto-pressione','tesi-mai-sentita','caffe-ansia','sudore-e-biblioteca','caffe-relatore-panico','tesi-tre-copie'],
  gaming: ['ctrl-alt-laurea','achievement-dottore','game-over-universita','respawn-lavoro','laureato-exe','ctrl-c-ctrl-v','ral-loading'],
  personal: ['missione-compiuta'],
};
const subjects = {
  'laureato-per-sbaglio':'un tocco di laurea caduto per caso su un diploma',
  'finalmente-disoccupato':'due omini stilizzati: uno con tocco di laurea, uno con curriculum vuoto',
  'missione-compiuta':'tocco di laurea con bandierina di traguardo leggermente storta',
  'ctrl-alt-laurea':'tre grandi tasti di tastiera CTRL, ALT e LAUREA',
  'achievement-dottore':'trofeo pixel art con tocco di laurea',
  'respawn-lavoro':'controller arcade e porta verso il mondo del lavoro',
  'laureato-exe':'finestra computer di errore e tocco di laurea',
  'chatgpt-ce-labbiamo-fatta':'due omini stilizzati, studente e piccolo robot, che si danno il cinque',
  '3-anni-in-7':'tartaruga con tocco di laurea che taglia il traguardo',
  'sotto-pressione':'pentola a pressione con tocco di laurea',
  'tesi-mai-sentita':'libro di tesi che gioca a nascondino',
  'caffe-ansia':'tazzina di caffè con occhiaie e tocco di laurea',
  'ctrl-c-ctrl-v':'due grandi tasti di tastiera che si copiano a vicenda',
  'brindisi-neo-disoccupato':'due omini stilizzati che brindano con bottiglie, uno con tocco di laurea',
  'dottore-giorno-disastro-notte':'un dottore laureato di giorno, lo stesso omino festaiolo di notte',
  'laurea-presa-dignita':'tocco di laurea in mano e dignità che scappa via',
  'bevi-responsabilmente':'due amici che brindano, uno con tocco di laurea stanco',
  'oggi-dottore-domani-hangover':'tocco di laurea accanto a un bicchiere e una sveglia',
  '110-lode-amaro':'calice di amaro e piccolo diploma con 110',
  'cum-laude-cum-spritz':'calice di spritz con fetta d’arancia e ramo d’alloro',
  'vero-esame-domani':'sveglia del mattino accanto a un bicchiere da festa',
  'discussione-superata':'due calici che brindano sopra un libro di tesi chiuso',
  'proclamazione-pre-serata':'tocco di laurea appeso sopra due calici da festa',
  'tesi-finita-fegato':'libro di tesi chiuso accanto a un fegato disegnato in modo simpatico',
  'non-chiedete-tesi':'omino stanco davanti a una tesi, amico che gli porge un bicchiere',
  'dott-in-teoria':'stetoscopio che abbraccia un piccolo tocco di laurea',
  'trust-me-dottore':'medico improvvisato con stetoscopio e tocco di laurea',
  'fonte-laureato':'nota a piè di pagina e tocco di laurea',
  'sbagliare-con-titolo':'tocco di laurea sopra una grossa matita con gomma',
  'mamma-pezzo-carta':'mamma che abbraccia il neolaureato con diploma arrotolato',
  'costo-laurea':'portafoglio vuoto e tocco di laurea',
  'ral-loading':'barra di caricamento quasi vuota e tocco di laurea',
  'esperienza-titolo':'bilancia: zero esperienza da un lato, diploma dall’altro',
  'linkedin-prima-proclamazione':'curriculum con tocco di laurea accanto a un computer',
  'dottore-senza-pazienti':'stetoscopio e sala d’attesa vuota',
  'chiamatemi-dottore':'omino con tocco di laurea che indica con orgoglio il suo titolo',
  'laurea-nessuna-idea':'neolaureato davanti a tre strade con punti interrogativi',
  'non-domande-difficili':'omino con tocco di laurea che evita un grosso punto interrogativo',
  'commissione-sopravvissuta':'neolaureato che esce stanco da un’aula di discussione',
  'voto-segreto':'pagella chiusa e due calici in festa',
  'sudore-e-biblioteca':'studente con libri impilati sotto un condizionatore in biblioteca',
  'caffe-relatore-panico':'tazzina di caffè, tesi e piccolo relatore stilizzato',
  'fuori-corso-dentro-party':'tartaruga con tocco di laurea che entra alla festa',
  'tesi-tre-copie':'tre copie della tesi impilate e un foglio di appunti vuoto',
  'non-chiamatemi-domani':'telefono silenzioso accanto a un tocco di laurea',
  'sessione-fuori-pericolo':'microfono da karaoke e libro d’esami chiuso',
  'brindisi-ai-fuori-corso':'tartaruga con tocco di laurea che brinda con un amico',
  'laurea-con-riserva':'neolaureato addormentato sul diploma',
  'dottore-ora-si-vede':'diploma usato come manuale d’istruzioni aperto',
  'festa-piano-studi':'piano di studi e due bicchieri che brindano',
};
const categoryFor = slug => Object.entries(groups).find(([, values]) => values.includes(slug))?.[0];
const quote = phrase => `«${phrase}»`;
const targets = new Set();
if (redo) for (const product of products) {
  const slug=product.slug.replace(/^sottobicchiere-/,'');
  const art=JSON.parse(await fs.readFile(path.join(destination,`${slug}.json`),'utf8'));
  if (await drawnBorderCoverage(art.paths) >= .95) targets.add(slug);
}
if (redo) console.log(`Regenerating ${targets.size} coasters with integrated borders.`);
const report = [];
for (const product of products) {
  const slug = product.slug.replace(/^sottobicchiere-/, '');
  if (only && slug !== only) continue;
  if (redo && !targets.has(slug)) continue;
  const category = categoryFor(slug);
  if (!category) throw new Error(`Missing category: ${slug}`);
  const file = path.join(destination, `${slug}.json`);
  if (!redo && !force) { try { await fs.access(file); console.log(`Existing ${slug}`); continue; } catch {} }
  if (redo) {
    await fs.copyFile(file,path.join(redoDirectory,'backup',`${slug}.json`));
    try { await fs.copyFile(path.join(originals,`${slug}.png`),path.join(redoDirectory,'backup',`${slug}.png`)); } catch(error) { if(error.code!=='ENOENT')throw error; }
  }
  if (!redo && !force && reused[slug]) {
    const artwork = JSON.parse(await fs.readFile(path.join(sample, `${reused[slug]}.json`), 'utf8'));
    artwork.title = product.name;
    artwork.concept = `Grafica riutilizzata dall'esempio ${reused[slug]}`;
    await fs.writeFile(file, JSON.stringify(artwork));
    report.push({slug, category, reused: reused[slug]});
    console.log(`Reused ${slug}`);
    continue;
  }
  const brief = customBrief || `Scrivi ESATTAMENTE ${quote(product.name)} senza abbreviare, correggere o aggiungere parole. Il testo deve essere grande, leggibile e prevalere. Disegna ${subjects[slug] || 'una scena semplice e pertinente alla frase'}. Impagina in modo equilibrato nel disco, con inchiostro nero e pochi accenti rossi. Niente altri testi.${redo?' Nessuna cornice, anello o cerchio esterno, neppure spezzato o collegato alle lettere: il bordo viene aggiunto dal software.':''}`;
  let success = false;
  for (let attempt = 1; attempt <= (redo?4:3) && !success; attempt++) {
    console.log(`Generating ${slug} (${category}, attempt ${attempt})...`);
    const started = Date.now();
    try {
      const originalFile=path.join(originals, `${slug}.png`);
      let base64, usage;
      if (!redo && !force && attempt===1 && await fs.access(originalFile).then(()=>true,()=>false)) {
        base64=(await fs.readFile(originalFile)).toString('base64');
        console.log(`Recovering saved original ${slug}`);
      } else {
        const response = await generateArtworks({brief, category, colorMode: 'duotone'}, {env:{...process.env, COASTER_IMAGE_ENABLED:'1'}, palette, fetcher:fetch});
        const payload = await response.json();
        if (!response.ok || !payload.data?.[0]?.b64_json) throw new Error(`HTTP ${response.status}: ${payload.error || 'missing image'}`);
        base64=payload.data[0].b64_json;
        usage=payload.usage;
        await fs.writeFile(redo?path.join(redoDirectory,`${slug}-attempt${attempt}.png`):originalFile, Buffer.from(base64, 'base64'));
      }
      const paths = await vectorizeCoasterComposition(base64, 'duotone');
      if ((redo || force) && await drawnBorderCoverage(paths) >= .95) throw new Error('Model still drew an integrated circular border');
      if ((redo || force) && !paths[0]?.d.includes(' A ')) throw new Error('Missing normalized border');
      const artwork = validateArtworks([{title:product.name.slice(0,40), concept:`Grafica del catalogo: ${category}`, background:'#facc15', foreground:'#222222', ...(paths.some(p=>p.role==='accent')?{accent:'#dc2626'}:{}), texts:[], paths, imageComposition:true}],palette)[0];
      await fs.writeFile(file, JSON.stringify(artwork));
      if (redo) await fs.writeFile(originalFile,Buffer.from(base64,'base64'));
      report.push({slug, category, seconds:Math.round((Date.now()-started)/1000), paths:paths.length, usage});
      success = true;
    } catch(error) { console.error(`${slug}: ${error.message}`); if (attempt===(redo?4:3)) report.push({slug,category,error:error.message}); }
    await fs.writeFile(redo?path.join(redoDirectory,'report.json'):path.join(originals,'report.json'),JSON.stringify(report,null,2));
  }
}
console.log(`Complete: ${report.filter(r=>!r.error).length} new/reused, ${report.filter(r=>r.error).length} failures.`);
if (report.some(result => result.error)) process.exitCode = 1;
