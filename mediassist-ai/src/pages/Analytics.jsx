import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { getHistory } from '../utils/history.js'
import { getLog, getLogVersion, subscribeLog } from '../services/apiLog.js'
import { topReactions } from '../services/openFda.js'
import { friendlyError } from '../services/http.js'
import { EmptyPanel, FreshnessBadge, Notice, Spinner } from '../components/ui.jsx'
import { useSyncExternalStore } from 'react'

const COLORS = ['#0f766e', '#b45309', '#1d4ed8', '#7c3aed']

export default function Analytics() {
  const history = useMemo(getHistory, [])
  const logVersion = useSyncExternalStore(subscribeLog, getLogVersion)
  const [drug, setDrug] = useState(() => history.find((h) => h.cat !== 'diseases')?.q || '')
  const [st, setSt] = useState({ status: 'idle' })

  const byCat = ['medicines', 'diseases', 'all'].map((c) => ({ name: c, value: history.filter((h) => h.cat === c).length })).filter((x) => x.value)
  const topQ = Object.entries(history.reduce((m, h) => ((m[h.q.toLowerCase()] = (m[h.q.toLowerCase()] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }))

  const load = async (force = false) => {
    if (drug.trim().length < 2) return
    setSt({ status: 'loading' })
    try { setSt({ status: 'done', r: await topReactions(drug.trim(), { force }) }) }
    catch (e) { setSt({ status: 'error', msg: friendlyError(e) }) }
  }
  useEffect(() => { if (drug) load() /* eslint-disable-next-line */ }, [])

  const log = getLog()
  const byHost = Object.values(log.reduce((m, r) => { const x = (m[r.host] ||= { host: r.host, calls: 0, ms: 0 }); x.calls++; x.ms += r.ms; return m }, {})).map((x) => ({ host: x.host, calls: x.calls, avgMs: Math.round(x.ms / x.calls) }))

  return (
    <div className="space-y-5" data-v={logVersion}>
      <div>
        <h1 className="text-2xl font-semibold">Pharmaceutical Analytics</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-[70ch]">Live adverse-event reporting from openFDA, plus statistics about your own use of this app. Nothing here is a built-in dataset.</p>
      </div>

      <section className="card p-5 space-y-3">
        <h2 className="text-lg font-semibold">Most frequently reported reactions (FDA adverse event reports)</h2>
        <div className="flex gap-2 max-w-md">
          <input className="input" value={drug} onChange={(e) => setDrug(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="Generic drug name" aria-label="Drug name" />
          <button className="btn btn-primary" onClick={() => load()}>Load</button>
        </div>
        {st.status === 'loading' && <Spinner label="Retrieving from openFDA" />}
        {st.status === 'error' && <p className="text-sm text-red-700">{st.msg} <button className="underline" onClick={() => load(true)}>Retry</button></p>}
        {st.status === 'done' && (st.r.data.items.length === 0 ? <EmptyPanel title={`No adverse event reports found for “${drug}”`}><p>Try the generic name (for example acetaminophen rather than paracetamol).</p></EmptyPanel> : (
          <>
            <FreshnessBadge fromCache={st.r.fromCache} fetchedAt={st.r.fetchedAt} onRefresh={() => load(true)} />
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart data={st.r.data.items.map((x) => ({ name: x.term, value: x.count }))} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip /><Bar dataKey="value" name="Reports" fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ))}
        <Notice tone="warn">Adverse event reports are voluntary and unverified. A report does not prove the medicine caused the reaction, and counts cannot be used to compare how safe medicines are or to estimate how common a reaction is.</Notice>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-5">
          <h2 className="text-lg font-semibold mb-2">Your searches by category</h2>
          {byCat.length === 0 ? <p className="text-sm text-slate-500">No searches yet.</p> : (
            <div className="h-60"><ResponsiveContainer><PieChart><Pie data={byCat} dataKey="value" nameKey="name" outerRadius={80} label>{byCat.map((_, i) => <Cell key={i} fill={COLORS[i % 4]} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></div>
          )}
        </section>
        <section className="card p-5">
          <h2 className="text-lg font-semibold mb-2">Your most searched terms</h2>
          {topQ.length === 0 ? <p className="text-sm text-slate-500">No searches yet.</p> : (
            <div className="h-60"><ResponsiveContainer><BarChart data={topQ}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" name="Searches" fill="#b45309" /></BarChart></ResponsiveContainer></div>
          )}
        </section>
      </div>

      <section className="card p-5">
        <h2 className="text-lg font-semibold mb-2">API requests made in this session</h2>
        {byHost.length === 0 ? <p className="text-sm text-slate-500">No requests yet. Run a search and return here.</p> : (
          <div className="h-60"><ResponsiveContainer><BarChart data={byHost}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="host" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Legend /><Bar dataKey="calls" name="Requests" fill="#1d4ed8" /><Bar dataKey="avgMs" name="Average ms" fill="#7c3aed" /></BarChart></ResponsiveContainer></div>
        )}
      </section>
    </div>
  )
}
