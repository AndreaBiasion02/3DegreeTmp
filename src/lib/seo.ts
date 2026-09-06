import type { Metadata } from "next";
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:8001"
).replace(/\/$/, "");
export function metadata(
  title: string,
  description: string,
  path: string,
  image = "/hero-image.webp"
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "3Degree",
      locale: "it_IT",
      type: "website",
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
export const absolute = (path: string) => `${siteUrl}${path}`;
