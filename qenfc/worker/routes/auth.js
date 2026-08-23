import { getDb } from '../lib/db.js'
import { createSessionCookie, clearSessionCookie, getSessionUser, isAdminEmail } from '../lib/session.js'
import { json } from '../lib/response.js'

const NONCE_COOKIE = 'qenfc_oauth_n'

export async function googleRedirect(request, env) {
  const url = new URL(request.url)
  const returnTo = url.searchParams.get('returnTo') || '/'
  const nonce = crypto.randomUUID()
  const state = btoa(JSON.stringify({ returnTo, n: nonce }))
  const redirectUri = `${url.origin}/api/auth/callback`

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })

  const headers = new Headers()
  headers.set('Location', `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
  // Short-lived cookie used to verify the `state` on callback (CSRF protection).
  headers.append('Set-Cookie', `${NONCE_COOKIE}=${nonce}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`)
  return new Response(null, { status: 302, headers })
}

export async function googleCallback(request, env) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const cookieHeader = request.headers.get('Cookie') || ''
  const nonceMatch = cookieHeader.match(new RegExp(`${NONCE_COOKIE}=([^;]+)`))
  const cookieNonce = nonceMatch ? nonceMatch[1] : null

  let returnTo = '/'
  let stateNonce = null
  try {
    const parsed = JSON.parse(atob(state))
    returnTo = parsed.returnTo || '/'
    stateNonce = parsed.n
  } catch {
    // ignore, handled by the check below
  }

  if (!code || !stateNonce || !cookieNonce || stateNonce !== cookieNonce) {
    return Response.redirect(`${url.origin}/?error=auth_failed`, 302)
  }

  const redirectUri = `${url.origin}/api/auth/callback`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) return Response.redirect(`${url.origin}/?error=auth_failed`, 302)
  const tokenData = await tokenRes.json()

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  if (!userRes.ok) return Response.redirect(`${url.origin}/?error=auth_failed`, 302)
  const profile = await userRes.json()

  if (!profile.email) return Response.redirect(`${url.origin}/?error=auth_failed`, 302)

  const sql = getDb(env)
  const rows = await sql`
    INSERT INTO users (google_sub, email, name, picture)
    VALUES (${profile.sub}, ${profile.email}, ${profile.name || ''}, ${profile.picture || ''})
    ON CONFLICT (google_sub) DO UPDATE SET
      email = EXCLUDED.email, name = EXCLUDED.name, picture = EXCLUDED.picture
    RETURNING id, email
  `
  const user = rows[0]
  const sessionCookie = await createSessionCookie(user, env)

  const headers = new Headers()
  headers.set('Location', returnTo.startsWith('/') ? returnTo : '/')
  headers.append('Set-Cookie', sessionCookie)
  headers.append('Set-Cookie', `${NONCE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
  return new Response(null, { status: 302, headers })
}

export async function getSession(request, env) {
  const user = await getSessionUser(request, env)
  if (!user) return json({ user: null })
  return json({ user: { ...user, isAdmin: isAdminEmail(user.email, env) } })
}

export async function logout() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearSessionCookie() },
  })
}
