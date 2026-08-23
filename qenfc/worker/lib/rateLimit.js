/**
 * A small, dependency-free rate limiter backed by the `rate_limits` table.
 * Good enough for protecting sensitive write endpoints (like claiming a QR
 * code) from brute-forcing or spam, without needing a separate KV store.
 *
 * Returns true if the request is allowed, false if it should be rejected.
 */
export async function checkRateLimit(sql, { ip, bucket, limit, windowSeconds }) {
  const rows = await sql`
    SELECT count(*)::int AS c
    FROM rate_limits
    WHERE ip = ${ip}
      AND bucket = ${bucket}
      AND created_at > now() - (${windowSeconds} * interval '1 second')
  `
  const count = rows[0]?.c || 0
  if (count >= limit) return false
  await sql`INSERT INTO rate_limits (ip, bucket) VALUES (${ip}, ${bucket})`
  return true
}
