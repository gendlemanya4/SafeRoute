# Putting SafeRoute together and presenting it

## 1. Assemble (do this today)
1. Unzip. You should have `server/`, `client/`, `README.md`, `DEMO.md`.
2. Install MongoDB locally, or create a free Atlas cluster and put its URI in `server/.env` (`MONGO_URI`).
3. Terminal 1: `cd server && cp .env.example .env && npm install && npm run seed && npm start`.
4. Terminal 2: `cd client && npm install && npm run dev`, open the printed URL.
5. Run `npm test` and `npm run eval` in `server/` and screenshot both outputs for your report.
6. Put it on GitHub (`git init`, commit, push) so the professor can see the code history. Split commits between the two of you.
7. Record a 2 minute screen video as a backup. The free routing and map servers can be slow or blocked on college Wi-Fi.

## 2. Demo script (6 minutes)
1. Problem (30 s): women choose routes with little information. State the aim: compare options, not promise safety.
2. Plan a route (90 s): click start and end. Show 2 or 3 routes, colours, and the "few reports" warning on a sparse route.
3. AI (60 s): show the explanation text. Say what the LLM does (classifies reports, explains numbers) and that it falls back to rules without a key.
4. Report a concern (60 s): file one report, show the AI category and severity, then re-plan and show the score change.
5. Context and honesty (60 s): point to lamps/shops per km and the disclaimer. Explain why they sit outside the score.
6. Evaluation (60 s): show `npm run eval` output and say clearly it ran on synthetic data.

## 3. Report outline
Introduction and problem; literature (Galbrun et al. 2014 safe-path routing; Chalfin et al. 2022 street lighting trial; Weisburd 2015 crime concentration; Karusala and Kumar 2017 on Delhi women's perceptions; Lum and Isaac 2016 on biased data); requirements; architecture diagram (React, Express, MongoDB, OSRM, Overpass, LLM); database schema and geospatial index; scoring method and parameters; AI components; evaluation; limitations and ethics; future work. Cite only sources you have actually opened.

## 4. Likely viva questions
- Is the score "real" safety? No. It summarises reports, which are sparse and biased; no reports means unknown.
- Why not use crime data? Official Indian data we found is annual and city-level, not street-level.
- Why are the parameters 150 m, 30 days, 0.5? They are our heuristics. Say so, and say how you would tune them on real data.
- Where does the data come from? Seed data is synthetic. Say what real collection you would do (consented survey).
- What are the privacy risks? Location reports are sensitive: coordinates are rounded, free text is never shown to other users, no live tracking.
- Could it be abused? Yes, fake reports. We rate-limit and filter spam; human moderation is future work.

## 5. Say these limitations first
Synthetic demo data; untested with real users; no login; evaluation is optimistic on seeded data; the free routing server is for light use only.
