export const PORTFOLIO_FIELDS = [
  { key: 'business_name', label: 'Business name', required: true, placeholder: 'e.g. Sunrise Cafe' },
  { key: 'google_review_link', label: 'Google review link', placeholder: 'https://g.page/r/...' },
  { key: 'whatsapp', label: 'WhatsApp number', placeholder: '10-digit number — +91 added automatically' },
  { key: 'phone', label: 'Phone number', placeholder: '+1 555 123 4567' },
  { key: 'email', label: 'Email', placeholder: 'hello@business.com' },
  { key: 'website', label: 'Website', placeholder: 'https://...' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'twitter_x', label: 'X / Twitter', placeholder: 'https://x.com/...' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@...' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/...' },
  { key: 'address', label: 'Address', placeholder: 'Optional' },
  { key: 'logo_url', label: 'Logo image URL', placeholder: 'Optional — a direct image link' },
]

// Brand-ish colors for each link button on the public portfolio page.
export const SOCIAL_LINKS = [
  { key: 'website', label: 'Website', icon: '🌐', color: 'linear-gradient(135deg,#0f4a3d,#1b6d59)' },
  { key: 'instagram', label: 'Instagram', icon: '📷', color: 'linear-gradient(135deg,#f58529,#dd2a7b,#8134af,#515bd4)' },
  { key: 'facebook', label: 'Facebook', icon: '📘', color: '#1877F2' },
  { key: 'twitter_x', label: 'X / Twitter', icon: '✖️', color: '#111111' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵', color: 'linear-gradient(135deg,#25F4EE,#010101 55%,#FE2C55)' },
  { key: 'youtube', label: 'YouTube', icon: '▶️', color: '#FF0000' },
  { key: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#0A66C2' },
]

export function normalizeUrl(v) {
  if (!v) return '#'
  if (v.startsWith('http://') || v.startsWith('https://')) return v
  return `https://${v}`
}

// Best-effort: pull a readable @handle or hostname out of a profile URL, so
// a link button can show something more meaningful than just its own label.
export function extractLinkSubtitle(key, value) {
  try {
    const u = new URL(normalizeUrl(value))
    if (key === 'website') return u.hostname.replace(/^www\./, '')
    const parts = u.pathname.split('/').filter(Boolean)
    if (!parts.length) return null
    const last = decodeURIComponent(parts[parts.length - 1])
    if (!last || last.length > 28) return null
    return last.startsWith('@') ? last : `@${last}`
  } catch {
    return null
  }
}
