import Image from "next/image";
import products from "@/lib/products.json";
const links = [
  ["/", "Home"],
  ["/collections/laurea/", "Collezione"],
  ["/#how-it-works", "Come funziona"],
];
function Logo() {
  return (
    <a
      href="/"
      aria-label="3Degree — Home"
      className="flex items-center gap-2.5 text-2xl font-bold uppercase italic tracking-[-0.045em] text-brand-primary"
    >
      <Image
        src="/logo.png"
        width={36}
        height={36}
        alt=""
        className="h-9 w-9 object-contain"
      />
      3DEGREE
    </a>
  );
}
export function Nav() {
  return (
    <div className="sticky top-0 z-50">
      <div className="hidden bg-brand-primary px-5 py-2 text-center text-[10px] font-bold uppercase italic tracking-[0.12em] text-brand-light xsmall:block">
        Stampa 3D, personalità infinita — creata per il tuo traguardo
      </div>
      <header className="border-b border-brand-primary/15 bg-brand-light/95 backdrop-blur-xl">
        <nav
          aria-label="Navigazione principale"
          className="content-container flex h-16 items-center justify-between small:h-[72px]"
        >
          <Logo />
          <div className="hidden gap-10 small:flex">
            {links.map(([url, label]) => (
              <a
                key={url}
                href={url}
                className="text-sm font-bold uppercase tracking-[0.15em] hover:text-brand-secondary"
              >
                {label}
              </a>
            ))}
          </div>
          <span className="hidden text-xs uppercase tracking-[0.1em] text-brand-primary small:block">
            Vetrina dei modelli
          </span>
          <details className="group small:hidden">
            <summary className="cursor-pointer rounded-full border border-brand-primary/25 px-4 py-2 text-sm font-bold">
              Menu
            </summary>
            <div className="absolute inset-x-0 top-full border-b border-brand-primary/15 bg-brand-light px-5 py-6 shadow-lg">
              {links.map(([url, label]) => (
                <a
                  key={url}
                  href={url}
                  className="block py-3 text-lg font-bold uppercase"
                >
                  {label}
                </a>
              ))}
            </div>
          </details>
        </nav>
      </header>
    </div>
  );
}
export function Footer() {
  return (
    <footer className="bg-brand-primary text-brand-light">
      <div className="content-container py-14 small:py-20">
        <div className="grid gap-12 border-b border-white/15 pb-14 small:grid-cols-12">
          <div className="small:col-span-5">
            <a
              href="/"
              className="inline-flex items-center gap-3 text-2xl font-bold uppercase italic"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-light">
                <Image src="/logo.png" width={38} height={38} alt="" />
              </span>
              3DEGREE
            </a>
            <p className="mt-7 max-w-md leading-relaxed">
              Bomboniere di laurea personalizzate, progettate con cura e
              realizzate attraverso la stampa 3D.
            </p>
            <a
              href="/collections/laurea/"
              className="mt-8 inline-block border-b border-brand-gold pb-1 text-sm font-bold uppercase"
            >
              Esplora la collezione ↗
            </a>
          </div>
          <div className="small:col-span-4">
            <h2 className="text-sm font-bold uppercase italic tracking-widest">
              I percorsi
            </h2>
            <ul className="mt-6 grid grid-cols-2 gap-3">
              {products.map((p) => (
                <li key={p.slug}>
                  <a
                    className="hover:text-brand-gold"
                    href={`/products/${p.slug}/`}
                  >
                    {p.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="small:col-span-3">
            <h2 className="text-sm font-bold uppercase italic tracking-widest">
              Il progetto
            </h2>
            <p className="mt-6 leading-relaxed">
              Sei percorsi di laurea, sei modi di custodire un ricordo. Esplora
              forme e dettagli della collezione.
            </p>
            <p className="mt-4 text-sm">
              Vetrina illustrativa, senza vendita online.
            </p>
          </div>
        </div>
        <p className="pt-8 text-xs uppercase tracking-widest">
          © {new Date().getFullYear()} 3Degree. Tutti i diritti riservati.
        </p>
      </div>
    </footer>
  );
}
