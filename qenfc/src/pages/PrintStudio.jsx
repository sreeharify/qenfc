import { useEffect, useRef, useState } from 'react'

// A4 divided into a 2x2 grid with zero gap = four A5 cards, tiled edge to edge.
const CARD_W_MM = 105
const CARD_H_MM = 148.5

const DEFAULT_TEMPLATE = {
  background_url: '',
  qr_x: 27,
  qr_y: 10,
  qr_size: 50,
  key_x: 10,
  key_y: 68,
  key_width: 85,
  key_font_size: 4.5,
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
      setStatus({ type: 'success', msg: 'Design copied — paste it somewhere safe to reuse next time.' })
    } catch {
      setStatus({ type: 'error', msg: 'Could not copy automatically — select the text manually next time.' })
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

      let bg = null
      if (template.background_url) {
        try {
          bg = await urlToDataUrl(template.background_url)
        } catch {
          setStatus({
            type: 'error',
            msg: "Couldn't load the background image (its host may block direct access) — continuing without it.",
          })
        }
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
        msg: `PDF ready — ${parsedCodes.length} code(s) across ${Math.ceil(parsedCodes.length / 4)} page(s).`,
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
          Drag the QR code and key text to position them. This card is A5-sized (105 × 148.5mm) —
          four tile edge to edge onto one A4 sheet with zero gap.
        </p>

        <div className="field">
          <label>Background image URL (optional)</label>
          <input
            value={template.background_url}
            onChange={(e) => updateTemplate({ background_url: e.target.value })}
            placeholder="https://... (your design export — must allow direct access)"
          />
        </div>

        <div
          ref={containerRef}
          className="print-canvas"
          style={{ backgroundImage: template.background_url ? `url(${template.background_url})` : undefined }}
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

        <div className="field">
          <label>Key text size</label>
          <input
            type="range"
            min="2"
            max="10"
            step="0.5"
            value={template.key_font_size}
            onChange={(e) => updateTemplate({ key_font_size: parseFloat(e.target.value) })}
          />
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

async function urlToDataUrl(url) {
  const res = await fetch(url, { mode: 'cors' })
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
