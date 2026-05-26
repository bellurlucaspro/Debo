import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

/**
 * Sliding-window rate limiters backed by Upstash. Each protected surface gets
 * its own limiter so abuse of one endpoint can't starve another.
 */
export const rateLimiters = {
  // Auth: 10 attempts / 60s per identifier (mitigates credential stuffing).
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    prefix: "rl:auth",
    analytics: true,
  }),
  // Checkout: 20 payment-intent creations / 60s.
  checkout: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "60 s"),
    prefix: "rl:checkout",
    analytics: true,
  }),
  // Newsletter signup: 5 / 60s to stop spam subscriptions.
  newsletter: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "60 s"),
    prefix: "rl:newsletter",
    analytics: true,
  }),
} as const;

/**
 * Convenience wrapper. Returns `{ success }` plus rate-limit metadata.
 * Throws no errors so callers stay in control of the response shape.
 */
export async function enforceRateLimit(
  limiter: keyof typeof rateLimiters,
  identifier: string
) {
  return rateLimiters[limiter].limit(identifier);
}
