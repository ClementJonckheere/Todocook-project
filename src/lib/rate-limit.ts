/**
 * Limiteur de débit en mémoire (fenêtre fixe), suffisant pour une instance unique.
 * Pour plusieurs instances, remplacer le stockage par Redis ou une table Postgres.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      buckets.forEach((value, bucketKey) => {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      });
    }
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function resetRateLimits() {
  buckets.clear();
}

/** Adresse du client (premier élément de X-Forwarded-For derrière un proxy). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function tooManyRequests(retryAfterSeconds: number) {
  return Response.json(
    { error: "Trop de tentatives. Réessayez plus tard." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
