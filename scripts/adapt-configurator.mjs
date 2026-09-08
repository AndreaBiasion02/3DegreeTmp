// One-time adaptation of the existing local configurator. Re-running overwrites its port.
import fs from "node:fs";
fs.mkdirSync("src/lib/configurator", { recursive: true });
let source = fs.readFileSync(
  "../3DegreeFE/src/modules/products/components/graduation-favor-configurator/index.tsx",
  "utf8"
);
source = source.replace(
  'import type { OcctMesh, OcctModule } from "occt-import-js"',
  'import type { OcctMesh } from "@/lib/configurator/mesh"'
);
source = source.replaceAll("@lib/configurator/", "@/lib/configurator/");
source = source.replace(
  "type ConfiguratorState = {",
  "type ConfiguratorState = {\n  structureColor: string\n  middleColor: string"
);
source = source.replace(
  "type GraduationFavorConfiguratorProps = {",
  "type GraduationFavorConfiguratorProps = {\n  initialPreset: {structureColor:string;middleColor:string;lineColor:string;text:string;fontKey:string;textColor:string}"
);
source = source.replace('const structureColor = "#000000"', "");
source = source.replace(
  /let occtModulePromise:[\s\S]*?function createTextItem/,
  "function createTextItem"
);
source = source.replace(
  "function createInitialState(): ConfiguratorState {",
  'function createInitialState(preset: GraduationFavorConfiguratorProps["initialPreset"]): ConfiguratorState {'
);
source = source.replace(
  "const firstText = createTextItem(1)",
  "const firstText = {...createTextItem(1),text:preset.text,fontKey:preset.fontKey,color:preset.textColor}"
);
source = source.replace(
  'lineColor: "#dc2626",',
  "structureColor: preset.structureColor,\n    middleColor: preset.middleColor,\n    lineColor: preset.lineColor,"
);
source = source.replace(
  /function loadOcctScript\([\s\S]*?  const parts = createStepParts\(result.meshes\)/,
  `async function loadStepModel(cadSourcePath: string) {
  const response=await fetch(cadSourcePath)
  if(!response.ok)throw new Error('Modello non disponibile')
  const meshes:OcctMesh[]=await response.json()
  const parts = createStepParts(meshes)`
);
source = source.replace(
  "export default function GraduationFavorConfigurator({",
  "export default function GraduationFavorConfigurator({\n  initialPreset,"
);
source = source.replaceAll(
  "createInitialState()",
  "createInitialState(initialPreset)"
);
source = source.replaceAll(
  "      structureColor,",
  "      structureColor: config.structureColor,"
);
source = source.replaceAll(
  "backgroundColor: structureColor",
  "backgroundColor: config.structureColor"
);
source = source
  .replace("new Color(structureColor)", "new Color(config.structureColor)")
  .replace(
    "roughness: 0.86,\n      }),\n    []",
    "roughness: 0.86,\n      }),\n    [config.structureColor]"
  );
source = source.replace(
  'role: "structure" | "line"',
  'role: "structure" | "line" | "middle"'
);
source = source.replace(
  'role: part.isAccent ? "line" : "structure",',
  'role: part.isAccent ? (part.geometry.uuid === topBandGeometryUuid ? "line" : "middle") : "structure",'
);
source = source.replace(
  "  const lineMaterial = useMemo(",
  `  const middleMaterial = useMemo(()=>new MeshStandardMaterial({color:config.middleColor,roughness:0.8}),[config.middleColor])
  useEffect(()=>()=>{structureMaterial.dispose()},[structureMaterial])
  useEffect(()=>()=>{middleMaterial.dispose()},[middleMaterial])
  const lineMaterial = useMemo(`
);
source = source.replace(
  'part.role === "line" ? lineMaterial : structureMaterial',
  'part.role === "line" ? lineMaterial : part.role === "middle" ? middleMaterial : structureMaterial'
);
source = source.replace('label="Colore linee"', 'label="Colore linee"');
const location = source.indexOf(
  "          <ColorControl",
  source.indexOf("<aside")
);
source =
  source.slice(0, location) +
  `          <ColorControl label="Colore struttura" presets={["#000000","#7f1d1d","#1e3a8a","#064e3b","#4c1d95","#ffffff"]} value={config.structureColor} onChange={(structureColor)=>setConfig(current=>({...current,structureColor}))}/>
          <ColorControl label="Colore fascia" presets={linePresets} value={config.middleColor} onChange={(middleColor)=>setConfig(current=>({...current,middleColor}))}/>
` +
  source.slice(location);
source = source
  .replace('frameloop="always"', 'frameloop="demand"')
  .replace("<Canvas", '<Canvas frameloop="demand"');
source = source
  .replace(/text-ui-fg-base/g, "text-brand-dark")
  .replace(/text-ui-fg-subtle/g, "text-brand-dark/70")
  .replace(/border-ui-fg-base/g, "border-brand-primary");
source = source
  .replace("Modello STEP importato ·", "Anteprima pronta ·")
  .replace("Import STEP in corso", "Caricamento anteprima")
  .replace("Errore import STEP", "Errore caricamento modello");
fs.writeFileSync("src/components/cap-configurator.tsx", source);
let assets = fs.readFileSync(
  "../3DegreeFE/src/lib/configurator/assets.ts",
  "utf8"
);
assets = assets.slice(0, assets.indexOf("async function dataUrlToFile"));
assets = assets.replace(
  'import type { GraduationFavorTransientAssets } from "./graduation-favor"',
  ""
);
fs.writeFileSync("src/lib/configurator/assets.ts", assets);
fs.copyFileSync(
  "../3DegreeFE/src/lib/configurator/graduation-favor.ts",
  "src/lib/configurator/graduation-favor.ts"
);
for (const file of fs.readdirSync("../3DegreeFE/public/fonts"))
  if (file.endsWith(".woff") || file.endsWith(".woff2"))
    fs.copyFileSync(
      "../3DegreeFE/public/fonts/" + file,
      "public/fonts/" + file
    );
