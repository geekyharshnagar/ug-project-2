import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Pill, Stethoscope } from 'lucide-react'
import { getSuggestions } from '../services/searchService.js'

const CATS = [['all', 'All'], ['medicines', 'Medicines'], ['diseases', 'Diseases']]

export default function SearchBar() {
  const nav = useNavigate()
  const loc = useLocation()
  const [sp] = useSearchParams()
  const onSearch = loc.pathname === '/search'
  const [value, setValue] = useState(onSearch ? sp.get('q') || '' : '')
  const [cat, setCat] = useState(onSearch ? sp.get('cat') || 'all' : 'all')
  const [sugs, setSugs] = useState([])
  const [open, setOpen] = useState(false)
  const [hint, setHint] = useState('')
  const last = useRef(sp.get('q') || '')

  useEffect(() => {
    if (!onSearch) return
    setCat(sp.get('cat') || 'all')
    if ((sp.get('q') || '') !== last.current) setValue(sp.get('q') || '')
  }, [onSearch, sp])

  const go = (q, c = cat, replace = false) => {
    const t = q.trim()
    if (t.length < 2) { setHint('Enter at least 2 characters, for example a medicine or disease name.'); return }
    setHint(''); setOpen(false); last.current = t
    nav(`/search?q=${encodeURIComponent(t)}&cat=${c}`, { replace })
  }

  // Debounced suggestions (350 ms). The previous request is aborted on every keystroke.
  useEffect(() => {
    const t = value.trim()
    if (t.length < 2) { setSugs([]); return }
    const ctrl = new AbortController()
    const id = setTimeout(async () => {
      try { setSugs(await getSuggestions(t, cat, ctrl.signal)) } catch { /* suggestions are optional */ }
    }, 350)
    return () => { clearTimeout(id); ctrl.abort() }
  }, [value, cat])

  // Debounced live search while typing on the results page (800 ms).
  useEffect(() => {
    const t = value.trim()
    if (!onSearch || t.length < 2 || t === (sp.get('q') || '')) return
    const id = setTimeout(() => go(t, cat, true), 800)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, onSearch])

  const pickCat = (c) => { setCat(c); if (onSearch && value.trim().length >= 2) go(value, c, true) }

  return (
    <div className="relative w-full max-w-2xl">
      <form onSubmit={(e) => { e.preventDefault(); go(value) }} role="search" className="flex rounded-md border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-teal-600">
        <div className="flex items-center pl-3 text-slate-400"><Search size={16} /></div>
        <input
          value={value} onChange={(e) => { setValue(e.target.value); setOpen(true); setHint('') }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search medicines, brand names, active ingredients or diseases"
          aria-label="Global search" className="flex-1 px-3 py-2 text-sm bg-transparent outline-none min-w-0"
        />
        <div className="hidden sm:flex items-center border-l border-slate-200 text-xs">
          {CATS.map(([id, label]) => (
            <button type="button" key={id} onClick={() => pickCat(id)} aria-pressed={cat === id}
              className={`px-2.5 py-2 ${cat === id ? 'bg-teal-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{label}</button>
          ))}
        </div>
        <button className="px-3 text-sm font-medium bg-teal-800 text-white rounded-r-md hover:bg-teal-900" type="submit">Search</button>
      </form>
      {hint && <p className="absolute text-xs text-red-700 mt-1">{hint}</p>}
      {open && sugs.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full card shadow-lg py-1 text-sm" role="listbox">
          {sugs.map((s, i) => (
            <li key={i}>
              <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2" onMouseDown={() => { setValue(s.text); go(s.text, s.kind === 'disease' ? 'diseases' : 'medicines') }}>
                {s.kind === 'disease' ? <Stethoscope size={14} className="text-amber-700" /> : <Pill size={14} className="text-teal-700" />}{s.text}
                <span className="ml-auto text-xs text-slate-400">{s.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
