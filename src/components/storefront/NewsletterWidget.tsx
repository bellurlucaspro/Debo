"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check } from "lucide-react";

import { subscribeToNewsletter } from "@/server/actions/newsletter";
import { newsletterSchema } from "@/schemas/newsletter";
import { cn } from "@/lib/utils";

/**
 * Widget d'inscription newsletter (double opt-in).
 * Validation Zod côté client avant l'appel de la Server Action.
 */
export function NewsletterWidget({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = newsletterSchema.safeParse({ email, source: "footer_widget" });
    if (!parsed.success) {
      setStatus("error");
      setMessage("Adresse e-mail invalide.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await subscribeToNewsletter(parsed.data);
        setStatus(res.ok ? "ok" : "error");
        setMessage(res.message);
        if (res.ok) setEmail("");
      } catch {
        setStatus("error");
        setMessage("Une erreur est survenue. Réessayez plus tard.");
      }
    });
  }

  const confirmed = status === "ok";

  return (
    <div className={cn("w-full max-w-sm", className)}>
      <p className="eyebrow">Newsletter</p>
      <p className="mt-3 font-serif text-xl leading-snug">
        L'avant-première de nos collections, sans le bruit.
      </p>

      <form onSubmit={onSubmit} className="mt-5">
        <div className="flex items-center border-b border-foreground/30 focus-within:border-foreground">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status !== "idle") setStatus("idle");
            }}
            placeholder="vous@exemple.com"
            aria-label="Votre adresse e-mail"
            disabled={pending || confirmed}
            className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending || confirmed}
            aria-label="S'inscrire"
            className="grid size-9 shrink-0 place-items-center transition-transform hover:translate-x-0.5 disabled:opacity-40"
          >
            {confirmed ? (
              <Check className="size-4" strokeWidth={1.6} />
            ) : (
              <ArrowRight className="size-4" strokeWidth={1.6} />
            )}
          </button>
        </div>
      </form>

      {message && (
        <p
          role="status"
          className={cn(
            "mt-3 text-xs",
            status === "ok" ? "text-muted-foreground" : "text-destructive"
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
