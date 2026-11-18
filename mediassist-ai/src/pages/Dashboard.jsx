import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, Heart, Pill, Stethoscope } from 'lucide-react'
import { getHistory } from '../utils/history.js'
import { useFavourites } from '../context/FavouritesContext.jsx'
import { pingApis } from '../services/diagnostics.js'
import { Spinner } from '../components/ui.jsx'
import { timeAgo } from '../utils/text.js'

export default function Dashboard() {
  const nav = useNavigate()
  const { items } = useFavourites()
  const history = getHistory()
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const check = async () => { setBusy(true); setStatus(await pingApis()); setBusy(false) }
  const recent = [...new Map(history.map((h) => [`${h.q}|${h.cat}`, h])).values()].slice(0, 6)

  return (
    <div className="space-y-6">
      <section className="card p-6 md:p-8">
        <h1 className="text-3xl md:text-4xl font-semibold max-w-[22ch]">Look up any medicine or disease in public health databases</h1>
        <p className="text-slate-600 mt-3 max-w-[65ch]">Every search is sent live to the US FDA (openFDA), the NIH RxNorm service and NIH MedlinePlus. Results show their source, and missing fields are marked as not available instead of being filled in.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => nav('/search?cat=medicines')}><Pill size={14} />Search medicines</button>
          <button className="btn" onClick={() => nav('/search?cat=diseases')}><Stethoscope size={14} />Search diseases</button>
        </div>
      </section>

      <div className="grid md:grid-cols-3 gap-4">
        <section className="card p-5 md:col-span-2">
          <h2 className="text-lg font-semibold mb-2">Recent searches</h2>
          {recent.length === 0 ? <p className="text-sm text-slate-500">Searches you run will appear here. They are kept only in this browser.</p> : (
            <ul className="divide-y divide-slate-100">
              {recent.map((h) => (
                <li key={h.ts}><Link className="flex items-center justify-between py-2 text-sm hover:text-teal-800" to={`/search?q=${encodeURIComponent(h.q)}&cat=${h.cat}`}>
                  <span>{h.q} <span className="text-xs text-slate-400">{h.cat}</span></span><span className="text-xs text-slate-400">{timeAgo(h.ts)}</span></Link></li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><Heart size={16} />Favourites</h2>
          {items.length === 0 ? <p className="text-sm text-slate-500">Save a medicine or disease page to find it here.</p> : (
            <ul className="text-sm space-y-1">{items.slice(0, 5).map((f) => <li key={f.id}><Link className="text-teal-800 underline" to={f.href}>{f.title}</Link></li>)}</ul>
          )}
        </section>
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Activity size={16} />Live source status</h2>
          <button className="btn" onClick={check} disabled={busy}>{busy ? <Spinner label="Checking" /> : 'Check APIs now'}</button>
        </div>
        {!status ? <p className="text-sm text-slate-500 mt-2">Not checked yet. This sends one small request to each service.</p> : (
          <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
            {status.map((s) => (
              <li key={s.name} className={`border rounded-md px-3 py-2 ${s.ok ? 'border-slate-200' : 'border-red-200 bg-red-50'}`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${s.ok ? 'bg-teal-600' : 'bg-red-600'}`} />{s.name}: {s.ok ? `reachable (${s.ms} ms)` : s.message}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
