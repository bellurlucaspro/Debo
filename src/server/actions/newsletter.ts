"use server";

import { randomUUID } from "crypto";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { newsletterSchema, type NewsletterInput } from "@/schemas/newsletter";

type NewsletterResult = { ok: boolean; message: string };

/**
 * Inscription à la newsletter en double opt-in.
 * Étape 1 (ici) : on enregistre l'abonné au statut PENDING avec un token de
 * confirmation unique. L'e-mail de confirmation contenant le lien
 * /api/newsletter/confirm?token=… est expédié par le service Resend, branché
 * au Bloc 5. La confirmation fera passer le statut à CONFIRMED.
 */
export async function subscribeToNewsletter(
  input: NewsletterInput
): Promise<NewsletterResult> {
  const parsed = newsletterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Adresse e-mail invalide." };
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = await enforceRateLimit("newsletter", `news:${ip}`);
  if (!success) {
    return { ok: false, message: "Trop de tentatives. Réessayez plus tard." };
  }

  const email = parsed.data.email.toLowerCase();
  const source = parsed.data.source ?? "footer_widget";

  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email },
  });

  if (existing?.status === "CONFIRMED") {
    return { ok: true, message: "Vous êtes déjà inscrit(e). Merci !" };
  }

  const confirmToken = randomUUID();
  await prisma.newsletterSubscriber.upsert({
    where: { email },
    update: { status: "PENDING", confirmToken, source },
    create: { email, status: "PENDING", confirmToken, source },
  });

  return {
    ok: true,
    message:
      "Merci ! Un e-mail de confirmation va vous être envoyé pour valider votre inscription.",
  };
}
