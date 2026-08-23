import { getDb } from '../lib/db.js'
import { getSessionUser } from '../lib/session.js'
import { json } from '../lib/response.js'

export async function mine(request, env) {
  const user = await getSessionUser(request, env)
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb(env)
  const rows = await sql`
    SELECT q.code, q.claimed_at, q.is_active, p.business_name
    FROM qr_codes q
    LEFT JOIN portfolios p ON p.qr_code_id = q.id
    WHERE q.claimed_by = ${user.id}
    ORDER BY q.claimed_at DESC
  `
  return json({ qrs: rows })
}
