import { useState, useSyncExternalStore } from 'react'
import { ExternalLink } from 'lucide-react'
import { clearLog, getLog, getLogVersion, subscribeLog } from '../services/apiLog.js'
import { cacheClear, cacheStats } from '../services/cache.js'
import { devFlags } from '../services/http.js'
import { pingApis } from '../services/diagnostics.js'
import { searchDiseaseTopics, searchMedicines } from '../services/searchService.js'
import { ICD11_BROWSER_URL, ICD11_CONFIGURED, ICD11_DOCS_URL } from '../services/icd.js'
import { clearHistory } from '../utils/history.js'
import { Notice, Spinner } from '../components/ui.jsx'

const MED = ['Paracetamol', 'Metformin', 'Ibuprofen', 'Amoxicillin', 'Aspirin', 'Atorvastatin', 'Omeprazole', 'Lipitor (brand)', 'Pirfenidone (uncommon)', 'xqzvbnm123 (invalid)']
const DIS = ['Hypertension', 'Diabetes Mellitus', 'Asthma', 'Tuberculosis', 'Migraine', 'Rheumatoid Arthritis', 'Pneumonia', 'Takayasu arteritis (uncommon)', 'zzqxwv987 (invalid)']
const base = (s) => s.replace(/\s*\(.*\)$/, '')

export default function About() {
  const version = useSyncExternalStore(subscribeLog, getLogVersion)
  const [tests, setTests] = useState([])
  const [running, setRunning] = useState(false)
  const [ping, setPing] = useState(null)
  const [flags, setFlags] = useState({ timeout: false, fda: false, rx: false, mp: false })
  const [, force] = useState(0)

  const setFlag = (k, v) => {
    const next = { ...flags, [k]: v }
    setFlags(next)
    devFlags.simulateTimeout = next.timeout
    const hosts = [['fda', 'api.fda.gov'], ['rx', 'rxnav.nlm.nih.gov'], ['mp', 'wsearch.nlm.nih.gov']]
    devFlags.failHosts = new Set(hosts.filter(([f]) => next[f]).map(([, h]) => h))
  }

  const runSuite = async () => {
    setRunning(true); setTests([])
    const push = (t) => setTests((cur) => [...cur, t])
    const cases = [
      ...MED.map((n) => ['medicine', n]), ...DIS.map((n) => ['disease', n]),
    ]
    for (const [kind, n] of cases) {
      const t0 = performance.now()
      try {
        const r = kind === 'medicine' ? await searchMedicines(base(n), { force: true }) : await searchDiseaseTopics(base(n), { force: true })
        push({ kind, n, ok: true, count: r.results.length, ms: Math.round(performance.now() - t0), sources: r.statuses.map((s) => `${s.source}:${s.state}`).join(' ') })
      } catch (e) { push({ kind, n, ok: false, msg: e.message, ms: Math.round(performance.now() - t0) }) }
    }
    setRunning(false)
  }

  const log = getLog()
  const Row = ({ k, label }) => <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flags[k]} onChange={(e) => setFlag(k, e.target.checked)} />{label}</label>

  return (
    <div className="space-y-5" data-v={version}>
      <h1 className="text-2xl font-semibold">About MediAssist AI</h1>

      <section className="card p-5 space-y-2 text-sm max-w-[80ch]">
        <h2 className="text-lg font-semibold">What this is</h2>
        <p>A frontend-only pharmaceutical and disease information search platform. There is no backend, database or login. Every search and detail page is fetched on demand from public sources by your browser and cached in localStorage for a limited time. Pages say whether data is live or a cached copy.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>US FDA – openFDA drug labels</strong>: label text, brand and generic names, warnings, adverse reactions, pharmacology. <a className="underline" href="https://open.fda.gov/apis/drug/label/" target="_blank" rel="noreferrer">Docs</a></li>
          <li><strong>NIH RxNorm and RxClass</strong>: standard drug names, ingredient and brand relationships, drug classes. <a className="underline" href="https://lhncbc.nlm.nih.gov/RxNav/APIs/" target="_blank" rel="noreferrer">Docs</a></li>
          <li><strong>NIH MedlinePlus</strong>: disease and health-topic summaries. <a className="underline" href="https://medlineplus.gov/about/developers/webservices/" target="_blank" rel="noreferrer">Docs</a></li>
          <li><strong>Curated interaction dataset</strong>: small, referenced and separate from live search.</li>
        </ul>
        <p>Source coverage and regulatory approval vary by country. A medicine appearing in one database is not a statement that it is approved or available worldwide.</p>
      </section>

      <section className="card p-5 space-y-2 text-sm max-w-[80ch]">
        <h2 className="text-lg font-semibold">WHO ICD-11 (optional, off)</h2>
        <p>The ICD-11 API needs OAuth client credentials. A client secret cannot be hidden in frontend code, so this app does not call it. It links to the <a className="underline inline-flex items-center gap-1" href={ICD11_BROWSER_URL} target="_blank" rel="noreferrer">official ICD-11 browser <ExternalLink size={12} /></a> and shows ICD-10-CM codes from NIH on disease pages. To integrate later, run a small token proxy that holds the secret, then set <code>VITE_ICD11_PROXY_URL</code> in <code>.env</code> (see <code>src/services/icd.js</code> and the <a className="underline" href={ICD11_DOCS_URL} target="_blank" rel="noreferrer">ICD API docs</a>). Current status: {ICD11_CONFIGURED ? 'proxy URL configured' : 'not configured'}. The main app works without it.</p>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Diagnostics: verify live retrieval</h2>
        <p className="text-sm text-slate-600 max-w-[75ch]">The request log below lists every real network call made by this app (URL, status, time). The test suite bypasses the cache and runs real searches for each case.</p>

        <div className="flex flex-wrap gap-2 items-center">
          <button className="btn" onClick={async () => setPing(await pingApis())}>Ping all APIs</button>
          <button className="btn btn-primary" onClick={runSuite} disabled={running}>{running ? <Spinner label="Running tests" /> : 'Run live test suite'}</button>
          <button className="btn" onClick={() => { cacheClear(); force((x) => x + 1) }}>Clear cache ({cacheStats().count} entries, {cacheStats().kb} KB)</button>
          <button className="btn" onClick={() => { clearHistory(); force((x) => x + 1) }}>Clear search history</button>
        </div>
        {ping && <ul className="text-sm grid sm:grid-cols-2 gap-1">{ping.map((p) => <li key={p.name}>{p.ok ? '✓' : '✗'} {p.name}: {p.ok ? `${p.ms} ms` : p.message}</li>)}</ul>}

        <div className="border border-slate-200 rounded-md p-3 space-y-1">
          <p className="text-sm font-medium">Failure simulation (affects the whole app until unchecked)</p>
          <Row k="timeout" label="Simulate API timeout (every request times out after 1.5 s)" />
          <Row k="fda" label="Simulate openFDA outage" />
          <Row k="rx" label="Simulate RxNorm outage (search a medicine: openFDA results should still appear)" />
          <Row k="mp" label="Simulate MedlinePlus outage" />
        </div>
        <Notice>Also test manually: submit an empty search (the bar asks for at least 2 characters and sends no request), and a search with Wi-Fi switched off.</Notice>

        {tests.length > 0 && (
          <table className="w-full text-sm">
            <thead><tr className="text-left bg-slate-100"><th className="p-2">Case</th><th className="p-2">Result</th><th className="p-2">Time</th></tr></thead>
            <tbody>{tests.map((t, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-2">{t.n}</td>
                <td className="p-2">{t.ok ? `${t.count} results · ${t.sources}` : <span className="text-red-700">Failed: {t.msg}</span>}</td>
                <td className="p-2">{t.ms} ms</td>
              </tr>))}</tbody>
          </table>
        )}

        <div>
          <div className="flex justify-between items-center"><p className="text-sm font-medium">Request log (latest {Math.min(log.length, 25)})</p><button className="text-xs underline" onClick={clearLog}>Clear</button></div>
          <ul className="text-xs font-mono mt-1 space-y-0.5 max-h-72 overflow-auto bg-slate-50 border border-slate-200 rounded-md p-2">
            {log.length === 0 && <li className="text-slate-500">No requests yet.</li>}
            {log.slice(0, 25).map((r, i) => <li key={i} className={`break-all ${r.error ? 'text-red-700' : ''}`}>{r.status || '---'} · {r.ms} ms · {r.url}{r.error ? ` · ${r.error}` : ''}</li>)}
          </ul>
        </div>
      </section>
    </div>
  )
}
