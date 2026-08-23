import { json } from './lib/response.js'
import * as auth from './routes/auth.js'
import * as qr from './routes/qr.js'
import * as dashboard from './routes/dashboard.js'
import * as admin from './routes/admin.js'

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      let response
      try {
        response = await routeApi(request, env, url)
      } catch (err) {
        console.error(err)
        response = json({ error: 'Internal server error' }, { status: 500 })
      }
      return withSecurityHeaders(response)
    }

    // Everything else is the built React app. `not_found_handling:
    // "single-page-application"` in wrangler.jsonc means ASSETS.fetch already
    // serves index.html for client-side routes like /dashboard that aren't
    // real files, so the SPA's own router can take over from there.
    return env.ASSETS.fetch(request)
  },
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return new Response(response.body, { status: response.status, headers })
}

async function routeApi(request, env, url) {
  const { pathname } = url
  const method = request.method

  if (pathname === '/api/auth/google' && method === 'GET') return auth.googleRedirect(request, env)
  if (pathname === '/api/auth/callback' && method === 'GET') return auth.googleCallback(request, env)
  if (pathname === '/api/session' && method === 'GET') return auth.getSession(request, env)
  if (pathname === '/api/logout' && method === 'POST') return auth.logout()

  if (pathname === '/api/qr/claim' && method === 'POST') return qr.claimQr(request, env)
  const qrMatch = pathname.match(/^\/api\/qr\/([^/]+)$/)
  if (qrMatch && method === 'GET') return qr.getQr(request, env, decodeURIComponent(qrMatch[1]))
  if (qrMatch && method === 'PUT') return qr.updateQr(request, env, decodeURIComponent(qrMatch[1]))

  if (pathname === '/api/dashboard/mine' && method === 'GET') return dashboard.mine(request, env)

  if (pathname === '/api/admin/stats' && method === 'GET') return admin.stats(request, env)
  if (pathname === '/api/admin/users' && method === 'GET') return admin.users(request, env)
  if (pathname === '/api/admin/qrs' && method === 'GET') return admin.listQrs(request, env, url)
  if (pathname === '/api/admin/qrs' && method === 'POST') return admin.createQrs(request, env)
  const adminQrMatch = pathname.match(/^\/api\/admin\/qrs\/([^/]+)$/)
  if (adminQrMatch && method === 'PUT') return admin.updateQr(request, env, adminQrMatch[1])
  if (adminQrMatch && method === 'DELETE') return admin.deleteQr(request, env, adminQrMatch[1])

  return json({ error: 'Not found' }, { status: 404 })
}
