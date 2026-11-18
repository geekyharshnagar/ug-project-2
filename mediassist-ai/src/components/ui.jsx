import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ExternalLink, Heart, Loader2, RefreshCw, SearchX, WifiOff } from 'lucide-react'
import { NA, timeAgo } from '../utils/text.js'
import { useFavourites } from '../context/FavouritesContext.jsx'
import { friendlyError } from '../services/http.js'

export const SOURCE_STYLE = {
  'US FDA – openFDA': 'bg-blue-50 text-blue-800 border-blue-200',
  'NIH National Library of Medicine – RxNorm': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'NIH MedlinePlus': 'bg-amber-50 text-amber-900 border-amber-200',
}

export function SourceChip({ name, url }) {
  const cls = SOURCE_STYLE[name] || 'bg-slate-100 text-slate-700 border-slate-200'
  const inner = <>{name}{url && <ExternalLink size={11} />}</>
  return url
    ? <a href={url} target="_blank" rel="noreferrer" className={`badge border ${cls} hover:underline`}>{inner}</a>
    : <span className={`badge border ${cls}`}>{inner}</span>
}

export function Skeleton({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => <div key={i} className="skeleton h-4" style={{ width: `${95 - i * 12}%` }} />)}
    </div>
  )
}

export function ResultSkeletons({ n = 4 }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading results">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card p-4"><div className="skeleton h-5 w-1/3 mb-3" /><Skeleton lines={2} /></div>
      ))}
    </div>
  )
}

export function Spinner({ label }) {
  return <span className="inline-flex items-center gap-2 text-sm text-slate-600"><Loader2 className="animate-spin" size={16} />{label}</span>
}

export function ErrorPanel({ error, onRetry, children }) {
  const Icon = error?.type === 'network' || error?.type === 'timeout' ? WifiOff : AlertTriangle
  return (
    <div className="card p-6 border-red-200 bg-red-50/40 text-center" role="alert">
      <Icon className="mx-auto text-red-700 mb-2" />
      <p className="font-semibold text-slate-900">The search could not be completed</p>
      <p className="text-sm text-slate-600 mt-1">{friendlyError(error)}</p>
      {children}
      {onRetry && <button className="btn btn-primary mt-4" onClick={onRetry}><RefreshCw size={14} />Retry</button>}
    </div>
  )
}

export function EmptyPanel({ title, children }) {
  return (
    <div className="card p-8 text-center">
      <SearchX className="mx-auto text-slate-400 mb-2" />
      <p className="font-semibold text-slate-900">{title}</p>
      <div className="text-sm text-slate-600 mt-1 space-y-1">{children}</div>
    </div>
  )
}

export function Notice({ tone = 'info', children }) {
  const t = { info: 'bg-sky-50 border-sky-200 text-sky-900', warn: 'bg-amber-50 border-amber-200 text-amber-900', error: 'bg-red-50 border-red-200 text-red-900' }[tone]
  return <div className={`border rounded-md px-3 py-2 text-sm ${t}`}>{children}</div>
}

export function FreshnessBadge({ fromCache, fetchedAt, onRefresh }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-600">
      {fromCache
        ? <span className="badge bg-slate-200 text-slate-700">Cached copy · retrieved {timeAgo(fetchedAt)}</span>
        : <span className="badge bg-teal-100 text-teal-900">Live from API · just retrieved</span>}
      {onRefresh && <button className="underline hover:text-slate-900" onClick={onRefresh}>Fetch again</button>}
    </span>
  )
}

export function StatusStrip({ statuses }) {
  if (!statuses?.length) return null
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {statuses.map((s, i) => (
        <span key={i} className={`badge border ${s.state === 'ok' ? 'bg-white border-slate-200 text-slate-700' : 'bg-red-50 border-red-200 text-red-800'}`} title={s.message}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.state === 'ok' ? 'bg-teal-600' : 'bg-red-600'}`} />
          {s.source}: {s.state === 'ok' ? (s.fromCache ? 'cached' : 'live') : s.message}
        </span>
      ))}
    </div>
  )
}

export function FavButton({ item }) {
  const { has, toggle } = useFavourites()
  const on = has(item.id)
  return (
    <button className={`btn ${on ? 'border-rose-300 text-rose-800 bg-rose-50' : ''}`} onClick={() => toggle(item)} aria-pressed={on}>
      <Heart size={14} fill={on ? 'currentColor' : 'none'} />{on ? 'Saved' : 'Save'}
    </button>
  )
}

export function Field({ label, children }) {
  const empty = children == null || children === '' || (Array.isArray(children) && !children.length)
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className={`text-sm mt-0.5 ${empty ? 'text-slate-400 italic' : 'text-slate-800'}`}>{empty ? NA : Array.isArray(children) ? children.join(', ') : children}</dd>
    </div>
  )
}

export function TextSection({ title, text, tone, defaultOpen = false, source }) {
  const [open, setOpen] = useState(defaultOpen)
  const long = text && text.length > 1200
  const paras = text ? (open || !long ? text : text.slice(0, 1200).replace(/\s+\S*$/, '') + '…').split(/\n{2,}/) : []
  return (
    <section className={`card p-5 ${tone === 'danger' ? 'border-red-300 bg-red-50/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {source && <span className="text-xs text-slate-500">{source}</span>}
      </div>
      {text ? (
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700 max-w-[75ch]">
          {paras.map((p, i) => <p key={i}>{p}</p>)}
          {long && <button className="text-teal-800 font-medium underline" onClick={() => setOpen(!open)}>{open ? 'Show less' : 'Show full text'}</button>}
        </div>
      ) : <p className="mt-2 text-sm italic text-slate-400">{NA}</p>}
    </section>
  )
}

export function ResultCard({ r, query }) {
  const to = r.kind === 'disease' ? `/disease/${r.slug}?t=${encodeURIComponent(r.title)}` : `/medicine/${encodeURIComponent(r.id)}`
  return (
    <Link to={to} className="card p-4 block hover:border-teal-600 hover:shadow-sm transition">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className={`badge ${r.kind === 'disease' ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-900'}`}>{r.kind === 'disease' ? 'Disease' : 'Medicine'}</span>
        {r.subtitle && <span className="text-xs text-slate-500">{r.subtitle}</span>}
        {r.labelCount > 1 && <span className="text-xs text-slate-400">{r.labelCount} label records merged</span>}
      </div>
      <h3 className="text-lg font-semibold">{r.title}</h3>
      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{r.description}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{r.sources.map((s, i) => <SourceChip key={i} name={s.name} />)}</div>
    </Link>
  )
}
