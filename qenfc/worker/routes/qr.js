import { getDb } from '../lib/db.js'
import { getSessionUser } from '../lib/session.js'
import { json } from '../lib/response.js'
import { checkRateLimit } from '../lib/rateLimit.js'
import { normalizeWhatsApp } from '../lib/normalize.js'

const PORTFOLIO_FIELDS = [
  'business_name',
  'google_review_link',
  'phone',
  'whatsapp',
  'email',
  'website',
  'instagram',
  'facebook',
  'twitter_x',
  'tiktok',
  'youtube',
  'linkedin',
  'address',
  'logo_url',
  'theme_color',
]

function sanitizePortfolio(body) {
  const data = {}
  for (const f of PORTFOLIO_FIELDS) {
    data[f] = (body[f] ?? '').toString().trim().slice(0, 500)
  }
  data.whatsapp = normalizeWhatsApp(data.whatsapp)
  return data
}

async function upsertPortfolio(sql, qrCodeId, data) {
  await sql`
    INSERT INTO portfolios (
      qr_code_id, business_name, google_review_link, phone, whatsapp, email, website,
      instagram, facebook, twitter_x, tiktok, youtube, linkedin, address, logo_url, theme_color, updated_at
    )
    VALUES (
      ${qrCodeId}, ${data.business_name}, ${data.google_review_link}, ${data.phone}, ${data.whatsapp},
      ${data.email}, ${data.website}, ${data.instagram}, ${data.facebook}, ${data.twitter_x}, ${data.tiktok},
      ${data.youtube}, ${data.linkedin}, ${data.address}, ${data.logo_url}, ${data.theme_color}, now()
    )
    ON CONFLICT (qr_code_id) DO UPDATE SET
      business_name = EXCLUDED.business_name,
      google_review_link = EXCLUDED.google_review_link,
      phone = EXCLUDED.phone,
      whatsapp = EXCLUDED.whatsapp,
      email = EXCLUDED.email,
      website = EXCLUDED.website,
      instagram = EXCLUDED.instagram,
      facebook = EXCLUDED.facebook,
      twitter_x = EXCLUDED.twitter_x,
      tiktok = EXCLUDED.tiktok,
      youtube = EXCLUDED.youtube,
      linkedin = EXCLUDED.linkedin,
      address = EXCLUDED.address,
      logo_url = EXCLUDED.logo_url,
      theme_color = EXCLUDED.theme_color,
      updated_at = now()
  `
}

// GET /api/qr/:code — public, no auth, not rate limited (this is the page visitors see).
export async function getQr(request, env, code) {
  const sql = getDb(env)
  const rows = await sql`
    SELECT q.id, q.code, q.is_active, q.claimed_by,
           p.business_name, p.google_review_link, p.phone, p.whatsapp, p.email, p.website,
           p.instagram, p.facebook, p.twitter_x, p.tiktok, p.youtube, p.linkedin,
           p.address, p.logo_url, p.theme_color
    FROM qr_codes q
    LEFT JOIN portfolios p ON p.qr_code_id = q.id
    WHERE q.code = ${code}
    LIMIT 1
  `
  if (!rows.length) return json({ status: 'not_found' }, { status: 404 })
  const row = rows[0]
  if (!row.is_active) return json({ status: 'inactive' }, { status: 410 })
  if (!row.claimed_by) return json({ status: 'unclaimed' })
  return json({ status: 'claimed', portfolio: row })
}

// PUT /api/qr/:code — owner only, edits an already-claimed page.
export async function updateQr(request, env, code) {
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb(env)
  const rows = await sql`SELECT * FROM qr_codes WHERE code = ${code} LIMIT 1`
  if (!rows.length) return json({ error: 'Not found' }, { status: 404 })
  const qr = rows[0]
  if (qr.claimed_by !== user.id) return json({ error: 'Forbidden' }, { status: 403 })
  if (!qr.is_active) return json({ error: 'This QR code is inactive' }, { status: 410 })

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body' }, { status: 400 })
  }
  const data = sanitizePortfolio(body)
  if (!data.business_name) return json({ error: 'Business name is required' }, { status: 400 })

  await upsertPortfolio(sql, qr.id, data)
  return json({ ok: true })
}

// POST /api/qr/claim — logged-in user claims an unclaimed code with its key.
export async function claimQr(request, env) {
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 })

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const sql = getDb(env)

  const allowed = await checkRateLimit(sql, { ip, bucket: 'claim', limit: 10, windowSeconds: 600 })
  if (!allowed) return json({ error: 'Too many attempts. Please try again in a few minutes.' }, { status: 429 })

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body' }, { status: 400 })
  }

  const code = (body.code || '').toString().trim()
  const key = (body.key || '').toString().trim()
  if (!code || !key) return json({ error: 'Code and key are required' }, { status: 400 })

  const rows = await sql`SELECT * FROM qr_codes WHERE code = ${code} LIMIT 1`
  if (!rows.length) return json({ error: 'Invalid QR code' }, { status: 404 })
  const qr = rows[0]
  if (!qr.is_active) return json({ error: 'This QR code is inactive' }, { status: 410 })
  if (qr.claimed_by) return json({ error: 'This QR code has already been claimed' }, { status: 409 })
  if (qr.claim_key !== key) return json({ error: 'Incorrect key' }, { status: 401 })

  const data = sanitizePortfolio(body)
  if (!data.business_name) return json({ error: 'Business name is required' }, { status: 400 })

  await sql`UPDATE qr_codes SET claimed_by = ${user.id}, claimed_at = now() WHERE id = ${qr.id}`
  await upsertPortfolio(sql, qr.id, data)

  return json({ ok: true, code: qr.code })
}
