import { z } from "zod";

/**
 * Centralized, fail-fast environment validation.
 * Server secrets live in `serverSchema`; only NEXT_PUBLIC_* values are exposed
 * to the client via `clientSchema`. Importing this module throws immediately
 * when a required variable is missing or malformed — no silent undefined.
 */

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  AUTH_URL: z.string().url().optional(),
  AUTH_GOOGLE_ID: z.string().optional().default(""),
  AUTH_GOOGLE_SECRET: z.string().optional().default(""),

  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),

  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  RESEND_API_KEY: z.string().startsWith("re_"),
  EMAIL_FROM: z.string().min(3),

  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
});

/**
 * Client variables must be referenced statically so Next.js can inline them
 * into the browser bundle at build time.
 */
const clientEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
};

const isServer = typeof window === "undefined";

function formatErrors(error: z.ZodError): string {
  return error.errors
    .map((e) => `  • ${e.path.join(".")}: ${e.message}`)
    .join("\n");
}

const parsedClient = clientSchema.safeParse(clientEnv);
if (!parsedClient.success) {
  throw new Error(
    `❌ Invalid public environment variables:\n${formatErrors(parsedClient.error)}`
  );
}

let serverEnv: z.infer<typeof serverSchema> | undefined;
if (isServer) {
  const parsedServer = serverSchema.safeParse(process.env);
  if (!parsedServer.success) {
    throw new Error(
      `❌ Invalid server environment variables:\n${formatErrors(parsedServer.error)}`
    );
  }
  serverEnv = parsedServer.data;
}

/**
 * Unified, typed accessor. Server fields are only populated on the server.
 * Accessing a server-only field in the browser throws to prevent leaks.
 */
export const env = new Proxy(
  {
    ...parsedClient.data,
    ...(serverEnv ?? {}),
  } as z.infer<typeof clientSchema> & z.infer<typeof serverSchema>,
  {
    get(target, prop: string) {
      if (
        !isServer &&
        !(prop in clientSchema.shape) &&
        prop.startsWith("NEXT_PUBLIC_") === false
      ) {
        throw new Error(
          `❌ Attempted to access server-only env "${prop}" on the client.`
        );
      }
      return target[prop as keyof typeof target];
    },
  }
);
