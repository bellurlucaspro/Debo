import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Module augmentation so `session.user.role` / `session.user.id` are fully
 * typed throughout the app and in RBAC guards.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
