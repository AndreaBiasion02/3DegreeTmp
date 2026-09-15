import Hero from "@/components/hero";
import {
  TrustStrip,
  ProcessSection,
  ValueSection,
  FaqAndCta,
  ContactSection,
} from "@/components/sections";
import Catalog from "@/components/catalog";
import CollectionCards from "@/components/collection-cards";
import { metadata as meta } from "@/lib/seo";
export const metadata = meta(
  "Il tuo traguardo, in 3D",
  "Scopri le bomboniere di laurea 3Degree: portaconfetti a tema, tocchi per facoltà e configuratore di colori, testi e logo. Catalogo illustrativo in 3D.",
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
                Le nostre collezioni
              </h2>
            </div>
            <a
              href="/collections/laurea/"
              className="shrink-0 border-b border-brand-primary pb-1 text-sm font-bold uppercase"
            >
              Scopri le collezioni ↗
            </a>
          </div>
          <CollectionCards />
          <h2 className="brand-heading mb-9 mt-16 text-4xl small:text-5xl">
            Il simbolo della tua facoltà
          </h2>
          <Catalog collection="tocchi-di-facolta" limit={3} />
          <a
            href="/collections/tocchi-di-facolta/"
            className="brand-button-secondary mt-9"
          >
            Tutti i tocchi di facoltà ↗
          </a>
        </div>
      </section>
      <ValueSection />
      <FaqAndCta />
      <ContactSection />
    </>
  );
}
