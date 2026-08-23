const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  me: () => request('/session'),
  logout: () => request('/logout', { method: 'POST' }),
  googleLoginUrl: (returnTo) => `${BASE}/auth/google?returnTo=${encodeURIComponent(returnTo)}`,

  getQr: (code) => request(`/qr/${encodeURIComponent(code)}`),
  claimQr: (payload) => request('/qr/claim', { method: 'POST', body: JSON.stringify(payload) }),
  updateQr: (code, payload) => request(`/qr/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(payload) }),

  myQrs: () => request('/dashboard/mine'),

  admin: {
    stats: () => request('/admin/stats'),
    listUsers: () => request('/admin/users'),
    listQrs: (query) => request(`/admin/qrs${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    createQrs: (payload) => request('/admin/qrs', { method: 'POST', body: JSON.stringify(payload) }),
    updateQr: (id, payload) => request(`/admin/qrs/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteQr: (id) => request(`/admin/qrs/${id}`, { method: 'DELETE' }),
  },
}
