import type { NextFunction, Request, Response } from "express";

// Simple in-memory rate limiter (per-process). Good for small deployments.
// For production at scale, replace with a shared store (Redis) or a library like express-rate-limit.
type Options = {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
  statusCode?: number;
};

type Counter = { count: number; startsAt: number };

const buckets = new Map<string, Counter>();

export function rateLimit(options: Options) {
  const {
    windowMs,
    max,
    keyGenerator = (req) => req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown",
    message = "Too many requests",
    statusCode = 429,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const entry = buckets.get(key);

    if (!entry || now - entry.startsAt > windowMs) {
      buckets.set(key, { count: 1, startsAt: now });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(statusCode).json({ error: message });
    }

    buckets.set(key, entry);
    next();
  };
}
