# SafeRoute (MERN mini project)

Compares walking routes using community safety reports. Stack: React (Vite) + Leaflet, Node/Express REST API, MongoDB (2dsphere geospatial index).

## Run (Node 18+, MongoDB running locally or an Atlas URI)
```
cd server && cp .env.example .env && npm install && npm run seed && npm start
cd client && npm install && npm run dev      # second terminal, open the printed URL
```
`npm test` in `server/` runs the scoring unit test. Add `ANTHROPIC_API_KEY` to `.env` to use the LLM for report classification and route explanations; without it, keyword rules and a template are used.

## API
- `GET /api/reports` recent reports (category, severity, location only; free text stays private)
- `POST /api/reports` `{lat,lng,text}` classifies (AI or fallback), rejects spam, saves with ~11 m coordinate precision
- `GET /api/routes?from=lat,lng&to=lat,lng` fetches alternative walking routes (OSRM), scores each, returns routes + explanation

## How scoring works
Each route is sampled every 40 m. A report within 150 m adds `severity x exp(-age/30 days) x (1 - distance/150)`, halved if its time of day (night = 20:00 to 05:00 IST) differs from now. `avgRisk` is the mean per sample, `maxRisk` the peak (two criteria, as in Galbrun et al. 2014). These parameters are our own heuristics, not evidence-based values: tune and justify them, and compare against a baseline for your evaluation.

## Limits to state in your report
- Scores reflect reports, not actual crime; areas with no reports are unknown, not safe. The UI flags routes with fewer than 3 nearby reports.
- Seeded data is synthetic. Replace it with consented survey data and say so.
- Routing uses the public FOSSGIS demo server (non-commercial, max 1 request/second). Self-host or switch provider for real use.
- Context layer (OSM lamps, shops/services) is shown beside the score, not inside it, because OSM coverage varies and crowd effects are mixed in the research.
- `npm run eval` (server) compares the model with a raw-count baseline and random on a time split. On seeded data it is optimistic by construction.
- Not built yet: login/accounts, human moderation, deployment.
