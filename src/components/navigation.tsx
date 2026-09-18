import Image from "next/image";
import collections from "@/lib/collections.json";
import { t } from "@/lib/translations";
import { InstagramIcon, TikTokIcon, MailIcon, SOCIAL_LINKS } from "@/components/social-links";

const links = [
  ["/", "Home"],
  ["/collections/laurea/", "Collezioni"],
  ["/#how-it-works", "Come funziona"],
  ["/#contact", "Contatti"],
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
        {t("Announcement Bar")}
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
          <div className="hidden items-center gap-2.5 small:flex">
            <a
              href="https://www.instagram.com/3degree_lab/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram @3degree_lab"
              className="grid h-9 w-9 place-items-center rounded-full border border-brand-primary/20 text-brand-primary transition-all hover:scale-105 hover:border-brand-primary hover:bg-brand-primary hover:text-brand-light"
              title="Instagram @3degree_lab"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            <a
              href="https://www.tiktok.com/@3degreelab"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok @3degreelab"
              className="grid h-9 w-9 place-items-center rounded-full border border-brand-primary/20 text-brand-primary transition-all hover:scale-105 hover:border-brand-primary hover:bg-brand-primary hover:text-brand-light"
              title="TikTok @3degreelab"
            >
              <TikTokIcon className="h-4 w-4" />
            </a>
            <a
              href="mailto:info@3degreelab.com"
              aria-label="Email info@3degreelab.com"
              className="grid h-9 w-9 place-items-center rounded-full border border-brand-primary/20 text-brand-primary transition-all hover:scale-105 hover:border-brand-primary hover:bg-brand-primary hover:text-brand-light"
              title="Email info@3degreelab.com"
            >
              <MailIcon className="h-4 w-4" />
            </a>
          </div>
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
              <div className="mt-4 border-t border-brand-primary/15 pt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-dark/70">
                  Scrivici nei DM o via email per info
                </p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <a
                    href="https://www.instagram.com/3degree_lab/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-brand-primary/25 px-3 py-1.5 text-xs font-bold hover:bg-brand-primary hover:text-brand-light"
                  >
                    <InstagramIcon className="h-3.5 w-3.5" />
                    <span>@3degree_lab</span>
                  </a>
                  <a
                    href="https://www.tiktok.com/@3degreelab"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-brand-primary/25 px-3 py-1.5 text-xs font-bold hover:bg-brand-primary hover:text-brand-light"
                  >
                    <TikTokIcon className="h-3.5 w-3.5" />
                    <span>@3degreelab</span>
                  </a>
                </div>
                <a
                  href="mailto:info@3degreelab.com"
                  className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-brand-primary underline"
                >
                  <MailIcon className="h-3.5 w-3.5" />
                  info@3degreelab.com
                </a>
              </div>
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
          <div className="small:col-span-4">
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
              Bomboniere e sottobicchieri di laurea, progettati con cura e
              realizzati attraverso la stampa 3D.
            </p>
            <a
              href="/collections/laurea/"
              className="mt-8 inline-block border-b border-brand-gold pb-1 text-sm font-bold uppercase"
            >
              Esplora le collezioni ↗
            </a>
          </div>
          <div className="small:col-span-2">
            <h2 className="text-sm font-bold uppercase italic tracking-widest">
              Collezioni
            </h2>
            <ul className="mt-6 space-y-3">
              {collections.map((p) => (
                <li key={p.slug}>
                  <a
                    className="hover:text-brand-gold"
                    href={`/collections/${p.slug}/`}
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
              Forme originali, tocchi di facoltà, bomboniere personalizzabili e sottobicchieri ironici.
              Quattro modi di raccontare il tuo traguardo.
            </p>
            <p className="mt-4 text-sm text-brand-light/75">
              Vetrina illustrativa, senza vendita online diretta.
            </p>
          </div>
          <div className="small:col-span-3">
            <h2 className="text-sm font-bold uppercase italic tracking-widest">
              Social & Contatti
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-brand-light/85">
              Vuoi info, preventivi o personalizzazioni? Scrivici nei direct
              message o via email:
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              {SOCIAL_LINKS.map((s) => (
                <li key={s.name}>
                  <a
                    href={s.url}
                    target={s.url.startsWith("http") ? "_blank" : undefined}
                    rel={s.url.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="group inline-flex items-center gap-2.5 text-brand-light transition-colors hover:text-brand-gold"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 transition-colors group-hover:bg-brand-gold group-hover:text-brand-dark">
                      <s.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-semibold">{s.name}:</span>
                    <span className="text-brand-light/75 group-hover:text-brand-gold">
                      {s.handle}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4 pt-8 text-xs tracking-widest text-brand-light/75 small:flex-row small:items-center">
          <p className="uppercase">
            © {new Date().getFullYear()} 3Degree. Tutti i diritti riservati.
          </p>
          <p className="normal-case">
            Per informazioni o richieste:{" "}
            <a
              href="mailto:info@3degreelab.com"
              className="text-brand-light underline hover:text-brand-gold"
            >
              info@3degreelab.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
