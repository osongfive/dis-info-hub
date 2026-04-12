import { NextRequest } from 'next/server';

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const cache = new Map<string, { count: number; expires: number }>();

/**
 * Basic in-memory rate limiter for Next.js API routes.
 * 
 * @param req The NextRequest object
 * @param config Configuration for limit and window
 * @returns { success: boolean, remaining: number, reset: number }
 */
export function rateLimit(req: NextRequest, config: RateLimitConfig = { limit: 10, windowMs: 60000 }) {
  // @ts-ignore - 'ip' is available in Next.js runtime but sometimes missing in older @types/node
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'anonymous';

  const key = `ratelimit_${ip}`;
  const now = Date.now();
  
  const entry = cache.get(key);
  
  if (!entry || now > entry.expires) {
    const newEntry = {
      count: 1,
      expires: now + config.windowMs,
    };
    cache.set(key, newEntry);
    return {
      success: true,
      remaining: config.limit - 1,
      reset: newEntry.expires,
    };
  }
  
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      reset: entry.expires,
    };
  }
  
  entry.count += 1;
  return {
    success: true,
    remaining: config.limit - entry.count,
    reset: entry.expires,
  };
}

/**
 * Cleans up expired entries from the cache to prevent memory leaks.
 */
export function cleanupRateLimitCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expires) {
      cache.delete(key);
    }
  }
}
