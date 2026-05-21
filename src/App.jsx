import { useState, useRef } from 'react'
import { TIMEZONE_LIST } from './data/timezones.js'
import {
  localToUTC, formatTimeInZone, getDayDiff,
  getZoneMeta, todayStr, formatDisplayDate,
} from './utils/timezone.js'

// ─── design tokens ───────────────────────────────────────────────────────────

const T = {
  ink: '#000000',
  canvas: '#ffffff',
  ash: '#f5f5f5',
  charcoal: '#171717',
  muted: '#737373',
  green: '#a3e635',
  shadow: 'rgb(10,10,13)',
  // shadows
  shadowHard: 'rgb(10,10,13) 2px 2px 0px 0px',
  shadowHard4: 'rgb(10,10,13) 4px 4px 0px 0px',
  shadowHard1: 'rgb(10,10,13) 1px 1px 0px 0px',
  // radii
  rBtn: 4,
  rCard: 8,
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS = { TZ: 'fc_userTz', DATE: 'fc_date', START: 'fc_start', END: 'fc_end', CLIENTS: 'fc_clients' }
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback } catch { return fallback }
}
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch { } }

function fallbackCopy(text, onSuccess) {
  const ta = Object.assign(document.createElement('textarea'), {
    value: text,
    style: 'position:fixed;top:0;left:0;opacity:0;pointer-events:none',
  })
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  try { if (document.execCommand('copy')) onSuccess() } catch { }
  document.body.removeChild(ta)
}

function buildZoneLabel(iana, city) {
  const { code, offset } = getZoneMeta(iana)
  return code ? `${city} / ${code} ${offset}` : `${city} / ${offset}`
}

// ─── shared primitives ────────────────────────────────────────────────────────

function Label({ children }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted }}>
      {children}
    </span>
  )
}

function FieldLabel({ children }) {
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
      {children}
    </span>
  )
}

// ─── TimezoneSearch ───────────────────────────────────────────────────────────

function TimezoneSearch({ value, onChange, placeholder = 'Search timezone…', excludeIanas = [], autoFocus = false }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(autoFocus)
  const ref = useRef(null)

  const selected = TIMEZONE_LIST.find(t => t.iana === value)
  const displayVal = selected ? buildZoneLabel(selected.iana, selected.city) : ''

  const filtered = TIMEZONE_LIST.filter(t => {
    if (excludeIanas.includes(t.iana)) return false
    const q = query.toLowerCase()
    return t.city.toLowerCase().includes(q) || t.iana.toLowerCase().includes(q) || getZoneMeta(t.iana).code.toLowerCase().includes(q)
  }).slice(0, 40)

  function handleBlur(e) {
    if (!ref.current?.contains(e.relatedTarget)) setOpen(false)
  }

  return (
    <div ref={ref} className="relative" onBlur={handleBlur}>
      <input
        type="text"
        autoFocus={autoFocus}
        placeholder={open ? placeholder : (displayVal || placeholder)}
        value={open ? query : displayVal}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: 14,
          fontWeight: 500,
          fontFamily: 'inherit',
          color: T.ink,
          background: T.canvas,
          border: `1px solid ${open ? T.charcoal : T.muted}`,
          borderRadius: T.rBtn,
          outline: 'none',
          boxShadow: open ? T.shadowHard1 : 'none',
          transition: 'border-color 120ms, box-shadow 120ms',
        }}
      />
      {open && (
        <div
          className="absolute z-50 w-full overflow-auto"
          style={{
            top: 'calc(100% + 4px)',
            background: T.canvas,
            border: `1px solid ${T.charcoal}`,
            borderRadius: T.rCard,
            boxShadow: T.shadowHard4,
            maxHeight: 220,
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 14, color: T.muted }}>No results</div>
          )}
          {filtered.map(t => (
            <div
              key={t.iana}
              tabIndex={-1}
              style={{ padding: '10px 12px', fontSize: 14, fontWeight: 500, color: T.ink, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = T.ash}
              onMouseLeave={e => e.currentTarget.style.background = ''}
              onMouseDown={() => { onChange(t.iana); setOpen(false); setQuery('') }}
            >
              {buildZoneLabel(t.iana, t.city)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ClientZoneCard ───────────────────────────────────────────────────────────

function ClientZoneCard({ iana, date, startUtc, endUtc, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [copied, setCopied] = useState(false)
  const [hoverCopy, setHoverCopy] = useState(false)

  const tz = TIMEZONE_LIST.find(t => t.iana === iana)
  const city = tz?.city ?? iana
  const { code, offset } = getZoneMeta(iana)
  const label = code ? `${city} / ${code} ${offset}` : `${city} / ${offset}`

  const startStr = startUtc ? formatTimeInZone(startUtc, iana) : '—'
  const endStr = endUtc ? formatTimeInZone(endUtc, iana) : '—'
  const startDiff = startUtc ? getDayDiff(date, startUtc, iana) : 0
  const endDiff = endUtc ? getDayDiff(date, endUtc, iana) : 0
  const dayDiff = startDiff !== 0 ? startDiff : endDiff

  function copyReply() {
    const text = `I'm available ${formatDisplayDate(date)}, ${startStr}–${endStr} your time (${label})`
    const confirm = () => { setCopied(true); setTimeout(() => setCopied(false), 2000) }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(confirm).catch(() => fallbackCopy(text, confirm))
    } else {
      fallbackCopy(text, confirm)
    }
  }

  return (
    <div style={{
      background: T.canvas,
      border: `1px solid ${T.charcoal}`,
      borderRadius: T.rCard,
      boxShadow: T.shadowHard,
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: T.ash,
        borderBottom: `1px solid ${T.charcoal}`,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Reorder */}
          {[{ fn: onMoveUp, disabled: isFirst, label: 'Up', path: 'M5 2L9 7H1Z' },
          { fn: onMoveDown, disabled: isLast, label: 'Down', path: 'M5 8L1 3H9Z' }].map(({ fn, disabled, label: al, path }) => (
            <button key={al} onClick={fn} disabled={disabled} aria-label={al}
              style={{
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.2 : 0.5, padding: 0
              }}
              onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = 1 }}
              onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = 0.5 }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d={path} fill={T.ink} />
              </svg>
            </button>
          ))}
          {/* Remove */}
          <button onClick={onRemove} aria-label="Remove"
            style={{
              width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 0, marginLeft: 4
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.4}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke={T.ink} strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        {/* Time + badge */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.61px', lineHeight: 1.2, color: T.ink }}>
            {startStr}–{endStr}
          </span>
          {dayDiff !== 0 && (
            <span style={{
              fontSize: 12, fontWeight: 700, color: T.ink,
              background: T.canvas, border: `1px solid ${T.charcoal}`,
              borderRadius: 100, padding: '3px 10px',
              boxShadow: T.shadowHard1, whiteSpace: 'nowrap',
            }}>
              {dayDiff > 0 ? `+${dayDiff}d` : `${dayDiff}d`}
            </span>
          )}
        </div>

        {/* Copy button */}
        <button
          onClick={copyReply}
          onMouseEnter={() => setHoverCopy(true)}
          onMouseLeave={() => setHoverCopy(false)}
          style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            cursor: 'pointer',
            borderRadius: T.rBtn,
            transition: 'box-shadow 100ms, transform 100ms',
            ...(copied ? {
              background: T.green,
              color: T.ink,
              border: `1px solid ${T.charcoal}`,
              boxShadow: T.shadowHard,
            } : hoverCopy ? {
              background: T.green,
              color: T.ink,
              border: `1px solid ${T.charcoal}`,
              boxShadow: T.shadowHard,
            } : {
              background: T.canvas,
              color: T.ink,
              border: `1px solid ${T.charcoal}`,
              boxShadow: T.shadowHard,
            }),
          }}
        >
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke={T.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                <rect x="4" y="1" width="7" height="8" rx="1.5" stroke={T.ink} strokeWidth="1.5" />
                <path d="M1 4H3.5V11H8.5V9" stroke={T.ink} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ visible }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%',
      transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(12px)',
      opacity: visible ? 1 : 0,
      transition: 'all 200ms',
      padding: '10px 20px', fontSize: 14, fontWeight: 700,
      background: T.green, color: T.ink,
      border: `1px solid ${T.charcoal}`, borderRadius: T.rBtn,
      boxShadow: T.shadowHard,
      pointerEvents: 'none',
    }}>
      Copied to clipboard
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [userTz, setUserTzRaw] = useState(() => load(LS.TZ, 'Asia/Jakarta'))
  const [date, setDateRaw] = useState(() => load(LS.DATE, todayStr()))
  const [start, setStartRaw] = useState(() => load(LS.START, '09:00'))
  const [end, setEndRaw] = useState(() => load(LS.END, '18:00'))
  const [clients, setClientsRaw] = useState(() => load(LS.CLIENTS, ['America/New_York', 'Asia/Shanghai']))
  const [addingZone, setAddingZone] = useState(false)
  const [toast, setToast] = useState(false)

  const set = (key, setter) => v => { setter(v); save(key, v) }
  const setUserTz = set(LS.TZ, setUserTzRaw)
  const setDate = set(LS.DATE, setDateRaw)
  const setStart = set(LS.START, setStartRaw)
  const setEnd = set(LS.END, setEndRaw)
  const setClients = set(LS.CLIENTS, setClientsRaw)

  function addClient(iana) {
    if (!iana || clients.includes(iana) || clients.length >= 8) return
    setClients([...clients, iana])
    setAddingZone(false)
  }
  function removeClient(iana) { setClients(clients.filter(c => c !== iana)) }
  function moveClient(idx, dir) {
    const next = [...clients], swap = idx + dir
    if (swap < 0 || swap >= next.length) return
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setClients(next)
  }

  const startUtc = date && start ? localToUTC(date, start, userTz) : null
  const endUtc = date && end ? localToUTC(date, end, userTz) : null
  const userTzInfo = TIMEZONE_LIST.find(t => t.iana === userTz)
  const userLabel = userTzInfo ? buildZoneLabel(userTz, userTzInfo.city) : userTz

  // Input style shared
  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
    color: T.ink, background: T.canvas, border: `1px solid ${T.muted}`,
    borderRadius: T.rBtn, outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: T.ash, fontFamily: 'Satoshi, ui-sans-serif, system-ui, sans-serif' }}>

      {/* ── LEFT PANEL ── */}
      <aside style={{
        width: '36%', minWidth: 280, flexShrink: 0,
        background: T.ash,
        borderRight: `1px solid ${T.charcoal}`,
        display: 'flex', flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {/* Brand */}
        <div style={{ padding: '24px 28px', borderBottom: `1px solid ${T.charcoal}`, background: T.canvas }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: T.rCard,
              background: T.green, border: `1px solid ${T.charcoal}`,
              boxShadow: T.shadowHard1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke={T.ink} strokeWidth="1.6" />
                <path d="M9 5V9L12 11.5" stroke={T.ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.108px', color: T.ink, lineHeight: 1.3 }}>
                FreelancerClock
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: T.muted, marginTop: 1 }}>
                Share your hours across every timezone
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Timezone */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Label>Your Timezone</Label>
            <TimezoneSearch value={userTz} onChange={setUserTz} placeholder="Search your timezone…" />
            {userLabel && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: T.rBtn,
                background: T.canvas, border: `1px solid ${T.charcoal}`,
                boxShadow: T.shadowHard1,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, border: `1px solid ${T.charcoal}`, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{userLabel}</span>
              </div>
            )}
          </section>

          {/* Divider */}
          <div style={{ height: 1, background: T.charcoal, opacity: 0.12 }} />

          {/* Availability */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Label>Availability</Label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>Date</FieldLabel>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle}
                onFocus={e => { e.target.style.borderColor = T.charcoal; e.target.style.boxShadow = T.shadowHard1 }}
                onBlur={e => { e.target.style.borderColor = T.muted; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              {[['From', start, setStart], ['To', end, setEnd]].map(([lbl, val, setter]) => (
                <div key={lbl} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FieldLabel>{lbl}</FieldLabel>
                  <input type="time" value={val} onChange={e => setter(e.target.value)} style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = T.charcoal; e.target.style.boxShadow = T.shadowHard1 }}
                    onBlur={e => { e.target.style.borderColor = T.muted; e.target.style.boxShadow = 'none' }}
                  />
                </div>
              ))}
            </div>

            {date && start && end && (
              <div style={{
                padding: '12px 16px', borderRadius: T.rCard,
                background: T.canvas, border: `1px solid ${T.charcoal}`,
                boxShadow: T.shadowHard1,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{formatDisplayDate(date)}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: T.muted, marginTop: 2 }}>
                  {start} – {end} · {userLabel}
                </div>
              </div>
            )}
          </section>
        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: T.canvas, minHeight: '100vh' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 32px',
          borderBottom: `1px solid ${T.charcoal}`,
          background: T.canvas,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Label>Client Timezones</Label>
            {clients.length > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: T.ink,
                background: T.green, border: `1px solid ${T.charcoal}`,
                borderRadius: 100, padding: '2px 8px',
                boxShadow: T.shadowHard1,
              }}>
                {clients.length}
              </span>
            )}
          </div>

          {clients.length < 8 && (
            <button
              onClick={() => setAddingZone(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                cursor: 'pointer', borderRadius: T.rBtn,
                transition: 'box-shadow 100ms',
                ...(addingZone ? {
                  background: T.ash, color: T.ink,
                  border: `1px solid ${T.charcoal}`,
                  boxShadow: T.shadowHard,
                } : {
                  background: T.green, color: T.ink,
                  border: `1px solid ${T.charcoal}`,
                  boxShadow: T.shadowHard,
                }),
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'none'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = T.shadowHard}
            >
              {addingZone ? 'Cancel' : (
                <>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M5.5 1V10M1 5.5H10" stroke={T.ink} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Add timezone
                </>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Add zone box */}
          {addingZone && (
            <div style={{
              padding: 20, borderRadius: T.rCard,
              background: T.ash, border: `1px solid ${T.charcoal}`,
              boxShadow: T.shadowHard, marginBottom: 4,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 10 }}>
                Search by city or timezone
              </div>
              <TimezoneSearch
                value=""
                onChange={addClient}
                placeholder="e.g. London, Tokyo, CST…"
                excludeIanas={[userTz, ...clients]}
                autoFocus
              />
            </div>
          )}

          {/* Zone cards */}
          {clients.length > 0 ? (
            clients.map((iana, idx) => (
              <ClientZoneCard
                key={iana}
                iana={iana}
                date={date}
                startUtc={startUtc}
                endUtc={endUtc}
                onRemove={() => removeClient(iana)}
                onMoveUp={() => moveClient(idx, -1)}
                onMoveDown={() => moveClient(idx, 1)}
                isFirst={idx === 0}
                isLast={idx === clients.length - 1}
              />
            ))
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: T.rCard,
                background: T.ash, border: `1px solid ${T.charcoal}`,
                boxShadow: T.shadowHard1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="8.5" stroke={T.ink} strokeWidth="1.5" />
                  <path d="M11 6.5V11L14 13.5" stroke={T.ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: T.ink, margin: '0 0 6px' }}>No client timezones yet</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: T.muted, maxWidth: 220, lineHeight: 1.5, margin: 0 }}>
                Add a client timezone to see your availability converted there
              </p>
            </div>
          )}
        </div>
      </main>

      <Toast visible={toast} />
    </div>
  )
}
