import { notFound } from "next/navigation";
import collections from "@/lib/collections.json";
import { products } from "@/lib/catalog";
import Catalog from "@/components/catalog";
import CoasterStudio from "@/components/coaster-art-studio";
import CapStudio from "@/components/cap-art-studio";
import Schema from "@/components/schema";
import { metadata as meta, absolute } from "@/lib/seo";

export const dynamicParams = false;

function resolveHandle(handle: string) {
  if (handle === "tocchi-di-facolta" || handle === "personalizzabili") return "tocchi-laurea";
  return handle;
}

export function generateStaticParams() {
  return [
    ...collections.map(c => ({ handle: c.slug })),
    { handle: "tocchi-di-facolta" },
    { handle: "personalizzabili" },
  ];
}

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props) {
  const { handle: rawHandle } = await params;
  const handle = resolveHandle(rawHandle);
  const collection = collections.find(c => c.slug === handle);
  if (!collection) return {};
  return meta(collection.name, collection.description, `/collections/${handle}/`, collection.image);
}

export default async function Collection({ params }: Props) {
  const { handle: rawHandle } = await params;
  const handle = resolveHandle(rawHandle);
  const collection = collections.find(c => c.slug === handle);
  if (!collection) notFound();
  const items = products.filter(p => p.collection === handle);

  return (
    <div className="content-container py-10 small:py-20">
      <nav aria-label="Percorso" className="mb-10 flex flex-wrap gap-2 text-sm"><a href="/" className="underline">Home</a><span>/</span><a href="/collections/laurea/" className="underline">Collezioni</a><span>/</span><span>{collection.name}</span></nav>
      <header className="mb-12 max-w-3xl">
        <span className="brand-kicker">Collezione 3Degree</span>
        <h1 className="brand-heading mt-5 text-3xl xsmall:text-5xl small:text-7xl">{collection.name}</h1>
        <p className="mt-7 text-lg leading-relaxed text-brand-dark/70">{collection.description}</p>
      </header>
      <nav aria-label="Scegli collezione" className="mb-12 flex flex-wrap gap-3">
        {collections.map(c => <a key={c.slug} href={`/collections/${c.slug}/`} aria-current={c.slug === handle ? "page" : undefined} className={c.slug === handle ? "brand-button" : "brand-button-secondary"}>{c.name}</a>)}
      </nav>
      {handle === "tocchi-laurea" && <CapStudio />}
      {handle === "sottobicchieri-laurea" && <CoasterStudio />}
      <Catalog collection={handle} />
      <Schema data={{"@context":"https://schema.org","@type":"CollectionPage",name:collection.name,url:absolute(`/collections/${handle}/`),mainEntity:{"@type":"ItemList",numberOfItems:items.length,itemListElement:items.map((p,i)=>({"@type":"ListItem",position:i+1,name:p.name,url:absolute(`/products/${p.slug}/`)}))}}} />
    </div>
  );
}
