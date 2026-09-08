// Optional, read-only import. Never runs during build or on the public website.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { normalizeCatalog } from "./normalize-palette.mjs";
const sql =
  "SELECT coalesce(json_agg(t),'[]') FROM (SELECT title,handle,description,metadata FROM product WHERE deleted_at IS NULL AND status='published' ORDER BY handle) t";
const rows = JSON.parse(
  execFileSync(
    "docker",
    [
      "exec",
      "degree-medusa-postgres",
      "psql",
      "-U",
      "medusa",
      "-d",
      "medusa_backend",
      "-At",
      "-c",
      sql,
    ],
    { encoding: "utf8" }
  )
);
const caps = rows
  .filter((p) => p.metadata?.product_type === "graduation_cap_favor")
  .map((p) => ({
    slug: p.handle,
    name: p.title,
    description: p.description,
    kind: "cap",
    image: `/products/${p.handle}.webp`,
    model: "",
    openModel: "",
    dimensions: [65, 65, 37],
    assembly:
      "Tocco di laurea con base cilindrica, fascia e coperchio quadrato da 65 mm.",
    preset: {
      structureColor: p.metadata.preset_config?.structureColor || "#000000",
      middleColor: p.metadata.preset_config?.middleColor || "#dc2626",
      lineColor: p.metadata.preset_config?.stripeColor || "#dc2626",
      text: p.metadata.preset_config?.textItems?.[0]?.text || "",
      fontKey:
        p.metadata.preset_config?.textItems?.[0]?.fontKey || "great-vibes",
      textColor: p.metadata.preset_config?.textItems?.[0]?.color || "#ffffff",
    },
    modelVersion: p.metadata.model_version,
  }));
const current = JSON.parse(
  fs.readFileSync("src/lib/products.json", "utf8")
).filter((p) => p.kind !== "cap");
fs.writeFileSync(
  "src/lib/products.json",
  JSON.stringify(normalizeCatalog([...current, ...caps]), null, 2) + "\n"
);
console.log(
  `Imported ${caps.length} published products and their presentation presets. No customer, order, price or credential data exported.`
);
