import { getSessionUser } from '../lib/session.js'
import { json } from '../lib/response.js'
import { checkRateLimit } from '../lib/rateLimit.js'
import { getDb } from '../lib/db.js'
import { extractFeatureIdPair, featureIdToPlaceId } from '../lib/googlePlace.js'

// Only ever fetch Google Maps domains server-side — this endpoint takes a
// user-supplied URL, so an allowlist keeps it from being usable as an open
// proxy/SSRF vector.
const ALLOWED_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl', 'maps.google.com', 'www.google.com', 'google.com'])

export async function reviewLinkFromMaps(request, env, url) {
  // Requires any logged-in session (not admin-only) — this is a helper for
  // whoever is filling in the portfolio form.
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 })

  const input = url.searchParams.get('url')
  if (!input) return json({ error: 'Missing url' }, { status: 400 })

  let parsed
  try {
    parsed = new URL(input)
  } catch {
    return json({ error: "That doesn't look like a valid link" }, { status: 400 })
  }
  const hostOk =
    ALLOWED_HOSTS.has(parsed.hostname) &&
    (parsed.hostname !== 'www.google.com' && parsed.hostname !== 'google.com' ? true : parsed.pathname.startsWith('/maps'))
  if (!hostOk) {
    return json({ error: 'Please paste a Google Maps link (maps.app.goo.gl or google.com/maps)' }, { status: 400 })
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const sql = getDb(env)
  const allowed = await checkRateLimit(sql, { ip, bucket: 'review-link', limit: 20, windowSeconds: 600 })
  if (!allowed) return json({ error: 'Too many attempts. Please try again in a few minutes.' }, { status: 429 })

  let finalUrl
  try {
    const res = await fetch(parsed.toString(), { redirect: 'follow' })
    finalUrl = res.url || parsed.toString()
  } catch {
    return json({ error: 'Could not open that link. Double-check it and try again.' }, { status: 502 })
  }

  const pair = extractFeatureIdPair(finalUrl)
  if (!pair) {
    return json(
      {
        error:
          "Couldn't find place details in that link. Open the business in Google Maps, tap Share, copy that link, and try again.",
      },
      { status: 422 }
    )
  }

  const placeId = featureIdToPlaceId(pair.hi, pair.lo)
  const reviewLink = `https://search.google.com/local/writereview?placeid=${placeId}`
  return json({ placeId, reviewLink })
}
