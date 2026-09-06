import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const products = JSON.parse(await fs.readFile("src/lib/products.json", "utf8"));
const pages = [
  "/",
  "/collections/laurea/",
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
test("All six supplied models have valid binary glTFs and optimized images", async () => {
  assert.equal(products.length, 6);
  for (const p of products) {
    assert.equal(p.dimensions.length, 3);
    assert(p.dimensions.every((n) => n > 0));
    for (const file of [p.model, p.openModel]) {
      const buffer = await fs.readFile(path.join("public", file));
      assert.equal(buffer.toString("ascii", 0, 4), "glTF");
      assert.equal(buffer.readUInt32LE(4), 2);
      assert.equal(buffer.readUInt32LE(8), buffer.length);
    }
    assert((await fs.stat(path.join("public", p.image))).size < 100_000);
    const html = await readPage(`/products/${p.slug}/`);
    assert(html.includes(p.name));
    assert(html.includes(p.description.replaceAll("’", "’")));
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
