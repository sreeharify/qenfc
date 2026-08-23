import { signJWT, verifyJWT } from './jwt.js'

const COOKIE_NAME = 'qenfc_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

export async function createSessionCookie(user, env) {
  if (!env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set. Add it under Worker Settings > Variables and Secrets.')
  }
  const token = await signJWT({ uid: user.id, email: user.email }, env.SESSION_SECRET, MAX_AGE_SECONDS)
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

export async function getSessionUser(request, env) {
  const cookieHeader = request.headers.get('Cookie') || ''
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  if (!match) return null
  const payload = await verifyJWT(match[1], env.SESSION_SECRET)
  if (!payload) return null
  return { id: payload.uid, email: payload.email }
}

export function isAdminEmail(email, env) {
  const admins = (env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes((email || '').toLowerCase())
}

export async function requireAdmin(request, env) {
  const user = await getSessionUser(request, env)
  if (!user) return { error: 'Unauthorized', status: 401 }
  if (!isAdminEmail(user.email, env)) return { error: 'Forbidden', status: 403 }
  return { user }
}
