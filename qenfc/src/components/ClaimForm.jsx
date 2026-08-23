import { useState } from 'react'
import { api } from '../lib/api.js'
import { PORTFOLIO_FIELDS } from '../lib/fields.js'

export default function ClaimForm({ code, onClaimed }) {
  const [key, setKey] = useState('')
  const [values, setValues] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setValues((prev) => ({ ...prev, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!key.trim()) return setError('Enter the key printed under your QR code.')
    if (!values.business_name?.trim()) return setError('Business name is required.')

    setBusy(true)
    try {
      await api.claimQr({ code, key, ...values })
      onClaimed()
    } catch (err) {
      setError(err.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h1>Set up your page</h1>
      <p className="muted">QR code <b>{code}</b> hasn't been set up yet. Fill this in once — customers will see it every time they scan.</p>

      {error && <div className="error-box">{error}</div>}

      <div className="field">
        <label>Key</label>
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Printed under your QR code" autoCapitalize="characters" />
      </div>

      {PORTFOLIO_FIELDS.map((f) => (
        <div className="field" key={f.key}>
          <label>{f.label}{f.required && ' *'}</label>
          <input value={values[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
        </div>
      ))}

      <button className="btn btn-primary" disabled={busy} type="submit">
        {busy ? 'Saving…' : 'Save & activate page'}
      </button>
    </form>
  )
}
