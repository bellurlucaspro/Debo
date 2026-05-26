"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { loginSchema } from "@/schemas/auth";

const FIELD =
  "w-full border-b border-border bg-transparent py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError("Identifiants invalides.");
      return;
    }

    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (res?.error) {
      setError("E-mail ou mot de passe incorrect.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <Link
        href="/"
        className="font-serif text-2xl tracking-[0.25em] text-foreground"
        aria-label="DEBO — Accueil"
      >
        DEBO
      </Link>
      <p className="kicker mt-12">Espace privé</p>
      <h1 className="mt-4 font-serif text-4xl">Connexion</h1>

      <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-6">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Adresse e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={FIELD}
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={FIELD}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Connexion…" : "Se connecter"}
        </Button>
      </form>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        Démo administrateur : <span className="text-foreground">admin@debo.com</span>{" "}
        / <span className="text-foreground">ChangeMe!2026</span>
      </p>
      <Link
        href="/"
        className="mt-4 inline-block text-xs uppercase tracking-luxe text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Retour à la boutique
      </Link>
    </div>
  );
}
