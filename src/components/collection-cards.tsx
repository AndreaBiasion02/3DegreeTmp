import collections from "@/lib/collections.json";
import { products } from "@/lib/catalog";
import ResponsiveImage from "./responsive-image";

export default function CollectionCards() {
  return (
    <div className="grid gap-8 small:grid-cols-2">
      {collections.map((collection) => (
        <a key={collection.slug} href={`/collections/${collection.slug}/`} className="group flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-brand-primary/15 bg-brand-paper">
          <ResponsiveImage src={collection.image} alt={collection.name} width={465} height={355} className="w-full transition-transform duration-500 group-hover:scale-[1.03]" />
          <div className="flex flex-1 flex-col p-6 xsmall:p-8">
            <span className="brand-kicker">{products.filter(p => p.collection === collection.slug).length} {collection.slug === "personalizzabili" ? "modello da creare" : "modelli"}</span>
            <h2 className="brand-heading mt-4 text-3xl">{collection.name}</h2>
            <p className="my-5 leading-relaxed text-brand-dark/70">{collection.description}</p>
            <span className="mt-auto text-sm font-bold uppercase">Esplora la collezione ↗</span>
          </div>
        </a>
      ))}
    </div>
  );
}
