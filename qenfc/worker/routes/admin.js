import { getDb } from '../lib/db.js'
import { requireAdmin } from '../lib/session.js'
import { json } from '../lib/response.js'
import { normalizeWhatsApp } from '../lib/normalize.js'

function randomCode(len = 5) {
  const digits = '0123456789'
  let s = ''
  for (let i = 0; i < len; i++) s += digits[Math.floor(Math.random() * digits.length)]
  return s
}

// Excludes visually-confusing characters (0/O, 1/I/L) since this gets printed and typed by hand.
function randomKey(len = 8) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export async function stats(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return json({ error: auth.error }, { status: auth.status })

  const sql = getDb(env)
  const rows = await sql`
    SELECT
      (SELECT count(*)::int FROM qr_codes) AS total_qrs,
      (SELECT count(*)::int FROM qr_codes WHERE claimed_by IS NOT NULL) AS claimed_qrs,
      (SELECT count(*)::int FROM qr_codes WHERE is_active = false) AS inactive_qrs,
      (SELECT count(*)::int FROM users) AS total_users
  `
  return json({ stats: rows[0] })
}

export async function users(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return json({ error: auth.error }, { status: auth.status })

  const sql = getDb(env)
  const rows = await sql`
    SELECT u.id, u.email, u.name, u.created_at, count(q.id)::int AS qr_count
    FROM users u
    LEFT JOIN qr_codes q ON q.claimed_by = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT 500
  `
  return json({ users: rows })
}

export async function listQrs(request, env, url) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return json({ error: auth.error }, { status: auth.status })

  const search = url.searchParams.get('q') || ''
  const pattern = `%${search}%`
  const sql = getDb(env)
  const rows = await sql`
    SELECT q.id, q.code, q.claim_key, q.is_active, q.claimed_at,
           u.email AS claimed_by_email, p.business_name
    FROM qr_codes q
    LEFT JOIN users u ON u.id = q.claimed_by
    LEFT JOIN portfolios p ON p.qr_code_id = q.id
    WHERE q.code ILIKE ${pattern}
       OR COALESCE(p.business_name, '') ILIKE ${pattern}
       OR COALESCE(u.email, '') ILIKE ${pattern}
    ORDER BY q.id DESC
    LIMIT 300
  `
  return json({ qrs: rows })
}

// POST /api/admin/qrs — generate 1-200 new code/key pairs for manufacturing.
export async function createQrs(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return json({ error: auth.error }, { status: auth.status })

  let body
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const count = Math.min(Math.max(parseInt(body.count, 10) || 1, 1), 200)
  const sql = getDb(env)
  const created = []

  for (let i = 0; i < count; i++) {
    const useCustom = count === 1 && body.code
    let code = useCustom ? String(body.code).trim() : randomCode()
    let key = useCustom && body.key ? String(body.key).trim() : randomKey()
    let inserted = false
    let attempts = 0
    while (!inserted && attempts < 6) {
      try {
        await sql`INSERT INTO qr_codes (code, claim_key) VALUES (${code}, ${key})`
        inserted = true
      } catch {
        attempts++
        if (useCustom) break // don't silently change a code the admin chose on purpose
        code = randomCode()
      }
    }
    if (inserted) created.push({ code, key })
  }

  return json({ created })
}

// PUT /api/admin/qrs/:id — update active state, unclaim, rotate key, or edit portfolio data.
export async function updateQr(request, env, id) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return json({ error: auth.error }, { status: auth.status })

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body' }, { status: 400 })
  }

  const sql = getDb(env)

  if (typeof body.is_active === 'boolean') {
    await sql`UPDATE qr_codes SET is_active = ${body.is_active} WHERE id = ${id}`
  }
  if (body.unclaim === true) {
    await sql`UPDATE qr_codes SET claimed_by = NULL, claimed_at = NULL WHERE id = ${id}`
  }
  if (body.claim_key) {
    await sql`UPDATE qr_codes SET claim_key = ${String(body.claim_key).trim()} WHERE id = ${id}`
  }
  if (body.portfolio && typeof body.portfolio === 'object') {
    const fields = [
      'business_name', 'google_review_link', 'phone', 'whatsapp', 'email', 'website',
      'instagram', 'facebook', 'twitter_x', 'tiktok', 'youtube', 'linkedin',
      'address', 'logo_url', 'theme_color',
    ]
    const data = {}
    for (const f of fields) data[f] = (body.portfolio[f] ?? '').toString().trim().slice(0, 500)
    data.whatsapp = normalizeWhatsApp(data.whatsapp)

    await sql`
      INSERT INTO portfolios (
        qr_code_id, business_name, google_review_link, phone, whatsapp, email, website,
        instagram, facebook, twitter_x, tiktok, youtube, linkedin, address, logo_url, theme_color, updated_at
      )
      VALUES (
        ${id}, ${data.business_name}, ${data.google_review_link}, ${data.phone}, ${data.whatsapp},
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

  return json({ ok: true })
}

// DELETE /api/admin/qrs/:id — permanently remove a code and its portfolio data.
export async function deleteQr(request, env, id) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return json({ error: auth.error }, { status: auth.status })

  const sql = getDb(env)
  await sql`DELETE FROM portfolios WHERE qr_code_id = ${id}`
  await sql`DELETE FROM qr_codes WHERE id = ${id}`
  return json({ ok: true })
}
