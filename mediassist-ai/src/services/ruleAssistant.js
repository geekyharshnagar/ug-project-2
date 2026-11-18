// Rule-based MediBot: finds the requested section in the retrieved source record and returns it.
// It never writes medical facts of its own.
import { searchMedicines, getMedicineDetail } from './searchService.js'
import { searchDiseaseTopics } from './searchService.js'
import { getDisease } from './medlinePlus.js'
import { NA, norm, snippet } from '../utils/text.js'

const STOP = new Set('explain tell me what whats is are the a an of about for how does do work works working mechanism action side effects effect uses use used to treat treatment symptoms symptom causes cause risk factors diagnosis diagnose diagnosed prevent prevention warnings warning contraindications contraindication adverse reactions reaction dosage forms form ingredients ingredient active class category brand names name simple simply language please can you give show in with and when which who why information info on describe define'.split(' '))

const INTENTS = [
  { id: 'mechanism', kind: 'medicine', re: /mechanism|how (does|do|is).*(work|act)|works?\b/i, label: 'Mechanism of action' },
  { id: 'dosageForms', kind: 'medicine', re: /dosage forms?|strengths?|available (as|in)|tablets?|capsules?/i, label: 'Dosage forms' },
  { id: 'warnings', kind: 'medicine', re: /warnings?|precautions?|boxed/i, label: 'Warnings' },
  { id: 'contraindications', kind: 'medicine', re: /contraindicat|who should not|should not (take|use)/i, label: 'Contraindications' },
  { id: 'adverse', kind: 'medicine', re: /side effects?|adverse|reactions?/i, label: 'Adverse reactions' },
  { id: 'pharmacology', kind: 'medicine', re: /pharmacolog|pharmacokinetic|absorb|metabolis|half-?life/i, label: 'Clinical pharmacology' },
  { id: 'ingredients', kind: 'medicine', re: /ingredient|composition|contains?/i, label: 'Active ingredients' },
  { id: 'class', kind: 'medicine', re: /\bclass\b|category|classification|type of drug/i, label: 'Drug class' },
  { id: 'symptoms', kind: 'disease', re: /symptoms?|signs\b/i, label: 'Symptoms' },
  { id: 'causes', kind: 'disease', re: /\bcauses?\b|why do (people|you) get/i, label: 'Causes' },
  { id: 'riskFactors', kind: 'disease', re: /risk factors?|who gets|at risk/i, label: 'Risk factors' },
  { id: 'diagnosis', kind: 'disease', re: /diagnos|how is .* detected/i, label: 'Diagnosis' },
  { id: 'prevention', kind: 'disease', re: /prevent|avoid/i, label: 'Prevention' },
  { id: 'treatment', kind: 'either', re: /treat(ment|ed|s)?\b|therap|cure/i, label: 'Treatment' },
  { id: 'indications', kind: 'either', re: /used for|\buses?\b|indicat/i, label: 'Indications and usage' },
  { id: 'overview', kind: 'either', re: /.*/, label: 'Overview' },
]

export const REFUSAL = /\b(how (much|many)|what dose|my dose|should i (take|use|stop)|can i (take|use|mix)|prescribe|diagnose me|do i have|am i (sick|ill)|for my (child|son|daughter|baby|mother|father)|is it safe for me)\b/i
export const REFUSAL_TEXT = 'I can only explain published information. I cannot diagnose, prescribe, or give personal dosage advice. For decisions about your own treatment, please talk to a pharmacist or doctor.'

export const detectIntent = (q) => INTENTS.find((i) => i.re.test(q))
export function extractSubject(q) {
  return q.toLowerCase().replace(/[?.!,]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)).join(' ').trim()
}

const pick = (ctx, id) => {
  const s = ctx.sections || {}
  const map = {
    mechanism: [s.mechanism, ctx.moaClasses?.length ? `Pharmacologic mechanism class(es) listed: ${ctx.moaClasses.join('; ')}.` : null],
    dosageForms: [s.dosageForms, s.howSupplied],
    warnings: [s.boxedWarning ? `BOXED WARNING: ${s.boxedWarning}` : null, s.warnings],
    contraindications: [s.contraindications],
    adverse: [s.adverseReactions],
    pharmacology: [s.clinicalPharmacology],
    ingredients: [ctx.ingredients?.length ? ctx.ingredients.join(', ') : null],
    class: [ctx.classes?.length ? ctx.classes.join('; ') : null],
    indications: [s.indications],
  }
  const parts = (map[id] || [s[id]]).filter(Boolean)
  return parts.length ? parts.join('\n\n') : null
}

/** Build an answer from a context object (see AssistantContext). */
export function answerFromContext(ctx, intent) {
  let id = intent.id
  if (ctx.kind === 'disease' && id === 'indications') id = 'treatment'
  const text = pick(ctx, id)
  return {
    found: Boolean(text), title: ctx.title, sectionLabel: intent.label,
    sourceName: ctx.sourceName, sourceUrl: ctx.sourceUrl,
    excerpt: text ? snippet(text, 1400) : null,
    missing: text ? null : `${NA}: the retrieved ${ctx.sourceName} record for ${ctx.title} does not include "${intent.label}". I will not fill this in from memory.`,
  }
}

const toDiseaseCtx = (d) => ({
  kind: 'disease', title: d.title, id: `mp:${d.slug}`, href: `/disease/${d.slug}?t=${encodeURIComponent(d.title)}`,
  sourceName: 'NIH MedlinePlus', sourceUrl: d.url,
  sections: Object.fromEntries(Object.entries(d.sections).map(([k, v]) => [k, v.map((b) => (b.p ? b.p : b.list.join('; '))).join('\n\n') || null])),
})

export const toMedicineCtx = (d, id) => ({
  kind: 'medicine', id, href: `/medicine/${encodeURIComponent(id)}`,
  title: d.label ? (d.label.genericNames[0] || d.label.brandNames[0]) : d.rx?.name,
  sourceName: d.label ? 'US FDA – openFDA drug label' : 'NIH RxNorm', sourceUrl: d.links.dailyMed || d.links.openFda || d.links.rxnav,
  sections: d.label?.sections || {},
  moaClasses: d.label?.pharmClasses.moa?.length ? d.label.pharmClasses.moa : d.rx?.classes?.moa || [],
  ingredients: d.label?.substances?.length ? d.label.substances : d.rx?.ingredients?.map((i) => i.name) || [],
  classes: [...(d.label?.pharmClasses.epc || []), ...(d.label?.pharmClasses.cs || []), ...(d.rx?.classes?.epc || [])],
})

/** Fetch live data for a subject named in a question. Returns a context or null. */
export async function fetchContextFor(subject, intent, preferKind, signal) {
  const order = intent.kind === 'medicine' ? ['medicine'] : intent.kind === 'disease' ? ['disease'] : preferKind === 'disease' ? ['disease', 'medicine'] : ['medicine', 'disease']
  for (const k of order) {
    try {
      if (k === 'medicine') {
        const r = await searchMedicines(subject, { signal })
        const hit = r.results.find((x) => x.id.startsWith('fda:')) || r.results[0]
        if (hit) { const d = await getMedicineDetail(hit.id, { signal }); return toMedicineCtx(d, hit.id) }
      } else {
        const r = await searchDiseaseTopics(subject, { signal })
        const hit = r.results[0]
        if (hit) { const d = await getDisease(hit.slug, hit.title, { signal }); return toDiseaseCtx(d.data) }
      }
    } catch (e) { if (e.name === 'AbortError') throw e }
  }
  return null
}

export const matchesContext = (subject, ctx) => !subject || (ctx && (norm(ctx.title).includes(subject) || subject.includes(norm(ctx.title))))
export { toDiseaseCtx }
