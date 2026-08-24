import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession.js'
import { api } from '../lib/api.js'
import Spinner from '../components/Spinner.jsx'
import GoogleLoginButton from '../components/GoogleLoginButton.jsx'
import ReviewLinkHelper from '../components/ReviewLinkHelper.jsx'
import { PORTFOLIO_FIELDS } from '../lib/fields.js'
import { normalizeWhatsApp } from '../lib/whatsapp.js'

export default function EditPortfolio() {
  const { code } = useParams()
  const { user, loading } = useSession()
  const [values, setValues] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState(null)
  const nav = useNavigate()

  useEffect(() => {
    api.getQr(code).then((d) => setValues(d.status === 'claimed' ? d.portfolio : {})).catch(() => setValues({}))
  }, [code])

  if (loading || values === null) return <Spinner />

  if (!user) {
    return (
      <div className="card">
        <h1>Sign in required</h1>
        <GoogleLoginButton returnTo={`/dashboard/${code}`} />
      </div>
    )
  }

  const set = (k, v) => setValues((prev) => ({ ...prev, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setMsg(null)
    if (!values.business_name?.trim()) return setError('Business name is required.')

    setBusy(true)
    try {
      await api.updateQr(code, { ...values, whatsapp: normalizeWhatsApp(values.whatsapp) })
      setMsg('Saved.')
    } catch (err) {
      setError(err.data?.error || 'Could not save. Make sure this QR code belongs to your account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <button type="button" className="btn btn-outline btn-sm" style={{ marginBottom: 18 }} onClick={() => nav('/dashboard')}>
        ← Back
      </button>
      <h1>Edit page</h1>
      <p className="muted">Code <b>{code}</b></p>

      {error && <div className="error-box">{error}</div>}
      {msg && <div className="success-box">{msg}</div>}

      {PORTFOLIO_FIELDS.map((f) => (
        <div key={f.key}>
          <div className="field">
            <label>{f.label}{f.required && ' *'}</label>
            <input
              value={values[f.key] || ''}
              onChange={(e) => set(f.key, e.target.value)}
              onBlur={f.key === 'whatsapp' ? (e) => set('whatsapp', normalizeWhatsApp(e.target.value)) : undefined}
              placeholder={f.placeholder}
              inputMode={f.key === 'whatsapp' || f.key === 'phone' ? 'tel' : undefined}
            />
          </div>
          {f.key === 'google_review_link' && (
            <ReviewLinkHelper onConverted={(link) => set('google_review_link', link)} />
          )}
        </div>
      ))}

      <button className="btn btn-primary" disabled={busy} type="submit">
        {busy ? 'Saving…' : 'Save changes'}
      </button>
      <a className="btn btn-outline" style={{ marginTop: 10 }} href={`/?code=${code}`} target="_blank" rel="noreferrer">
        Preview page
      </a>
    </form>
  )
}
