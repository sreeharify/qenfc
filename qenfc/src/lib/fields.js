export const PORTFOLIO_FIELDS = [
  { key: 'business_name', label: 'Business name', required: true, placeholder: 'e.g. Sunrise Cafe' },
  { key: 'google_review_link', label: 'Google review link', placeholder: 'https://g.page/r/...' },
  { key: 'whatsapp', label: 'WhatsApp number', placeholder: '+1 555 123 4567' },
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

export const SOCIAL_LINKS = [
  { key: 'website', label: 'Website', icon: '🌐' },
  { key: 'instagram', label: 'Instagram', icon: '📷' },
  { key: 'facebook', label: 'Facebook', icon: '📘' },
  { key: 'twitter_x', label: 'X / Twitter', icon: '✖️' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵' },
  { key: 'youtube', label: 'YouTube', icon: '▶️' },
  { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
]

export function normalizeUrl(v) {
  if (!v) return '#'
  if (v.startsWith('http://') || v.startsWith('https://')) return v
  return `https://${v}`
}
