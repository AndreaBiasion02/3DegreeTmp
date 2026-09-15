import { ArrowDown, ArrowUpRight } from "lucide-react";
import Image from "next/image";

import { t } from "@/lib/translations";
import LocalizedClientLink from "@/components/link";

const Hero = () => {
  return (
    <section className="border-b border-brand-primary/15 bg-brand-light">
      <div className="content-container py-4 small:py-7">
        <div className="grid min-w-0 overflow-hidden rounded-[1.5rem] border border-brand-primary/15 bg-brand-paper medium:min-h-[720px] medium:grid-cols-2 medium:rounded-[2.25rem]">
          <div className="flex min-w-0 flex-col px-5 py-8 2xsmall:px-6 xsmall:px-9 xsmall:py-10 small:px-14 small:py-14 medium:px-14 medium:py-12 large:px-16 large:py-14">
            <div className="reveal-up">
              <span className="brand-kicker">{t("Hero Eyebrow")}</span>
            </div>

            <div className="my-12 xsmall:my-16 medium:my-auto medium:py-10">
              <h1 className="brand-heading reveal-up reveal-up-delay-1 text-[clamp(2.5rem,12.5vw,3rem)] leading-[0.88] tracking-[-0.055em] xsmall:text-[4rem] small:text-[6.5rem] medium:text-[4.25rem] large:text-[5.15rem]">
                <span className="block">{t("Hero Title Lead")}</span>
                <span className="block">{t("Hero Title Subject")}</span>
                <span className="mt-1 block text-brand-secondary">
                  {t("Hero Title Line 2")}
                </span>
              </h1>
              <p className="reveal-up reveal-up-delay-2 mt-7 max-w-[34rem] text-base leading-7 text-brand-dark/70 xsmall:text-lg small:mt-9 medium:text-[1.05rem]">
                {t("Hero Description New")}
              </p>
              <div className="reveal-up reveal-up-delay-2 mt-8 flex min-w-0 flex-col gap-3 xsmall:flex-row medium:mt-9">
                <LocalizedClientLink
                  className="brand-button w-full xsmall:w-auto"
                  href="/collections/laurea/"
                >
                  {t("Create Yours")}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </LocalizedClientLink>
                <a
                  className="brand-button-secondary w-full xsmall:w-auto"
                  href="#how-it-works"
                >
                  {t("How It Works")}
                  <ArrowDown size={16} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-brand-primary/15 pt-5 text-center text-[8px] font-bold uppercase leading-3 tracking-[0.08em] text-brand-primary/60 2xsmall:text-[9px] xsmall:gap-4 xsmall:text-[10px] xsmall:tracking-[0.12em]">
              <span className="min-w-0">{t("Made in Italy")}</span>
              <span className="min-w-0">{t("Made to order")}</span>
              <span className="min-w-0">{t("3D printed")}</span>
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden border-t border-brand-primary/15 medium:aspect-auto medium:min-h-full medium:border-l medium:border-t-0">
            <Image
              src="/hero-homepage-ultrarealistica-v3.webp"
              alt={t("Hero Image Alt")}
              fill
              className="object-cover object-center transition-transform duration-1000 ease-out hover:scale-[1.015]"
              priority
              sizes="(max-width: 1023px) 100vw, 55vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
