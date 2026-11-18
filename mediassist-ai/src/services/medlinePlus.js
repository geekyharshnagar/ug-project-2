// NIH MedlinePlus Web Service  (https://medlineplus.gov/about/developers/webservices/)
import { request, ApiError } from './http.js'
import { cached, TTL } from './cache.js'
import { stripHtml, snippet, clean } from '../utils/text.js'

const BASE = 'https://wsearch.nlm.nih.gov/ws/query'
export const medlineSearchPage = (term) => `https://medlineplus.gov/search/?query=${encodeURIComponent(term)}`
const slugOf = (url = '') => url.split('/').pop().replace(/\.html?$/, '')

// MedlinePlus normally allows browser requests. If a network blocks it during `npm run dev`,
// the Vite dev proxy in vite.config.js is used as a fallback (still no backend code).
async function fetchXml(term, { retstart, retmax, signal }) {
  const qs = `db=healthTopics&term=${encodeURIComponent(term)}&retmax=${retmax}&retstart=${retstart}`
  try {
    return await request(`${BASE}?${qs}`, { signal, as: 'xml' })
  } catch (e) {
    if (e.type === 'network' && import.meta.env.DEV) return await request(`/proxy/medlineplus/ws/query?${qs}`, { signal, as: 'xml' })
    throw e
  }
}

// ---- Overview text is grouped into sections by keyword. This only SORTS text MedlinePlus wrote.
const RULES = [
  ['symptoms', /\b(symptoms?|signs)\b/i],
  ['causes', /\b(causes?|caused by|results? from|due to)\b/i],
  ['riskFactors', /\b(risk factors?|more likely|higher risk|increases? (your |the )?(risk|chance))\b/i],
  ['diagnosis', /\b(diagnos\w*|screening|tests?|exam)\b/i],
  ['prevention', /\b(prevent\w*|vaccin\w*|reduce (your )?risk|avoid\w*)\b/i],
  ['treatment', /\b(treat\w*|medicines?|medications?|therap\w*|surgery|manag\w*)\b/i],
]
export const SECTION_LABELS = {
  overview: 'Overview', symptoms: 'Symptoms', causes: 'Causes', riskFactors: 'Risk factors',
  diagnosis: 'Diagnosis', treatment: 'Treatment', prevention: 'Prevention',
}

function sectionize(html) {
  const d = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html')
  const blocks = [...d.body.firstChild.children].map((el) => ({
    isList: /^(UL|OL)$/.test(el.tagName),
    text: clean(el.textContent),
    items: [...el.querySelectorAll('li')].map((li) => clean(li.textContent)),
  })).filter((b) => b.text)
  const out = Object.fromEntries(Object.keys(SECTION_LABELS).map((k) => [k, []]))
  let last = 'overview'
  blocks.forEach((b, i) => {
    let sec = last
    if (i === 0) sec = 'overview'
    else if (!b.isList) sec = RULES.find(([, re]) => re.test(b.text))?.[0] || 'overview'
    last = sec
    out[sec].push(b.isList ? { list: b.items } : { p: b.text })
  })
  return { sections: out, blocks: blocks.map((b) => (b.isList ? { list: b.items } : { p: b.text })) }
}

export function parseMedlineXml(text, { full = false } = {}) {
  const xml = new DOMParser().parseFromString(text, 'text/xml')
  if (xml.querySelector('parsererror')) throw new ApiError('parse', 'MedlinePlus returned an unreadable response')
  const total = parseInt(xml.querySelector('nlmSearchResult > count')?.textContent || '0', 10) || 0
  const items = [...xml.querySelectorAll('document')].map((d) => {
    const all = (n) => [...d.querySelectorAll(`content[name="${n}"]`)].map((c) => stripHtml(c.textContent)).filter(Boolean)
    const url = d.getAttribute('url') || ''
    const summaryHtml = d.querySelector('content[name="FullSummary"]')?.textContent || ''
    const summaryText = stripHtml(summaryHtml) || all('snippet')[0] || ''
    const base = {
      id: slugOf(url), slug: slugOf(url), url,
      title: all('title')[0] || slugOf(url),
      altTitles: all('altTitle'), groups: all('groupName'), mesh: all('mesh'),
      description: snippet(summaryText, 280),
    }
    return full ? { ...base, ...sectionize(summaryHtml), summaryLength: summaryText.length } : base
  })
  return { total, items }
}

/** Search health topics. Returns cached() triple: { data:{total,items,url}, fromCache, fetchedAt } */
export function searchDiseases(term, { retstart = 0, retmax = 10, signal, force } = {}) {
  return cached(`mp:s:${term.toLowerCase()}:${retstart}:${retmax}`, TTL.search, async () => {
    const text = await fetchXml(term, { retstart, retmax, signal })
    return { ...parseMedlineXml(text), url: medlineSearchPage(term) }
  }, { force })
}

/** Full normalised disease record for the detail page, plus related topics from the same query. */
export function getDisease(slug, title, { signal, force } = {}) {
  return cached(`mp:d:${slug}`, TTL.detail, async () => {
    const text = await fetchXml(title || slug.replace(/-/g, ' '), { retstart: 0, retmax: 10, signal })
    const { items } = parseMedlineXml(text, { full: true })
    const match = items.find((i) => i.slug === slug) || items[0]
    if (!match) throw new ApiError('not_found', 'MedlinePlus has no health topic for this search')
    return { ...match, related: items.filter((i) => i !== match).slice(0, 6).map((i) => ({ title: i.title, slug: i.slug, url: i.url })) }
  }, { force })
}

export function suggestTopics(term, { signal } = {}) {
  return cached(`mp:sug:${term.toLowerCase()}`, TTL.suggest, async () => {
    const text = await fetchXml(term, { retstart: 0, retmax: 5, signal })
    return parseMedlineXml(text).items.map((i) => i.title)
  })
}
