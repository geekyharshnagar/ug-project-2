// NIH National Library of Medicine – RxNorm / RxClass  (https://lhncbc.nlm.nih.gov/RxNav/APIs/)
import { request } from './http.js'
import { cached, TTL } from './cache.js'
import { uniq } from '../utils/text.js'

const BASE = 'https://rxnav.nlm.nih.gov/REST'
export const TTY_LABEL = {
  IN: 'Ingredient', MIN: 'Multiple ingredients', PIN: 'Precise ingredient', BN: 'Brand name',
  SCD: 'Generic clinical drug', SBD: 'Branded clinical drug', GPCK: 'Generic pack', BPCK: 'Branded pack',
  SCDC: 'Clinical drug component', SBDC: 'Branded drug component', DF: 'Dose form',
}
const PRIORITY = ['IN', 'MIN', 'PIN', 'BN', 'SCD', 'SBD', 'GPCK', 'BPCK']
export const rxnavUrl = (rxcui) => `https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${rxcui}`

const props = async (id, signal) => {
  const j = await request(`${BASE}/rxcui/${id}/properties.json`, { signal })
  const p = j.properties
  return p ? { rxcui: String(p.rxcui), name: p.name, tty: p.tty, synonym: p.synonym || null, umls: p.umlscui || null, suppress: p.suppress } : null
}
const isAbort = (r) => r.status === 'rejected' && r.reason?.name === 'AbortError'

/** Resolve a typed name (generic, brand, misspelling, synonym) to standardised RxNorm concepts. */
export function resolveConcepts(term, { signal, force } = {}) {
  return cached(`rx:resolve:${term.toLowerCase()}`, TTL.search, async () => {
    const enc = encodeURIComponent(term)
    const [ex, ap] = await Promise.allSettled([
      request(`${BASE}/rxcui.json?name=${enc}&search=2`, { signal }),
      request(`${BASE}/approximateTerm.json?term=${enc}&maxEntries=10`, { signal }),
    ])
    if (isAbort(ex)) throw ex.reason
    if (isAbort(ap)) throw ap.reason
    if (ex.status === 'rejected' && ap.status === 'rejected') throw ex.reason
    const ids = uniq([
      ...(ex.value?.idGroup?.rxnormId || []),
      ...(ap.value?.approximateGroup?.candidate || []).map((c) => c.rxcui),
    ]).slice(0, 10)
    const ps = await Promise.allSettled(ids.map((id) => props(id, signal)))
    const abortedOne = ps.find(isAbort)
    if (abortedOne) throw abortedOne.reason
    const concepts = ps
      .filter((p) => p.status === 'fulfilled' && p.value && !['Y', 'O'].includes(p.value.suppress))
      .map((p) => p.value)
    const rank = (c) => { const i = PRIORITY.indexOf(c.tty); return i === -1 ? 99 : i }
    concepts.sort((a, b) => rank(a) - rank(b))
    return { concepts }
  }, { force })
}

/** Standardised detail for one RXCUI: names, ingredients, brands, dose forms, drug classes (RxClass). */
export function getConceptDetail(rxcui, { signal, force } = {}) {
  return cached(`rx:detail:${rxcui}`, TTL.detail, async () => {
    const [p, rel] = await Promise.allSettled([
      props(rxcui, signal),
      request(`${BASE}/rxcui/${rxcui}/related.json?tty=IN+MIN+PIN+BN+DF`, { signal }),
    ])
    if (isAbort(p)) throw p.reason
    if (isAbort(rel)) throw rel.reason
    if (p.status === 'rejected') throw p.reason
    if (!p.value) { const e = new Error('RxNorm has no concept with this identifier'); e.type = 'not_found'; throw e }
    const groups = rel.status === 'fulfilled' ? rel.value?.relatedGroup?.conceptGroup || [] : []
    const pull = (tty) => groups.filter((g) => g.tty === tty).flatMap((g) => g.conceptProperties || []).map((c) => ({ rxcui: String(c.rxcui), name: c.name }))
    const self = { rxcui: p.value.rxcui, name: p.value.name }
    const ingredients = [...(['IN', 'MIN'].includes(p.value.tty) ? [self] : []), ...pull('IN'), ...pull('MIN')]
    const brands = [...(p.value.tty === 'BN' ? [self] : []), ...pull('BN')]
    const ingRx = ingredients.find((i) => i.rxcui)?.rxcui
    let classes = null
    let classError = null
    if (ingRx && p.value.tty !== 'MIN') {
      try {
        const j = await request(`${BASE}/rxclass/class/byRxcui.json?rxcui=${ingRx}`, { signal })
        const list = j.rxclassDrugInfoList?.rxclassDrugInfo || []
        const by = { atc: [], epc: [], moa: [], pe: [], mayTreat: [] }
        const add = (k, name) => name && !by[k].includes(name) && by[k].push(name)
        list.forEach((x) => {
          const c = x.rxclassMinConceptItem || {}
          if (c.classType === 'EPC') add('epc', c.className)
          else if (c.classType === 'MOA') add('moa', c.className)
          else if (c.classType === 'PE') add('pe', c.className)
          else if (c.classType === 'ATC1-4') add('atc', c.className)
          else if (c.classType === 'DISEASE' && x.rela === 'may_treat') add('mayTreat', c.className)
        })
        Object.keys(by).forEach((k) => (by[k] = by[k].slice(0, 12)))
        classes = by
      } catch (e) {
        if (e.name === 'AbortError') throw e
        classError = e.message
      }
    }
    return {
      ...p.value,
      ingredients, brands,
      doseForms: pull('DF').map((d) => d.name),
      classes, classError,
      url: rxnavUrl(rxcui),
      relatedFailed: rel.status === 'rejected',
    }
  }, { force })
}

/** Spelling / near-match suggestions for typeahead. */
export function suggestNames(term, { signal } = {}) {
  return cached(`rx:sug:${term.toLowerCase()}`, TTL.suggest, async () => {
    const j = await request(`${BASE}/spellingsuggestions.json?name=${encodeURIComponent(term)}`, { signal, retries: 0 })
    return (j.suggestionGroup?.suggestionList?.suggestion || []).slice(0, 6)
  })
}
