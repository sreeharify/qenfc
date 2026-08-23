export default function Landing() {
  return (
    <div className="card" style={{ textAlign: 'center', marginTop: 60 }}>
      <h1>qeNFC</h1>
      <p className="muted">Scan your QR code to view or set up a business page.</p>
      <a className="btn btn-outline" href="/dashboard" style={{ marginTop: 20 }}>
        Go to my dashboard
      </a>
    </div>
  )
}
