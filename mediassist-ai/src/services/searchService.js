// Unified search: RxNorm (name resolution) + openFDA (labels) + MedlinePlus (diseases).
import { searchLabels, findLabelsForDetail, getLabelById, labelApiUrl, dailyMedUrl } from './openFda.js'
import { resolveConcepts, getConceptDetail, suggestNames, rxnavUrl, TTY_LABEL } from './rxnorm.js'
import { searchDiseases, suggestTopics } from './medlinePlus.js'
import { friendlyError } from './http.js'
import { norm, titleCase } from '../utils/text.js'

const SRC = {
  fda: { name: 'US FDA – openFDA', url: 'https://open.fda.gov/apis/drug/label/' },
  rx: { name: 'NIH National Library of Medicine – RxNorm', url: 'https://www.nlm.nih.gov/research/umls/rxnorm/' },
  mp: { name: 'NIH MedlinePlus', url: 'https://medlineplus.gov/' },
}
export const SOURCES = SRC
const isAbort = (r) => r.status === 'rejected' && r.reason?.name === 'AbortError'
const nameMatch = (a, b) => { a = norm(a); b = norm(b); return !!a && !!b && (a === b || a.startsWith(b + ' ') || b.startsWith(a + ' ')) }

function status(source, r, extra = {}) {
  if (r.status === 'fulfilled') return { source, state: 'ok', fromCache: r.value?.fromCache, fetchedAt: r.value?.fetchedAt, ...extra }
  return { source, state: 'error', message: friendlyError(r.reason), type: r.reason?.type }
}

function fdaToResult(lab, apiUrl) {
  const generic = lab.genericNames[0] || lab.substances[0] || ''
  const brand = lab.brandNames[0] || ''
  const different = brand && norm(brand) !== norm(generic)
  return {
    id: `fda:${lab.id}`, kind: 'medicine',
    title: titleCase(different ? brand : generic || brand),
    subtitle: different && generic ? `Generic: ${titleCase(generic)}` : lab.manufacturers[0] ? titleCase(lab.manufacturers[0]) : '',
    description: lab.indicationsSnippet || 'Indications are not included in this label record.',
    names: [generic, brand, ...lab.substances],
    rxcui: null, labelCount: 1, updated: lab.effectiveTime,
    sources: [{ name: SRC.fda.name, url: apiUrl }],
  }
}

function mergeMedicines(labels, fdaUrl, concepts, seen) {
  const map = new Map()
  labels.forEach((lab) => {
    const r = fdaToResult(lab, fdaUrl)
    const key = `${norm(r.names[0])}|${norm(r.names[1])}`
    if (seen.has(key)) return
    if (map.has(key)) { map.get(key).labelCount++; return }
    map.set(key, { ...r, key })
  })
  const results = [...map.values()]
  const usedConcepts = new Set()
  concepts.forEach((c) => {
    const hit = results.find((r) => r.names.some((n) => nameMatch(c.name.replace(/\s*\[.*\]$/, ''), n)))
    if (hit) {
      usedConcepts.add(c.rxcui)
      if (!hit.rxcui) { hit.rxcui = c.rxcui; hit.sources.push({ name: SRC.rx.name, url: rxnavUrl(c.rxcui) }) }
    }
  })
  const core = concepts.filter((c) => !usedConcepts.has(c.rxcui) && ['IN', 'MIN', 'PIN', 'BN'].includes(c.tty))
  const leftovers = core.length ? core : concepts.filter((c) => !usedConcepts.has(c.rxcui)).slice(0, 3)
  const rxResults = leftovers.map((c) => ({
    id: `rx:${c.rxcui}`, kind: 'medicine', title: titleCase(c.name), subtitle: TTY_LABEL[c.tty] || c.tty,
    description: 'Standardised drug concept from RxNorm. Open it for related names, ingredients, classification and any matching FDA label records.',
    names: [c.name], rxcui: c.rxcui, labelCount: 0,
    sources: [{ name: SRC.rx.name, url: rxnavUrl(c.rxcui) }], key: `rx:${c.rxcui}`,
  }))
  return [...results, ...rxResults]
}

export async function searchMedicines(term, { cursor, signal, force } = {}) {
  const skip = cursor?.skip || 0
  const first = skip === 0
  const seen = new Set(cursor?.seen || [])
  const [fda, rx] = await Promise.allSettled([
    searchLabels(term, { skip, signal, force }),
    first ? resolveConcepts(term, { signal, force }) : Promise.resolve(null),
  ])
  if (isAbort(fda)) throw fda.reason
  if (isAbort(rx)) throw rx.reason
  if (fda.status === 'rejected' && (rx.status === 'rejected' || !first)) throw fda.status === 'rejected' && rx.status === 'rejected' ? fda.reason : fda.reason

  const statuses = [status('openFDA', fda), ...(first ? [status('RxNorm', rx)] : [])]
  const notes = []
  let fdaData = fda.status === 'fulfilled' ? fda.value.data : { total: 0, items: [], url: '' }
  const concepts = rx.status === 'fulfilled' && rx.value ? rx.value.data.concepts : []

  // openFDA has no match under the typed name (e.g. "paracetamol" is "acetaminophen" in the US): retry with RxNorm names.
  if (first && fda.status === 'fulfilled' && fdaData.items.length === 0 && concepts.length) {
    const names = [...new Set(concepts.filter((c) => ['IN', 'BN', 'MIN'].includes(c.tty)).map((c) => c.name))].slice(0, 2)
    for (const n of names) {
      try {
        const alt = await searchLabels(n, { signal, force })
        if (alt.data.items.length) {
          fdaData = alt.data
          notes.push(`No FDA label matched "${term}". RxNorm resolved it to "${n}", and the label records below were found under that name.`)
          break
        }
      } catch (e) { if (e.name === 'AbortError') throw e }
    }
  }

  const results = mergeMedicines(fdaData.items, fdaData.url, concepts, seen)
  results.forEach((r) => r.key && seen.add(r.key))
  const nextSkip = skip + fdaData.items.length
  return {
    results, statuses, notes,
    total: fdaData.total,
    cursor: { skip: nextSkip, seen: [...seen] },
    hasMore: fda.status === 'fulfilled' && nextSkip < fdaData.total && fdaData.items.length > 0,
    fromCache: statuses.every((s) => s.state !== 'ok' || s.fromCache),
  }
}

export async function searchDiseaseTopics(term, { cursor, signal, force } = {}) {
  const start = cursor?.start || 0
  const r = await searchDiseases(term, { retstart: start, signal, force })
  const items = r.data.items.map((d) => ({
    id: `mp:${d.slug}`, kind: 'disease', title: d.title, slug: d.slug,
    subtitle: d.groups.length ? d.groups.slice(0, 2).join(', ') : 'Health topic',
    description: d.description || 'No summary text returned for this topic.',
    sources: [{ name: SRC.mp.name, url: d.url }], altTitles: d.altTitles,
  }))
  const next = start + r.data.items.length
  return {
    results: items,
    statuses: [{ source: 'MedlinePlus', state: 'ok', fromCache: r.fromCache, fetchedAt: r.fetchedAt }],
    total: r.data.total, cursor: { start: next }, hasMore: next < r.data.total && r.data.items.length > 0, fromCache: r.fromCache,
  }
}

/** category: 'all' | 'medicines' | 'diseases' */
export async function unifiedSearch({ q, category = 'all', cursor = {}, signal, force }) {
  const wantMed = category !== 'diseases'
  const wantDis = category !== 'medicines'
  const [m, d] = await Promise.allSettled([
    wantMed ? searchMedicines(q, { cursor: cursor.med, signal, force }) : Promise.resolve(null),
    wantDis ? searchDiseaseTopics(q, { cursor: cursor.dis, signal, force }) : Promise.resolve(null),
  ])
  if (isAbort(m)) throw m.reason
  if (isAbort(d)) throw d.reason
  const failed = (r, on) => on && r.status === 'rejected'
  const statuses = [
    ...(wantMed ? (m.status === 'fulfilled' ? m.value.statuses : [{ source: 'openFDA + RxNorm', state: 'error', message: friendlyError(m.reason), type: m.reason?.type }]) : []),
    ...(wantDis ? (d.status === 'fulfilled' ? d.value.statuses : [{ source: 'MedlinePlus', state: 'error', message: friendlyError(d.reason), type: d.reason?.type }]) : []),
  ]
  if ((!wantMed || failed(m, true)) && (!wantDis || failed(d, true))) {
    throw Object.assign(new Error('All sources failed'), { statuses, type: (m.reason || d.reason)?.type })
  }
  const med = m.status === 'fulfilled' ? m.value : null
  const dis = d.status === 'fulfilled' ? d.value : null
  return {
    results: [...(med?.results || []), ...(dis?.results || [])],
    statuses, notes: med?.notes || [],
    cursor: { med: med?.cursor, dis: dis?.cursor },
    hasMore: Boolean(med?.hasMore || dis?.hasMore),
    totals: { med: med?.total ?? null, dis: dis?.total ?? null },
    fromCache: [med, dis].filter(Boolean).every((x) => x.fromCache),
  }
}

export async function getSuggestions(q, category, signal) {
  const [m, d] = await Promise.allSettled([
    category !== 'diseases' ? suggestNames(q, { signal }) : Promise.resolve({ data: [] }),
    category !== 'medicines' ? suggestTopics(q, { signal }) : Promise.resolve({ data: [] }),
  ])
  if (isAbort(m) || isAbort(d)) throw (m.reason || d.reason)
  return [
    ...(m.status === 'fulfilled' ? m.value.data.map((t) => ({ text: t, kind: 'medicine' })) : []),
    ...(d.status === 'fulfilled' ? d.value.data.map((t) => ({ text: t, kind: 'disease' })) : []),
  ].slice(0, 8)
}

/** Full medicine record from an id like "fda:<labelId>" or "rx:<rxcui>". Combines openFDA + RxNorm; tolerates one failing. */
export async function getMedicineDetail(id, { signal, force } = {}) {
  const [kind, key] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)]
  const parts = []
  const notes = []
  let label = null, labelMeta = null, others = [], rx = null

  if (kind === 'fda') {
    const [l] = await Promise.allSettled([getLabelById(key, { signal, force })])
    if (isAbort(l)) throw l.reason
    if (l.status === 'fulfilled') { parts.push(l.value); label = l.value.data.main; labelMeta = l.value.data }
    else notes.push({ source: 'openFDA', message: friendlyError(l.reason), type: l.reason?.type })
    const rxcui = label?.rxcuis?.[0]
    if (rxcui) {
      const [r] = await Promise.allSettled([getConceptDetail(rxcui, { signal, force })])
      if (isAbort(r)) throw r.reason
      if (r.status === 'fulfilled') { parts.push(r.value); rx = r.value.data }
      else notes.push({ source: 'RxNorm', message: friendlyError(r.reason), type: r.reason?.type })
    } else if (label) notes.push({ source: 'RxNorm', message: 'This label record carries no RxNorm identifier, so no standardised RxNorm details were retrieved.' })
    if (label) {
      const nm = label.genericNames[0]
      if (nm) {
        const [o] = await Promise.allSettled([findLabelsForDetail({ term: nm }, { signal, force })])
        if (isAbort(o)) throw o.reason
        if (o.status === 'fulfilled') { parts.push(o.value); others = o.value.data.others.filter((x) => x.id !== label.id).concat(o.value.data.main && o.value.data.main.id !== label.id ? [o.value.data.main] : []) }
      }
    }
  } else {
    const [r] = await Promise.allSettled([getConceptDetail(key, { signal, force })])
    if (isAbort(r)) throw r.reason
    if (r.status === 'fulfilled') { parts.push(r.value); rx = r.value.data }
    else notes.push({ source: 'RxNorm', message: friendlyError(r.reason), type: r.reason?.type })
    const query = rx
      ? ['IN', 'MIN', 'PIN', 'BN'].includes(rx.tty) ? { term: rx.name } : { rxcui: key }
      : null
    if (query) {
      const [l] = await Promise.allSettled([findLabelsForDetail(query, { signal, force })])
      if (isAbort(l)) throw l.reason
      if (l.status === 'fulfilled') { parts.push(l.value); label = l.value.data.main; labelMeta = l.value.data; others = l.value.data.others }
      else notes.push({ source: 'openFDA', message: friendlyError(l.reason), type: l.reason?.type })
    }
  }
  if (!label && !rx) {
    const first = notes[0]
    throw Object.assign(new Error(first?.message || 'No record could be retrieved'), { type: first?.type })
  }
  return {
    id, label, rx, others, notes,
    links: {
      openFda: label ? labelApiUrl(label.id) : null,
      dailyMed: label?.setId ? dailyMedUrl(label.setId) : null,
      rxnav: rx ? rx.url : null,
    },
    lastUpdated: labelMeta?.lastUpdated || null,
    fromCache: parts.length > 0 && parts.every((p) => p.fromCache),
    fetchedAt: parts.length ? Math.min(...parts.map((p) => p.fetchedAt)) : Date.now(),
  }
}
