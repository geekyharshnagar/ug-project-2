import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { canonicalName, checkPair, DRUGS, LIMITATIONS, NO_MATCH_TEXT } from '../data/interactions.js'
import { Notice } from '../components/ui.jsx'
import { titleCase } from '../utils/text.js'

const SEV = {
  Contraindicated: 'bg-red-100 text-red-900 border-red-300',
  Major: 'bg-orange-100 text-orange-900 border-orange-300',
  Moderate: 'bg-amber-100 text-amber-900 border-amber-300',
  Minor: 'bg-slate-100 text-slate-800 border-slate-300',
}

export default function Interactions() {
  const [input, setInput] = useState('')
  const [list, setList] = useState([])
  const [err, setErr] = useState('')
  const [result, setResult] = useState(null)

  const add = () => {
    const t = input.trim()
    if (!t) return
    if (list.length >= 6) { setErr('You can compare up to 6 medicines at once.'); return }
    const canon = canonicalName(t)
    if (list.some((x) => (x.canon && x.canon === canon) || x.text.toLowerCase() === t.toLowerCase())) { setErr('That medicine is already in the list.'); return }
    setList([...list, { text: t, canon }]); setInput(''); setErr(''); setResult(null)
  }
  const check = () => {
    const known = list.filter((x) => x.canon)
    const pairs = []
    for (let i = 0; i < known.length; i++) for (let j = i + 1; j < known.length; j++) {
      pairs.push({ x: known[i], y: known[j], hit: checkPair(known[i].canon, known[j].canon) })
    }
    setResult({ pairs, unknown: list.filter((x) => !x.canon) })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Drug Interaction Checker</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-[70ch]">Checks pairs of medicines against a small curated, referenced dataset. It is separate from live search because openFDA labels and RxNorm are not complete interaction-checking services.</p>
      </div>
      <section className="card p-5 space-y-3">
        <div className="flex gap-2">
          <input className="input" list="drugs" value={input} placeholder="Add a medicine (generic or common brand name)" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} aria-label="Medicine name" />
          <datalist id="drugs">{DRUGS.map((d) => <option key={d} value={titleCase(d)} />)}</datalist>
          <button className="btn" onClick={add}><Plus size={14} />Add</button>
        </div>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <div className="flex flex-wrap gap-2">
          {list.map((x, i) => (
            <span key={i} className={`badge border ${x.canon ? 'bg-teal-50 border-teal-200 text-teal-900' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
              {x.text}{x.canon && x.canon !== x.text.toLowerCase() ? ` → ${x.canon}` : ''}
              <button aria-label={`Remove ${x.text}`} onClick={() => { setList(list.filter((_, j) => j !== i)); setResult(null) }}><X size={12} /></button>
            </span>
          ))}
        </div>
        <button className="btn btn-primary" disabled={list.length < 2} onClick={check}>Check interactions</button>
        {list.length < 2 && <p className="text-xs text-slate-500">Add at least two medicines.</p>}
      </section>

      {result && (
        <section className="space-y-3">
          {result.unknown.length > 0 && <Notice tone="warn">Not in the interaction dataset, so these could not be checked: <strong>{result.unknown.map((u) => u.text).join(', ')}</strong>. “Not checked” is different from “no interaction”.</Notice>}
          {result.pairs.length === 0 && <Notice>Add at least two medicines that are in the dataset.</Notice>}
          {result.pairs.map((p, i) => (
            <div key={i} className="card p-5">
              <h2 className="text-lg font-semibold">{titleCase(p.x.canon)} + {titleCase(p.y.canon)}</h2>
              {p.hit ? (
                <div className="mt-2 space-y-2 text-sm">
                  <span className={`badge border ${SEV[p.hit.severity]}`}>Known interaction · {p.hit.severity}</span>
                  <p><strong>Mechanism:</strong> {p.hit.mechanism}</p>
                  <p><strong>Potential adverse effects:</strong> {p.hit.effects}</p>
                  <p><strong>Source:</strong> <a className="underline" href={p.hit.source.url} target="_blank" rel="noreferrer">{p.hit.source.label}</a></p>
                </div>
              ) : <p className="mt-2 text-sm text-slate-700">{NO_MATCH_TEXT}</p>}
            </div>
          ))}
        </section>
      )}
      <Notice tone="warn"><strong>Limitations.</strong> {LIMITATIONS}</Notice>
    </div>
  )
}
