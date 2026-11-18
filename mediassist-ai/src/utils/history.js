const KEY = 'mediassist:history:v1'
export const getHistory = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }
export function addHistory(entry) {
  const h = getHistory()
  h.unshift({ ...entry, ts: Date.now() })
  try { localStorage.setItem(KEY, JSON.stringify(h.slice(0, 300))) } catch { /* ignore */ }
}
export const clearHistory = () => localStorage.removeItem(KEY)
