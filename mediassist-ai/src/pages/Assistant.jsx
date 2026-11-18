import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, Settings } from 'lucide-react'
import { useAssistantContext } from '../context/AssistantContext.jsx'
import { clearAiConfig, explainWithAi, getAiConfig, isAiConfigured, saveAiConfig } from '../services/aiClient.js'
import { answerFromContext, detectIntent, extractSubject, fetchContextFor, matchesContext, REFUSAL, REFUSAL_TEXT } from '../services/ruleAssistant.js'
import { friendlyError } from '../services/http.js'
import { Notice, Spinner } from '../components/ui.jsx'
import { norm } from '../utils/text.js'

const STARTERS = ['Explain the mechanism of action of Metformin', 'What are the side effects of ibuprofen?', 'What are the symptoms of asthma?', 'What causes migraine?']

export default function Assistant() {
  const { active, setActive } = useAssistantContext()
  const [msgs, setMsgs] = useState([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [cfgOpen, setCfgOpen] = useState(false)
  const [cfg, setCfg] = useState(getAiConfig())
  const [aiOn, setAiOn] = useState(isAiConfigured())
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  const ask = async (text) => {
    const question = text.trim()
    if (!question || busy) return
    setQ(''); setBusy(true)
    setMsgs((m) => [...m, { role: 'user', text: question }])
    try {
      if (REFUSAL.test(question)) { setMsgs((m) => [...m, { role: 'bot', refusal: REFUSAL_TEXT }]); return }
      const intent = detectIntent(question)
      const subject = norm(extractSubject(question))
      let ctx = active
      if (!ctx || !matchesContext(subject, ctx)) {
        const fetched = await fetchContextFor(subject || question, intent, active?.kind)
        if (!fetched) {
          setMsgs((m) => [...m, { role: 'bot', refusal: `I could not retrieve a record for “${subject || question}” from openFDA, RxNorm or MedlinePlus, so I have nothing sourced to explain. Try the exact generic or brand name, or use the search bar.` }])
          return
        }
        ctx = fetched; setActive(fetched)
      }
      const a = answerFromContext(ctx, intent)
      let ai = null, aiError = null
      if (a.found && aiOn) {
        try { ai = await explainWithAi({ question, title: a.title, sectionLabel: a.sectionLabel, sourceText: a.excerpt, sourceName: a.sourceName }) }
        catch (e) { aiError = e.message }
      }
      setMsgs((m) => [...m, { role: 'bot', a, ai, aiError, href: ctx.href }])
    } catch (e) {
      setMsgs((m) => [...m, { role: 'bot', refusal: `Retrieval failed: ${friendlyError(e)} Please try again.` }])
    } finally { setBusy(false) }
  }

  const save = () => { saveAiConfig(cfg); setAiOn(isAiConfigured()); setCfgOpen(false) }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">AI Pharma Assistant (MediBot)</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-[65ch]">MediBot retrieves the live source record for what you ask about, then quotes the matching section. It never diagnoses, prescribes or gives personal dosing advice.</p>
        </div>
        <button className="btn" onClick={() => setCfgOpen(!cfgOpen)}><Settings size={14} />AI settings</button>
      </div>

      {cfgOpen && (
        <section className="card p-5 space-y-3">
          <p className="text-sm text-slate-600">Optional. Add any OpenAI-compatible endpoint to get plain-language rewording of the sourced text. Your key stays in this browser’s localStorage and is sent only to the endpoint you enter. Without it, MediBot uses the rule-based fallback.</p>
          <input className="input" placeholder="Base URL, e.g. https://api.openai.com/v1 or http://localhost:11434/v1" value={cfg.baseUrl || ''} onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })} />
          <input className="input" placeholder="Model name" value={cfg.model || ''} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} />
          <input className="input" type="password" placeholder="API key (leave empty for local models)" value={cfg.apiKey || ''} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} />
          <div className="flex gap-2"><button className="btn btn-primary" onClick={save}>Save</button><button className="btn" onClick={() => { clearAiConfig(); setCfg({}); setAiOn(false) }}>Remove</button></div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="badge bg-slate-200 text-slate-700">{aiOn ? 'AI rewording on' : 'Rule-based mode'}</span>
        {active ? <span>Current context: <Link className="underline text-teal-800" to={active.href}>{active.title}</Link> <span className="text-slate-500">({active.sourceName})</span></span> : <span className="text-slate-500">No record open. Name a medicine or disease in your question and I will fetch it.</span>}
      </div>

      <section className="card p-4 min-h-[300px] space-y-4">
        {msgs.length === 0 && (
          <div>
            <p className="text-sm text-slate-600 mb-2">Try asking</p>
            <div className="flex flex-wrap gap-2">{STARTERS.map((s) => <button key={s} className="btn" onClick={() => ask(s)}>{s}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => m.role === 'user'
          ? <div key={i} className="ml-auto max-w-[85%] bg-teal-800 text-white rounded-lg px-3 py-2 text-sm w-fit">{m.text}</div>
          : (
            <div key={i} className="max-w-[92%] space-y-2 text-sm">
              {m.refusal && <Notice tone="warn">{m.refusal}</Notice>}
              {m.a && (m.a.found ? (
                <>
                  <div className="border border-blue-200 bg-blue-50/50 rounded-md p-3">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Source text · {m.a.title} · {m.a.sectionLabel}</p>
                    <p className="whitespace-pre-line leading-relaxed">{m.a.excerpt}</p>
                    <p className="text-xs text-slate-600 mt-2">Source: <a className="underline" href={m.a.sourceUrl} target="_blank" rel="noreferrer">{m.a.sourceName}</a> · <Link className="underline" to={m.href}>open full record</Link></p>
                  </div>
                  {m.ai && <div className="border border-violet-200 bg-violet-50/50 rounded-md p-3"><p className="text-xs font-semibold text-violet-900 mb-1">AI-generated plain-language rewording of the source text above</p><p className="leading-relaxed">{m.ai}</p></div>}
                  {m.aiError && <Notice tone="warn">AI rewording failed ({m.aiError}). The sourced text above is still shown.</Notice>}
                  {!aiOn && <p className="text-xs text-slate-500">Showing the source wording. Add an AI endpoint in AI settings to get a simpler rewording.</p>}
                </>
              ) : <Notice tone="warn">{m.a.missing} {m.a.sourceUrl && <a className="underline" href={m.a.sourceUrl} target="_blank" rel="noreferrer">Check the source</a>}</Notice>)}
            </div>
          ))}
        {busy && <Spinner label="Retrieving from the live sources" />}
        <div ref={end} />
      </section>

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(q) }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about a medicine or disease, e.g. “What are the contraindications of omeprazole?”" aria-label="Question" />
        <button className="btn btn-primary" disabled={busy || !q.trim()}><Send size={14} />Ask</button>
      </form>
    </div>
  )
}
