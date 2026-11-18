// OPTIONAL AI layer. Works with any OpenAI-compatible chat endpoint (OpenAI, OpenRouter, Groq,
// a local Ollama server at http://localhost:11434/v1, ...). The key you enter is stored only in
// YOUR browser's localStorage. Without it the assistant uses the rule-based fallback.
const KEY = 'mediassist:ai:v1'
export const getAiConfig = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
export const saveAiConfig = (c) => localStorage.setItem(KEY, JSON.stringify(c))
export const clearAiConfig = () => localStorage.removeItem(KEY)
export const isAiConfigured = () => { const c = getAiConfig(); return Boolean(c.baseUrl && c.model) }

const SYSTEM = `You are MediBot, a pharmaceutical information explainer.
Rules you must follow:
- Use ONLY the SOURCE TEXT provided. If the source text does not answer the question, say exactly that. Never add facts from memory.
- Rewrite the source information in simple, plain language. Keep numbers and drug names exact.
- Never diagnose, never prescribe, never give personal dosage instructions. Recommend a pharmacist or doctor for personal decisions.
- Keep the answer under 200 words.`

export async function explainWithAi({ question, title, sectionLabel, sourceText, sourceName }, signal) {
  const c = getAiConfig()
  const base = c.baseUrl.replace(/\/+$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', ...(c.apiKey ? { Authorization: `Bearer ${c.apiKey}` } : {}) },
    body: JSON.stringify({
      model: c.model, temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `QUESTION: ${question}\n\nSOURCE (${sourceName}) — ${title} — ${sectionLabel}:\n${sourceText.slice(0, 6000)}` },
      ],
    }),
  })
  if (!res.ok) throw new Error(`AI endpoint responded with HTTP ${res.status}`)
  const j = await res.json()
  return j.choices?.[0]?.message?.content?.trim() || ''
}
