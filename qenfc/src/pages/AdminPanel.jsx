import { useEffect, useState } from 'react'
import { useSession } from '../hooks/useSession.js'
import { api } from '../lib/api.js'
import GoogleLoginButton from '../components/GoogleLoginButton.jsx'
import Spinner from '../components/Spinner.jsx'
import PrintStudio from './PrintStudio.jsx'

export default function AdminPanel() {
  const { user, loading, refresh } = useSession()

  if (loading) return <Spinner />

  if (!user) {
    return (
      <div className="card">
        <h1>Admin sign in</h1>
        <p className="muted">This area is restricted to approved accounts.</p>
        <GoogleLoginButton returnTo={window.location.pathname} />
      </div>
    )
  }

  if (!user.isAdmin) {
    return (
      <div className="card">
        <h1>Not authorized</h1>
        <p className="muted">The account {user.email} doesn't have admin access.</p>
      </div>
    )
  }

  return <AdminDashboard user={user} onLogout={() => api.logout().then(refresh)} />
}

function AdminDashboard({ user, onLogout }) {
  const [stats, setStats] = useState(null)
  const [qrs, setQrs] = useState([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('qrs')
  const [users, setUsers] = useState([])
  const [genCount, setGenCount] = useState(10)
  const [genResult, setGenResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const loadQrs = (q = '') => api.admin.listQrs(q).then((d) => setQrs(d.qrs))
  const loadStats = () => api.admin.stats().then((d) => setStats(d.stats))

  useEffect(() => {
    loadStats()
    loadQrs()
  }, [])

  useEffect(() => {
    if (tab === 'users') api.admin.listUsers().then((d) => setUsers(d.users))
  }, [tab])

  const generate = async () => {
    setBusy(true)
    setGenResult(null)
    try {
      const d = await api.admin.createQrs({ count: genCount })
      setGenResult(d.created)
      loadQrs(search)
      loadStats()
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (q) => {
    await api.admin.updateQr(q.id, { is_active: !q.is_active })
    loadQrs(search)
    loadStats()
  }
  const unclaim = async (q) => {
    if (!confirm(`Unclaim code ${q.code}? The current owner will lose access and can no longer edit this page.`)) return
    await api.admin.updateQr(q.id, { unclaim: true })
    loadQrs(search)
    loadStats()
  }
  const remove = async (q) => {
    if (!confirm(`Permanently delete code ${q.code} and all its data? This cannot be undone.`)) return
    await api.admin.deleteQr(q.id)
    loadQrs(search)
    loadStats()
  }

  return (
    <div>
      <div className="top-bar">
        <div>
          <h1 style={{ marginBottom: 2 }}>Admin</h1>
          <p className="muted" style={{ margin: 0 }}>{user.email}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={onLogout}>Log out</button>
      </div>

      {stats && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="stat-grid">
            <Stat label="Total QRs" value={stats.total_qrs} />
            <Stat label="Claimed" value={stats.claimed_qrs} />
            <Stat label="Inactive" value={stats.inactive_qrs} />
            <Stat label="Users" value={stats.total_users} />
          </div>
        </div>
      )}

      <div className="tabs">
        <button className={`btn ${tab === 'qrs' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('qrs')}>QR codes</button>
        <button className={`btn ${tab === 'print' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('print')}>Print</button>
        <button className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('users')}>Users</button>
      </div>

      {tab === 'qrs' && (
        <>
          <div className="card" style={{ marginBottom: 18 }}>
            <h2>Generate new QR codes</h2>
            <p className="muted" style={{ marginTop: -4 }}>For manufacturing — creates fresh code/key pairs to print.</p>
            <div className="field">
              <label>How many?</label>
              <input type="number" min="1" max="200" value={genCount} onChange={(e) => setGenCount(e.target.value)} />
            </div>
            <button className="btn btn-primary" disabled={busy} onClick={generate}>
              {busy ? 'Generating…' : 'Generate'}
            </button>

            {genResult && (
              <div style={{ marginTop: 16 }}>
                <div className="success-box" style={{ marginBottom: 10 }}>
                  Created {genResult.length} code{genResult.length === 1 ? '' : 's'}.
                </div>
                <label>CSV (code,key) — copy this for your printer</label>
                <textarea
                  readOnly
                  rows={Math.min(genResult.length + 1, 10)}
                  value={'code,key\n' + genResult.map((r) => `${r.code},${r.key}`).join('\n')}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            )}
          </div>

          <div className="field">
            <label>Search</label>
            <input
              placeholder="Code, business name, or owner email"
              value={search}
              onChange={(e) => { setSearch(e.target.value); loadQrs(e.target.value) }}
            />
          </div>

          {qrs.map((q) => (
            <QrRow key={q.id} q={q} onToggle={() => toggleActive(q)} onUnclaim={() => unclaim(q)} onDelete={() => remove(q)} onSaved={() => loadQrs(search)} />
          ))}
        </>
      )}

      {tab === 'print' && <PrintStudio codes={genResult || []} />}

      {tab === 'users' && (
        <div className="card">
          <table>
            <thead>
              <tr><th>Email</th><th>Name</th><th>QRs</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}><td>{u.email}</td><td>{u.name}</td><td>{u.qr_count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function QrRow({ q, onToggle, onUnclaim, onDelete, onSaved }) {
  const [open, setOpen] = useState(false)
  const [businessName, setBusinessName] = useState(q.business_name || '')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await api.admin.updateQr(q.id, { portfolio: { business_name: businessName } })
      onSaved()
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 10, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div>
          <b>{q.code}</b>{!q.is_active && <span className="muted"> · inactive</span>}
          <div className="muted" style={{ fontSize: '0.85rem' }}>
            {q.business_name || 'Unclaimed'}{q.claimed_by_email ? ` · ${q.claimed_by_email}` : ''}
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Manage'}</button>
      </div>

      {open && (
        <div style={{ marginTop: 16 }}>
          <p className="muted">Key: <b>{q.claim_key}</b></p>

          <div className="field">
            <label>Business name</label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={save} style={{ marginBottom: 14 }}>
            Save business name
          </button>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={onToggle}>{q.is_active ? 'Deactivate' : 'Activate'}</button>
            {q.claimed_by_email && <button className="btn btn-outline btn-sm" onClick={onUnclaim}>Unclaim</button>}
            <button className="btn btn-danger-outline btn-sm" onClick={onDelete}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
