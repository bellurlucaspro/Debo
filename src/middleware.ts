import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/auth.config";

/**
 * Edge middleware uses ONLY the edge-safe config (no Prisma/bcrypt). The
 * `authorized` callback in authConfig enforces route-level RBAC:
 *   /admin/*    → ADMIN only
 *   /account/*  → any authenticated user
 *   /checkout/* → any authenticated user
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Run on everything except static assets and the auth API itself.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|brand|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
