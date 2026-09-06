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

Home, collezione Laurea e sei schede: Informatica, Economia, Medicina, Giurisprudenza, Ingegneria e Biologia. Dati editoriali in `src/lib/products.json`; i dati dimensionali vengono dai manifest originali. Modelli e immagini in `public/products`. Si tratta di prototipi digitali, non di fotografie di prodotti finiti. L’NFC è presentato come concetto del brand, senza attribuirlo come caratteristica verificata ai sei prototipi.

`scripts/import-storefront.mjs` documenta l’importazione iniziale, inclusi gli adattamenti ai testi. Il build è autonomo: non richiede né lo storefront originale né la cartella condivisa. Per una nuova importazione passare la cartella storefront e quella della collezione come argomenti; questa operazione riscrive i file importati.

## Prestazioni e accessibilità

Next.js con `output: export`: pagine HTML generate in anticipo, nessun backend necessario. Testi, navigazione e catalogo sono disponibili senza JavaScript. Immagini WebP, dimensioni dichiarate, caricamento differito delle immagini di catalogo, font WOFF2 locali, video senza preload. Three.js e GLB vengono richiesti solo dopo «Esplora in 3D»; il rendering avviene su interazione, senza loop continuo. Controlli alternativi alla rotazione con mouse, menu e FAQ nativi, focus visibile e rispetto delle preferenze di movimento ridotto.

## Pubblicazione e indicizzazione

Impostare `NEXT_PUBLIC_SITE_URL` all’origine pubblica definitiva **prima** del build. Il valore predefinito è l’indirizzo dell’anteprima privata Sites, definito in `src/lib/seo.ts`. Pubblicare la cartella `out` su un hosting statico con supporto a `index.html` per directory e a `404.html` con stato HTTP 404; non usare un fallback SPA che risponde 200 alle pagine inesistenti.

Le pagine includono title e description specifici, canonical, Open Graph, dati strutturati Organization / CollectionPage / Product / BreadcrumbList, robots.txt e sitemap.xml. I Product non includono prezzi, offerte, recensioni o disponibilità inventate: non si promettono risultati avanzati di shopping. Nessun file speciale per AI è necessario: la base è contenuto utile e scansionabile (https://developers.google.com/search/docs/appearance/ai-features).

Un’anteprima privata non è indicizzabile. Sul dominio pubblico verificare assenza di autenticazione, blocchi WAF e header noindex, quindi verificare la proprietà in Google Search Console e inviare `/sitemap.xml`. I file rendono il sito tecnicamente scansionabile, ma non garantiscono indicizzazione, posizionamento o citazioni AI. I tempi e le metriche Core Web Vitals vanno misurati sull’hosting pubblico.

## Verifiche automatiche

`npm test` verifica sull’HTML esportato titoli/canonical unici, H1, link interni e ancore, metadati e JSON-LD, sitemap completa, assenza di percorsi di acquisto, validità GLB e peso delle immagini. `npm run check` controlla TypeScript. Nessuna credenziale dello shop viene importata.
