import { createContext, useContext, useEffect, useState } from 'react'

const KEY = 'mediassist:favourites:v1'
const Ctx = createContext(null)
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }

export function FavouritesProvider({ children }) {
  const [items, setItems] = useState(read)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* ignore */ } }, [items])
  const has = (id) => items.some((i) => i.id === id)
  const toggle = (item) => setItems((cur) => (cur.some((i) => i.id === item.id) ? cur.filter((i) => i.id !== item.id) : [{ ...item, savedAt: Date.now() }, ...cur]))
  return <Ctx.Provider value={{ items, has, toggle }}>{children}</Ctx.Provider>
}
export const useFavourites = () => useContext(Ctx)
