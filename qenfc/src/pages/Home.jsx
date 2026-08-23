import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSession } from '../hooks/useSession.js'
import { api } from '../lib/api.js'
import Portfolio from '../components/Portfolio.jsx'
import ClaimForm from '../components/ClaimForm.jsx'
import GoogleLoginButton from '../components/GoogleLoginButton.jsx'
import Spinner from '../components/Spinner.jsx'
import Landing from './Landing.jsx'

export default function Home() {
  const [params] = useSearchParams()
  const code = params.get('code')
  const { user, loading } = useSession()
  const [qrState, setQrState] = useState(undefined)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!code) return
    setErr(null)
    setQrState(undefined)
    api.getQr(code).then(setQrState).catch((e) => setErr(e.data?.error || e.data?.status || 'not_found'))
  }, [code])

  if (!code) return <Landing />

  if (loading || (qrState === undefined && !err)) return <Spinner />

  if (err || qrState?.status === 'not_found') {
    return (
      <div className="card">
        <h1>Invalid QR code</h1>
        <p className="muted">This code doesn't match any QR in our system. Double-check the link and try again.</p>
      </div>
    )
  }

  if (qrState.status === 'inactive') {
    return (
      <div className="card">
        <h1>Not available</h1>
        <p className="muted">This QR code has been deactivated.</p>
      </div>
    )
  }

  if (qrState.status === 'claimed') {
    return <Portfolio data={qrState.portfolio} />
  }

  // unclaimed
  if (!user) {
    return (
      <div className="card">
        <h1>Set up your page</h1>
        <p className="muted">
          This QR code (<b>{code}</b>) hasn't been set up yet. Sign in with Google to claim it — you'll need the key printed under the code.
        </p>
        <GoogleLoginButton returnTo={`/?code=${code}`} />
      </div>
    )
  }

  return <ClaimForm code={code} onClaimed={() => api.getQr(code).then(setQrState)} />
}
