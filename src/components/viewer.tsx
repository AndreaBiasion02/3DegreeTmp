"use client";
import { useEffect, useRef, useState } from "react";
import ResponsiveImage from "./responsive-image";
import type { SceneControls } from "./viewer-scene";
import { filamentName } from "@/lib/filament-colors";
import {
  colorChoices,
  defaultColors,
  type ModelColors,
} from "@/lib/model-colors";
type Product = {
  name: string;
  image: string;
  model: string;
  openModel: string;
  kind?: string;
};
export default function Viewer({ product }: { product: Product }) {
  const [enabled, setEnabled] = useState(false);
  const [opened, setOpened] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [retry, setRetry] = useState(0);
  const [colors, setColors] = useState<ModelColors>(defaultColors);
  const colorsRef = useRef(colors);
  useEffect(() => {
    colorsRef.current = colors;
    scene.current?.setColors(colors);
  }, [colors]);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<SceneControls | null>(null);
  useEffect(() => {
    if (!enabled || !host.current) return;
    let cancelled = false;
    let instance: SceneControls | null = null;
    const abort = new AbortController();
    setStatus("loading");
    import("./viewer-scene")
      .then(({ createScene }) => {
        if (cancelled || !host.current) return null;
        return createScene(
          host.current,
          opened ? product.openModel : product.model,
          abort.signal
        );
      })
      .then((value) => {
        if (!value) return;
        if (cancelled) {
          value.dispose();
          return;
        }
        instance = value;
        scene.current = value;
        value.setColors(colorsRef.current);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      abort.abort();
      instance?.dispose();
      scene.current = null;
    };
  }, [enabled, opened, product.model, product.openModel, retry]);
  return (
    <figure className="min-w-0">
      <div className="relative aspect-[465/355] overflow-hidden rounded-[1.75rem] border border-brand-primary/15 bg-[#f0efed]">
        {(!enabled || status !== "ready") && (
          <ResponsiveImage
            src={product.image}
            alt={product.kind === "faculty-cap" ? `${product.name}, simbolo a filo del coperchio` : `Prototipo digitale del portaconfetti ${product.name}, con coperchio separato`}
            width={930}
            height={710}
            priority
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
        {enabled && (
          <div
            ref={host}
            className="absolute inset-0"
            style={{ visibility: status === "ready" ? "visible" : "hidden" }}
          />
        )}
        {!enabled && (
          <div className="absolute inset-x-0 bottom-5 text-center">
            <button
              className="brand-button shadow-lg"
              onClick={() => setEnabled(true)}
            >
              Esplora in 3D ↗
            </button>
          </div>
        )}
        {enabled && status === "loading" && (
          <p
            role="status"
            className="absolute inset-x-4 bottom-4 rounded-full bg-brand-light px-4 py-3 text-center text-sm"
          >
            Caricamento del modello 3D…
          </p>
        )}
        {enabled && status === "error" && (
          <div
            role="alert"
            className="absolute inset-x-4 bottom-4 rounded-2xl bg-brand-light p-4 text-center text-sm"
          >
            <p>
              La vista 3D non è disponibile. Puoi continuare a consultare
              l’immagine e i dettagli.
            </p>
            <button
              className="mt-2 underline"
              onClick={() => setRetry((n) => n + 1)}
            >
              Riprova
            </button>
            <button
              className="ml-5 underline"
              onClick={() => setEnabled(false)}
            >
              Chiudi 3D
            </button>
          </div>
        )}
      </div>
      <fieldset className="mt-5 space-y-4 rounded-2xl border border-brand-primary/15 p-4">
        <legend className="px-2 font-bold">Prova i colori</legend>
        {(["structure", "accent"] as const).map((role) => (
          <div key={role}>
            <label className="flex items-center justify-between gap-3 text-sm font-bold">
              {role === "structure" ? "Struttura" : "Dettagli"}
              <span>{filamentName(colors[role])}</span>
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {colorChoices.map(([label, hex]) => (
                <button
                  key={hex}
                  type="button"
                  title={label}
                  aria-label={`${
                    role === "structure" ? "Struttura" : "Dettagli"
                  } ${label}`}
                  aria-pressed={colors[role] === hex}
                  onClick={() => {
                    setColors((c) => ({ ...c, [role]: hex }));
                    setEnabled(true);
                  }}
                  className="h-11 w-11 rounded-full border-2 border-brand-primary/30 aria-pressed:ring-2 aria-pressed:ring-brand-primary aria-pressed:ring-offset-2"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="text-sm underline"
          onClick={() => setColors(defaultColors)}
        >
          Ripristina i colori originali
        </button>
        <p className="text-sm text-brand-dark/70">
          I colori a schermo sono
          indicativi. La scelta resta applicata anche aprendo il modello.
        </p>
      </fieldset>
      {enabled && (
        <div
          className="mt-4 flex flex-wrap gap-2"
          aria-label="Controlli del modello 3D"
        >
          <button
            className="viewer-control"
            aria-pressed={!opened}
            onClick={() => setOpened(false)}
          >
            Chiuso
          </button>
          <button
            className="viewer-control"
            aria-pressed={opened}
            onClick={() => setOpened(true)}
          >
            Aperto
          </button>
          <button
            className="viewer-control"
            disabled={status !== "ready"}
            onClick={() => scene.current?.rotate(-1)}
            aria-label="Ruota a sinistra"
          >
            ↶
          </button>
          <button
            className="viewer-control"
            disabled={status !== "ready"}
            onClick={() => scene.current?.rotate(1)}
            aria-label="Ruota a destra"
          >
            ↷
          </button>
          <button
            className="viewer-control"
            disabled={status !== "ready"}
            onClick={() => scene.current?.zoom(0.8)}
            aria-label="Avvicina"
          >
            +
          </button>
          <button
            className="viewer-control"
            disabled={status !== "ready"}
            onClick={() => scene.current?.zoom(1.25)}
            aria-label="Allontana"
          >
            −
          </button>
          <button className="viewer-control" onClick={() => setEnabled(false)}>
            Torna all’immagine
          </button>
        </div>
      )}
      <figcaption className="mt-4 text-sm leading-relaxed text-brand-dark/70">
        {enabled
          ? "Trascina per ruotare, usa due dita per lo zoom oppure i pulsanti. Vista del prototipo digitale."
          : product.kind === "faculty-cap"
            ? "Attiva il 3D per ruotare il tocco e scoprirlo aperto o chiuso."
            : "Anteprima illustrativa con coperchio separato. Attiva il 3D per ruotare il modello e scoprirlo aperto o chiuso."}
      </figcaption>
      <noscript>
        <p className="mt-3 text-sm">
          La vista interattiva richiede JavaScript. Immagini e caratteristiche
          sono consultabili anche senza.
        </p>
      </noscript>
    </figure>
  );
}
