import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const products = JSON.parse(await fs.readFile("src/lib/products.json", "utf8"));
const collections = JSON.parse(await fs.readFile("src/lib/collections.json", "utf8"));
const palette = JSON.parse(
  await fs.readFile("src/lib/filament-palette.json", "utf8")
);
const allowed = new Set(palette.map((p) => p.hex));
const pages = [
  "/",
  "/collections/laurea/",
  ...collections.map(c => `/collections/${c.slug}/`),
  ...products.map((p) => `/products/${p.slug}/`),
];
const readPage = (route) =>
  fs.readFile(path.join("out", route, "index.html"), "utf8");
test("Every catalog page has crawlable content, one H1 and unique canonical metadata", async () => {
  const titles = new Set();
  const canonicals = new Set();
  for (const route of pages) {
    const html = await readPage(route);
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, route);
    assert.match(html, /<html lang="it"/);
    assert.match(html, /<meta name="description" content="[^"]+"/);
    assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/);
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    assert(!titles.has(title));
    titles.add(title);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
    assert(!canonicals.has(canonical));
    canonicals.add(canonical);
    assert(canonical.endsWith(route));
    // Check actual anchors, not scripts that could contain unrelated framework strings.
    for (const [, href] of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
      assert(!/\/(cart|checkout|account|order)(\/|$)/.test(href), href);
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      const [target, anchor] = href.split("#");
      const resolved = target || route;
      assert(pages.includes(resolved), `${route}: broken link ${href}`);
      if (anchor)
        assert((await readPage(resolved)).includes(`id="${anchor}"`), href);
    }
    for (const [, json] of html.matchAll(
      /<script type="application\/ld\+json">(.*?)<\/script>/g
    )) {
      const schema = JSON.parse(json);
      assert.equal(schema["@context"], "https://schema.org");
      assert(!("offers" in schema));
      assert(!("aggregateRating" in schema));
    }
  }
});
test("All 17 products have valid assets: six shapes, ten faculty caps and one configurator", async () => {
  assert.equal(products.length, 17);
  assert.equal(products.filter((p) => p.kind === "cap").length, 1);
  assert.equal(products.filter((p) => p.kind === "faculty-cap").length, 10);
  for (const p of products) {
    assert.equal(p.dimensions.length, 3);
    assert(p.dimensions.every((n) => n > 0));
    for (const file of p.kind === "cap" ? [] : [p.model, p.openModel]) {
      const buffer = await fs.readFile(path.join("public", file));
      assert.equal(buffer.toString("ascii", 0, 4), "glTF");
      assert.equal(buffer.readUInt32LE(4), 2);
      assert.equal(buffer.readUInt32LE(8), buffer.length);
    }
    if (p.kind === "cap" || p.kind === "faculty-cap") {
      assert(p.preset);
      for (const key of [
        "structureColor",
        "middleColor",
        "lineColor",
        "textColor",
      ]) {
        assert.match(p.preset[key], /^#[0-9a-f]{6}$/i);
        assert(allowed.has(p.preset[key]), `${p.slug}: unsupported ${key}`);
      }
    }
    assert((await fs.stat(path.join("public", p.image))).size < 100_000);
    const html = await readPage(`/products/${p.slug}/`);
    assert(html.includes(p.name));
    assert(html.includes(p.description.replaceAll("’", "’")));
  }
});
test("All product color surfaces use the nine printable filament colors", async () => {
  assert.equal(allowed.size, 9);
  for (const file of [
    "src/components/viewer.tsx",
    "src/components/cap-configurator.tsx",
  ])
    assert.doesNotMatch(await fs.readFile(file, "utf8"), /type=["']color["']/);
  const rgbSet = new Set(
    palette.map((p) =>
      [1, 3, 5].map((i) => parseInt(p.hex.slice(i, i + 2), 16)).join(",")
    )
  );
  for (const p of products.filter((p) => p.kind !== "cap"))
    for (const file of [p.model, p.openModel]) {
      const b = await fs.readFile("public" + file),
        len = b.readUInt32LE(12),
        j = JSON.parse(b.subarray(20, 20 + len)),
        bin = b.subarray(28 + len);
      for (const mesh of j.meshes)
        for (const primitive of mesh.primitives) {
          const a = j.accessors[primitive.attributes.COLOR_0],
            v = j.bufferViews[a.bufferView],
            offset = (v.byteOffset || 0) + (a.byteOffset || 0),
            stride = v.byteStride || 4;
          for (let i = 0; i < a.count; i++)
            assert(
              rgbSet.has(
                [
                  ...bin.subarray(offset + i * stride, offset + i * stride + 3),
                ].join(",")
              ),
              `${file}: unsupported mesh color`
            );
        }
    }
});
test("Runtime is database-free and the converted CAD preserves dimensions", async () => {
  const meshes = JSON.parse(
    await fs.readFile("public/models/tocco-meshes.json", "utf8")
  );
  const bounds = [
    [Infinity, -Infinity],
    [Infinity, -Infinity],
    [Infinity, -Infinity],
  ];
  for (const mesh of meshes)
    for (let i = 0; i < mesh.attributes.position.array.length; i++) {
      const v = mesh.attributes.position.array[i];
      bounds[i % 3][0] = Math.min(bounds[i % 3][0], v);
      bounds[i % 3][1] = Math.max(bounds[i % 3][1], v);
    }
  assert.deepEqual(
    bounds.map(([min, max]) => max - min),
    [65, 65, 37]
  );
  for (const file of [
    "src/components/cap-configurator.tsx",
    "src/lib/configurator/assets.ts",
    "src/components/viewer.tsx",
  ]) {
    const code = await fs.readFile(file, "utf8");
    assert.doesNotMatch(
      code,
      /localhost:9000|MEDUSA_|uploadGraduationFavorAssets|addToCart|\/api\//
    );
  }
});
test("Sitemap exposes the full catalog and purchase endpoints are absent", async () => {
  const sitemap = await fs.readFile("out/sitemap.xml", "utf8");
  assert.equal((sitemap.match(/<loc>/g) || []).length, pages.length);
  for (const route of pages) assert(sitemap.includes(`${route}</loc>`), route);
  const robots = await fs.readFile("out/robots.txt", "utf8");
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap:/);
  for (const route of ["cart", "checkout", "account", "api"])
    await assert.rejects(fs.access(`out/${route}`));
});
