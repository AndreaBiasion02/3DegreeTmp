// A curated, locally bundled Lucide subset. No external icon requests at runtime.
import fs from 'node:fs/promises';
const groups = {
  'Studio e professioni': { stethoscope: 'Stetoscopio, medicina, turni', pill: 'Pillola, farmacia, terapia', syringe: 'Siringa, infermieristica', brain: 'Cervello, psicologia, studio', atom: 'Atomo, fisica, scienza', microscope: 'Microscopio, biologia, ricerca', flaskConical: 'Provetta, chimica, laboratorio', scale: 'Bilancia, legge, giurisprudenza', gavel: 'Martelletto, giudice', calculator: 'Calcolatrice, economia, conti', chartNoAxesCombined: 'Grafico, finanza, crescita', bookOpen: 'Libro, lettere, lettura', palette: 'Tavolozza, arte, design', ruler: 'Righello, architettura', wrench: 'Chiave inglese, ingegneria', laptop: 'Portatile, informatica, tesi', terminal: 'Terminale, codice, programmazione', binary: 'Codice binario, informatica', languages: 'Lingue, traduzione', graduationCap: 'Tocco, laurea, traguardo' },
  'Brindisi e passioni': { martini: 'Cocktail, spritz, aperitivo', beer: 'Birra, pub, festa', wine: 'Vino, calice, brindisi', pizza: 'Pizza, fame, serata', cake: 'Torta, compleanno, festa', coffee: 'Tazza, caffè, studio notturno', music: 'Musica, concerto', headphones: 'Cuffie, musica, podcast', camera: 'Fotografia, ricordi', plane: 'Aereo, viaggi, vacanze', mountain: 'Montagna, escursioni', bike: 'Bicicletta, ciclismo', dumbbell: 'Palestra, fitness', cat: 'Gatto, animali', dog: 'Cane, animali', gamepad2: 'Controller, videogiochi', cookingPot: 'Pentola, cucina', film: 'Cinema, film', flower2: 'Fiore, natura' },
  'Umori e traguardi': { alarmClock: 'Sveglia, turni, ritardi', moon: 'Luna, notte, sonno', batteryLow: 'Batteria scarica, stanchezza', rocket: 'Razzo, futuro, partenza', trophy: 'Trofeo, vittoria', medal: 'Medaglia, traguardo', partyPopper: 'Coriandoli, festa', sparkles: 'Scintille, magia', flame: 'Fiamma, energia', ghost: 'Fantasmino, sparire, ironia', skull: 'Teschio, umorismo nero', smile: 'Sorriso, felicità', heart: 'Cuore, amore', clover: 'Quadrifoglio, fortuna' },
};
const result = {};
for (const [category, entries] of Object.entries(groups)) for (const [name, label] of Object.entries(entries)) {
  const slug = name.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`).replace(/(\D)(\d)/g, '$1-$2');
  const { __iconNode } = await import(`../node_modules/lucide-react/dist/esm/icons/${slug}.mjs`);
  result[`lucide-${slug}`] = { label, category, nodes: __iconNode.map(([tag, attrs]) => [tag, Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'key'))]) };
}
await fs.writeFile('src/lib/coaster-icons.json', JSON.stringify(result, null, 2) + '\n');
await fs.mkdir('public/licenses', { recursive: true });
await fs.copyFile('node_modules/lucide-react/LICENSE', 'public/licenses/lucide.txt');
console.log(`Bundled ${Object.keys(result).length} Lucide icons.`);
for (const font of ['noto-sans', 'noto-serif', 'roboto-mono']) {
  await fs.copyFile(`node_modules/@fontsource/${font}/files/${font}-latin-700-normal.woff`, `public/fonts/coaster-${font}.woff`);
  await fs.copyFile(`node_modules/@fontsource/${font}/LICENSE`, `public/licenses/${font}.txt`);
}
