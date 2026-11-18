import { logRequest } from './apiLog.js'

// Test switches controlled from About > Diagnostics. They only simulate FAILURES;
// they never fabricate data.
export const devFlags = { simulateTimeout: false, failHosts: new Set() }

export class ApiError extends Error {
  constructor(type, message, status) { super(message); this.name = 'ApiError'; this.type = type; this.status = status }
}
const abortErr = () => new DOMException('Aborted', 'AbortError')
const hostOf = (u) => { try { return new URL(u, location.origin).host } catch { return 'unknown' } }
const sleep = (ms, signal) => new Promise((res, rej) => {
  const t = setTimeout(res, ms)
  signal?.addEventListener('abort', () => { clearTimeout(t); rej(abortErr()) }, { once: true })
})

async function once(url, { signal, as, timeoutMs }) {
  const host = hostOf(url)
  if (signal?.aborted) throw abortErr()
  const ctrl = new AbortController()
  let timedOut = false
  const onAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  const timer = setTimeout(() => { timedOut = true; ctrl.abort() }, timeoutMs)
  const t0 = performance.now()
  let status = 0
  let error = null
  try {
    if (devFlags.failHosts.has(host)) throw new ApiError('network', `Simulated outage for ${host}`)
    if (devFlags.simulateTimeout) await sleep(timeoutMs + 500, ctrl.signal)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: as === 'xml' ? 'application/xml, text/xml, */*' : 'application/json' },
    })
    status = res.status
    if (res.status === 404) throw new ApiError('not_found', 'No records found', 404)
    if (res.status === 429) {
      const ra = Number(res.headers.get('Retry-After'))
      const e = new ApiError('rate_limit', 'The service is rate-limiting requests. Please wait a moment and retry.', 429)
      e.retryAfter = ra > 0 && ra <= 5 ? ra * 1000 : undefined
      throw e
    }
    if (!res.ok) throw new ApiError('http', `The service responded with HTTP ${res.status}`, res.status)
    return as === 'xml' ? await res.text() : await res.json()
  } catch (e) {
    if (e instanceof ApiError) { error = e.message; throw e }
    if (signal?.aborted) { error = 'cancelled'; throw abortErr() }
    if (timedOut) { error = 'timeout'; throw new ApiError('timeout', `Request timed out after ${Math.round(timeoutMs / 1000)}s`) }
    error = e.message
    if (e.name === 'SyntaxError') throw new ApiError('parse', 'The service returned an unreadable response')
    throw new ApiError('network', 'Network error (offline, or the service blocked the browser request)')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
    logRequest({ url, host, status, ms: Math.round(performance.now() - t0), error })
  }
}

export async function request(url, opts = {}) {
  const { retries = 1, as = 'json', signal } = opts
  const timeoutMs = devFlags.simulateTimeout ? 1500 : opts.timeoutMs ?? 15000
  for (let a = 0; ; a++) {
    try {
      return await once(url, { signal, as, timeoutMs })
    } catch (e) {
      if (e.name === 'AbortError') throw e
      const retryable = e.type === 'rate_limit' || e.type === 'http'
      if (retryable && a < retries) { await sleep(e.retryAfter ?? 1500 * (a + 1), signal); continue }
      throw e
    }
  }
}

export const friendlyError = (e) => ({
  timeout: 'The service took too long to respond.',
  rate_limit: 'The service is rate-limiting requests right now.',
  network: 'The service could not be reached (offline, blocked, or temporarily down).',
  http: e?.message,
  parse: e?.message,
}[e?.type] || e?.message || 'Something went wrong.')
