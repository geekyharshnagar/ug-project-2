export const NA = 'Information not available'

export const clean = (s = '') => String(s).replace(/\s+/g, ' ').trim()

export function stripHtml(html = '') {
  const d = new DOMParser().parseFromString(html, 'text/html')
  return clean(d.body.textContent || '')
}

// Joins an openFDA field (array of strings) into text. Returns null when empty.
export function joinText(v, max = 12000) {
  if (!v) return null
  const t = (Array.isArray(v) ? v : [v]).map(String).join('\n\n').replace(/[ \t]+/g, ' ').trim()
  if (!t) return null
  return t.length > max ? t.slice(0, max) + '\n\n[Text shortened in this view. Open the full label via the source link.]' : t
}

export function snippet(t, n = 240) {
  if (!t) return null
  const s = clean(t)
  if (s.length <= n) return s
  return s.slice(0, n).replace(/\s+\S*$/, '') + '…'
}

export function formatDate(yyyymmdd) {
  if (!yyyymmdd || String(yyyymmdd).length !== 8) return null
  const s = String(yyyymmdd)
  const d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`)
  return isNaN(d) ? null : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export const norm = (s = '') => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

export const uniq = (a) => [...new Set(a.filter(Boolean))]

export const titleCase = (s = '') =>
  s.toLowerCase().replace(/(^|[\s(\-/])([a-z])/g, (m, a, b) => a + b.toUpperCase())

export function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}
