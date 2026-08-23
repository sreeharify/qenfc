import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/useSession.js'
import { api } from '../lib/api.js'
import GoogleLoginButton from '../components/GoogleLoginButton.jsx'
import Spinner from '../components/Spinner.jsx'

export default function Dashboard() {
  const { user, loading, refresh } = useSession()
  const [qrs, setQrs] = useState(null)

  useEffect(() => {
    if (user) api.myQrs().then((d) => setQrs(d.qrs)).catch(() => setQrs([]))
  }, [user])

  if (loading) return <Spinner />

  if (!user) {
    return (
      <div className="card">
        <h1>Dashboard</h1>
        <p className="muted">Sign in to see and manage the pages you've claimed.</p>
        <GoogleLoginButton returnTo="/dashboard" />
      </div>
    )
  }

  return (
    <div>
      <div className="top-bar">
        <div>
          <h1 style={{ marginBottom: 2 }}>My pages</h1>
          <p className="muted" style={{ margin: 0 }}>{user.email}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => api.logout().then(refresh)}>
          Log out
        </button>
      </div>

      {qrs === null && <Spinner />}

      {qrs && qrs.length === 0 && (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            You haven't claimed any QR codes yet. Scan one and sign in to get started.
          </p>
        </div>
      )}

      {qrs && qrs.map((q) => (
        <Link key={q.code} className="list-item" to={`/dashboard/${q.code}`}>
          <span>{q.business_name || `Code ${q.code}`}{!q.is_active && <span className="muted"> (inactive)</span>}</span>
          <span className="muted">Edit →</span>
        </Link>
      ))}
    </div>
  )
}
