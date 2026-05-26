"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { registerSchema, type RegisterInput } from "@/schemas/auth";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Customer self-registration. Hashes the password with bcrypt, enforces a
 * rate limit keyed on client IP, and never reveals whether an email already
 * exists beyond a generic message.
 */
export async function registerUser(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation échouée",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = await enforceRateLimit("auth", `register:${ip}`);
  if (!success) {
    return { ok: false, error: "Trop de tentatives. Réessayez plus tard." };
  }

  const { name, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: "CUSTOMER",
      },
    });
    return { ok: true };
  } catch (e) {
    // Unique constraint on email → generic message (no account enumeration).
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        ok: false,
        error: "Impossible de créer le compte avec ces informations.",
      };
    }
    throw e;
  }
}
