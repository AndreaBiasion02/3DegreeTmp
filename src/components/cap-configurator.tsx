"use client";

import { Canvas, useLoader } from "@react-three/fiber";
import { filamentColors, filamentName } from "@/lib/filament-colors";
import { OrbitControls, Text } from "@react-three/drei";
import { preloadFont } from "troika-three-text";
import {
  Box,
  Check,
  ImagePlus,
  Move,
  Palette,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";
import {
  type ChangeEvent,
  Component,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  NoColorSpace,
  TextureLoader,
  Vector3,
} from "three";
import type { OcctMesh } from "@/lib/configurator/mesh";
import {
  createCapSurfacePreview,
  createCapSurfaceTexture,
  createCapSurfaceVector,
  prepareLogoMask,
  type PreparedLogoMask,
  type VectorLogoPath,
} from "@/lib/configurator/assets";
import type {
  GraduationFavorPayload,
  GraduationFavorTransientAssets,
} from "@/lib/configurator/graduation-favor";

class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Canvas 3D rendering error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-brand-dark/70">
            Errore di caricamento 3D
          </div>
        )
      );
    }
    return this.props.children;
  }
}

type StepLoadState =
  | { status: "loading" }
  | { status: "ready"; meshCount: number }
  | { status: "error"; message: string };

type StepPart = {
  geometry: BufferGeometry;
  role: "structure" | "line" | "middle";
  isCap: boolean;
  isTopBand: boolean;
};

type StepModel = {
  parts: StepPart[];
  center: Vector3;
  scale: number;
};

type TextItem = {
  id: string;
  text: string;
  fontKey: string;
  color: string;
  scale: number;
  x: number;
  y: number;
};

type LogoItem = {
  id: string;
  sourceName: string;
  maskDataUrl: string;
  previewDataUrl: string;
  color: string;
  scale: number;
  x: number;
  y: number;
  aspectRatio: number;
  vectorHeight: number;
  vectorPaths: VectorLogoPath[];
  vectorWidth: number;
  vectorX: number;
  vectorY: number;
};

type ConfiguratorState = {
  structureColor: string;
  middleColor: string;
  lineColor: string;
  textItems: TextItem[];
  selectedTextItemId: string;
  logoItem: LogoItem | null;
};

type GraduationFavorConfiguratorProps = {
  initialPreset: {
    structureColor: string;
    middleColor: string;
    lineColor: string;
    text: string;
    fontKey: string;
    textColor: string;
  };
  cadSourcePath: string;
  modelVersion: string;
  onPayloadChange: (payload: GraduationFavorPayload) => void;
  onTransientAssetsChange: (assets: GraduationFavorTransientAssets) => void;
};

const linePresets = filamentColors;
const textScaleMin = 0.28;
const textScaleMax = 2.46;
const textPositionLimit = 0.78;
const capSurfaceSize = 3.2;
const capSizeMm = 65;
const bandOuterSizeMm = 57;
const bandThicknessMm = 2;
const printableSurfaceSizeMm = 50;
const printableSurfaceSize =
  capSurfaceSize * (printableSurfaceSizeMm / capSizeMm);
const bandOuterSize = capSurfaceSize * (bandOuterSizeMm / capSizeMm);
const bandThickness = capSurfaceSize * (bandThicknessMm / capSizeMm);
const millimetersPerSurfaceUnit = capSizeMm / capSurfaceSize;
const logoScaleMin = 0.3;
const logoScaleMax = 2.46;
const textMaxItems = 5;
const textMaxCharacters = 18;
const topSurfaceY = 0.955;
const defaultFontKey = "great-vibes";

const fontOptions = [
  {
    key: "great-vibes",
    label: "Great Vibes",
    family: "Great Vibes",
    src: "/fonts/great-vibes-400.woff",
  },
  {
    key: "dancing-script",
    label: "Dancing Script",
    family: "Dancing Script",
    src: "/fonts/dancing-script-700.woff",
  },
  {
    key: "italianno",
    label: "Italianno",
    family: "Italianno",
    src: "/fonts/italianno-400.woff",
  },
  {
    key: "pacifico",
    label: "Pacifico",
    family: "Pacifico",
    src: "/fonts/pacifico-400.woff",
  },
] as const;

function createTextItem(index: number): TextItem {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `text-${Date.now()}-${index}`;

  return {
    id,
    text: "",
    fontKey: defaultFontKey,
    color: "#ffffff",
    scale: 0.38,
    x: 0,
    y: 0,
  };
}

function createInitialState(
  preset: GraduationFavorConfiguratorProps["initialPreset"]
): ConfiguratorState {
  const firstText = {
    ...createTextItem(1),
    text: preset.text,
    fontKey: preset.fontKey,
    color: preset.textColor,
  };

  return {
    structureColor: preset.structureColor,
    middleColor: preset.middleColor,
    lineColor: preset.lineColor,
    textItems: [firstText],
    selectedTextItemId: firstText.id,
    logoItem: null,
  };
}

function createLogoItem(logo: PreparedLogoMask): LogoItem {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `logo-${Date.now()}`;

  return {
    id,
    sourceName: logo.sourceName,
    maskDataUrl: logo.maskDataUrl,
    previewDataUrl: logo.previewDataUrl,
    color: "#ffffff",
    scale: 0.62,
    x: 0,
    y: 0,
    aspectRatio: logo.aspectRatio,
    vectorHeight: logo.vectorHeight,
    vectorPaths: logo.vectorPaths,
    vectorWidth: logo.vectorWidth,
    vectorX: logo.vectorX,
    vectorY: logo.vectorY,
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, textMaxCharacters);
}

function constrainTextItem(item: TextItem) {
  return {
    ...item,
    scale: clampNumber(item.scale, textScaleMin, textScaleMax),
    x: clampNumber(item.x, -printableSurfaceSize / 2, printableSurfaceSize / 2),
    y: clampNumber(item.y, -printableSurfaceSize / 2, printableSurfaceSize / 2),
  };
}

function constrainLogoItem(item: LogoItem) {
  const scale = clampNumber(item.scale, logoScaleMin, logoScaleMax);
  const maxX = Math.max(
    0,
    (printableSurfaceSize - scale * item.aspectRatio) / 2
  );
  const maxY = Math.max(0, (printableSurfaceSize - scale) / 2);

  return {
    ...item,
    scale,
    x: clampNumber(item.x, -maxX, maxX),
    y: clampNumber(item.y, -maxY, maxY),
  };
}

async function loadStepModel(cadSourcePath: string) {
  const response = await fetch(cadSourcePath);
  if (!response.ok) throw new Error("Modello non disponibile");
  const meshes: OcctMesh[] = await response.json();
  const parts = createStepParts(meshes);
  const bounds = new Box3();

  parts.forEach((part) => {
    part.geometry.computeBoundingBox();
    if (part.geometry.boundingBox) {
      bounds.union(part.geometry.boundingBox);
    }
  });

  const size = new Vector3();
  const center = new Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);

  const maxAxis = Math.max(size.x, size.y, size.z) || 1;

  return {
    model: {
      parts,
      center,
      scale: 3.2 / maxAxis,
    },
    meshCount: parts.length,
  };
}

export default function GraduationFavorConfigurator({
  initialPreset,
  cadSourcePath,
  modelVersion,
  onPayloadChange,
  onTransientAssetsChange,
}: GraduationFavorConfiguratorProps) {
  const [initialState, setInitialState] = useState<ConfiguratorState>(() =>
    createInitialState(initialPreset)
  );
  const [config, setConfig] = useState<ConfiguratorState>(initialState);
  const [stepModel, setStepModel] = useState<StepModel | null>(null);
  const [stepLoadState, setStepLoadState] = useState<StepLoadState>({
    status: "loading",
  });
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [capTextureAsset, setCapTextureAsset] = useState<{
    dataUrl: string;
    signature: string;
  } | null>(null);
  const [capVectorAsset, setCapVectorAsset] = useState<{
    dataUrl: string | null;
    signature: string;
  } | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [isLogoDragActive, setIsLogoDragActive] = useState(false);

  useEffect(() => {
    fontOptions.forEach((option) => {
      try {
        preloadFont({ font: option.src }, () => {});
      } catch {
        // ignore preload errors
      }
    });
  }, []);
  const surfaceSignature = useMemo(
    () =>
      JSON.stringify({
        lineColor: config.lineColor,
        textItems: config.textItems.map((item) => ({
          id: item.id,
          text: item.text,
          fontKey: item.fontKey,
          color: item.color,
          scale: item.scale,
          x: item.x,
          y: item.y,
        })),
        logoItem: config.logoItem
          ? {
              id: config.logoItem.id,
              color: config.logoItem.color,
              scale: config.logoItem.scale,
              x: config.logoItem.x,
              y: config.logoItem.y,
              aspectRatio: config.logoItem.aspectRatio,
            }
          : null,
      }),
    [config.lineColor, config.logoItem, config.textItems]
  );
  const capTextureDataUrl =
    capTextureAsset?.signature === surfaceSignature
      ? capTextureAsset.dataUrl
      : null;
  const capVectorDataUrl =
    capVectorAsset?.signature === surfaceSignature
      ? capVectorAsset.dataUrl
      : null;
  const selectedTextItem =
    config.textItems.find((item) => item.id === config.selectedTextItemId) ??
    config.textItems[0] ??
    null;

  function resetConfig() {
    const next = createInitialState(initialPreset);
    setInitialState(next);
    setConfig(next);
    setPreviewDataUrl(null);
    setLogoError(null);
  }

  function addTextItem() {
    setConfig((current) => {
      if (current.textItems.length >= textMaxItems) {
        return current;
      }

      const item = createTextItem(current.textItems.length + 1);

      return {
        ...current,
        textItems: [...current.textItems, item],
        selectedTextItemId: item.id,
      };
    });
  }

  function updateSelectedTextItem(update: Partial<TextItem>) {
    if (!selectedTextItem) {
      return;
    }

    setConfig((current) => ({
      ...current,
      textItems: current.textItems.map((item) =>
        item.id === selectedTextItem.id
          ? {
              ...item,
              ...update,
              text:
                update.text !== undefined
                  ? normalizeText(update.text)
                  : item.text,
              scale:
                update.scale !== undefined
                  ? clampNumber(update.scale, textScaleMin, textScaleMax)
                  : item.scale,
              x:
                update.x !== undefined
                  ? clampNumber(update.x, -textPositionLimit, textPositionLimit)
                  : item.x,
              y:
                update.y !== undefined
                  ? clampNumber(update.y, -textPositionLimit, textPositionLimit)
                  : item.y,
            }
          : item
      ),
    }));
  }

  function removeTextItem(id: string) {
    setConfig((current) => {
      const textItems = current.textItems.filter((item) => item.id !== id);
      const selectedTextItemId =
        current.selectedTextItemId === id
          ? textItems[0]?.id ?? ""
          : current.selectedTextItemId;

      return {
        ...current,
        textItems,
        selectedTextItemId,
      };
    });
  }

  function updateLogoItem(update: Partial<LogoItem>) {
    setConfig((current) => {
      if (!current.logoItem) {
        return current;
      }

      return {
        ...current,
        logoItem: constrainLogoItem({
          ...current.logoItem,
          ...update,
        }),
      };
    });
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    await processLogoFile(file);
  }

  async function processLogoFile(file: File) {
    setLogoError(null);

    try {
      const preparedLogo = await prepareLogoMask(file);
      setConfig((current) => ({
        ...current,
        logoItem: createLogoItem(preparedLogo),
      }));
    } catch (error) {
      setLogoError(
        error instanceof Error
          ? error.message
          : "Impossibile elaborare il logo caricato."
      );
    }
  }

  useEffect(() => {
    // A previous frame must never be saved for a newer customer configuration.
    setPreviewDataUrl(null);
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    let loadedModel: StepModel | null = null;

    async function run() {
      setStepLoadState({ status: "loading" });

      try {
        const { model, meshCount } = await loadStepModel(cadSourcePath);

        if (cancelled) {
          model.parts.forEach((part) => part.geometry.dispose());
          return;
        }

        loadedModel = model;
        setStepModel(model);
        setStepLoadState({ status: "ready", meshCount });
      } catch (error) {
        if (!cancelled) {
          setStepModel(null);
          setStepLoadState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Errore caricamento modello",
          });
        }
      }
    }

    run();

    return () => {
      cancelled = true;
      loadedModel?.parts.forEach((part) => part.geometry.dispose());
    };
  }, [cadSourcePath]);

  const productionPayload = useMemo<GraduationFavorPayload>(() => {
    const textItems = config.textItems.map((item) => {
      const font =
        fontOptions.find((option) => option.key === item.fontKey) ??
        fontOptions[0];

      return {
        id: item.id,
        text: item.text,
        fontKey: item.fontKey,
        fontFamily: font.family,
        fontAssetUrl: font.src,
        color: item.color,
        scale: item.scale,
        x: item.x,
        y: item.y,
      };
    });

    return {
      modelVersion,
      cadSourceUrl: cadSourcePath,
      cadSourceFormat: "step",
      structureColor: config.structureColor,
      lineColor: config.lineColor,
      surface: {
        mode: "composition",
        textItems,
        logoItems: config.logoItem
          ? [
              {
                id: config.logoItem.id,
                sourceName: config.logoItem.sourceName,
                color: config.logoItem.color,
                scale: config.logoItem.scale,
                x: config.logoItem.x,
                y: config.logoItem.y,
                aspectRatio: config.logoItem.aspectRatio,
              },
            ]
          : [],
        maxItems: textMaxItems,
        maxCharactersPerText: textMaxCharacters,
        reliefDepthMm: 0.8,
        surfacePlane: "upper_cap_top",
      },
    };
  }, [cadSourcePath, config, modelVersion]);

  useEffect(() => {
    onPayloadChange(productionPayload);
  }, [onPayloadChange, productionPayload]);

  useEffect(() => {
    let cancelled = false;

    const surfaceInput = {
      structureColor: config.structureColor,
      textItems: productionPayload.surface.textItems,
      logo: config.logoItem
        ? {
            previewDataUrl: config.logoItem.previewDataUrl,
            color: config.logoItem.color,
            scale: config.logoItem.scale,
            x: config.logoItem.x,
            y: config.logoItem.y,
            aspectRatio: config.logoItem.aspectRatio,
            vectorHeight: config.logoItem.vectorHeight,
            vectorPaths: config.logoItem.vectorPaths,
            vectorWidth: config.logoItem.vectorWidth,
            vectorX: config.logoItem.vectorX,
            vectorY: config.logoItem.vectorY,
          }
        : null,
    };

    Promise.all([
      createCapSurfaceTexture(surfaceInput),
      createCapSurfaceVector(surfaceInput),
    ])
      .then(async ([dataUrl, vectorDataUrl]) => ({
        dataUrl,
        previewDataUrl: await createCapSurfacePreview(
          dataUrl,
          config.lineColor
        ),
        vectorDataUrl,
      }))
      .then(
        ({ dataUrl, previewDataUrl: nextPreviewDataUrl, vectorDataUrl }) => {
          if (!cancelled) {
            setCapTextureAsset({ dataUrl, signature: surfaceSignature });
            setCapVectorAsset({
              dataUrl: vectorDataUrl,
              signature: surfaceSignature,
            });
            setPreviewDataUrl(nextPreviewDataUrl);
          }
        }
      )
      .catch(() => {
        if (!cancelled) {
          setCapTextureAsset((current) =>
            current?.signature === surfaceSignature ? null : current
          );
          setCapVectorAsset((current) =>
            current?.signature === surfaceSignature ? null : current
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    config.lineColor,
    config.logoItem,
    productionPayload.surface.textItems,
    surfaceSignature,
  ]);

  useEffect(() => {
    onTransientAssetsChange({
      previewDataUrl,
      logoMaskDataUrl: config.logoItem?.maskDataUrl ?? null,
      capTextureDataUrl,
      capVectorDataUrl,
    });
  }, [
    capTextureDataUrl,
    capVectorDataUrl,
    config.logoItem?.maskDataUrl,
    onTransientAssetsChange,
    previewDataUrl,
  ]);

  return (
    <section className="brand-card overflow-hidden shadow-[0_24px_70px_rgba(23,39,28,0.1)]">
      <div className="overflow-hidden">
        <div className="relative flex items-start justify-between gap-5 overflow-hidden bg-brand-primary px-5 py-6 text-brand-light xsmall:px-7 small:px-9 small:py-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[38px] border-white/[0.04]" />
          <div className="pointer-events-none absolute bottom-0 right-28 h-20 w-20 rounded-full bg-brand-gold/10 blur-2xl" />
          <div>
            <p className="mb-2 text-[11px] font-bold italic uppercase tracking-[0.16em] text-brand-gold">
              01 · Configura
            </p>
            <h2 className="text-2xl font-bold uppercase italic leading-none tracking-[-0.035em] xsmall:text-3xl">
              Crea la tua bomboniera
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-light/70">
              Struttura nera, bande e restringimento personalizzabili, con testo
              o logo sul tocco.
            </p>
            <p className="sr-only" data-testid="step-load-status">
              {stepLoadState.status === "ready"
                ? `STEP importato: ${stepLoadState.meshCount} mesh`
                : stepLoadState.status === "error"
                ? `Errore STEP: ${stepLoadState.message}`
                : "Caricamento anteprima"}
            </p>
          </div>
          <button
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-brand-light transition-all hover:-rotate-12 hover:border-white/40 hover:bg-white/20"
            onClick={resetConfig}
            title="Ripristina"
            type="button"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Ripristina configurazione</span>
          </button>
        </div>

        <div className="border-b border-brand-primary/15 bg-white/80 px-4 py-4 xsmall:px-6 small:px-8 small:py-5">
          <div className="flex flex-col gap-4 small:flex-row small:items-end">
            <label className="min-w-0 flex-1 text-small-regular">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-brand-primary">
                Scrivi sul tocco
              </span>
              <input
                className="h-12 w-full rounded-xl border border-brand-primary/20 bg-brand-light px-4 text-sm text-brand-dark outline-none transition placeholder:text-brand-dark/35 hover:border-brand-primary/35 focus:border-brand-primary focus:bg-white focus:ring-4 focus:ring-brand-primary/10"
                maxLength={textMaxCharacters}
                placeholder="Es. Andrea · 18 luglio 2026"
                value={selectedTextItem?.text ?? ""}
                onChange={(event) =>
                  updateSelectedTextItem({ text: event.target.value })
                }
              />
            </label>
            <div
              className="grid h-12 w-full grid-cols-2 rounded-full border border-brand-primary/15 bg-brand-paper p-1 small:w-auto"
              aria-label="Tipo di vista"
            >
              <button
                className={`inline-flex items-center justify-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-[0.05em] transition-all ${
                  viewMode === "2d"
                    ? "bg-brand-primary text-brand-light shadow-[0_5px_14px_rgba(52,86,62,0.2)]"
                    : "text-brand-primary/65 hover:text-brand-primary"
                }`}
                onClick={() => setViewMode("2d")}
                type="button"
              >
                <Square className="h-4 w-4" aria-hidden="true" /> Modifica 2D
              </button>
              <button
                className={`inline-flex items-center justify-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-[0.05em] transition-all ${
                  viewMode === "3d"
                    ? "bg-brand-primary text-brand-light shadow-[0_5px_14px_rgba(52,86,62,0.2)]"
                    : "text-brand-primary/65 hover:text-brand-primary"
                }`}
                onClick={() => setViewMode("3d")}
                type="button"
              >
                <Box className="h-4 w-4" aria-hidden="true" /> Anteprima 3D
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-brand-primary/10 pt-4">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-primary/65">
              Colore bordo
            </span>
            {linePresets.map((color) => (
              <button
                aria-label={`Colore bordo ${filamentName(color)}`}
                className={`h-8 w-8 rounded-full border-2 shadow-sm transition-all hover:scale-110 ${
                  config.lineColor === color
                    ? "border-brand-primary ring-2 ring-brand-primary/20 ring-offset-2"
                    : "border-white"
                }`}
                key={color}
                onClick={() =>
                  setConfig((current) => ({ ...current, lineColor: color }))
                }
                style={{ backgroundColor: color }}
                type="button"
              />
            ))}
            <span
              className="mx-1 hidden h-6 w-px bg-brand-primary/15 xsmall:block"
              aria-hidden="true"
            />
            <button
              className="inline-flex h-9 items-center gap-2 rounded-full border border-brand-primary/15 bg-brand-light px-3 text-xs font-bold text-brand-primary transition hover:border-brand-primary/35 hover:bg-brand-paper disabled:cursor-not-allowed disabled:opacity-40"
              disabled={config.textItems.length >= textMaxItems}
              onClick={addTextItem}
              type="button"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Nuovo testo
            </button>
            {selectedTextItem ? (
              <select
                aria-label="Font del testo"
                className="h-9 rounded-full border border-brand-primary/15 bg-brand-light px-3 text-xs text-brand-dark outline-none transition hover:border-brand-primary/35 focus:border-brand-primary"
                onChange={(event) =>
                  updateSelectedTextItem({ fontKey: event.target.value })
                }
                value={selectedTextItem.fontKey}
              >
                {fontOptions.map((font) => (
                  <option key={font.key} value={font.key}>
                    {font.label}
                  </option>
                ))}
              </select>
            ) : null}
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-brand-primary/15 bg-brand-light px-3 text-xs font-bold text-brand-primary transition hover:border-brand-primary/35 hover:bg-brand-paper">
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              {config.logoItem ? "Sostituisci logo" : "Carica logo"}
              <input
                accept="image/svg+xml,.svg"
                className="sr-only"
                onChange={handleLogoUpload}
                type="file"
              />
            </label>
            {config.logoItem ? (
              <button
                className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                onClick={() =>
                  setConfig((current) => ({ ...current, logoItem: null }))
                }
                type="button"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Rimuovi logo
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 border-t border-brand-primary/10 pt-4 small:grid-cols-2">
            {selectedTextItem ? (
              <ToolbarColorControl
                label="Colore testo"
                onChange={(color) => updateSelectedTextItem({ color })}
                presets={linePresets}
                value={selectedTextItem.color}
              />
            ) : null}
            <ToolbarColorControl
              disabled={!config.logoItem}
              label="Colore logo"
              onChange={(color) => updateLogoItem({ color })}
              presets={linePresets}
              value={config.logoItem?.color ?? "#ffffff"}
            />
          </div>
          {logoError ? (
            <p
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              role="alert"
            >
              {logoError}
            </p>
          ) : null}
        </div>

        <div className="relative h-[430px] bg-brand-paper small:h-[620px]">
          <div
            className={`absolute inset-0 ${
              viewMode === "3d" ? "visible" : "invisible"
            }`}
          >
            <CanvasErrorBoundary>
              <Canvas
                frameloop="demand"
                camera={{ position: [4, 3, 5], fov: 42 }}
                dpr={[1, 1.5]}
                gl={{ preserveDrawingBuffer: true }}
                style={{ height: "100%", width: "100%" }}
              >
                <color attach="background" args={["#eef1ed"]} />
                <ambientLight intensity={2.2} />
                <directionalLight intensity={0.7} position={[3, 5, 4]} />
                <Suspense fallback={null}>
                  {stepModel ? (
                    <StepBaseModel config={config} model={stepModel} />
                  ) : null}
                </Suspense>
                <OrbitControls
                  enablePan={false}
                  maxDistance={8}
                  minDistance={3}
                  target={[0, 0, 0]}
                />
              </Canvas>
            </CanvasErrorBoundary>
          </div>
          <div
            className={`absolute inset-0 ${
              viewMode === "2d" ? "visible" : "invisible"
            }`}
          >
            <SurfaceEditor2D
              config={config}
              onLogoChange={updateLogoItem}
              onSelectText={(id) =>
                setConfig((current) => ({ ...current, selectedTextItemId: id }))
              }
              onTextChange={(id, update) => {
                setConfig((current) => ({
                  ...current,
                  selectedTextItemId: id,
                  textItems: current.textItems.map((item) =>
                    item.id === id
                      ? constrainTextItem({ ...item, ...update })
                      : item
                  ),
                }));
              }}
              selectedTextId={selectedTextItem?.id ?? null}
            />
          </div>
          {stepLoadState.status !== "ready" ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-brand-paper/80 backdrop-blur-sm">
              {stepLoadState.status === "error" ? (
                <div className="mx-5 max-w-xs rounded-2xl border border-red-200 bg-white p-5 text-center text-small-regular text-red-700 shadow-lg">
                  {stepLoadState.message}
                </div>
              ) : (
                <div
                  aria-hidden="true"
                  className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-brand-primary"
                />
              )}
            </div>
          ) : null}
          <div className="pointer-events-none absolute bottom-4 left-1/2 flex max-w-[calc(100%_-_2rem)] -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-brand-primary/15 bg-white/90 px-4 py-2 text-[10px] font-semibold text-brand-primary/70 shadow-[0_8px_24px_rgba(23,39,28,0.12)] backdrop-blur-md xsmall:text-xs">
            {viewMode === "2d" ? (
              <Move className="h-4 w-4" aria-hidden="true" />
            ) : (
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            )}
            {viewMode === "2d"
              ? "Trascina gli elementi · usa l’angolo per ridimensionare"
              : "Trascina per ruotare · scorri per zoomare"}
          </div>
        </div>
      </div>

      <aside className="hidden" aria-hidden="true">
        <div className="space-y-6">
          <div>
            <h3 className="text-base-semi text-brand-dark">
              Personalizzazione
            </h3>
            <p className="mt-1 text-small-regular text-brand-dark/70">
              La configurazione viene salvata insieme al tuo ordine.
            </p>
          </div>

          <ColorControl
            label="Colore struttura"
            presets={filamentColors}
            value={config.structureColor}
            onChange={(structureColor) =>
              setConfig((current) => ({ ...current, structureColor }))
            }
          />
          <ColorControl
            label="Colore fascia"
            presets={linePresets}
            value={config.middleColor}
            onChange={(middleColor) =>
              setConfig((current) => ({ ...current, middleColor }))
            }
          />
          <ColorControl
            label="Bande e restringimento"
            presets={linePresets}
            value={config.lineColor}
            onChange={(lineColor) =>
              setConfig((current) => ({ ...current, lineColor }))
            }
          />

          <div className="border-t border-gray-200 pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-small-semi text-brand-dark">Testi</h4>
              <button
                className="inline-flex h-9 items-center gap-2 border border-gray-200 px-3 text-small-regular transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={config.textItems.length >= textMaxItems}
                onClick={addTextItem}
                type="button"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Aggiungi
              </button>
            </div>

            <div className="grid gap-2">
              {config.textItems.map((item, index) => {
                const isSelected = item.id === selectedTextItem?.id;

                return (
                  <div
                    className={`grid grid-cols-[1fr_40px] border ${
                      isSelected ? "border-brand-primary" : "border-gray-200"
                    }`}
                    key={item.id}
                  >
                    <button
                      className="min-w-0 px-3 py-2 text-left transition hover:bg-gray-50"
                      onClick={() =>
                        setConfig((current) => ({
                          ...current,
                          selectedTextItemId: item.id,
                        }))
                      }
                      type="button"
                    >
                      <span className="block text-xs uppercase text-brand-dark/70">
                        Testo {index + 1}
                      </span>
                      <span className="block truncate text-small-regular">
                        {item.text || "Vuoto"}
                      </span>
                    </button>
                    <button
                      className="inline-flex items-center justify-center border-l border-gray-200 transition hover:bg-gray-50"
                      onClick={() => removeTextItem(item.id)}
                      title="Rimuovi testo"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Rimuovi testo</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedTextItem ? (
            <div className="space-y-4 border border-gray-200 p-4">
              <label className="grid gap-2 text-small-regular">
                <span className="font-medium text-brand-dark">Contenuto</span>
                <input
                  className="h-10 w-full border border-gray-200 px-3 text-small-regular outline-none focus:border-brand-primary"
                  maxLength={textMaxCharacters}
                  value={selectedTextItem.text}
                  onChange={(event) =>
                    updateSelectedTextItem({ text: event.target.value })
                  }
                />
              </label>

              <label className="grid gap-2 text-small-regular">
                <span className="font-medium text-brand-dark">Font</span>
                <select
                  className="h-10 w-full border border-gray-200 bg-white px-3 text-small-regular outline-none focus:border-brand-primary"
                  value={selectedTextItem.fontKey}
                  onChange={(event) =>
                    updateSelectedTextItem({ fontKey: event.target.value })
                  }
                >
                  {fontOptions.map((font) => (
                    <option key={font.key} value={font.key}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </label>

              <ColorControl
                label="Colore testo"
                presets={linePresets}
                value={selectedTextItem.color}
                onChange={(color) => updateSelectedTextItem({ color })}
              />

              <RangeControl
                label="Scala testo"
                max={textScaleMax}
                min={textScaleMin}
                step={0.02}
                value={selectedTextItem.scale}
                onChange={(scale) => updateSelectedTextItem({ scale })}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-small-regular font-medium text-brand-dark">
                    Posizione
                  </span>
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center border border-gray-200 transition hover:bg-gray-50"
                    onClick={() => updateSelectedTextItem({ x: 0, y: 0 })}
                    type="button"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Azzera posizione</span>
                  </button>
                </div>
                <RangeControl
                  label="X"
                  max={textPositionLimit}
                  min={-textPositionLimit}
                  step={0.02}
                  value={selectedTextItem.x}
                  onChange={(x) => updateSelectedTextItem({ x })}
                />
                <RangeControl
                  label="Y"
                  max={textPositionLimit}
                  min={-textPositionLimit}
                  step={0.02}
                  value={selectedTextItem.y}
                  onChange={(y) => updateSelectedTextItem({ y })}
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-4 border-t border-gray-200 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-small-semi text-brand-dark">Logo</h4>
                <p className="mt-1 text-small-regular text-brand-dark/70">
                  SVG vettoriale con forme e tracciati pieni.
                </p>
              </div>
              {config.logoItem ? (
                <button
                  className="inline-flex h-9 items-center gap-2 border border-gray-200 px-3 text-small-regular transition hover:bg-gray-50"
                  onClick={() =>
                    setConfig((current) => ({ ...current, logoItem: null }))
                  }
                  type="button"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Rimuovi
                </button>
              ) : null}
            </div>

            {config.logoItem ? (
              <div className="space-y-4 border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden border border-gray-200 bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0px]">
                    {/* The processed logo is a local data URL, not a Next image asset. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="Anteprima del logo elaborato"
                      className="max-h-full max-w-full object-contain"
                      src={config.logoItem.previewDataUrl}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-small-semi text-brand-dark">
                      {config.logoItem.sourceName}
                    </p>
                    <p className="mt-1 text-small-regular text-brand-dark/70">
                      Pronto per la configurazione
                    </p>
                  </div>
                </div>

                <ColorControl
                  label="Colore logo"
                  presets={linePresets}
                  value={config.logoItem.color}
                  onChange={(color) => updateLogoItem({ color })}
                />

                <RangeControl
                  label="Scala logo"
                  max={logoScaleMax}
                  min={logoScaleMin}
                  step={0.02}
                  value={config.logoItem.scale}
                  onChange={(scale) => updateLogoItem({ scale })}
                />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-small-regular font-medium text-brand-dark">
                      Posizione logo
                    </span>
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center border border-gray-200 transition hover:bg-gray-50"
                      onClick={() => updateLogoItem({ x: 0, y: 0 })}
                      type="button"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Azzera posizione logo</span>
                    </button>
                  </div>
                  <RangeControl
                    label="X logo"
                    max={textPositionLimit}
                    min={-textPositionLimit}
                    step={0.02}
                    value={config.logoItem.x}
                    onChange={(x) => updateLogoItem({ x })}
                  />
                  <RangeControl
                    label="Y logo"
                    max={textPositionLimit}
                    min={-textPositionLimit}
                    step={0.02}
                    value={config.logoItem.y}
                    onChange={(y) => updateLogoItem({ y })}
                  />
                </div>
              </div>
            ) : (
              <label
                className={`grid cursor-pointer place-items-center gap-2 border-2 border-dashed p-6 text-center text-small-regular transition ${
                  isLogoDragActive
                    ? "border-brand-primary bg-gray-50"
                    : "border-gray-300 text-brand-dark/70 hover:border-brand-primary hover:bg-gray-50"
                }`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsLogoDragActive(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setIsLogoDragActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsLogoDragActive(false);
                  const file = event.dataTransfer.files[0];
                  if (file) void processLogoFile(file);
                }}
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-gray-100 text-brand-dark">
                  <ImagePlus className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-medium text-brand-dark">
                  Trascina qui il logo
                </span>
                <span>oppure scegli un file SVG vettoriale · max 512 KB</span>
                <input
                  accept="image/svg+xml,.svg"
                  className="sr-only"
                  onChange={handleLogoUpload}
                  type="file"
                />
              </label>
            )}

            {logoError ? (
              <p className="text-small-regular text-red-600" role="alert">
                {logoError}
              </p>
            ) : null}
          </div>
        </div>
      </aside>
    </section>
  );
}

function SurfaceEditor2D({
  config,
  onLogoChange,
  onSelectText,
  onTextChange,
  selectedTextId,
}: {
  config: ConfiguratorState;
  onLogoChange: (update: Partial<LogoItem>) => void;
  onSelectText: (id: string) => void;
  onTextChange: (id: string, update: Partial<TextItem>) => void;
  selectedTextId: string | null;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const editorFrameRef = useRef<HTMLDivElement>(null);
  const logoElementRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<{
    item: TextItem | LogoItem;
    itemRect: DOMRect;
    kind: "text" | "logo";
    mode: "move" | "resize";
    resizeDirection: [number, number];
    startItem: TextItem | LogoItem;
    startX: number;
    startY: number;
    surfaceRect: DOMRect;
  } | null>(null);
  const [editorSide, setEditorSide] = useState(0);
  const [snapState, setSnapState] = useState({ x: false, y: false });
  const [measurements, setMeasurements] = useState<
    Record<string, { heightMm: number; widthMm: number }>
  >({});
  const [glyphBounds, setGlyphBounds] = useState<
    Record<string, { height: number; width: number; x: number; y: number }>
  >({});

  useEffect(() => {
    const frame = editorFrameRef.current;
    if (!frame) return;

    const updateSide = () => {
      // The cap must remain a true top-down square at every viewport size.
      setEditorSide(
        Math.max(
          0,
          Math.min(frame.clientWidth - 64, frame.clientHeight - 64, 560)
        )
      );
    };

    updateSide();
    const observer = new ResizeObserver(updateSide);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || !editorSide) return;

    let cancelled = false;
    const measureAndFit = () => {
      if (cancelled) return;
      const surfaceRect = surface.getBoundingClientRect();
      const nextMeasurements: Record<
        string,
        { heightMm: number; widthMm: number }
      > = {};
      const nextGlyphBounds: Record<
        string,
        { height: number; width: number; x: number; y: number }
      > = {};
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;

      config.textItems.forEach((item) => {
        const text = item.text.trim();
        if (!text) return;
        const font =
          fontOptions.find((option) => option.key === item.fontKey) ??
          fontOptions[0];
        const fontSize = (item.scale / capSurfaceSize) * surfaceRect.width;
        context.font = `${fontSize}px "${font.family}"`;
        const metrics = context.measureText(text);
        const width = Math.max(
          1,
          metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
        );
        const height = Math.max(
          1,
          metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
        );
        const bounds = {
          height,
          width,
          x: -metrics.actualBoundingBoxLeft,
          y: -metrics.actualBoundingBoxAscent,
        };
        nextGlyphBounds[item.id] = {
          height: bounds.height,
          width: bounds.width,
          x: bounds.x,
          y: bounds.y,
        };
        const widthUnits = (bounds.width / surfaceRect.width) * capSurfaceSize;
        const heightUnits =
          (bounds.height / surfaceRect.height) * capSurfaceSize;
        const availableWidth = Math.max(
          0,
          printableSurfaceSize - Math.abs(item.x) * 2
        );
        const availableHeight = Math.max(
          0,
          printableSurfaceSize - Math.abs(item.y) * 2
        );
        const fitRatio = Math.min(
          1,
          availableWidth / Math.max(widthUnits, 0.001),
          availableHeight / Math.max(heightUnits, 0.001)
        );

        if (fitRatio < 0.995) {
          const fittedScale = Math.max(
            textScaleMin,
            item.scale * fitRatio * 0.98
          );
          if (fittedScale < item.scale - 0.001) {
            onTextChange(item.id, { scale: fittedScale });
          } else {
            const maxX = Math.max(0, printableSurfaceSize / 2 - widthUnits / 2);
            const maxY = Math.max(
              0,
              printableSurfaceSize / 2 - heightUnits / 2
            );
            onTextChange(item.id, {
              x: clampNumber(item.x, -maxX, maxX),
              y: clampNumber(item.y, -maxY, maxY),
            });
          }
        }

        nextMeasurements[item.id] = {
          heightMm: heightUnits * millimetersPerSurfaceUnit,
          widthMm: widthUnits * millimetersPerSurfaceUnit,
        };
      });

      if (config.logoItem && logoElementRef.current) {
        const rect = logoElementRef.current.getBoundingClientRect();
        nextMeasurements[config.logoItem.id] = {
          heightMm: (rect.height / surfaceRect.height) * capSizeMm,
          widthMm: (rect.width / surfaceRect.width) * capSizeMm,
        };
      }

      setMeasurements((current) => {
        const currentSignature = JSON.stringify(current);
        const nextSignature = JSON.stringify(nextMeasurements);
        return currentSignature === nextSignature ? current : nextMeasurements;
      });
      setGlyphBounds((current) =>
        JSON.stringify(current) === JSON.stringify(nextGlyphBounds)
          ? current
          : nextGlyphBounds
      );
    };

    const frame = window.requestAnimationFrame(measureAndFit);
    document.fonts.ready.then(measureAndFit).catch(() => undefined);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [config.logoItem, config.textItems, editorSide, onTextChange]);

  function startInteraction(
    event: ReactPointerEvent<HTMLElement>,
    item: TextItem | LogoItem,
    kind: "text" | "logo",
    mode: "move" | "resize",
    resizeDirection: [number, number] = [1, 1]
  ) {
    event.preventDefault();
    event.stopPropagation();
    const surface = surfaceRef.current;
    const target = event.currentTarget.parentElement;
    if (!surface || !target) return;

    if (kind === "text") onSelectText(item.id);
    const surfaceRect = surface.getBoundingClientRect();
    const itemRect = target.getBoundingClientRect();
    interactionRef.current = {
      item,
      itemRect,
      kind,
      mode,
      resizeDirection,
      startItem: { ...item },
      startX: event.clientX,
      startY: event.clientY,
      surfaceRect,
    };
    surface.setPointerCapture(event.pointerId);
  }

  function handleSurfacePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const interaction = interactionRef.current;
    if (!interaction) return;

    const {
      item,
      itemRect,
      kind,
      mode,
      resizeDirection,
      startItem,
      startX,
      startY,
      surfaceRect,
    } = interaction;
    if (mode === "resize") {
      const diagonalDelta =
        ((event.clientX - startX) * resizeDirection[0] +
          (event.clientY - startY) * resizeDirection[1]) /
        2;
      const initialSize = Math.max(itemRect.width, itemRect.height, 1);
      const requestedScale =
        startItem.scale * (1 + diagonalDelta / initialSize);
      const itemWidth = (itemRect.width / surfaceRect.width) * capSurfaceSize;
      const itemHeight =
        (itemRect.height / surfaceRect.height) * capSurfaceSize;
      const surfaceEdge = printableSurfaceSize / 2;
      const fixedX =
        resizeDirection[0] > 0
          ? startItem.x - itemWidth / 2
          : startItem.x + itemWidth / 2;
      const fixedY =
        resizeDirection[1] > 0
          ? startItem.y + itemHeight / 2
          : startItem.y - itemHeight / 2;
      const availableWidth =
        resizeDirection[0] > 0 ? surfaceEdge - fixedX : fixedX + surfaceEdge;
      const availableHeight =
        resizeDirection[1] > 0 ? fixedY + surfaceEdge : surfaceEdge - fixedY;
      const maxScale =
        startItem.scale *
        Math.min(
          availableWidth / Math.max(itemWidth, 0.001),
          availableHeight / Math.max(itemHeight, 0.001)
        );
      const minScale = kind === "text" ? textScaleMin : logoScaleMin;
      const scale = clampNumber(
        requestedScale,
        minScale,
        Math.max(minScale, maxScale)
      );
      const scaleRatio = scale / startItem.scale;
      const widthDelta = itemWidth * (scaleRatio - 1);
      const heightDelta = itemHeight * (scaleRatio - 1);
      const update = {
        scale,
        x: startItem.x + (resizeDirection[0] * widthDelta) / 2,
        y: startItem.y - (resizeDirection[1] * heightDelta) / 2,
      };
      if (kind === "text") onTextChange(item.id, update);
      else onLogoChange(update);
      return;
    }

    const rawX =
      startItem.x +
      ((event.clientX - startX) / surfaceRect.width) * capSurfaceSize;
    const rawY =
      startItem.y -
      ((event.clientY - startY) / surfaceRect.height) * capSurfaceSize;
    const snapThreshold = (10 / surfaceRect.width) * capSurfaceSize;
    const snapsToX = Math.abs(rawX) <= snapThreshold;
    const snapsToY = Math.abs(rawY) <= snapThreshold;
    const snappedX = snapsToX ? 0 : rawX;
    const snappedY = snapsToY ? 0 : rawY;
    const halfWidth =
      ((itemRect.width / surfaceRect.width) * capSurfaceSize) / 2;
    const halfHeight =
      ((itemRect.height / surfaceRect.height) * capSurfaceSize) / 2;
    const maxX = Math.max(0, printableSurfaceSize / 2 - halfWidth);
    const maxY = Math.max(0, printableSurfaceSize / 2 - halfHeight);
    const update = {
      x: clampNumber(snappedX, -maxX, maxX),
      y: clampNumber(snappedY, -maxY, maxY),
    };
    setSnapState({ x: snapsToX, y: snapsToY });
    if (kind === "text") onTextChange(item.id, update);
    else onLogoChange(update);
  }

  function finishSurfaceInteraction(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    interactionRef.current = null;
    setSnapState({ x: false, y: false });
  }

  function renderResizeHandles(
    item: TextItem | LogoItem,
    kind: "text" | "logo"
  ) {
    const handles: Array<{
      direction: [number, number];
      label: string;
      style: {
        bottom?: number;
        cursor: "nesw-resize" | "nwse-resize";
        left?: number;
        right?: number;
        top?: number;
      };
    }> = [
      {
        direction: [-1, -1],
        label: "Ridimensiona dall'angolo in alto a sinistra",
        style: { cursor: "nwse-resize", left: -6, top: -6 },
      },
      {
        direction: [1, -1],
        label: "Ridimensiona dall'angolo in alto a destra",
        style: { cursor: "nesw-resize", right: -6, top: -6 },
      },
      {
        direction: [-1, 1],
        label: "Ridimensiona dall'angolo in basso a sinistra",
        style: { bottom: -6, cursor: "nesw-resize", left: -6 },
      },
      {
        direction: [1, 1],
        label: "Ridimensiona dall'angolo in basso a destra",
        style: { bottom: -6, cursor: "nwse-resize", right: -6 },
      },
    ];

    return handles.map((handle) => (
      <button
        aria-label={handle.label}
        className="absolute z-30 border border-black bg-white shadow-sm"
        key={handle.label}
        onPointerDown={(event) =>
          startInteraction(event, item, kind, "resize", handle.direction)
        }
        style={{
          ...handle.style,
          appearance: "none",
          borderRadius: 0,
          height: 12,
          minHeight: 0,
          minWidth: 0,
          padding: 0,
          width: 12,
        }}
        type="button"
      />
    ));
  }

  return (
    <div
      className="absolute inset-0 grid place-items-center overflow-hidden bg-brand-paper p-8 small:p-14"
      ref={editorFrameRef}
    >
      <div className="absolute inset-0 brand-noise opacity-40" />
      <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-brand-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-brand-secondary/10 blur-3xl" />
      <div
        aria-label="Vista dall'alto del tappo"
        className="relative shrink-0 touch-none shadow-[inset_0_0_0_2px_#374151,inset_0_0_28px_#0008,0_28px_70px_rgba(31,27,22,0.24)] [container-type:inline-size]"
        ref={surfaceRef}
        style={{
          backgroundColor: config.structureColor,
          height: editorSide,
          width: editorSide,
        }}
        onPointerCancel={finishSurfaceInteraction}
        onPointerMove={handleSurfacePointerMove}
        onPointerUp={finishSurfaceInteraction}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: config.structureColor }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-7 left-0 right-0 z-30 flex items-center gap-2 text-[10px] font-semibold text-brand-dark/70"
        >
          <span className="h-px flex-1 bg-gray-500" />
          <span>{capSizeMm} mm</span>
          <span className="h-px flex-1 bg-gray-500" />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-7 bottom-0 top-0 z-30 flex flex-col items-center gap-2 text-[10px] font-semibold text-brand-dark/70"
        >
          <span className="w-px flex-1 bg-gray-500" />
          <span className="[writing-mode:vertical-rl]">{capSizeMm} mm</span>
          <span className="w-px flex-1 bg-gray-500" />
        </div>
        <div
          className="pointer-events-none absolute z-10 border-2"
          style={{
            borderColor: config.lineColor,
            borderWidth: `${(bandThicknessMm / capSizeMm) * editorSide}px`,
            inset: `${((capSizeMm - bandOuterSizeMm) / capSizeMm / 2) * 100}%`,
            boxShadow: `0 0 0 1px #0008, inset 0 0 0 1px ${config.lineColor}88`,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 top-0 transition-all duration-150"
          style={{
            backgroundColor: snapState.x ? "#34563e" : "rgb(255 255 255 / 0.2)",
            boxShadow: snapState.x
              ? "0 0 0 1px #a8d5b4, 0 0 14px 4px rgba(109, 134, 116, 0.95)"
              : "none",
            left: "50%",
            transform: "translateX(-50%)",
            width: snapState.x ? 3 : 1,
            zIndex: snapState.x ? 40 : 10,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 transition-all duration-150"
          style={{
            backgroundColor: snapState.y ? "#34563e" : "rgb(255 255 255 / 0.2)",
            boxShadow: snapState.y
              ? "0 0 0 1px #a8d5b4, 0 0 14px 4px rgba(109, 134, 116, 0.95)"
              : "none",
            height: snapState.y ? 3 : 1,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: snapState.y ? 40 : 10,
          }}
        />
        {config.textItems.map((item) => {
          const font =
            fontOptions.find((option) => option.key === item.fontKey) ??
            fontOptions[0];
          const selected = selectedTextId === item.id;
          const bounds = glyphBounds[item.id];
          const fontSize = (item.scale / capSurfaceSize) * editorSide;
          return item.text.trim() ? (
            <div
              className={`absolute z-20 select-none border ${
                selected
                  ? "border-white shadow-[0_0_0_1px_#111827]"
                  : "border-transparent hover:border-white/50"
              }`}
              key={item.id}
              style={{
                color: item.color,
                height: bounds?.height ?? 1,
                left: `${50 + (item.x / capSurfaceSize) * 100}%`,
                top: `${50 - (item.y / capSurfaceSize) * 100}%`,
                transform: "translate(-50%, -50%)",
                width: bounds?.width ?? 1,
              }}
            >
              <button
                aria-label={`Sposta ${item.text}`}
                className="block cursor-move border-0 bg-transparent"
                onPointerDown={(event) =>
                  startInteraction(event, item, "text", "move")
                }
                style={{
                  appearance: "none",
                  height: bounds?.height ?? 1,
                  margin: 0,
                  minHeight: 0,
                  minWidth: 0,
                  padding: 0,
                  width: bounds?.width ?? 1,
                }}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="block overflow-visible"
                  height={bounds?.height ?? 1}
                  viewBox={
                    bounds
                      ? `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`
                      : "0 0 1 1"
                  }
                  width={bounds?.width ?? 1}
                >
                  <text
                    fill={item.color}
                    style={{
                      fontFamily: `"${font.family}"`,
                      fontSize,
                      textShadow: "0 1px 2px #000",
                    }}
                    x="0"
                    y="0"
                  >
                    {item.text.trim()}
                  </text>
                </svg>
              </button>
              {selected ? renderResizeHandles(item, "text") : null}
              {measurements[item.id] ? (
                <>
                  <span
                    className="pointer-events-none absolute top-1/2 z-30 -translate-y-1/2 whitespace-nowrap font-semibold text-brand-dark/70 [writing-mode:vertical-rl]"
                    style={{
                      fontFamily: "ui-sans-serif, system-ui, sans-serif",
                      fontSize: "10px",
                      lineHeight: 1,
                      right: "calc(100% + 5px)",
                    }}
                  >
                    {measurements[item.id].heightMm.toFixed(1)} mm
                  </span>
                  <span
                    className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap font-semibold text-brand-dark/70"
                    style={{
                      fontFamily: "ui-sans-serif, system-ui, sans-serif",
                      fontSize: "10px",
                      lineHeight: 1,
                      top: "calc(100% + 5px)",
                    }}
                  >
                    {measurements[item.id].widthMm.toFixed(1)} mm
                  </span>
                </>
              ) : null}
            </div>
          ) : null;
        })}

        {config.logoItem ? (
          <div
            className="absolute z-20 border border-white shadow-[0_0_0_1px_#111827]"
            ref={logoElementRef}
            style={{
              height: `${(config.logoItem.scale / capSurfaceSize) * 100}%`,
              left: `${50 + (config.logoItem.x / capSurfaceSize) * 100}%`,
              top: `${50 - (config.logoItem.y / capSurfaceSize) * 100}%`,
              transform: "translate(-50%, -50%)",
              width: `${
                ((config.logoItem.scale * config.logoItem.aspectRatio) /
                  capSurfaceSize) *
                100
              }%`,
            }}
          >
            <button
              aria-label="Sposta logo"
              className="h-full w-full cursor-move"
              onPointerDown={(event) =>
                startInteraction(event, config.logoItem!, "logo", "move")
              }
              style={{
                backgroundColor: config.logoItem.color,
                maskImage: `url(${config.logoItem.maskDataUrl})`,
                maskPosition: "center",
                maskRepeat: "no-repeat",
                maskSize: "contain",
              }}
              type="button"
            />
            {renderResizeHandles(config.logoItem, "logo")}
            {measurements[config.logoItem.id] ? (
              <>
                <span
                  className="pointer-events-none absolute top-1/2 z-30 -translate-y-1/2 whitespace-nowrap font-semibold text-brand-dark/70 [writing-mode:vertical-rl]"
                  style={{
                    fontFamily: "ui-sans-serif, system-ui, sans-serif",
                    fontSize: "10px",
                    lineHeight: 1,
                    right: "calc(100% + 5px)",
                  }}
                >
                  {measurements[config.logoItem.id].heightMm.toFixed(1)} mm
                </span>
                <span
                  className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap font-semibold text-brand-dark/70"
                  style={{
                    fontFamily: "ui-sans-serif, system-ui, sans-serif",
                    fontSize: "10px",
                    lineHeight: 1,
                    top: "calc(100% + 5px)",
                  }}
                >
                  {measurements[config.logoItem.id].widthMm.toFixed(1)} mm
                </span>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StepBaseModel({
  config,
  model,
}: {
  config: ConfiguratorState;
  model: StepModel;
}) {
  const structureMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(config.structureColor),
        metalness: 0,
        roughness: 0.86,
      }),
    [config.structureColor]
  );

  const middleMaterial = useMemo(
    () =>
      new MeshStandardMaterial({ color: config.middleColor, roughness: 0.8 }),
    [config.middleColor]
  );
  useEffect(
    () => () => {
      structureMaterial.dispose();
    },
    [structureMaterial]
  );
  useEffect(
    () => () => {
      middleMaterial.dispose();
    },
    [middleMaterial]
  );
  const lineMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(config.lineColor),
        metalness: 0,
        roughness: 0.76,
      }),
    [config.lineColor]
  );
  useEffect(() => () => lineMaterial.dispose(), [lineMaterial]);

  return (
    <group>
      <group scale={model.scale} rotation={[-Math.PI / 2, 0, 0]}>
        <group position={[-model.center.x, -model.center.y, -model.center.z]}>
          {model.parts.map((part, index) =>
            part.isTopBand ? null : (
              <mesh
                geometry={part.geometry}
                key={`${part.geometry.uuid}-${index}`}
                material={
                  part.role === "line"
                    ? lineMaterial
                    : part.role === "middle"
                    ? middleMaterial
                    : structureMaterial
                }
              />
            )
          )}
        </group>
      </group>

      <TopBand material={lineMaterial} />

      {config.textItems.map((item) => {
        const trimmed = item.text.trim();
        const font =
          fontOptions.find((option) => option.key === item.fontKey) ??
          fontOptions[0];

        return trimmed ? (
          <Suspense fallback={null} key={item.id}>
            <Text
              anchorX="center"
              anchorY="middle"
              color={item.color}
              font={font.src}
              fontSize={item.scale}
              lineHeight={0.9}
              outlineColor="#000000"
              outlineWidth={0.018}
              position={[item.x, topSurfaceY + 0.008, -item.y]}
              rotation={[-Math.PI / 2, 0, 0]}
              textAlign="center"
            >
              {item.text}
            </Text>
          </Suspense>
        ) : null;
      })}

      {config.logoItem ? (
        <Suspense fallback={null}>
          <LogoSurface item={config.logoItem} />
        </Suspense>
      ) : null}
    </group>
  );
}

function TopBand({ material }: { material: MeshStandardMaterial }) {
  const innerSize = bandOuterSize - bandThickness * 2;
  const edgeOffset = (bandOuterSize - bandThickness) / 2;

  return (
    <group position={[0, topSurfaceY + 0.004, 0]}>
      <mesh
        material={material}
        position={[0, 0, -edgeOffset]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[bandOuterSize, bandThickness]} />
      </mesh>
      <mesh
        material={material}
        position={[0, 0, edgeOffset]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[bandOuterSize, bandThickness]} />
      </mesh>
      <mesh
        material={material}
        position={[-edgeOffset, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[bandThickness, innerSize]} />
      </mesh>
      <mesh
        material={material}
        position={[edgeOffset, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[bandThickness, innerSize]} />
      </mesh>
    </group>
  );
}

function LogoSurface({ item }: { item: LogoItem }) {
  const texture = useLoader(TextureLoader, item.maskDataUrl);

  useEffect(() => {
    texture.colorSpace = NoColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh
      position={[item.x, topSurfaceY + 0.006, -item.y]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[item.scale * item.aspectRatio, item.scale]} />
      <meshBasicMaterial
        alphaMap={texture}
        alphaTest={0.02}
        color={item.color}
        depthWrite={false}
        side={DoubleSide}
        transparent
      />
    </mesh>
  );
}

function createStepParts(meshes: OcctMesh[]): StepPart[] {
  const analyzed = meshes.map((mesh) => {
    const geometry = createGeometryFromOcctMesh(mesh);
    geometry.computeBoundingBox();
    const center = new Vector3();
    geometry.boundingBox?.getCenter(center);

    return {
      geometry,
      centerZ: center.z,
      isAccent: Boolean(mesh.color?.some((channel) => channel > 0.05)),
    };
  });

  const capGeometryUuid = analyzed
    .filter((part) => !part.isAccent)
    .sort((left, right) => right.centerZ - left.centerZ)[0]?.geometry.uuid;
  const topBandGeometryUuid = analyzed
    .filter((part) => part.isAccent)
    .sort((left, right) => right.centerZ - left.centerZ)[0]?.geometry.uuid;

  return analyzed.map((part) => ({
    geometry: part.geometry,
    role: part.isAccent
      ? part.geometry.uuid === topBandGeometryUuid
        ? "line"
        : "middle"
      : "structure",
    isCap: part.geometry.uuid === capGeometryUuid,
    isTopBand: part.geometry.uuid === topBandGeometryUuid,
  }));
}

function createGeometryFromOcctMesh(mesh: OcctMesh) {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(
      new Float32Array(Array.from(mesh.attributes.position.array)),
      3
    )
  );

  if (mesh.attributes.normal?.array?.length) {
    geometry.setAttribute(
      "normal",
      new BufferAttribute(
        new Float32Array(Array.from(mesh.attributes.normal.array)),
        3
      )
    );
  } else {
    geometry.computeVertexNormals();
  }

  if (mesh.index?.array?.length) {
    geometry.setIndex(
      new BufferAttribute(new Uint32Array(Array.from(mesh.index.array)), 1)
    );
  }

  return geometry;
}

function ColorControl({
  label,
  onChange,
  presets,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  presets: string[];
  value: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-small-regular font-medium text-brand-dark">
          {label}
        </label>
        <span className="text-sm">{filamentName(value)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            aria-label={`${label} ${filamentName(preset)}`}
            className="flex h-10 w-10 items-center justify-center border border-gray-200"
            key={preset}
            onClick={() => onChange(preset)}
            style={{ backgroundColor: preset }}
            type="button"
          >
            {value.toLowerCase() === preset.toLowerCase() ? (
              <Check
                className="h-4 w-4 text-white drop-shadow"
                aria-hidden="true"
              />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToolbarColorControl({
  disabled = false,
  label,
  onChange,
  presets,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  presets: string[];
  value: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 transition-colors xsmall:p-4 ${
        disabled
          ? "border-brand-primary/10 bg-brand-paper/40"
          : "border-brand-primary/15 bg-brand-light"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
              disabled
                ? "bg-brand-primary/5 text-brand-primary/30"
                : "bg-brand-primary text-brand-light"
            }`}
          >
            <Palette className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p
              className={`text-xs font-bold uppercase tracking-[0.08em] ${
                disabled ? "text-brand-primary/35" : "text-brand-primary"
              }`}
            >
              {label}
            </p>
            <p className="mt-0.5 text-[10px] text-brand-dark/45">
              {disabled ? "Carica prima un logo" : filamentName(value)}
            </p>
          </div>
        </div>
        {!disabled ? (
          <span
            className="h-7 w-7 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(52,86,62,0.18)]"
            style={{ backgroundColor: value }}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((preset) => {
          const isSelected = value.toLowerCase() === preset.toLowerCase();
          const needsDarkCheck = preset === "#ffffff" || preset === "#facc15";

          return (
            <button
              aria-label={`${label} ${filamentName(preset)}`}
              aria-pressed={isSelected}
              className={`grid h-8 w-8 place-items-center rounded-full border-2 shadow-sm transition-all ${
                isSelected
                  ? "scale-110 border-brand-primary ring-2 ring-brand-primary/15 ring-offset-2"
                  : "border-white hover:scale-110"
              } disabled:cursor-not-allowed disabled:opacity-30`}
              disabled={disabled}
              key={preset}
              onClick={() => onChange(preset)}
              style={{ backgroundColor: preset }}
              type="button"
            >
              {isSelected ? (
                <Check
                  className={`h-4 w-4 ${
                    needsDarkCheck ? "text-brand-dark" : "text-white"
                  } drop-shadow-sm`}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RangeControl({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <label className="grid gap-2 text-small-regular font-medium text-brand-dark">
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="text-brand-dark/70">{value.toFixed(2)}</span>
      </span>
      <input
        className="w-full accent-brand-primary"
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
