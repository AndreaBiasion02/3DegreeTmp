import { notFound } from "next/navigation";
import collections from "@/lib/collections.json";
import { products } from "@/lib/catalog";
import Catalog from "@/components/catalog";
import Schema from "@/components/schema";
import { metadata as meta, absolute } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() { return collections.map(c => ({ handle: c.slug })); }
type Props = { params: Promise<{ handle: string }> };
export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  const collection = collections.find(c => c.slug === handle);
  if (!collection) return {};
  return meta(collection.name, collection.description, `/collections/${handle}/`, collection.image);
}
export default async function Collection({ params }: Props) {
  const { handle } = await params;
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
        {handle === "personalizzabili" && <a className="brand-button mt-7" href="/products/tocco-laurea/">Crea la tua bomboniera ↗</a>}
      </header>
      <nav aria-label="Scegli collezione" className="mb-12 flex flex-wrap gap-3">
        {collections.map(c => <a key={c.slug} href={`/collections/${c.slug}/`} aria-current={c.slug === handle ? "page" : undefined} className={c.slug === handle ? "brand-button" : "brand-button-secondary"}>{c.name}</a>)}
      </nav>
      <Catalog collection={handle} />
      <Schema data={{"@context":"https://schema.org","@type":"CollectionPage",name:collection.name,url:absolute(`/collections/${handle}/`),mainEntity:{"@type":"ItemList",numberOfItems:items.length,itemListElement:items.map((p,i)=>({"@type":"ListItem",position:i+1,name:p.name,url:absolute(`/products/${p.slug}/`)}))}}} />
    </div>
  );
}
