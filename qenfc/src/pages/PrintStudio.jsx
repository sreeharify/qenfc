import { useEffect, useRef, useState } from 'react'

// A4 divided into a 2x2 grid with zero gap = four A5 cards, tiled edge to edge.
const CARD_W_MM = 105
const CARD_H_MM = 148.5

// The poster background — add your file at public/images/poster.png in the
// project (so it lands at this exact path once deployed). Nothing to
// configure here; if the file isn't there yet, printing just skips it.
const POSTER_PATH = '/images/poster.png'

// All position/size values below are PERCENTAGES of the card:
//   x, width, qr_size, key_font_size  -> % of the card WIDTH (105mm)
//   y                                  -> % of the card HEIGHT (148.5mm)
const DEFAULT_TEMPLATE = {
  qr_x: 35.75457435393246,
  qr_y: 55.00469903948971,
  qr_size: 28.438355966175653,
  key_x: 16.70249466533547,
  key_y: 77.22235185173828,
  key_width: 66.43,
  key_font_size: 2,
  key_color: '#111111',
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export default function PrintStudio({ codes = [] }) {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [codesText, setCodesText] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)
  const containerRef = useRef(null)

  // Re-fill the codes box whenever a fresh batch is generated above.
  useEffect(() => {
    if (codes.length) setCodesText(codes.map((c) => `${c.code},${c.key}`).join('\n'))
  }, [codes])

  const parsedCodes = codesText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [code, key] = l.split(',').map((s) => (s || '').trim())
      return { code, key }
    })
    .filter((c) => c.code)

  const updateTemplate = (patch) => setTemplate((t) => ({ ...t, ...patch }))

  const copyDesign = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(template, null, 2))
      setStatus({ type: 'success', msg: 'Design copied — paste it somewhere safe, or send the numbers in chat to have it baked in permanently.' })
    } catch {
      setStatus({ type: 'error', msg: 'Could not copy automatically — read the values from the fields below instead.' })
    }
  }

  const loadDesign = () => {
    // eslint-disable-next-line no-alert
    const text = window.prompt('Paste a previously copied design:')
    if (!text) return
    try {
      const parsed = JSON.parse(text)
      setTemplate({ ...DEFAULT_TEMPLATE, ...parsed })
      setStatus({ type: 'success', msg: 'Design loaded.' })
    } catch {
      setStatus({ type: 'error', msg: "That doesn't look like a valid design — check you copied the whole thing." })
    }
  }

  const exportPdf = async () => {
    if (!parsedCodes.length) {
      setStatus({ type: 'error', msg: 'Add at least one "code,key" line first.' })
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const { jsPDF } = await import('jspdf')
      const QRCode = (await import('qrcode')).default

      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const positions = [
        [0, 0],
        [CARD_W_MM, 0],
        [0, CARD_H_MM],
        [CARD_W_MM, CARD_H_MM],
      ]

      // Same-origin static file — no CORS handling needed.
      let bg = null
      try {
        bg = await urlToDataUrl(POSTER_PATH)
      } catch {
        // No poster.png yet — print without a background instead of failing.
      }

      const origin = window.location.origin

      for (let i = 0; i < parsedCodes.length; i++) {
        const slot = i % 4
        if (slot === 0 && i !== 0) doc.addPage()
        const [ox, oy] = positions[slot]
        const { code, key } = parsedCodes[i]

        if (bg) {
          doc.addImage(bg.dataUrl, bg.format, ox, oy, CARD_W_MM, CARD_H_MM, undefined, 'FAST')
        }

        const qrTargetUrl = `${origin}/?code=${encodeURIComponent(code)}`
        const qrDataUrl = await QRCode.toDataURL(qrTargetUrl, { margin: 0, width: 512 })
        const qrSize = (template.qr_size / 100) * CARD_W_MM
        doc.addImage(
          qrDataUrl,
          'PNG',
          ox + (template.qr_x / 100) * CARD_W_MM,
          oy + (template.qr_y / 100) * CARD_H_MM,
          qrSize,
          qrSize
        )

        if (key) {
          const fontSizePt = ((template.key_font_size / 100) * CARD_W_MM) * 2.83465
          doc.setFontSize(fontSizePt)
          doc.setTextColor(template.key_color || '#111111')
          const textW = (template.key_width / 100) * CARD_W_MM
          const textX = ox + (template.key_x / 100) * CARD_W_MM + textW / 2
          const textY = oy + (template.key_y / 100) * CARD_H_MM
          doc.text(key, textX, textY, { align: 'center', maxWidth: textW })
        }
      }

      doc.save('qenfc-print-sheet.pdf')
      setStatus({
        type: 'success',
        msg: `PDF ready — ${parsedCodes.length} code(s) across ${Math.ceil(parsedCodes.length / 4)} page(s).${bg ? '' : ' (No public/images/poster.png found yet, so it printed without a background.)'}`,
      })
    } catch (err) {
      console.error(err)
      setStatus({ type: 'error', msg: 'Something went wrong generating the PDF.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Design</h2>
        <p className="muted" style={{ marginTop: -4 }}>
          Drag the QR code and key text to position them, or type exact numbers below. This card is
          A5-sized (105 × 148.5mm) — four tile edge to edge onto one A4 sheet with zero gap. The
          background is your <code>public/images/poster.png</code> file.
        </p>

        <div
          ref={containerRef}
          className="print-canvas"
          style={{ backgroundImage: `url(${POSTER_PATH})` }}
        >
          <DesignBox
            containerRef={containerRef}
            x={template.qr_x}
            y={template.qr_y}
            width={template.qr_size}
            square
            onMove={(x, y) => updateTemplate({ qr_x: x, qr_y: y })}
            onResize={(w) => updateTemplate({ qr_size: clamp(w, 15, 90) })}
          >
            <div className="print-qr-preview" />
          </DesignBox>

          <DesignBox
            containerRef={containerRef}
            x={template.key_x}
            y={template.key_y}
            width={template.key_width}
            onMove={(x, y) => updateTemplate({ key_x: x, key_y: y })}
            onResize={(w) => updateTemplate({ key_width: clamp(w, 10, 95) })}
          >
            <div className="print-key-preview" style={{ fontSize: `${template.key_font_size * 3.2}px`, color: template.key_color }}>
              SAMPLE-KEY
            </div>
          </DesignBox>
        </div>

        <div className="section-title">Precise values (%)</div>
        <p className="muted" style={{ marginTop: -6, fontSize: '0.82rem' }}>
          X, width, size and font size are % of the card's 105mm width. Y is % of the card's 148.5mm
          height. Read these off here to tell me exact numbers next time instead of dragging.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <NumField label="QR — X" value={template.qr_x} onChange={(v) => updateTemplate({ qr_x: v })} />
          <NumField label="QR — Y" value={template.qr_y} onChange={(v) => updateTemplate({ qr_y: v })} />
          <NumField label="QR — Size" value={template.qr_size} onChange={(v) => updateTemplate({ qr_size: clamp(v, 15, 90) })} />
          <NumField label="Key — X" value={template.key_x} onChange={(v) => updateTemplate({ key_x: v })} />
          <NumField label="Key — Y" value={template.key_y} onChange={(v) => updateTemplate({ key_y: v })} />
          <NumField label="Key — Width" value={template.key_width} onChange={(v) => updateTemplate({ key_width: clamp(v, 10, 95) })} />
          <NumField label="Key — Font size" value={template.key_font_size} onChange={(v) => updateTemplate({ key_font_size: v })} />
        </div>
        <div className="field">
          <label>Key text color</label>
          <input
            type="color"
            value={template.key_color}
            onChange={(e) => updateTemplate({ key_color: e.target.value })}
            style={{ padding: 4, height: 44 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={copyDesign}>Copy design</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={loadDesign}>Load design</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setTemplate(DEFAULT_TEMPLATE)}>Reset</button>
        </div>
      </div>

      <div className="card">
        <h2>Codes to print</h2>
        <p className="muted" style={{ marginTop: -4 }}>
          One per line, as code,key — auto-filled after you generate a batch above. Paste any other
          code,key pairs here for a reprint.
        </p>
        <textarea
          rows={6}
          value={codesText}
          onChange={(e) => setCodesText(e.target.value)}
          placeholder={'12345,ABCD1234\n12346,WXYZ5678'}
        />
        <p className="muted" style={{ marginTop: -8 }}>
          {parsedCodes.length} code(s) ready · {Math.ceil(parsedCodes.length / 4) || 0} sheet(s)
        </p>

        {status && <div className={status.type === 'error' ? 'error-box' : 'success-box'}>{status.msg}</div>}

        <button className="btn btn-primary" disabled={busy} onClick={exportPdf}>
          {busy ? 'Generating…' : 'Generate print PDF'}
        </button>
      </div>
    </div>
  )
}

function NumField({ label, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="number"
        step="0.5"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{ marginBottom: 14 }}
      />
    </div>
  )
}

async function urlToDataUrl(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('fetch failed')
  const blob = await res.blob()
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
  const match = dataUrl.match(/^data:image\/(\w+);/)
  const format = match ? match[1].toUpperCase().replace('JPG', 'JPEG') : 'JPEG'
  return { dataUrl, format }
}

function DesignBox({ containerRef, x, y, width, square, onMove, onResize, children }) {
  const dragState = useRef(null)
  const resizeState = useRef(null)

  const handleMoveDown = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = containerRef.current.getBoundingClientRect()
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: x, origY: y, rect }
  }
  const handleMoveMove = (e) => {
    if (!dragState.current) return
    const { startX, startY, origX, origY, rect } = dragState.current
    const dxPct = ((e.clientX - startX) / rect.width) * 100
    const dyPct = ((e.clientY - startY) / rect.height) * 100
    onMove(clamp(origX + dxPct, 0, 100 - width), clamp(origY + dyPct, 0, 95))
  }
  const handleMoveUp = () => { dragState.current = null }

  const handleResizeDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = containerRef.current.getBoundingClientRect()
    resizeState.current = { startX: e.clientX, origW: width, rect }
  }
  const handleResizeMove = (e) => {
    if (!resizeState.current) return
    const { startX, origW } = resizeState.current
    const rect = resizeState.current.rect
    const dxPct = ((e.clientX - startX) / rect.width) * 100
    onResize(origW + dxPct)
  }
  const handleResizeUp = () => { resizeState.current = null }

  return (
    <div
      className="design-box"
      style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, aspectRatio: square ? '1 / 1' : undefined }}
      onPointerDown={handleMoveDown}
      onPointerMove={handleMoveMove}
      onPointerUp={handleMoveUp}
    >
      {children}
      <div
        className="design-box-handle"
        onPointerDown={handleResizeDown}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeUp}
      />
    </div>
  )
}