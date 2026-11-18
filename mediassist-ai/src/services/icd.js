// Disease classification helpers.
//
// WHO ICD-11 API (https://icd.who.int/docs/icd-api/) needs OAuth2 client credentials. A client
// secret can NOT be kept secret in a browser app, so this project does not call it directly.
//
// Optional future integration: run your own tiny token proxy (e.g. a serverless function that
// holds the secret and forwards ICD-11 requests), then set VITE_ICD11_PROXY_URL in .env.
// Until then the app links to the official ICD-11 browser and shows ICD-10-CM codes from NIH.
import { request } from './http.js'
import { cached, TTL } from './cache.js'

export const ICD11_PROXY_URL = import.meta.env.VITE_ICD11_PROXY_URL || ''
export const ICD11_CONFIGURED = Boolean(ICD11_PROXY_URL)
export const ICD11_BROWSER_URL = 'https://icd.who.int/browse11/l-m/en'
export const ICD11_DOCS_URL = 'https://icd.who.int/docs/icd-api/'

/** ICD-10-CM codes from the NIH Clinical Table Search Service (public, no key). Non-critical. */
export function searchIcd10cm(term, { signal } = {}) {
  const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&maxList=6&terms=${encodeURIComponent(term)}`
  return cached(`icd10:${term.toLowerCase()}`, TTL.detail, async () => {
    const j = await request(url, { signal, retries: 0 })
    return { items: (j?.[3] || []).map(([code, name]) => ({ code, name })), url }
  })
}
