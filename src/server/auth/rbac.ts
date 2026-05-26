import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/server/auth/auth";

/**
 * Role-Based Access Control helpers for Server Components and Server Actions.
 * These run server-side only and are the single source of truth for "who can
 * do what" — UI hiding is cosmetic; these guards are the real enforcement.
 */

export class AuthorizationError extends Error {
  constructor(message = "Action non autorisée") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Returns the current session or null. */
export async function getCurrentSession() {
  return auth();
}

/** Returns the authenticated user or redirects to /login. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}

/** Returns the user if they hold the required role, otherwise redirects. */
export async function requireRole(role: Role) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== role) {
    redirect("/");
  }
  return session.user;
}

/** Convenience admin guard for the Control Tower. */
export async function requireAdmin() {
  return requireRole("ADMIN");
}

/**
 * Non-redirecting assertion for use inside Server Actions, where throwing is
 * preferable to a navigation side effect.
 */
export async function assertAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new AuthorizationError("Réservé aux administrateurs");
  }
  return session.user;
}
