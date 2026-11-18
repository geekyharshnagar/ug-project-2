import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, RefreshCw } from 'lucide-react'
import { unifiedSearch } from '../services/searchService.js'
import { EmptyPanel, ErrorPanel, FreshnessBadge, Notice, ResultCard, ResultSkeletons, StatusStrip } from '../components/ui.jsx'
import { addHistory } from '../utils/history.js'
import { medlineSearchPage } from '../services/medlinePlus.js'
import { ICD11_BROWSER_URL } from '../services/icd.js'

const TITLES = { all: 'Search medicines and diseases', medicines: 'Global Medicine Search', diseases: 'Global Disease Search' }
const TIPS = {
  all: 'Type a medicine, brand name, active ingredient, disease or medical term in the search bar above.',
  medicines: 'Search any generic name, brand name or active ingredient. RxNorm resolves alternate names, and openFDA supplies the label.',
  diseases: 'Search a disease by common name, medical term, alternative name or related keyword. Results come from NIH MedlinePlus.',
}
const EXAMPLES = { all: ['metformin', 'asthma', 'Lipitor'], medicines: ['paracetamol', 'amoxicillin', 'Lipitor'], diseases: ['hypertension', 'rheumatoid arthritis', 'tuberculosis'] }

export default function SearchPage() {
  const [sp, setSp] = useSearchParams()
  const q = (sp.get('q') || '').trim()
  const cat = ['all', 'medicines', 'diseases'].includes(sp.get('cat')) ? sp.get('cat') : 'all'
  const [s, setS] = useState({ status: 'idle', results: [] })
  const [more, setMore] = useState(false)
  const ctrl = useRef(null)

  const run = useCallback(async (force = false) => {
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    if (q.length < 2) { setS({ status: 'idle', results: [] }); return }
    setS({ status: 'loading', results: [] })
    try {
      const r = await unifiedSearch({ q, category: cat, signal: c.signal, force })
      if (c.signal.aborted) return
      setS({ ...r, status: r.results.length ? 'done' : 'empty' })
      addHistory({ q, cat, count: r.results.length })
    } catch (e) {
      if (e.name === 'AbortError') return
      setS({ status: 'error', error: e, statuses: e.statuses, results: [] })
    }
  }, [q, cat])

  useEffect(() => { run(); return () => ctrl.current?.abort() }, [run])

  const loadMore = async () => {
    setMore(true)
    try {
      const r = await unifiedSearch({ q, category: cat, cursor: s.cursor })
      setS((cur) => {
        const ids = new Set(cur.results.map((x) => x.id))
        return { ...cur, results: [...cur.results, ...r.results.filter((x) => !ids.has(x.id))], cursor: r.cursor, hasMore: r.hasMore, statuses: [...(cur.statuses || []).filter((x) => x.state === 'error'), ...r.statuses] }
      })
    } catch (e) { if (e.name !== 'AbortError') setS((cur) => ({ ...cur, loadMoreError: e })) }
    setMore(false)
  }

  const med = (s.results || []).filter((r) => r.kind === 'medicine')
  const dis = (s.results || []).filter((r) => r.kind === 'disease')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{TITLES[cat]}</h1>
        {q.length >= 2
          ? <p className="text-sm text-slate-600 mt-1">Results for <strong>“{q}”</strong>{s.totals?.med != null && ` · about ${s.totals.med.toLocaleString()} FDA label records`}{s.totals?.dis != null && ` · ${s.totals.dis.toLocaleString()} MedlinePlus topics`}</p>
          : <p className="text-sm text-slate-600 mt-1 max-w-[70ch]">{TIPS[cat]}</p>}
      </div>

      {q.length < 2 && (
        <div className="card p-5">
          <p className="text-sm font-medium mb-2">Try a search</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES[cat].map((e) => <button key={e} className="btn" onClick={() => setSp({ q: e, cat })}>{e}</button>)}
          </div>
          <p className="text-xs text-slate-500 mt-3">Every search is sent live to the public APIs. Nothing is searched from a built-in list.</p>
        </div>
      )}

      {s.status === 'loading' && <ResultSkeletons />}
      {s.status === 'error' && (
        <ErrorPanel error={s.error} onRetry={() => run(true)}>
          <div className="mt-3"><StatusStrip statuses={s.statuses} /></div>
          {cat !== 'medicines' && (
            <p className="text-xs text-slate-500 mt-3">While you wait you can search directly on <a className="underline" href={medlineSearchPage(q)} target="_blank" rel="noreferrer">MedlinePlus</a> or browse <a className="underline" href={ICD11_BROWSER_URL} target="_blank" rel="noreferrer">WHO ICD-11</a>.</p>
          )}
        </ErrorPanel>
      )}
      {s.status === 'empty' && (
        <EmptyPanel title={`No results for “${q}”`}>
          <p>Check the spelling, or try a generic name, active ingredient, or a more general term.</p>
          <StatusStrip statuses={s.statuses} />
          <button className="btn mt-3" onClick={() => run(true)}><RefreshCw size={14} />Search again</button>
        </EmptyPanel>
      )}

      {s.status === 'done' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusStrip statuses={s.statuses} />
            <FreshnessBadge fromCache={s.fromCache} fetchedAt={Date.now()} onRefresh={() => run(true)} />
          </div>
          {s.statuses?.some((x) => x.state === 'error') && <Notice tone="warn">One source is unavailable, so these results come from the remaining source only. Use Retry to try again.</Notice>}
          {s.notes?.map((n, i) => <Notice key={i}>{n}</Notice>)}
          {cat === 'all' ? (
            <>
              {med.length > 0 && <Group title="Medicines" items={med} />}
              {dis.length > 0 && <Group title="Diseases and health topics" items={dis} />}
            </>
          ) : <div className="space-y-3">{s.results.map((r) => <ResultCard key={r.id} r={r} />)}</div>}
          {s.loadMoreError && <Notice tone="error">Could not load more results. <button className="underline" onClick={loadMore}>Retry</button></Notice>}
          {s.hasMore && (
            <div className="text-center">
              <button className="btn" onClick={loadMore} disabled={more}>{more ? <><Loader2 className="animate-spin" size={14} />Loading</> : 'Load more results'}</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const Group = ({ title, items }) => (
  <section>
    <h2 className="text-lg font-semibold mb-2">{title} <span className="text-sm font-sans font-normal text-slate-500">({items.length} shown)</span></h2>
    <div className="space-y-3">{items.map((r) => <ResultCard key={r.id} r={r} />)}</div>
  </section>
)
