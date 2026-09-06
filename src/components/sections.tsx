import {
  ArrowUpRight,
  BadgeCheck,
  Box,
  Camera,
  ChevronDown,
  HeartHandshake,
  Link,
  PackageCheck,
  Palette,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { t } from "@/lib/translations";
import LocalizedClientLink from "@/components/link";
import ScrollReveal from "@/components/reveal";

export const TrustStrip = () => {
  const items = [
    [Palette, t("Customizable")],
    [Box, t("3D printed")],
    [HeartHandshake, t("Made with care")],
    [ShieldCheck, t("Secure checkout")],
  ] as const;

  return (
    <section
      aria-label={t("Why trust us")}
      className="border-b border-brand-primary/15 bg-brand-primary text-brand-light"
    >
      <div className="content-container">
        <div className="grid grid-cols-2 gap-px bg-white/15 small:grid-cols-4">
          {items.map(([Icon, label], index) => (
            <ScrollReveal
              className="flex min-w-0 items-center gap-2 bg-brand-primary px-2 py-6 xsmall:min-h-24 xsmall:gap-3 xsmall:px-5"
              delay={index * 60}
              key={label}
            >
              <Icon
                className="shrink-0 text-brand-gold"
                size={19}
                strokeWidth={1.7}
                aria-hidden="true"
              />
              <span className="min-w-0 break-words text-[9px] font-bold uppercase italic leading-tight tracking-[0.03em] 2xsmall:text-[10px] xsmall:text-[11px] xsmall:tracking-[0.06em]">
                {label}
              </span>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export const ProcessSection = () => {
  const steps = [
    {
      number: "01",
      Icon: Link,
      title: t("Process 1 Title"),
      description: t("Process 1 Text"),
    },
    {
      number: "02",
      Icon: Smartphone,
      title: t("Process 2 Title"),
      description: t("Process 2 Text"),
    },
    {
      number: "03",
      Icon: UsersRound,
      title: t("Process 3 Title"),
      description: t("Process 3 Text"),
    },
    {
      number: "04",
      Icon: Camera,
      title: t("Process 4 Title"),
      description: t("Process 4 Text"),
    },
  ];

  return (
    <section className="bg-brand-light py-20 small:py-32" id="how-it-works">
      <div className="content-container">
        <div className="grid gap-8 small:grid-cols-[0.72fr_1.28fr] small:gap-16">
          <ScrollReveal className="small:sticky small:top-32 small:self-start">
            <header>
              <span className="brand-kicker">{t("Simple process")}</span>
              <h2 className="brand-heading mt-5 text-5xl xsmall:text-6xl medium:text-7xl">
                {t("From idea to memory")}
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-brand-dark/65">
                {t("Process Intro")}
              </p>
              <LocalizedClientLink
                className="brand-button mt-8"
                href="/collections/laurea/"
              >
                {t("Start now")}
                <ArrowUpRight size={17} aria-hidden="true" />
              </LocalizedClientLink>
            </header>
          </ScrollReveal>

          <div className="space-y-6">
            <ScrollReveal>
              <div className="overflow-hidden rounded-[1.75rem] border border-brand-primary/15 bg-brand-dark shadow-[0_24px_60px_rgba(23,39,28,0.16)]">
                <video
                  className="block aspect-[16/9] w-full max-h-[680px] object-cover"
                  controls
                  controlsList="nodownload"
                  muted
                  playsInline
                  preload="none"
                  poster="/hero-image.webp"
                >
                  <source src="/nfc-memories.mp4" type="video/mp4" />
                  {t("Video unsupported")}
                </video>
                <p className="border-t border-white/15 px-5 py-4 text-xs font-bold uppercase tracking-[0.1em] text-brand-light/75 xsmall:px-7">
                  {t("Video caption")}
                </p>
              </div>
            </ScrollReveal>

            <ol className="space-y-4">
              {steps.map(({ number, Icon, title, description }, index) => (
                <li key={number}>
                  <ScrollReveal delay={index * 60}>
                    <article className="brand-card group grid min-h-48 grid-cols-[auto_1fr] gap-5 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary/35 hover:shadow-[0_24px_60px_rgba(52,86,62,0.1)] xsmall:p-8">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-sm font-bold italic text-brand-gold">
                          {number}
                        </span>
                        <Icon
                          className="text-brand-primary/65"
                          size={19}
                          strokeWidth={1.7}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="flex flex-col justify-between gap-8">
                        <h3 className="text-3xl font-bold uppercase italic tracking-[-0.04em] text-brand-primary xsmall:text-4xl">
                          {title}
                        </h3>
                        <p className="max-w-lg leading-relaxed text-brand-dark/65">
                          {description}
                        </p>
                      </div>
                    </article>
                  </ScrollReveal>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
};

export const ValueSection = () => {
  const values = [
    [Sparkles, t("Value 1 Title"), t("Value 1 Text")],
    [BadgeCheck, t("Value 2 Title"), t("Value 2 Text")],
    [PackageCheck, t("Value 3 Title"), t("Value 3 Text")],
  ] as const;

  return (
    <section className="overflow-hidden bg-brand-primary py-20 text-brand-light small:py-32">
      <div className="content-container">
        <div className="flex flex-col justify-between gap-7 small:flex-row small:items-end">
          <ScrollReveal>
            <div>
              <span className="text-[11px] font-bold uppercase italic tracking-[0.16em] text-brand-light">
                {t("Why 3Degree")}
              </span>
              <h2 className="mt-5 max-w-4xl text-5xl font-bold uppercase italic leading-[0.9] tracking-[-0.05em] xsmall:text-6xl medium:text-8xl">
                {t("Not a favor")}
              </h2>
            </div>
          </ScrollReveal>
          <p className="max-w-md text-base leading-relaxed text-brand-light small:pb-2">
            {t("Value Intro")}
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-[1.8rem] bg-white/15 small:mt-20 small:grid-cols-3">
          {values.map(([Icon, title, text], index) => (
            <ScrollReveal
              className="bg-brand-primary"
              delay={index * 70}
              key={title}
            >
              <article className="group min-h-72 bg-brand-primary p-7 transition-colors hover:bg-brand-dark xsmall:p-9">
                <div className="flex items-center justify-between">
                  <Icon
                    className="text-brand-gold"
                    size={26}
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-bold text-white/40">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-16 text-3xl font-bold uppercase italic tracking-[-0.04em]">
                  {title}
                </h3>
                <p className="mt-4 leading-relaxed text-brand-light">{text}</p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export const FaqAndCta = () => {
  const faqs = [
    [t("FAQ 1 Question"), t("FAQ 1 Answer")],
    [t("FAQ 2 Question"), t("FAQ 2 Answer")],
    [t("FAQ 3 Question"), t("FAQ 3 Answer")],
  ];

  return (
    <>
      <section className="bg-brand-light py-20 small:py-32">
        <div className="content-container grid gap-10 small:grid-cols-[0.8fr_1.2fr] small:gap-20">
          <ScrollReveal>
            <div>
              <span className="brand-kicker">FAQ</span>
              <h2 className="brand-heading mt-5 text-5xl xsmall:text-6xl">
                {t("Clear before creating")}
              </h2>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <div className="divide-y divide-brand-primary/20 border-y border-brand-primary/20">
              {faqs.map(([question, answer]) => (
                <details className="group py-1" key={question}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-6 text-lg font-bold uppercase italic tracking-[-0.02em] text-brand-primary [&::-webkit-details-marker]:hidden">
                    {question}
                    <ChevronDown
                      className="shrink-0 transition-transform group-open:rotate-180"
                      size={20}
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="max-w-2xl pb-7 leading-relaxed text-brand-dark/65">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-brand-light px-5 pb-5 small:px-8 small:pb-8">
        <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[1.8rem] bg-brand-gold px-6 py-14 xsmall:px-9 small:rounded-[2.5rem] small:px-16 small:py-24">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border-[56px] border-brand-light/18" />
          <ScrollReveal className="relative grid gap-9 small:grid-cols-[1fr_auto] small:items-end">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase italic tracking-[0.16em] text-brand-primary/70">
                {t("Your milestone")}
              </span>
              <h2 className="mt-5 max-w-full break-words text-[clamp(2.25rem,10vw,3.75rem)] font-bold uppercase italic leading-[0.9] tracking-[-0.06em] text-brand-primary medium:max-w-4xl medium:text-8xl">
                {t("Make it yours")}
              </h2>
            </div>
            <LocalizedClientLink
              className="brand-button w-full bg-brand-primary px-4 text-center text-xs xsmall:w-auto xsmall:px-6 xsmall:text-sm"
              href="/collections/laurea/"
            >
              {t("Explore collection")}
              <ArrowUpRight size={18} aria-hidden="true" />
            </LocalizedClientLink>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
};
