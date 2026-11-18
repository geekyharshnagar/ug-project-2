// US FDA – openFDA Drug Label API  (https://open.fda.gov/apis/drug/label/)
import { request } from './http.js'
import { cached, TTL } from './cache.js'
import { joinText, snippet } from '../utils/text.js'

const BASE = 'https://api.fda.gov/drug'
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : [])
const HEAD = /^\s*(\d+(\.\d+)?\s*)?(INDICATIONS\s*(AND|&)\s*USAGE|WARNINGS(\s*AND\s*(PRECAUTIONS|CAUTIONS))?|CONTRAINDICATIONS|ADVERSE REACTIONS|CLINICAL PHARMACOLOGY|MECHANISM OF ACTION|DOSAGE FORMS\s*(AND|&)\s*STRENGTHS|DESCRIPTION|BOXED WARNING|HOW SUPPLIED|DRUG INTERACTIONS)\s*:?\s*/
const tidy = (v) => joinText(arr(v).map((s) => String(s).replace(HEAD, '')))

const phrase = (s) => encodeURIComponent(`"${s.replace(/["\\()+]/g, ' ').replace(/\s+/g, ' ').trim()}"`)

/** openFDA query syntax: field:"phrase"+OR+field:prefix*  (the + signs are query operators, not encoded text) */
export function buildLabelQuery(term) {
  const t = term.replace(/["\\()+]/g, ' ').replace(/\s+/g, ' ').trim()
  const fields = ['openfda.generic_name', 'openfda.brand_name', 'openfda.substance_name']
  const parts = fields.map((f) => `${f}:${phrase(t)}`)
  if (!t.includes(' ') && t.length >= 3 && /^[A-Za-z0-9-]+$/.test(t)) {
    fields.forEach((f) => parts.push(`${f}:${encodeURIComponent(t.toLowerCase())}*`))
  }
  return parts.join('+OR+')
}

export const labelApiUrl = (id) => `${BASE}/label.json?search=id:"${id}"`
export const dailyMedUrl = (setId) => `https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${setId}`

export function normalizeLabel(r, full = false) {
  const o = r.openfda || {}
  const base = {
    id: r.id,
    setId: r.set_id || arr(o.spl_set_id)[0] || null,
    effectiveTime: r.effective_time || null,
    version: r.version || null,
    genericNames: arr(o.generic_name),
    brandNames: arr(o.brand_name),
    substances: arr(o.substance_name),
    manufacturers: arr(o.manufacturer_name),
    routes: arr(o.route),
    productTypes: arr(o.product_type),
    rxcuis: arr(o.rxcui),
    pharmClasses: { epc: arr(o.pharm_class_epc), moa: arr(o.pharm_class_moa), cs: arr(o.pharm_class_cs), pe: arr(o.pharm_class_pe) },
    indicationsSnippet: snippet(tidy(r.indications_and_usage), 260),
  }
  if (!full) return base
  return {
    ...base,
    sections: {
      indications: tidy(r.indications_and_usage),
      dosageForms: tidy(r.dosage_forms_and_strengths),
      howSupplied: tidy(r.how_supplied),
      boxedWarning: tidy(r.boxed_warning),
      warnings: tidy(r.warnings_and_cautions) || tidy(r.warnings),
      contraindications: tidy(r.contraindications),
      adverseReactions: tidy(r.adverse_reactions),
      clinicalPharmacology: tidy(r.clinical_pharmacology),
      mechanism: tidy(r.mechanism_of_action),
      description: tidy(r.description),
    },
  }
}

const isNotFound = (e) => e?.type === 'not_found'

/** Light search (for result lists). Returns cached() triple: { data:{total,items,url}, fromCache, fetchedAt } */
export function searchLabels(term, { skip = 0, limit = 20, signal, force } = {}) {
  const url = `${BASE}/label.json?search=${buildLabelQuery(term)}&limit=${limit}&skip=${skip}`
  return cached(`fda:s:${term.toLowerCase()}:${skip}:${limit}`, TTL.search, async () => {
    try {
      const j = await request(url, { signal })
      const items = (j.results || []).map((r) => normalizeLabel(r))
      return { total: j.meta?.results?.total ?? items.length, items, url, lastUpdated: j.meta?.last_updated || null }
    } catch (e) {
      if (isNotFound(e)) return { total: 0, items: [], url }
      throw e
    }
  }, { force })
}

/** For detail pages: one request, best label fully normalised, the rest light. */
export function findLabelsForDetail({ term, rxcui }, { signal, force } = {}) {
  const search = rxcui ? `openfda.rxcui:${phrase(String(rxcui))}` : buildLabelQuery(term)
  const url = `${BASE}/label.json?search=${search}&limit=10`
  return cached(`fda:d:${rxcui || term.toLowerCase()}`, TTL.detail, async () => {
    try {
      const j = await request(url, { signal })
      const raw = j.results || []
      const withInd = raw.filter((r) => r.indications_and_usage)
      const pool = withInd.length ? withInd : raw
      const best = [...pool].sort((a, b) => String(b.effective_time).localeCompare(String(a.effective_time)))[0]
      return {
        main: best ? normalizeLabel(best, true) : null,
        others: raw.filter((r) => r !== best).map((r) => normalizeLabel(r)),
        total: j.meta?.results?.total ?? raw.length,
        lastUpdated: j.meta?.last_updated || null,
        url,
      }
    } catch (e) {
      if (isNotFound(e)) return { main: null, others: [], total: 0, url }
      throw e
    }
  }, { force })
}

export function getLabelById(id, { signal, force } = {}) {
  const url = `${BASE}/label.json?search=id:${phrase(id)}&limit=1`
  return cached(`fda:id:${id}`, TTL.detail, async () => {
    const j = await request(url, { signal })
    const r = j.results?.[0]
    return { main: r ? normalizeLabel(r, true) : null, lastUpdated: j.meta?.last_updated || null, url }
  }, { force })
}

/** openFDA adverse-event reports (FAERS): most frequently reported reaction terms for a drug. */
export function topReactions(drug, { signal, force } = {}) {
  const url = `${BASE}/event.json?search=patient.drug.openfda.generic_name:${phrase(drug)}&count=patient.reaction.reactionmeddrapt.exact&limit=12`
  return cached(`fda:faers:${drug.toLowerCase()}`, TTL.detail, async () => {
    try {
      const j = await request(url, { signal })
      return { items: j.results || [], url, lastUpdated: j.meta?.last_updated || null }
    } catch (e) {
      if (isNotFound(e)) return { items: [], url }
      throw e
    }
  }, { force })
}
