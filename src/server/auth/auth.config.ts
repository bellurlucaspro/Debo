import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Edge-safe Auth.js configuration.
 *
 * This file contains NO database or Node-only imports (bcrypt, Prisma) so it
 * can run inside the Edge middleware. The Credentials provider with its DB
 * lookup is added later in `auth.ts`, which runs in the Node runtime.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [], // concrete providers are attached in auth.ts
  callbacks: {
    /**
     * Route protection used by the middleware. Returning false redirects
     * unauthenticated users to the sign-in page; admins-only paths are guarded
     * here too.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const { pathname } = nextUrl;

      const isAdminRoute = pathname.startsWith("/admin");
      const isAccountRoute = pathname.startsWith("/account");
      // NB : /checkout reste accessible aux invités (checkout sans compte).

      if (isAdminRoute) {
        return isLoggedIn && role === "ADMIN";
      }
      if (isAccountRoute) {
        return isLoggedIn;
      }
      return true;
    },
    jwt({ token, user }) {
      // On sign-in, persist id + role into the token.
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
