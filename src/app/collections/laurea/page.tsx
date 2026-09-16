import CollectionCards from "@/components/collection-cards";
import { metadata as meta } from "@/lib/seo";

export const metadata = meta("Le collezioni di laurea", "Bomboniere originali, tocchi personalizzabili e sottobicchieri ironici: scegli la collezione 3Degree che racconta il tuo traguardo.", "/collections/laurea/");

export default function Collections() {
  return (
    <div className="content-container py-10 small:py-20">
      <nav aria-label="Percorso" className="mb-10 text-sm"><a href="/" className="underline">Home</a> / Collezioni</nav>
      <header className="mb-14 max-w-3xl">
        <span className="brand-kicker">Quattro collezioni, un traguardo</span>
        <h1 className="brand-heading mt-5 text-5xl xsmall:text-7xl">Il tuo modo<br />di ricordare</h1>
        <p className="mt-7 text-lg leading-relaxed text-brand-dark/70">Una forma originale, il simbolo della tua facoltà, una creazione tutta tua o una battuta per il brindisi. Scegli da dove partire.</p>
      </header>
      <CollectionCards />
    </div>
  );
}
