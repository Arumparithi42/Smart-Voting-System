const buckets = new Map();

// Minimal in-memory fixed-window rate limiter, keyed by IP + a route
// label. Good enough for a single-process dev/demo deployment; a real
// multi-instance production deployment would want a shared store (e.g.
// Redis) instead, since this resets on process restart and isn't shared
// across instances.
export function simpleRateLimit({ windowMs, max, keyPrefix }) {
  return (req, res, next) => {
    const key = `${keyPrefix}:${req.ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      const waitSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      return res.status(429).json({ message: `Too many requests. Please try again in ${waitSeconds}s.` });
    }

    bucket.count += 1;
    next();
  };
}
