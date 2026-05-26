"use server";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { customRequestSchema, type CustomRequest } from "@/schemas/custom";

/**
 * Réception d'une demande de devis sur-mesure.
 * Persiste la demande + la fiche technique lapidaire (angles, mesures, programme
 * de facettage) dans `DevisRequest` → consultable dans l'admin.
 */
export async function submitCustomRequest(raw: CustomRequest) {
  const parsed = customRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, message: "Formulaire incomplet ou invalide." };
  }
  const d = parsed.data;
  const spec = d.gemSpec;

  try {
    await prisma.devisRequest.create({
      data: {
        contactName: d.name,
        contactEmail: d.email,
        phone: d.phone,
        gemKind: d.gemKind,
        stone: d.stone,
        cut: d.cut,
        mounting: d.mounting,
        material: d.material,
        goldCarat: d.carat,
        grammage: d.grammage,
        occasion: d.occasion,
        message: d.message,
        inspirationCount: d.inspirationCount,
        caratWeight: spec?.caratWeight,
        diameterMm: spec?.diameterMm,
        lengthMm: spec?.lengthMm,
        depthMm: spec?.depthMm,
        tablePercent: spec?.tablePercent ?? undefined,
        crownAngle: spec?.crownAngleDeg ?? undefined,
        pavilionAngle: spec?.pavilionAngleDeg ?? undefined,
        mainFacets: spec?.mainFacets,
        girdleFacets: spec?.girdleFacets,
        spec: spec ? (spec as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (err) {
    // On ne bloque pas le client : on journalise pour ne rien perdre.
    console.error("[DEVIS] échec persistance :", err);
    console.info("[DEVIS payload]", JSON.stringify(d));
  }

  return {
    ok: true as const,
    message:
      "Votre demande est envoyée. Clarisse Debost vous recontacte avec un devis et des gouachés.",
  };
}
