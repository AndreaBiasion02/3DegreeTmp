"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import Image from "next/image";
import type { CapPreset } from "@/lib/catalog";
const Configurator = dynamic(() => import("./cap-configurator"), {
  ssr: false,
  loading: () => (
    <p role="status" className="py-10">
      Caricamento del configuratore…
    </p>
  ),
});
const ignore = () => {};
export default function CapExplorer({
  image,
  name,
  preset,
}: {
  image: string;
  name: string;
  preset: CapPreset;
}) {
  const [active, setActive] = useState(false);
  return (
    <section className="mt-10" aria-label="Configuratore illustrativo">
      {active ? (
        <Configurator
          initialPreset={preset}
          cadSourcePath="/models/tocco-meshes.json"
          modelVersion="tocco-laurea-v1"
          onPayloadChange={ignore}
          onTransientAssetsChange={ignore}
        />
      ) : (
        <div className="grid items-center gap-8 rounded-[1.75rem] border border-brand-primary/15 bg-brand-paper p-5 small:grid-cols-2 small:p-9">
          <Image
            src={image}
            alt={`Anteprima 3D ${name}`}
            width={465}
            height={355}
            priority
            className="w-full rounded-2xl"
          />
          <div>
            <h2 className="brand-heading text-4xl">Il tuo tocco personale.</h2>
            <p className="my-5 leading-relaxed">
              Esplora i colori di struttura, fascia e bordo. Aggiungi testi,
              scegli il font o prova un logo e guarda il risultato in 2D e in
              3D.
            </p>
            <button className="brand-button" onClick={() => setActive(true)}>
              Apri il configuratore ↗
            </button>
          </div>
        </div>
      )}
      <p className="mt-4 text-sm text-brand-dark/70">
        Simulazione illustrativa, senza acquisto. Testi e logo sono elaborati
        solo sul tuo dispositivo e non vengono inviati a un server. Ricaricando
        la pagina riparti dalla configurazione iniziale.
      </p>
    </section>
  );
}
