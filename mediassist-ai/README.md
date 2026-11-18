# MediAssist AI v2 – live pharmaceutical and disease search 

React + Vite + Tailwind. No backend, no database, no login. All data is fetched live from:

- US FDA openFDA drug labels (`api.fda.gov`)
- NIH RxNorm / RxClass (`rxnav.nlm.nih.gov`)
- NIH MedlinePlus (`wsearch.nlm.nih.gov`)
- NIH Clinical Tables, ICD-10-CM codes (`clinicaltables.nlm.nih.gov`, supporting info only)

## Run

Requires Node.js 18+ and an internet connection.

```
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Verify it is live

Go to **About Project → Diagnostics**: ping the APIs, run the live test suite (cache bypassed), read the request log, and use the failure-simulation switches.

## Structure

- `src/services/` one file per source (`openFda.js`, `rxnorm.js`, `medlinePlus.js`, `icd.js`), `http.js` (timeouts, abort, retry, rate limit), `cache.js` (localStorage, expiry), `searchService.js` (hybrid search, merge, dedupe)
- `src/data/interactions.js` curated, referenced interaction list (only data in the project that is hand-written)
- `src/pages/` one file per screen

## Notes

- Optional AI rewording: Assistant → AI settings (any OpenAI-compatible endpoint; key stays in your browser).
- WHO ICD-11 API is intentionally not called (needs a secret). See `src/services/icd.js`.
- `vite.config.js` includes a dev-only proxy for MedlinePlus as a CORS fallback.
