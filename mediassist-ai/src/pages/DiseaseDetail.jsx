import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Bot, ExternalLink } from 'lucide-react'
import { getDisease, SECTION_LABELS } from '../services/medlinePlus.js'
import { ICD11_BROWSER_URL, ICD11_CONFIGURED, ICD11_DOCS_URL, searchIcd10cm } from '../services/icd.js'
import { toDiseaseCtx } from '../services/ruleAssistant.js'
import { ErrorPanel, FavButton, FreshnessBadge, Notice, Skeleton, SourceChip } from '../components/ui.jsx'
import { useAssistantContext } from '../context/AssistantContext.jsx'
import { NA } from '../utils/text.js'

const Blocks = ({ blocks }) => blocks.map((b, i) => (b.p
  ? <p key={i}>{b.p}</p>
  : <ul key={i} className="list-disc pl-5 space-y-0.5">{b.list.map((x, j) => <li key={j}>{x}</li>)}</ul>))

export default function DiseaseDetail() {
  const { slug } = useParams()
  const [sp] = useSearchParams()
  const title = sp.get('t') || ''
  const nav = useNavigate()
  const { setActive } = useAssistantContext()
  const [st, setSt] = useState({ status: 'loading' })
  const [icd, setIcd] = useState(null)
  const ctrl = useRef(null)

  const load = useCallback(async (force = false) => {
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    setSt({ status: 'loading' }); setIcd(null)
    try {
      const r = await getDisease(slug, title, { signal: c.signal, force })
      if (c.signal.aborted) return
      setSt({ status: 'done', r })
      setActive(toDiseaseCtx(r.data))
      searchIcd10cm(r.data.title, { signal: c.signal }).then((x) => !c.signal.aborted && setIcd(x.data)).catch(() => {})
    } catch (e) { if (e.name !== 'AbortError') setSt({ status: 'error', error: e }) }
  }, [slug, title, setActive])

  useEffect(() => { load(); return () => ctrl.current?.abort() }, [load])

  if (st.status === 'loading') return <div className="space-y-4"><div className="skeleton h-8 w-1/3" /><Skeleton lines={5} /></div>
  if (st.status === 'error') return <ErrorPanel error={st.error} onRetry={() => load(true)} />

  const { data: d, fromCache, fetchedAt } = st.r
  const fav = { id: `mp:${d.slug}`, kind: 'disease', title: d.title, subtitle: 'MedlinePlus health topic', href: `/disease/${d.slug}?t=${encodeURIComponent(d.title)}` }

  return (
    <article className="space-y-5">
      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Disease or health topic</p>
            <h1 className="text-3xl font-semibold">{d.title}</h1>
            {d.altTitles.length > 0 && <p className="text-sm text-slate-600 mt-1">Also known as: {d.altTitles.slice(0, 6).join(', ')}</p>}
          </div>
          <div className="flex gap-2">
            <FavButton item={fav} />
            <button className="btn btn-primary" onClick={() => nav('/assistant')}><Bot size={14} />Ask MediBot</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SourceChip name="NIH MedlinePlus" url={d.url} />
          {d.groups.map((g) => <span key={g} className="badge bg-slate-100 text-slate-700">{g}</span>)}
          <FreshnessBadge fromCache={fromCache} fetchedAt={fetchedAt} onRefresh={() => load(true)} />
        </div>
      </header>

      <Notice>The text below is written by NIH MedlinePlus, not by an AI. It is sorted into headings automatically by keyword from MedlinePlus’s health-topic summary, so a heading may be empty even if the full MedlinePlus page covers it. Read the official page for complete information.</Notice>

      {Object.entries(SECTION_LABELS).map(([k, label]) => (
        <section key={k} className="card p-5">
          <h2 className="text-lg font-semibold">{label}</h2>
          {d.sections[k].length
            ? <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700 max-w-[75ch]"><Blocks blocks={d.sections[k]} /></div>
            : <p className="mt-2 text-sm italic text-slate-400">{NA} in the MedlinePlus summary. <a className="underline" href={d.url} target="_blank" rel="noreferrer">See the full MedlinePlus page</a>.</p>}
        </section>
      ))}

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Classification and related medical information</h2>
        <div className="mt-2 text-sm space-y-3">
          {d.mesh.length > 0 && <p><span className="font-medium">MeSH terms (NIH):</span> {d.mesh.join(', ')}</p>}
          {icd?.items?.length > 0 && (
            <div>
              <p className="font-medium">ICD-10-CM codes matching this name <span className="font-normal text-slate-500">(NIH Clinical Table Search Service; US clinical modification, not WHO ICD-11)</span></p>
              <ul className="list-disc pl-5">{icd.items.map((x) => <li key={x.code}><span className="font-mono">{x.code}</span> {x.name}</li>)}</ul>
            </div>
          )}
          <p>WHO ICD-11: <a className="underline inline-flex items-center gap-1" href={ICD11_BROWSER_URL} target="_blank" rel="noreferrer">open the official ICD-11 browser <ExternalLink size={12} /></a> and search for “{d.title}”. {ICD11_CONFIGURED ? '' : <>Direct API integration is optional and off (it needs OAuth credentials; see <a className="underline" href={ICD11_DOCS_URL} target="_blank" rel="noreferrer">documentation</a>).</>}</p>
          {d.related.length > 0 && (
            <div>
              <p className="font-medium">Related MedlinePlus topics</p>
              <ul className="list-disc pl-5">{d.related.map((r) => <li key={r.slug}><Link className="text-teal-800 underline" to={`/disease/${r.slug}?t=${encodeURIComponent(r.title)}`}>{r.title}</Link></li>)}</ul>
            </div>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Full MedlinePlus summary</h2>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700 max-w-[75ch]"><Blocks blocks={d.blocks} /></div>
      </section>

      <section className="card p-5 bg-slate-50 text-sm">
        <h2 className="text-lg font-semibold mb-2">Sources</h2>
        <a className="underline inline-flex items-center gap-1" href={d.url} target="_blank" rel="noreferrer">Official MedlinePlus page <ExternalLink size={12} /></a>
        <p className="text-xs text-slate-600 mt-2 max-w-[75ch]">MedlinePlus is produced by the US National Library of Medicine for general education. It is not a diagnosis or a treatment plan. Health guidance, available treatments and terminology can differ by country.</p>
      </section>
    </article>
  )
}
