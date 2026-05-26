import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

/**
 * Upstash Redis REST client. Used for guest cart caching and rate-limiting.
 * REST-based so it works in both Node and Edge runtimes.
 */
export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

/** Namespaced key helpers keep the Redis keyspace organized and collision-free. */
export const redisKeys = {
  guestCart: (cartId: string) => `cart:guest:${cartId}`,
  rateLimit: (scope: string, id: string) => `rl:${scope}:${id}`,
} as const;

/** Default TTL for a guest cart: 7 days (in seconds). */
export const GUEST_CART_TTL = 60 * 60 * 24 * 7;

/**
 * Indique si une vraie instance Redis est configurée (par opposition aux
 * valeurs factices de l'aperçu local). Quand c'est `false`, le panier invité
 * bascule sur un repli cookie signé — voir src/server/actions/cart.ts.
 */
export const redisConfigured =
  !/preview\.upstash\.io/i.test(env.UPSTASH_REDIS_REST_URL) &&
  env.UPSTASH_REDIS_REST_TOKEN !== "preview_dummy_token";
