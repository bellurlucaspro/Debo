import type { Metadata, Viewport } from "next";
import { fontSerif, fontSans } from "@/lib/fonts";
import { Providers } from "@/components/providers/Providers";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { Preloader } from "@/components/system/Preloader";
import { CursorLight } from "@/components/system/CursorLight";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { HideOnPaths } from "@/components/system/HideOnPaths";
import "./globals.css";

// Routes sans le chrome storefront (header/footer/preloader/panier).
const BARE_ROUTES = ["/admin", "/login"];

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "DEBO — Perles facettées & Haute joaillerie",
    template: "%s · DEBO",
  },
  description:
    "DEBO, maison de Clarisse Debost, lapidaire : perles de culture facettées, pierres précieuses taillées à la main et haute joaillerie sur-mesure. Lumière, ombre et précision.",
  keywords: [
    "DEBO",
    "perle facettée",
    "perle de culture",
    "haute joaillerie",
    "pierre précieuse",
    "bijou sur-mesure",
    "lapidaire",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: APP_URL,
    siteName: "DEBO",
    title: "DEBO — Perles facettées & Haute joaillerie",
    description:
      "Perles de culture facettées, pierres précieuses et haute joaillerie sur-mesure. Lumière, ombre et précision.",
  },
  twitter: { card: "summary_large_image", title: "DEBO" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#D2CDC3" },
    { media: "(prefers-color-scheme: dark)", color: "#D2CDC3" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${fontSerif.variable} ${fontSans.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        {/* Pose le thème avant le paint pour éviter tout flash (FOUC). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('debo-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        <Providers>
          <HideOnPaths prefixes={BARE_ROUTES}>
            <Preloader />
            <CartDrawer />
          </HideOnPaths>
          <CursorLight />
          <SmoothScroll>
            <div className="relative flex min-h-dvh flex-col">
              <HideOnPaths prefixes={BARE_ROUTES}>
                <Header />
              </HideOnPaths>
              <main className="flex-1">{children}</main>
              <HideOnPaths prefixes={BARE_ROUTES}>
                <Footer />
              </HideOnPaths>
            </div>
          </SmoothScroll>
        </Providers>
      </body>
    </html>
  );
}
