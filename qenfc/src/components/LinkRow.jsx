export default function LinkRow({ icon, label, href }) {
  return (
    <a className="link-row" href={href} target="_blank" rel="noopener noreferrer">
      <span className="glyph" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </a>
  )
}
