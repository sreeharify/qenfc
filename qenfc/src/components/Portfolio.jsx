import LinkRow from './LinkRow.jsx'
import { SOCIAL_LINKS, normalizeUrl } from '../lib/fields.js'

export default function Portfolio({ data }) {
  const hasContact = data.whatsapp || data.phone || data.email
  const hasSocials = SOCIAL_LINKS.some((s) => data[s.key])

  return (
    <div>
      {data.logo_url && (
        <img
          src={data.logo_url}
          alt={data.business_name}
          style={{
            width: 84, height: 84, borderRadius: '50%', objectFit: 'cover',
            display: 'block', margin: '4px auto 18px', border: '3px solid #fff',
            boxShadow: '0 2px 10px rgba(23,25,15,0.12)',
          }}
        />
      )}

      <h1 style={{ textAlign: 'center' }}>{data.business_name}</h1>
      {data.address && (
        <p className="muted" style={{ textAlign: 'center', marginTop: -4, marginBottom: 20 }}>{data.address}</p>
      )}

      {data.google_review_link && (
        <a
          href={data.google_review_link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn review-btn"
          style={{ margin: '18px 0 8px' }}
        >
          ⭐ Leave us a Google review
        </a>
      )}

      {hasContact && (
        <>
          <div className="section-title">Contact</div>
          <div className="link-list">
            {data.whatsapp && (
              <LinkRow icon="💬" label="WhatsApp" href={`https://wa.me/${data.whatsapp.replace(/[^0-9]/g, '')}`} />
            )}
            {data.phone && <LinkRow icon="📞" label={data.phone} href={`tel:${data.phone}`} />}
            {data.email && <LinkRow icon="✉️" label={data.email} href={`mailto:${data.email}`} />}
          </div>
        </>
      )}

      {hasSocials && (
        <>
          <div className="section-title">Links</div>
          <div className="link-list">
            {SOCIAL_LINKS.map((s) =>
              data[s.key] ? (
                <LinkRow key={s.key} icon={s.icon} label={s.label} href={normalizeUrl(data[s.key])} />
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
