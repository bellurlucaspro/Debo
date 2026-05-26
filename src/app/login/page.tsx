import { Suspense } from "react";
import Image from "next/image";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { HERO } from "@/lib/images";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Volet image (desktop) */}
      <div className="relative hidden overflow-hidden bg-midnight lg:block">
        <Image
          src={HERO.pearls}
          alt="Perles et pierres façonnées à la main"
          fill
          sizes="50vw"
          className="object-cover opacity-70"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <p className="font-serif text-3xl leading-snug text-offwhite">
            « La lumière entre, rebondit, ressort transformée. »
          </p>
          <p className="mt-3 text-[11px] uppercase tracking-luxe text-offwhite/60">
            DEBO — Clarisse Debost, lapidaire
          </p>
        </div>
      </div>

      {/* Volet formulaire */}
      <div className="grid place-items-center bg-background px-6 py-20">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
