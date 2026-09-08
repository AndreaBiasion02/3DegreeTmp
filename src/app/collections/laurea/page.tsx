import Catalog from "@/components/catalog";
import Schema from "@/components/schema";
import products from "@/lib/products.json";
import { metadata as meta, absolute } from "@/lib/seo";
export const metadata = meta(
  "Collezione Laurea — Portaconfetti e tocchi personalizzabili",
  "Esplora 17 bomboniere di laurea: sei portaconfetti 3D, dieci tocchi per facoltà e un tocco personalizzabile. Prova colori, testi e logo senza acquisti.",
  "/collections/laurea/"
);
export default function Collection() {
  return (
    <div className="content-container py-10 small:py-20">
      <nav aria-label="Percorso" className="mb-10 text-sm">
        <a href="/" className="underline">
          Home
        </a>{" "}
        / Collezione Laurea
      </nav>
      <header className="mb-14 max-w-3xl">
        <span className="brand-kicker">Bomboniere di laurea in stampa 3D</span>
        <h1 className="brand-heading mt-5 text-5xl xsmall:text-7xl">
          Il tuo percorso.
          <br />
          Un traguardo.
        </h1>
        <p className="mt-7 text-lg leading-relaxed text-brand-dark/70">
          Dal codice alla biologia, ogni percorso ha il suo simbolo. Scopri la
          collezione Laurea: portaconfetti a tema e tocchi per facoltà, con
          colori e dettagli da esplorare e personalizzare.
        </p>
        <p className="mt-4 text-sm text-brand-dark/70">
          Modelli digitali a scopo illustrativo. Le dimensioni si riferiscono ai
          modelli montati.
        </p>
      </header>
      <nav
        aria-label="Tipi di bomboniera"
        className="mb-10 flex flex-wrap gap-3"
      >
        <a className="brand-button-secondary" href="#portaconfetti">
          Portaconfetti a tema
        </a>
        <a className="brand-button-secondary" href="#tocchi">
          Tocchi e configuratore
        </a>
      </nav>
      <section id="portaconfetti">
        <h2 className="brand-heading mb-8 text-4xl">
          Sei forme, tanti colori.
        </h2>
        <Catalog kind="sculpture" />
      </section>
      <section id="tocchi" className="mt-20">
        <h2 className="brand-heading mb-5 text-4xl">
          Il tocco della tua facoltà.
        </h2>
        <p className="mb-8 max-w-3xl leading-relaxed">
          Dieci combinazioni iniziali per facoltà e un tocco da personalizzare.
          Parti da un modello, cambia i colori e prova testi e logo nel
          configuratore.
        </p>
        <Catalog kind="cap" />
      </section>
      <Schema
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Collezione Laurea 3Degree",
          url: absolute("/collections/laurea/"),
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: products.length,
            itemListElement: products.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: p.name,
              url: absolute(`/products/${p.slug}/`),
            })),
          },
        }}
      />
    </div>
  );
}
