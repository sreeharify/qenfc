import { SOCIAL_LINKS, normalizeUrl, extractLinkSubtitle } from '../lib/fields.js'

export default function Portfolio({ data }) {
  const hasContact = data.whatsapp || data.phone || data.email
  const hasSocials = SOCIAL_LINKS.some((s) => data[s.key])
  let chipIndex = 0

  return (
    <div>
      <div className="hero">
        {data.logo_url && <img src={data.logo_url} alt={data.business_name} className="hero-logo" />}
        <h1>{data.business_name}</h1>
        {data.address && <p className="muted" style={{ marginBottom: 0 }}>{data.address}</p>}
      </div>

      {data.google_review_link && (
        <a
          href={data.google_review_link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn review-btn"
          style={{ marginTop: -22, marginBottom: 8, position: 'relative', zIndex: 1 }}
        >
          ⭐ Leave us a Google review
        </a>
      )}

      {hasContact && (
        <>
          <div className="section-title">Contact</div>
          <div className="chip-list">
            {data.whatsapp && (
              <Chip
                index={chipIndex++}
                icon="💬"
                color="#25D366"
                label="WhatsApp"
                value={data.whatsapp}
                href={`https://wa.me/${data.whatsapp.replace(/[^0-9]/g, '')}`}
              />
            )}
            {data.phone && (
              <Chip index={chipIndex++} icon="📞" color="#0f4a3d" label="Call" value={data.phone} href={`tel:${data.phone}`} />
            )}
            {data.email && (
              <Chip index={chipIndex++} icon="✉️" color="#4A5568" label="Email" value={data.email} href={`mailto:${data.email}`} />
            )}
          </div>
        </>
      )}

      {hasSocials && (
        <>
          <div className="section-title">Links</div>
          <div className="chip-list">
            {SOCIAL_LINKS.map((s) =>
              data[s.key] ? (
                <Chip
                  key={s.key}
                  index={chipIndex++}
                  icon={s.icon}
                  color={s.color}
                  label={s.label}
                  value={extractLinkSubtitle(s.key, data[s.key])}
                  href={normalizeUrl(data[s.key])}
                />
              ) : null
            )}
          </div>
        </>
      )}

      <p className="muted" style={{ textAlign: 'center', marginTop: 32, fontSize: '0.8rem' }}>
        Powered by qeNFC
      </p>
    </div>
  )
}

function Chip({ icon, color, label, value, href, index }) {
  return (
    <a
      className="chip"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <span className="chip-icon" style={{ background: color }} aria-hidden="true">{icon}</span>
      <span className="chip-text">
        <span className="chip-label">{label}</span>
        {value && <span className="chip-value">{value}</span>}
      </span>
    </a>
  )
}
