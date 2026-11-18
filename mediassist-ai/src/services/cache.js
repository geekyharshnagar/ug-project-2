// localStorage cache with expiry. Results returned by `cached()` always say whether
// they came from the cache so the UI never presents old data as freshly retrieved.
const P = 'mediassist:cache:v1:'
export const TTL = { suggest: 60 * 60e3, search: 6 * 60 * 60e3, detail: 24 * 60 * 60e3 }

export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(P + key)
    if (!raw) return null
    const o = JSON.parse(raw)
    if (Date.now() > o.exp) { localStorage.removeItem(P + key); return null }
    return o
  } catch { return null }
}

function entries() {
  const out = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(P)) {
      try { const raw = localStorage.getItem(k); out.push({ k, t: JSON.parse(raw).t, size: raw.length }) } catch { out.push({ k, t: 0, size: 0 }) }
    }
  }
  return out
}

function prune() {
  const all = entries().sort((a, b) => a.t - b.t)
  all.slice(0, Math.max(3, Math.ceil(all.length / 2))).forEach((e) => localStorage.removeItem(e.k))
}

export function cacheSet(key, value, ttl) {
  const o = JSON.stringify({ v: value, t: Date.now(), exp: Date.now() + ttl })
  try { localStorage.setItem(P + key, o) } catch {
    prune()
    try { localStorage.setItem(P + key, o) } catch { /* cache is best-effort */ }
  }
}

export function cacheClear() { entries().forEach((e) => localStorage.removeItem(e.k)) }
export function cacheStats() { const e = entries(); return { count: e.length, kb: Math.round(e.reduce((s, x) => s + x.size, 0) / 1024) } }

/** Returns { data, fromCache, fetchedAt } */
export async function cached(key, ttl, loader, { force = false } = {}) {
  if (!force) {
    const hit = cacheGet(key)
    if (hit) return { data: hit.v, fromCache: true, fetchedAt: hit.t }
  }
  const data = await loader()
  cacheSet(key, data, ttl)
  return { data, fromCache: false, fetchedAt: Date.now() }
}
