// If a WhatsApp number is missing a country code, assume +91 (India) by
// default — matches the common case of a 10-digit local mobile number.
// (This is applied client-side for instant feedback; the same rule is
// enforced again on the server so it's consistent no matter how data gets in.)
export function normalizeWhatsApp(value) {
  if (!value) return value
  const v = String(value).trim()
  if (!v) return v
  if (v.startsWith('+')) return v
  const digits = v.replace(/[^0-9]/g, '')
  if (!digits) return v
  if (digits.length === 10) return `+91 ${digits}`
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`
  return `+${digits}`
}
