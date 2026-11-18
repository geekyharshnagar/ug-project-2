import { createContext, useContext, useState } from 'react'

// Holds the medicine/disease record the user is currently viewing so MediBot can answer about it.
const Ctx = createContext(null)
export function AssistantProvider({ children }) {
  const [active, setActive] = useState(null)
  return <Ctx.Provider value={{ active, setActive }}>{children}</Ctx.Provider>
}
export const useAssistantContext = () => useContext(Ctx)
