// In-memory log of every real network request made by the app. Used by the
// Diagnostics panel so you can verify that data really comes from the live APIs.
const log = []
const subs = new Set()
let version = 0
const bump = () => { version++; subs.forEach((f) => f()) }
export function logRequest(e) { log.unshift({ ...e, time: Date.now() }); if (log.length > 200) log.length = 200; bump() }
export const getLog = () => log
export const getLogVersion = () => version
export const subscribeLog = (f) => { subs.add(f); return () => subs.delete(f) }
export const clearLog = () => { log.length = 0; bump() }
