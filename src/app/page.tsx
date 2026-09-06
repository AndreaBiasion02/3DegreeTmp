import Hero from "@/components/hero";
import {
  TrustStrip,
  ProcessSection,
  ValueSection,
  FaqAndCta,
} from "@/components/sections";
import Catalog from "@/components/catalog";
import { metadata as meta } from "@/lib/seo";
export const metadata = meta(
  "Il tuo traguardo, in 3D",
  "Scopri le bomboniere di laurea 3Degree: sei portaconfetti in stampa 3D ispirati al tuo percorso, con immagini, dettagli e anteprime interattive.",
  "/"
);
export default function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <ProcessSection />
      <section className="bg-brand-paper py-16 small:py-24">
        <div className="content-container">
          <div className="mb-12 flex flex-col justify-between gap-5 xsmall:flex-row xsmall:items-end">
            <div>
              <span className="brand-kicker">In evidenza</span>
              <h2 className="brand-heading mt-4 text-5xl xsmall:text-6xl small:text-7xl">
                Collezione Laurea
              </h2>
            </div>
            <a
              href="/collections/laurea/"
              className="shrink-0 border-b border-brand-primary pb-1 text-sm font-bold uppercase"
            >
              Scopri la collezione ↗
            </a>
          </div>
          <Catalog />
        </div>
      </section>
      <ValueSection />
      <FaqAndCta />
    </>
  );
}
