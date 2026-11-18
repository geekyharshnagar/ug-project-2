import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useFavourites } from '../context/FavouritesContext.jsx'
import { EmptyPanel } from '../components/ui.jsx'

export default function Favourites() {
  const { items, toggle } = useFavourites()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Favourites</h1>
      {items.length === 0 ? <EmptyPanel title="Nothing saved yet"><p>Open a medicine or disease page and choose Save. Favourites stay in this browser only.</p></EmptyPanel> : (
        <ul className="space-y-2">
          {items.map((f) => (
            <li key={f.id} className="card p-4 flex items-center justify-between gap-3">
              <Link to={f.href} className="min-w-0">
                <span className={`badge ${f.kind === 'disease' ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-900'}`}>{f.kind === 'disease' ? 'Disease' : 'Medicine'}</span>
                <p className="font-semibold mt-1 truncate">{f.title}</p>
                <p className="text-xs text-slate-500">{f.subtitle}</p>
              </Link>
              <button className="btn" onClick={() => toggle(f)} aria-label={`Remove ${f.title}`}><Trash2 size={14} />Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
