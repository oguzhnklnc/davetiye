import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "Özdil & Hüseyin | Düğün Davetiyesi";
  const description = "24 Ekim 2026 Cumartesi günü Barida Hotel'de mutluluğumuza eşlik edin.";
  return {
    metadataBase: new URL(origin),
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", locale: "tr_TR", images: [{ url: `${origin}/og.png`, width: 1536, height: 901, alt: "Özdil ve Hüseyin düğün davetiyesi" }] },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
