# 3Degree — Vetrina

Versione separata dello storefront `3DegreeFE`, solo illustrativa. Mantiene logo, font locali Glacial Indifference, palette, hero, sezioni e proporzioni del frontend originale. Navigazione e testi sono adattati alla consultazione. Nessun carrello, checkout, account, pagamento, API Medusa o endpoint di acquisto.

## Avvio

Node.js 22, npm:

```sh
npm ci
npm run dev
```

Anteprima: http://localhost:8001. Per verificare l’export statico:

```sh
npm run build
npm run check
npm test
npm run preview
```

## Contenuti

### Collezioni attuali

Il catalogo è diviso in **Forme di laurea** (6 forme originali), **Tocchi di facoltà** (10 simboli a filo del coperchio) e **Personalizzabili** (il configuratore libero). Le pagine e il footer usano `src/lib/collections.json`.

`npm run generate:faculty` rigenera i dieci tocchi dal CAD: GLB aperti/chiusi, rendering WebP e STL del coperchio e del simbolo. I simboli occupano gli ultimi 0,8 mm del coperchio e terminano sul suo stesso piano. File di stampa e istruzioni in `public/models/facolta/LEGGIMI.md`; prevedono stampa multicolore e richiedono una prova fisica. Dopo una nuova importazione del catalogo, rieseguire questo comando prima del build per ripristinare collezioni e modelli di facoltà.

Home, collezione Laurea e 17 schede: i sei portaconfetti a tema più 11 tocchi importati dal catalogo pubblicato in Docker (un modello libero e dieci facoltà). I preset conservano colori, testo e font del backend. Dati editoriali in `src/lib/products.json`, immagini in `public/products`, geometria CAD già convertita in `public/models/tocco-meshes.json`. I tocchi misurano 65 × 65 × 37 mm secondo il CAD. Le anteprime sono rendering, non fotografie. L’NFC è presentato come concetto del brand.

Il configuratore del tocco conserva testi multipli, font, logo SVG e posizionamento 2D/3D dello storefront originale, con controlli separati per struttura, fascia e bordo. Funziona localmente nel browser: nessun salvataggio remoto, caricamento su server o carrello. I sei modelli GLB permettono di colorare struttura e dettagli mantenendo il chip giallo di Economia. I colori restano selezionati passando tra aperto e chiuso; ripristino e ricaricamento riportano ai valori iniziali.

### Palette di stampa

Unica fonte dei colori selezionabili: `src/lib/filament-palette.json`. Solo 9 colori ELEGOO PLA Basic con bobina: Black, White, Grey, Red, Yellow, Orange, Cobalt Blue, Green, Purple. Verificati acquistabili sul negozio europeo l’8 settembre 2026: https://eu.elegoo.com/products/pla-basic-filament-1-75mm-colored-1kg. La disponibilità può cambiare; non è una verifica delle bobine fisicamente a magazzino. I valori HEX sono approssimazioni per l’anteprima, non codici colorimetrici ufficiali ELEGOO.

Non sono presenti picker liberi, codici HEX modificabili o colori fuori palette, neppure per testi e logo. I preset importati vengono adattati dalla funzione `normalizeCatalog` in `scripts/normalize-palette.mjs`; anche le anteprime e i GLB sono allineati. Per aggiornare assets da sorgenti precedenti eseguire `node scripts/apply-printable-palette.mjs` e `node scripts/render-cap-previews.mjs`. L’oro è sostituito dal giallo, i colori scuri/pastello dai corrispondenti colori base. Il sito non promette finiture metalliche.

Per aggiornare volontariamente il catalogo dal database locale: `node scripts/import-backend.mjs`, poi `node scripts/render-cap-previews.mjs` e il normale build. L’importazione esegue solo una SELECT dei prodotti pubblicati e copia una lista esplicita di campi illustrativi; non esporta clienti, ordini, prezzi, chiavi o connessioni. **Non è uno step del build**: il sito funziona anche con Docker spento. Il database e il frontend originale restano invariati. `adapt-configurator.mjs` documenta il port iniziale; non eseguirlo per un semplice aggiornamento dei prodotti, perché riscrive il componente.

`scripts/import-storefront.mjs` documenta l’importazione iniziale, inclusi gli adattamenti ai testi. Il build è autonomo: non richiede né lo storefront originale né la cartella condivisa. Per una nuova importazione passare la cartella storefront e quella della collezione come argomenti; questa operazione riscrive i file importati.

## Prestazioni e accessibilità

Next.js con `output: export`: pagine HTML generate in anticipo, nessun backend necessario. Testi, navigazione e catalogo sono disponibili senza JavaScript. Immagini WebP, dimensioni dichiarate, caricamento differito delle immagini di catalogo, font WOFF2 locali, video senza preload. Three.js e GLB vengono richiesti solo dopo «Esplora in 3D»; il rendering avviene su interazione, senza loop continuo. Controlli alternativi alla rotazione con mouse, menu e FAQ nativi, focus visibile e rispetto delle preferenze di movimento ridotto.

## Pubblicazione e indicizzazione

Impostare `NEXT_PUBLIC_SITE_URL` all’origine pubblica definitiva **prima** del build. Il valore predefinito è l’indirizzo dell’anteprima privata Sites, definito in `src/lib/seo.ts`. Pubblicare la cartella `out` su un hosting statico con supporto a `index.html` per directory e a `404.html` con stato HTTP 404; non usare un fallback SPA che risponde 200 alle pagine inesistenti.

Le pagine includono title e description specifici, canonical, Open Graph, dati strutturati Organization / CollectionPage / Product / BreadcrumbList, robots.txt e sitemap.xml. I Product non includono prezzi, offerte, recensioni o disponibilità inventate: non si promettono risultati avanzati di shopping. Nessun file speciale per AI è necessario: la base è contenuto utile e scansionabile (https://developers.google.com/search/docs/appearance/ai-features).

Un’anteprima privata non è indicizzabile. Sul dominio pubblico verificare assenza di autenticazione, blocchi WAF e header noindex, quindi verificare la proprietà in Google Search Console e inviare `/sitemap.xml`. I file rendono il sito tecnicamente scansionabile, ma non garantiscono indicizzazione, posizionamento o citazioni AI. I tempi e le metriche Core Web Vitals vanno misurati sull’hosting pubblico.

## Verifiche automatiche

`npm test` verifica sull’HTML esportato titoli/canonical unici, H1, link interni e ancore, metadati e JSON-LD, sitemap completa, assenza di percorsi di acquisto, validità GLB e peso delle immagini. `npm run check` controlla TypeScript. Nessuna credenziale dello shop viene importata.
