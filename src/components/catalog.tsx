import ResponsiveImage from "./responsive-image";
import { products } from "@/lib/catalog";
export default function Catalog({
  exclude,
  kind,
  limit,
  collection,
}: {
  exclude?: string;
  kind?: "cap" | "sculpture";
  limit?: number;
  collection?: string;
}) {
  return (
    <ul className="grid gap-x-7 gap-y-12 xsmall:grid-cols-2 small:grid-cols-3">
      {products
        .filter((p) => p.slug !== exclude)
        .filter((p) => !collection || p.collection === collection)
        .filter(
          (p) => !kind || (kind === "cap" ? p.kind === "cap" : !p.kind)
        )
        .slice(0, limit)
        .map((p) => (
          <li key={p.slug} className="min-w-0">
            <a className="group block" href={`/products/${p.slug}/`}>
              <div className="overflow-hidden rounded-[1.75rem] border border-brand-primary/15 bg-[#f0efed]">
                <ResponsiveImage
                  src={p.image}
                  alt={
                    p.kind === "coaster" ? `Sottobicchiere di laurea: ${p.name}` : p.kind === "faculty-cap"
                      ? `${p.name}: ${p.symbol} a filo del coperchio`
                      : p.kind === "cap"
                      ? `${p.name}: anteprima del tocco nei colori iniziali`
                      : `Portaconfetti laurea ${p.name}: vista del prototipo con coperchio separato`
                  }
                  width={930}
                  height={710}
                  className="w-full transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="mt-5 flex items-center justify-between gap-4">
                <h3 className="text-2xl font-bold uppercase italic tracking-[-0.04em] text-brand-primary">
                  {p.name}
                </h3>
                <span aria-hidden="true">↗</span>
              </div>
              <p className="mt-2 leading-relaxed text-brand-dark/70">
                {p.description}
              </p>
              <span className="mt-4 inline-block border-b border-brand-primary/30 pb-1 text-sm font-bold uppercase tracking-wider">
                {p.kind === "cap"
                  ? "Prova il configuratore"
                  : "Esplora e cambia colore"}
              </span>
            </a>
          </li>
        ))}
    </ul>
  );
}
