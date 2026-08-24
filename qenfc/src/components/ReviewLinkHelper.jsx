import { useState } from 'react'

export default function ReviewLinkHelper({ onConverted }) {
  const [mapsUrl, setMapsUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const convert = async () => {
    const trimmed = mapsUrl.trim()
    if (!trimmed) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/tools/review-link?url=${encodeURIComponent(trimmed)}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not convert that link')
      onConverted(data.reviewLink)
      setMsg({ type: 'success', text: 'Review link filled in above ↑' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="review-helper">
      <label>Have a Google Maps link instead? Paste it here to convert it</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <input
          value={mapsUrl}
          onChange={(e) => setMapsUrl(e.target.value)}
          placeholder="https://maps.app.goo.gl/..."
          style={{ marginBottom: 0, flex: 1 }}
        />
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={convert}>
          {busy ? '…' : 'Convert'}
        </button>
      </div>
      {msg && (
        <p className={msg.type === 'error' ? 'error-box' : 'success-box'} style={{ marginTop: 10, marginBottom: 0 }}>
          {msg.text}
        </p>
      )}
    </div>
  )
}
