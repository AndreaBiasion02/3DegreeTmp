// One-time, reproducible import from the original storefront and supplied collection.
// The site build uses the checked-in result; the source directories are not required.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const source = path.resolve(process.argv[2] || "../3DegreeFE");
const collection = process.argv[3];
if (!collection)
  throw new Error(
    "Pass the Collezione_Laurea_3D directory as the second argument."
  );
const translations = await fs.readFile(
  path.join(source, "src/lib/translations/index.ts"),
  "utf8"
);
const italian = translations.slice(
  translations.indexOf("  it: {") + 7,
  translations.indexOf("    // Hero & Footer Static Texts")
);
const overrides = {
  "Hero Description New":
    "Trasforma il giorno della laurea in un ricordo che parla davvero di te: scopri le bomboniere 3Degree, tra design, personalità e stampa 3D.",
  "Create Yours": "Scopri i modelli",
  "Made to order": "Creato con cura",
  "Secure checkout": "Design italiano",
  "Start now": "Esplora la collezione",
  "Process 1 Text":
    "Un album condiviso raccoglie le foto del tuo giorno. Il suo link è il punto di partenza per un ricordo da ritrovare con un gesto.",
  "Process Intro":
    "Scopri l’idea dietro le bomboniere con NFC: un oggetto che può collegare il tuo giorno ai ricordi di chi lo ha vissuto.",
  "Process 2 Text":
    "Il link può essere associato a un tag NFC, per collegare la bomboniera all’album. Il video racconta questo concetto; i sei modelli della collezione sono prototipi digitali.",
  "FAQ 1 Question": "Posso acquistare da questo sito?",
  "FAQ 1 Answer":
    "Questo sito è una vetrina illustrativa: presenta i modelli e le loro caratteristiche, senza vendita online.",
  "FAQ 2 Question": "Cosa mostrano le anteprime?",
  "FAQ 2 Answer":
    "Le immagini e le viste 3D mostrano i prototipi digitali della collezione Laurea. Puoi esplorare ogni modello aperto e chiuso. Colori e finiture del prodotto fisico possono differire.",
  "FAQ 3 Question": "Come scelgo il modello da esplorare?",
  "FAQ 3 Answer":
    "Parti dal tuo percorso: Informatica, Economia, Medicina, Giurisprudenza, Ingegneria o Biologia. Ogni scheda racconta la forma del portaconfetti e riporta le dimensioni del modello montato.",
  "Clear before creating": "Conosci ogni dettaglio",
};
await fs.writeFile(
  "src/lib/translations.ts",
  `const dictionary: Record<string, string> = {${italian}\n};\nObject.assign(dictionary, ${JSON.stringify(
    overrides,
    null,
    2
  )});\nexport const t = (key: string) => dictionary[key] ?? key;\n`
);
for (const [original, target] of [
  ["hero", "hero"],
  ["conversion-sections", "sections"],
]) {
  let code = await fs.readFile(
    path.join(source, `src/modules/home/components/${original}/index.tsx`),
    "utf8"
  );
  code = code
    .replace('"use client"', "")
    .replace(
      'import { useTranslation } from "@lib/translations"',
      'import { t } from "@/lib/translations"'
    )
    .replace(
      'import LocalizedClientLink from "@modules/common/components/localized-client-link"',
      'import LocalizedClientLink from "@/components/link"'
    )
    .replace(
      'import ScrollReveal from "@modules/common/components/scroll-reveal"',
      'import ScrollReveal from "@/components/reveal"'
    )
    .replaceAll("  const { t } = useTranslation()", "")
    .replaceAll('href="/store"', 'href="/collections/laurea/"')
    .replace('src="/hero-image.png"', 'src="/hero-image.webp"')
    .replace('preload="metadata"', 'preload="none" poster="/hero-image.webp"');
  await fs.writeFile(`src/components/${target}.tsx`, code);
}
await sharp(path.join(source, "public/hero-image.png"))
  .webp({ quality: 82 })
  .toFile("public/hero-image.webp");
const folders = (await fs.readdir(collection))
  .filter((n) => /^0[1-6]_/.test(n))
  .sort();
const descriptions = [
  "Un piccolo computer portatile con simbolo del codice sullo schermo e tastiera a rilievo. La base nasconde la vaschetta portaconfetti.",
  "Una carta con simbolo dell’euro, grafico a colonne e freccia in crescita. Il coperchio racchiude una vaschetta rettangolare.",
  "Una valigetta con manico e croce rossa, ispirata al mondo della medicina. Il coperchio si separa dalla vaschetta portaconfetti.",
  "Un libro con bilancia della giustizia e segnalibro rosso. Sotto la copertina si trova lo spazio dedicato ai confetti.",
  "Un contenitore esagonale con ingranaggio rosso sul coperchio. Geometrie e dettagli richiamano il mondo dell’ingegneria.",
  "Un microscopio in miniatura con decorazione a doppia elica. Il piano integra una vaschetta portaconfetti con coperchio rimovibile.",
];
const products = [];
for (let i = 0; i < folders.length; i++) {
  const folder = folders[i];
  const data = JSON.parse(
    await fs.readFile(
      path.join(collection, folder, "pezzi_e_montaggio.json"),
      "utf8"
    )
  );
  const slug = data.nome.toLowerCase();
  await sharp(path.join(collection, "Anteprima_collezione.png"))
    .extract({
      left: 22 + (i % 3) * 493,
      top: i < 3 ? 145 : 570,
      width: 465,
      height: 355,
    })
    .webp({ quality: 88 })
    .toFile(`public/products/${slug}.webp`);
  for (const state of ["montato", "aperto"])
    await fs.copyFile(
      path.join(collection, folder, `${folder}_${state}.glb`),
      `public/products/${slug}-${state}.glb`
    );
  products.push({
    slug,
    name: data.nome,
    description: descriptions[i],
    dimensions: data.ingombro_montato_mm,
    assembly: data.strategia,
    image: `/products/${slug}.webp`,
    model: `/products/${slug}-montato.glb`,
    openModel: `/products/${slug}-aperto.glb`,
  });
}
await fs.writeFile(
  "src/lib/products.json",
  JSON.stringify(products, null, 2) + "\n"
);
console.log(
  `Imported storefront components and ${products.length} catalog models.`
);
