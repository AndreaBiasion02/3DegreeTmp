import { notFound } from "next/navigation";
import { products } from "@/lib/catalog";
import collections from "@/lib/collections.json";
import CapExplorer from "@/components/cap-explorer";
import ResponsiveImage from "@/components/responsive-image";
import { metadata as meta, absolute } from "@/lib/seo";
import Schema from "@/components/schema";
import Viewer from "@/components/viewer";
import Catalog from "@/components/catalog";
export const dynamicParams = false;
export function generateStaticParams() {
  return products.map((p) => ({ handle: p.slug }));
}
type Props = { params: Promise<{ handle: string }> };
export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  const p = products.find((p) => p.slug === handle);
  if (!p) return {};
  return meta(
    `${p.kind === "coaster" ? "Sottobicchiere" : "Bomboniera laurea"} ${p.name} in 3D`,
    p.description,
    `/products/${p.slug}/`,
    p.image
  );
}
export default async function Product({ params }: Props) {
  const { handle } = await params;
  const p = products.find((p) => p.slug === handle);
  if (!p) notFound();
  const collection = collections.find(c => c.slug === p.collection)!;
  const dimensions = p.dimensions
    .map((n) => n.toLocaleString("it-IT"))
    .join(" × ");
  return (
    <div className="content-container py-8 small:py-14">
      <nav aria-label="Percorso" className="mb-8 flex flex-wrap gap-2 text-sm">
        <a href="/" className="underline">
          Home
        </a>
        <span>/</span>
        <a href={`/collections/${collection.slug}/`} className="underline">
          {collection.name}
        </a>
        <span>/</span>
        <span>{p.name}</span>
      </nav>
      <div className="grid items-start gap-10 small:grid-cols-[1.2fr_1fr] small:gap-16">
        {p.kind === "cap" ? (
          <ResponsiveImage
            src={p.image}
            alt={`${p.name}, configurazione iniziale`}
            width={930}
            height={710}
            priority
            className="w-full rounded-[1.75rem]"
          />
        ) : (
          <Viewer product={p} />
        )}
        <article>
          <span className="brand-kicker">
            {collection.name}
          </span>
          <h1 className="brand-heading mt-5 break-words text-[clamp(2.25rem,7vw,4rem)]">
            {p.name}
          </h1>
          <p className="mt-7 text-lg leading-relaxed text-brand-dark/75">
            {p.description}
          </p>
          <dl className="mt-8 divide-y divide-brand-primary/15 border-y border-brand-primary/15">
            <div className="py-5">
              <dt className="text-sm font-bold uppercase tracking-wider">
                {p.kind === "coaster" ? "Dimensioni del sottobicchiere" : "Dimensioni del modello montato"}
              </dt>
              <dd className="mt-2">{p.kind === "coaster" ? "Ø 100 mm · spessore 4 mm" : `${dimensions} mm`}</dd>
            </div>
            <div className="py-5">
              <dt className="text-sm font-bold uppercase tracking-wider">
                Colori del prototipo
              </dt>
              <dd className="mt-2">
                {p.kind === "cap"
                  ? "Colori, testi e logo modificabili nel configuratore."
                  : `Struttura e dettagli modificabili nella vista 3D${
                      p.slug === "economia" ? "; chip giallo" : ""
                    }.`}
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-sm font-bold uppercase tracking-wider">
                Struttura
              </dt>
              <dd className="mt-2 leading-relaxed">{p.assembly}</dd>
            </div>
            <div className="py-5">
              <dt className="text-sm font-bold uppercase tracking-wider">
                Tecnica prevista
              </dt>
              <dd className="mt-2">
                {p.kind === "coaster" ? "Stampa 3D multicolore, superficie piana" : p.kind === "faculty-cap" ? "Stampa 3D multicolore, simbolo a filo della superficie" : "Stampa 3D, componenti separati da assemblare"}
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-sm leading-relaxed text-brand-dark/70">
            Prototipo digitale a scopo illustrativo. Le immagini non sono
            fotografie di un prodotto finito. Colori e finiture possono variare
            nella realizzazione fisica.
          </p>
          <a
            href={`/collections/${collection.slug}/`}
            className="brand-button-secondary mt-7"
          >
            Scopri la collezione ↗
          </a>
        </article>
      </div>
      {p.kind === "cap" && p.preset && (
        <CapExplorer image={p.image} name={p.name} preset={p.preset} />
      )}
      <section className="border-t border-brand-primary/15 mt-20 pt-14 pb-10">
        <h2 className="brand-heading mb-10 text-4xl xsmall:text-5xl">
          Altri percorsi, altre storie.
        </h2>
        <Catalog exclude={p.slug} collection={p.kind === "cap" ? undefined : p.collection} limit={6} />
      </section>
      <Schema
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: `${p.kind === "coaster" ? "Sottobicchiere" : "Portaconfetti laurea"} ${p.name}`,
          description: p.description,
          image: absolute(p.image),
          url: absolute(`/products/${p.slug}/`),
          category: p.kind === "coaster" ? "Sottobicchieri di laurea" : "Bomboniere di laurea",
          brand: { "@type": "Brand", name: "3Degree" },
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "Dimensioni modello montato",
              value: dimensions,
              unitText: "mm",
            },
            {
              "@type": "PropertyValue",
              name: "Stato",
              value: "Prototipo digitale illustrativo",
            },
          ],
        }}
      />
      <Schema
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            ["Home", "/"],
            [collection.name, `/collections/${collection.slug}/`],
            [p.name, `/products/${p.slug}/`],
          ].map(([name, url], i) => ({
            "@type": "ListItem",
            position: i + 1,
            name,
            item: absolute(url),
          })),
        }}
      />
    </div>
  );
}
