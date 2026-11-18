import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bot, ExternalLink } from 'lucide-react'
import { getMedicineDetail } from '../services/searchService.js'
import { toMedicineCtx } from '../services/ruleAssistant.js'
import { ErrorPanel, Field, FavButton, FreshnessBadge, Notice, Skeleton, SourceChip, TextSection } from '../components/ui.jsx'
import { useAssistantContext } from '../context/AssistantContext.jsx'
import { formatDate, titleCase, uniq } from '../utils/text.js'

export default function MedicineDetail() {
  const { id: raw } = useParams()
  const id = decodeURIComponent(raw)
  const nav = useNavigate()
  const { setActive } = useAssistantContext()
  const [st, setSt] = useState({ status: 'loading' })
  const ctrl = useRef(null)

  const load = useCallback(async (force = false) => {
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    setSt({ status: 'loading' })
    try {
      const d = await getMedicineDetail(id, { signal: c.signal, force })
      if (c.signal.aborted) return
      setSt({ status: 'done', d })
      setActive(toMedicineCtx(d, id))
    } catch (e) { if (e.name !== 'AbortError') setSt({ status: 'error', error: e }) }
  }, [id, setActive])

  useEffect(() => { load(); return () => ctrl.current?.abort() }, [load])

  if (st.status === 'loading') return <div className="space-y-4"><div className="skeleton h-8 w-1/3" /><Skeleton lines={4} /><Skeleton lines={6} /></div>
  if (st.status === 'error') return <ErrorPanel error={st.error} onRetry={() => load(true)} />

  const { d } = st
  const { label: l, rx } = d
  const s = l?.sections || {}
  const generic = l?.genericNames[0] || rx?.ingredients?.[0]?.name || rx?.name
  const title = titleCase(l?.brandNames[0] || generic || rx?.name || 'Medicine')
  const brands = uniq([...(l?.brandNames || []), ...(rx?.brands?.map((b) => b.name) || [])]).map(titleCase)
  const ingredients = uniq([...(l?.substances || []), ...(rx?.ingredients?.map((i) => i.name) || [])]).map(titleCase)
  const classes = uniq([...(l?.pharmClasses.epc || []), ...(l?.pharmClasses.cs || []), ...(rx?.classes?.epc || [])])
  const moa = uniq([...(l?.pharmClasses.moa || []), ...(rx?.classes?.moa || [])])
  const doseForms = uniq([...(rx?.doseForms || [])])
  const fav = { id: d.id, kind: 'medicine', title, subtitle: generic ? `Generic: ${titleCase(generic)}` : '', href: `/medicine/${encodeURIComponent(d.id)}` }

  return (
    <article className="space-y-5">
      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Medicine record</p>
            <h1 className="text-3xl font-semibold">{title}</h1>
            {generic && <p className="text-slate-600">Generic name: {titleCase(generic)}</p>}
          </div>
          <div className="flex gap-2">
            <FavButton item={fav} />
            <button className="btn btn-primary" onClick={() => nav('/assistant')}><Bot size={14} />Ask MediBot</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {l && <SourceChip name="US FDA – openFDA" url={d.links.openFda} />}
          {rx && <SourceChip name="NIH National Library of Medicine – RxNorm" url={d.links.rxnav} />}
          <FreshnessBadge fromCache={d.fromCache} fetchedAt={d.fetchedAt} onRefresh={() => load(true)} />
        </div>
      </header>

      {d.notes.map((n, i) => <Notice key={i} tone="warn"><strong>{n.source}:</strong> {n.message} The fields below that depend on it show “Information not available”.</Notice>)}
      {!l && <Notice>No openFDA label record was found for this concept. Label sections (indications, warnings and so on) are therefore unavailable. Source coverage varies by country.</Notice>}

      <section className="card p-5">
        <h2 className="text-lg font-semibold mb-3">Identification</h2>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          <Field label="Generic name">{generic ? titleCase(generic) : null}</Field>
          <Field label="Brand names">{brands.slice(0, 12)}</Field>
          <Field label="Active ingredients">{ingredients}</Field>
          <Field label="Route of administration">{l?.routes.map(titleCase)}</Field>
          <Field label="Pharmacological category (FDA established class)">{classes}</Field>
          <Field label="Mechanism class (MoA)">{moa}</Field>
          <Field label="Drug classification (ATC, via RxClass)">{rx?.classes?.atc}</Field>
          <Field label="Dose forms (RxNorm)">{doseForms.slice(0, 10)}</Field>
          <Field label="Manufacturer (this label)">{l?.manufacturers.slice(0, 2).map(titleCase)}</Field>
          <Field label="Label effective date">{formatDate(l?.effectiveTime)}</Field>
          <Field label="RxNorm concept">{rx ? `${rx.name} (RXCUI ${rx.rxcui})` : null}</Field>
          <Field label="openFDA data last updated">{d.lastUpdated}</Field>
        </dl>
        {rx?.classes?.mayTreat?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <dt className="text-xs font-semibold text-slate-500">Conditions linked to this ingredient in NIH MED-RT (RxClass “may treat”)</dt>
            <dd className="text-sm mt-0.5">{rx.classes.mayTreat.join(', ')}</dd>
          </div>
        )}
      </section>

      {s.boxedWarning && <TextSection title="Boxed warning" text={s.boxedWarning} tone="danger" defaultOpen source="FDA label" />}
      <TextSection title="Indications and usage" text={s.indications} defaultOpen source="FDA label" />
      <TextSection title="Dosage forms and strengths" text={s.dosageForms || s.howSupplied} source="FDA label" />
      <TextSection title="Warnings" text={s.warnings} source="FDA label" />
      <TextSection title="Contraindications" text={s.contraindications} source="FDA label" />
      <TextSection title="Adverse reactions" text={s.adverseReactions} source="FDA label" />
      <TextSection title="Mechanism of action" text={s.mechanism} source="FDA label" />
      <TextSection title="Clinical pharmacology" text={s.clinicalPharmacology} source="FDA label" />
      {s.description && <TextSection title="Product description" text={s.description} source="FDA label" />}

      {d.others.length > 0 && (
        <section className="card p-5">
          <h2 className="text-lg font-semibold mb-2">Other label records for this medicine</h2>
          <ul className="text-sm space-y-1">
            {d.others.slice(0, 10).map((o) => (
              <li key={o.id}><Link className="text-teal-800 underline" to={`/medicine/${encodeURIComponent('fda:' + o.id)}`}>{titleCase(o.brandNames[0] || o.genericNames[0] || 'Label')}</Link> <span className="text-slate-500">{o.manufacturers[0] ? `· ${titleCase(o.manufacturers[0])}` : ''} {formatDate(o.effectiveTime) ? `· ${formatDate(o.effectiveTime)}` : ''}</span></li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-5 bg-slate-50">
        <h2 className="text-lg font-semibold mb-2">Sources and limits</h2>
        <ul className="text-sm space-y-1">
          {d.links.openFda && <li>US FDA – openFDA record: <a className="underline inline-flex items-center gap-1" href={d.links.openFda} target="_blank" rel="noreferrer">API record <ExternalLink size={12} /></a></li>}
          {d.links.dailyMed && <li>Full official label on DailyMed: <a className="underline inline-flex items-center gap-1" href={d.links.dailyMed} target="_blank" rel="noreferrer">DailyMed <ExternalLink size={12} /></a></li>}
          {d.links.rxnav && <li>NIH RxNorm concept: <a className="underline inline-flex items-center gap-1" href={d.links.rxnav} target="_blank" rel="noreferrer">RxNav <ExternalLink size={12} /></a></li>}
        </ul>
        <p className="text-xs text-slate-600 mt-3 max-w-[75ch]">All text above is quoted from these sources and nothing is generated. openFDA describes medicines labelled for the US market. RxNorm is a US standard vocabulary. A medicine appearing here does not mean it is approved or sold in your country, and brand names and strengths differ between countries. Fields that a record does not provide are shown as “Information not available”.</p>
      </section>
    </article>
  )
}
