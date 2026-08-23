import { neon } from '@neondatabase/serverless'

/**
 * Returns a tagged-template SQL function bound to this request's env.
 * Neon's serverless driver talks to the database over HTTP/fetch, so it
 * works in Cloudflare Workers without any TCP connection or connection pool
 * to manage — nothing to keep alive, nothing to host yourself.
 */
export function getDb(env) {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add it under Worker Settings > Variables and Secrets.')
  }
  return neon(env.DATABASE_URL)
}
