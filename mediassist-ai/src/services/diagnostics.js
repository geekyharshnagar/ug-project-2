import { request } from './http.js'

/** Lightweight reachability checks (one tiny request per service). */
export async function pingApis(signal) {
  const checks = [
    ['US FDA – openFDA', 'https://api.fda.gov/drug/label.json?limit=1', 'json'],
    ['NIH – RxNorm', 'https://rxnav.nlm.nih.gov/REST/version.json', 'json'],
    ['NIH – MedlinePlus', 'https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=asthma&retmax=1', 'xml'],
    ['NIH – Clinical Tables (ICD-10-CM)', 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=asthma&maxList=1', 'json'],
  ]
  return Promise.all(checks.map(async ([name, url, as]) => {
    const t0 = performance.now()
    try { await request(url, { signal, as, retries: 0, timeoutMs: 10000 }); return { name, ok: true, ms: Math.round(performance.now() - t0) } }
    catch (e) { return { name, ok: false, ms: Math.round(performance.now() - t0), message: e.message } }
  }))
}
