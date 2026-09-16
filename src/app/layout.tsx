import type { Metadata } from "next";
import { Nav, Footer } from "@/components/navigation";
import Schema from "@/components/schema";
import { siteUrl, absolute } from "@/lib/seo";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "3Degree | Il tuo traguardo, in 3D",
    template: "%s | 3Degree",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <a href="#main" className="skip-link">
          Vai al contenuto
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        <Schema
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": absolute("/#organization"),
            name: "3Degree",
            url: siteUrl,
            logo: absolute("/logo.png"),
            email: "info@3degreelab.com",
            sameAs: [
              "https://www.instagram.com/3degree_lab/",
              "https://www.tiktok.com/@3degree.lab",
            ],
          }}
        />
      </body>
    </html>
  );
}
