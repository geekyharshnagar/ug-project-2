import { useState } from 'react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { BarChart3, Bot, GitCompare, Heart, Info, LayoutDashboard, Menu, Pill, ShieldAlert, Stethoscope, X } from 'lucide-react'
import SearchBar from './SearchBar.jsx'

const NAV = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/search?cat=medicines', 'Global Medicine Search', Pill],
  ['/search?cat=diseases', 'Global Disease Search', Stethoscope],
  ['/interactions', 'Drug Interaction Checker', ShieldAlert],
  ['/assistant', 'AI Pharma Assistant', Bot],
  ['/compare', 'Medicine Comparison', GitCompare],
  ['/analytics', 'Pharmaceutical Analytics', BarChart3],
  ['/favourites', 'Favourites', Heart],
  ['/about', 'About Project', Info],
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const [sp] = useSearchParams()
  const active = (to) => {
    const [path, qs] = to.split('?')
    if (loc.pathname !== path) return (path === '/search' ? false : path !== '/' && loc.pathname.startsWith(path))
    if (!qs) return true
    return new URLSearchParams(qs).get('cat') === (sp.get('cat') || 'all') || (to.includes('medicines') && loc.pathname.startsWith('/medicine'))
  }
  const detailActive = (to) => (to.includes('medicines') && loc.pathname.startsWith('/medicine/')) || (to.includes('diseases') && loc.pathname.startsWith('/disease/'))

  const nav = (
    <nav className="px-3 py-4 space-y-0.5" aria-label="Main">
      {NAV.map(([to, label, Icon]) => {
        const on = active(to) || detailActive(to)
        return (
          <Link key={to} to={to} onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${on ? 'bg-teal-800 text-white font-medium' : 'text-slate-700 hover:bg-slate-200/70'}`}>
            <Icon size={16} />{label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="hidden lg:block border-r border-slate-200 bg-white sticky top-0 h-screen overflow-y-auto">
        <div className="px-5 pt-5">
          <Link to="/" className="font-serif text-xl font-semibold text-slate-900">MediAssist AI</Link>
          <p className="text-xs text-slate-500 mt-0.5">Pharmaceutical information from public health sources</p>
        </div>
        {nav}
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white overflow-y-auto">
            <div className="flex justify-between items-center px-5 pt-5"><span className="font-serif text-xl font-semibold">MediAssist AI</span><button onClick={() => setOpen(false)} aria-label="Close menu"><X /></button></div>
            {nav}
          </aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
          <SearchBar />
        </header>
        <main className="p-4 md:p-8 max-w-6xl"><Outlet /></main>
        <footer className="px-4 md:px-8 pb-8 text-xs text-slate-500 max-w-6xl">
          For education and information only. This is not medical advice and does not replace a pharmacist or doctor. Source coverage and regulatory approval differ by country: appearing in one database does not mean a medicine is approved or available everywhere.
        </footer>
      </div>
    </div>
  )
}
