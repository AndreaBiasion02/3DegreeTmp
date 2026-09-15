import type { MetadataRoute } from "next";
import products from "@/lib/products.json";
import collections from "@/lib/collections.json";
import { absolute } from "@/lib/seo";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "/",
    "/collections/laurea/",
    ...collections.map(c => `/collections/${c.slug}/`),
    ...products.map((p) => `/products/${p.slug}/`),
  ].map((path) => ({ url: absolute(path) }));
}
