// A tiny, dependency-free JWT (HS256) implementation using the Web Crypto API,
// which is available natively in the Workers runtime. This is enough for signing
// our own session tokens — it is not a general-purpose JWT library.

function base64url(input) {
  let base64
  if (typeof input === 'string') {
    base64 = btoa(unescape(encodeURIComponent(input)))
  } else {
    base64 = btoa(String.fromCharCode(...new Uint8Array(input)))
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecodeToString(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
}

async function importKey(secret) {
  const enc = new TextEncoder()
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

export async function signJWT(payload, secret, expiresInSeconds = 60 * 60 * 24 * 30) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = { ...payload, iat: now, exp: now + expiresInSeconds }
  const encHeader = base64url(JSON.stringify(header))
  const encBody = base64url(JSON.stringify(body))
  const data = `${encHeader}.${encBody}`
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return `${data}.${base64url(sig)}`
}

export async function verifyJWT(token, secret) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [encHeader, encBody, encSig] = parts
  try {
    const key = await importKey(secret)
    const data = `${encHeader}.${encBody}`
    const sigStr = base64urlDecodeToString(encSig)
    const sigBytes = Uint8Array.from(sigStr, (c) => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data))
    if (!valid) return null
    const body = JSON.parse(base64urlDecodeToString(encBody))
    if (body.exp && Math.floor(Date.now() / 1000) > body.exp) return null
    return body
  } catch {
    return null
  }
}
