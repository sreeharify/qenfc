// Converts a Google Maps "feature ID" (the 0xHEX:0xHEX pair found in Maps
// URLs after "!1s") into a standard Google Place ID (the "ChIJ..." string
// used by the Places API and the review-link URL). This is a pure,
// documented data transform — no Google API key or scraping involved.
//
// The feature ID pair is packed into a tiny 20-byte protobuf message:
//   0x0A 0x12                     outer tag + length (18 bytes follow)
//   0x09 <8 bytes LE of hi>       field 1, fixed64 — the first hex value
//   0x11 <8 bytes LE of lo>       field 2, fixed64 — the second hex value (== CID)
// ...then base64url-encoded without padding. Verified against a real
// maps.app.goo.gl link during development (see chat history).

const FEATURE_ID_RE = /!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/

export function extractFeatureIdPair(url) {
  const match = String(url || '').match(FEATURE_ID_RE)
  if (!match) return null
  return { hi: match[1], lo: match[2] }
}

export function featureIdToPlaceId(hiHex, loHex) {
  const high = BigInt(hiHex)
  const low = BigInt(loHex)
  const bytes = new Uint8Array(20)
  bytes[0] = 0x0a
  bytes[1] = 0x12
  bytes[2] = 0x09
  writeLE64(bytes, 3, high)
  bytes[11] = 0x11
  writeLE64(bytes, 12, low)
  return base64UrlNoPad(bytes)
}

function writeLE64(arr, offset, value) {
  let v = value
  for (let i = 0; i < 8; i++) {
    arr[offset + i] = Number(v & 0xffn)
    v >>= 8n
  }
}

function base64UrlNoPad(bytes) {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
