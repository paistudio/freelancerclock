// Get the UTC Date object for a given local date+time in a specific timezone
export function localToUTC(dateStr, timeStr, tz) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)

  // Start with a naive UTC interpretation of the time
  const naive = new Date(Date.UTC(year, month - 1, day, hour, minute))

  // Ask Intl what time that UTC moment looks like in `tz`
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(naive)

  const get = (type) => parseInt(parts.find(p => p.type === type)?.value ?? '0')
  const tzH = get('hour') === 24 ? 0 : get('hour')
  const tzMin = get('minute')
  const tzY = get('year')
  const tzM = get('month')
  const tzD = get('day')

  // Diff between what we wanted vs what Intl reported
  const wantedMs = Date.UTC(year, month - 1, day, hour, minute)
  const gotMs = Date.UTC(tzY, tzM - 1, tzD, tzH, tzMin)
  const offsetMs = wantedMs - gotMs

  return new Date(naive.getTime() + offsetMs)
}

// Convert a UTC Date to formatted time string in a given timezone
export function formatTimeInZone(utcDate, tz) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(utcDate).toLowerCase().replace(' ', '')
}

// Get local date string (YYYY-MM-DD) in a timezone for a UTC Date
export function getLocalDateStr(utcDate, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(utcDate)
}

// Get day diff: how many days does toTz's date differ from fromDateStr
export function getDayDiff(fromDateStr, utcDate, toTz) {
  const toDateStr = getLocalDateStr(utcDate, toTz)
  const from = new Date(fromDateStr + 'T00:00:00Z')
  const to = new Date(toDateStr + 'T00:00:00Z')
  return Math.round((to - from) / 86400000)
}

// Get timezone short code and GMT offset label for display
export function getZoneMeta(iana, refDate = new Date()) {
  const codePart = new Intl.DateTimeFormat('en-US', {
    timeZone: iana, timeZoneName: 'short',
  }).formatToParts(refDate).find(p => p.type === 'timeZoneName')?.value ?? ''

  const offsetPart = new Intl.DateTimeFormat('en-US', {
    timeZone: iana, timeZoneName: 'shortOffset',
  }).formatToParts(refDate).find(p => p.type === 'timeZoneName')?.value ?? ''

  // Normalize GMT+0 → GMT
  const offset = offsetPart === 'GMT+0' ? 'GMT' : offsetPart

  // When the short code IS the offset (e.g. "GMT+7"), skip duplicating it
  const code = codePart === offset || codePart === offsetPart ? '' : codePart

  return { code, offset }
}

// Today as YYYY-MM-DD in local system time
export function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// Format a date string as "Monday, 19 May 2026"
export function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
