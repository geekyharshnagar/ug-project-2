import { useState } from 'react'
import { Search } from 'lucide-react'
import { getMedicineDetail, searchMedicines } from '../services/searchService.js'
import { friendlyError } from '../services/http.js'
import { Notice, Spinner } from '../components/ui.jsx'
import { NA, snippet, titleCase, uniq } from '../utils/text.js'

function Picker({ label, side, onPick }) {
  const [q, setQ] = useState('')
  const [st, setSt] = useState({ status: 'idle' })
  const find = async () => {
    if (q.trim().length < 2) { setSt({ status: 'error', msg: 'Enter at least 2 characters.' }); return }
    setSt({ status: 'loading' })
    try {
      const r = await searchMedicines(q.trim())
      setSt({ status: 'list', items: r.results.slice(0, 6) })
    } catch (e) { setSt({ status: 'error', msg: friendlyError(e) }) }
  }
  const choose = async (item) => {
    setSt({ status: 'loading' })
    try { onPick(await getMedicineDetail(item.id)); setSt({ status: 'idle' }); setQ('') }
    catch (e) { setSt({ status: 'error', msg: friendlyError(e) }) }
  }
  return (
    <div className="card p-4 space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      <div className="flex gap-2">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && find()} placeholder="Search a medicine" aria-label={`${label} search`} />
        <button className="btn" onClick={find}><Search size={14} /></button>
      </div>
      {st.status === 'loading' && <Spinner label="Retrieving" />}
      {st.status === 'error' && <p className="text-sm text-red-700">{st.msg} <button className="underline" onClick={find}>Retry</button></p>}
      {st.status === 'list' && (st.items.length === 0 ? <p className="text-sm text-slate-500">No matches.</p> : (
        <ul className="text-sm divide-y divide-slate-100">
          {st.items.map((i) => <li key={i.id}><button className="w-full text-left py-1.5 hover:text-teal-800" onClick={() => choose(i)}>{i.title} <span className="text-xs text-slate-500">{i.subtitle}</span></button></li>)}
        </ul>
      ))}
    </div>
  )
}

const rowsFor = (d) => {
  const l = d.label, rx = d.rx, s = l?.sections || {}
  const long = (t) => (t ? snippet(t, 700) : null)
  return {
    'Generic name': l?.genericNames[0] ? titleCase(l.genericNames[0]) : rx?.ingredients?.[0]?.name,
    'Brand names': uniq([...(l?.brandNames || []), ...(rx?.brands?.map((b) => b.name) || [])]).slice(0, 8).map(titleCase).join(', '),
    'Active ingredients': uniq([...(l?.substances || []), ...(rx?.ingredients?.map((i) => i.name) || [])]).map(titleCase).join(', '),
    'Pharmacological category': uniq([...(l?.pharmClasses.epc || []), ...(rx?.classes?.epc || [])]).join(', '),
    'Mechanism': long(s.mechanism) || uniq([...(l?.pharmClasses.moa || []), ...(rx?.classes?.moa || [])]).join(', '),
    'Route': l?.routes.map(titleCase).join(', '),
    'Indications': long(s.indications),
    'Dosage forms': long(s.dosageForms || s.howSupplied),
    'Boxed warning': s.boxedWarning ? long(s.boxedWarning) : l ? 'None in this label record' : null,
    'Warnings': long(s.warnings),
    'Contraindications': long(s.contraindications),
    'Adverse reactions': long(s.adverseReactions),
    'Sources': [l && 'US FDA – openFDA', rx && 'NIH RxNorm'].filter(Boolean).join(', '),
  }
}

export default function Compare() {
  const [a, setA] = useState(null)
  const [b, setB] = useState(null)
  const ra = a && rowsFor(a), rb = b && rowsFor(b)
  const keys = Object.keys(ra || rb || {})
  const name = (d) => titleCase(d.label?.brandNames[0] || d.label?.genericNames[0] || d.rx?.name || 'Medicine')
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Medicine Comparison</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-[70ch]">Pick two medicines. Each is retrieved live from openFDA and RxNorm and compared field by field. Long fields are shortened here; open the full record for complete text.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Picker label="Medicine A" onPick={setA} />
        <Picker label="Medicine B" onPick={setB} />
      </div>
      {(a || b) && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-100 text-left"><th className="p-3 w-40">Field</th><th className="p-3">{a ? name(a) : 'Medicine A'}</th><th className="p-3">{b ? name(b) : 'Medicine B'}</th></tr></thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k} className="border-t border-slate-100 align-top">
                  <th className="p-3 text-left font-medium text-slate-600">{k}</th>
                  {[ra, rb].map((r, i) => <td key={i} className={`p-3 max-w-[34ch] ${r?.[k] ? '' : 'italic text-slate-400'}`}>{r ? r[k] || NA : 'Select a medicine'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Notice>Comparison shows what the sources state. It does not say which medicine is better, and it is not a recommendation. Ask a pharmacist or doctor about your own situation.</Notice>
    </div>
  )
}
