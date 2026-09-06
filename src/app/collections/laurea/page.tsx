import Catalog from "@/components/catalog";
import Schema from "@/components/schema";
import products from "@/lib/products.json";
import { metadata as meta, absolute } from "@/lib/seo";
export const metadata = meta(
  "Collezione Laurea — Sei portaconfetti 3D",
  "Informatica, Economia, Medicina, Giurisprudenza, Ingegneria e Biologia: esplora sei modelli di bomboniere portaconfetti in stampa 3D.",
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
          Sei percorsi.
          <br />
          Un traguardo.
        </h1>
        <p className="mt-7 text-lg leading-relaxed text-brand-dark/70">
          Dal codice alla biologia, ogni percorso ha il suo simbolo. Scopri la
          collezione Laurea: sei portaconfetti neri con dettagli rossi, pensati
          per raccontare la tua passione.
        </p>
        <p className="mt-4 text-sm text-brand-dark/70">
          Prototipi digitali a scopo illustrativo. Le viste mostrano i coperchi
          separati; le dimensioni si riferiscono ai modelli montati.
        </p>
      </header>
      <Catalog />
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
