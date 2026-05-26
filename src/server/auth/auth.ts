import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { loginSchema } from "@/schemas/auth";
import { authConfig } from "@/server/auth/auth.config";

/**
 * Full Node-runtime Auth.js instance. Combines the edge-safe base config with
 * the Credentials provider (bcrypt + Prisma lookup) and optional Google OAuth.
 *
 * Sessions are JWT-based (required for Credentials), but the Prisma adapter is
 * still attached so OAuth account linking and User records are persisted.
 */
const googleEnabled = !!env.AUTH_GOOGLE_ID && !!env.AUTH_GOOGLE_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  secret: env.AUTH_SECRET,
  providers: [
    ...(googleEnabled
      ? [
          Google({
            clientId: env.AUTH_GOOGLE_ID,
            clientSecret: env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        // Constant-ish behavior: reject if no user or no password set (OAuth-only).
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
});
