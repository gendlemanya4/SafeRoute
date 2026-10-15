import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Report } from './models.js';
import { scoreRoute } from './scoring.js';
import { classifyReport, explainRoutes } from './ai.js';
import { fetchContext, routeContext } from './context.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10kb' }));
const ROUTER = process.env.ROUTER_URL || 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';
const wrap = f => (q, s) => f(q, s).catch(e => { console.error(e); s.status(500).json({ error: 'Server error. Try again.' }); });
const hits = new Map(); // simple in-memory rate limiter per path and IP
const limit = (max, ms) => (q, s, n) => { const k = q.path + q.ip, t = Date.now(), a = (hits.get(k) || []).filter(x => t - x < ms); if (a.length >= max) return s.status(429).json({ error: 'Too many requests. Try again in a few minutes.' }); a.push(t); hits.set(k, a); n(); };
const r4 = x => Math.round(x * 1e4) / 1e4; // ~11 m precision: avoids storing exact positions

app.get('/api/reports', wrap(async (req, res) => {
  // free text is never returned to other users
  res.json(await Report.find({ spam: false }).sort({ createdAt: -1 }).limit(500).select('location category severity synthetic createdAt'));
}));

app.post('/api/reports', limit(5, 6e5), wrap(async (req, res) => {
  const lat = +req.body.lat, lng = +req.body.lng, text = String(req.body.text || '').slice(0, 500);
  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return res.status(400).json({ error: 'lat and lng are required.' });
  const ai = await classifyReport(text);
  if (ai.spam) return res.status(422).json({ error: 'Add a few words about what happened or what feels unsafe.' });
  const r = await Report.create({ location: { type: 'Point', coordinates: [r4(lng), r4(lat)] }, text, ...ai });
  res.status(201).json({ id: r._id, category: r.category, severity: r.severity });
}));

app.get('/api/routes', limit(30, 6e5), wrap(async (req, res) => {
  const [fa, fo] = String(req.query.from).split(',').map(Number), [ta, to] = String(req.query.to).split(',').map(Number);
  if ([fa, fo, ta, to].some(v => !Number.isFinite(v))) return res.status(400).json({ error: 'from and to must be lat,lng.' });
  const r = await fetch(`${ROUTER}/${fo},${fa};${to},${ta}?alternatives=true&overview=full&geometries=geojson`, { headers: { 'User-Agent': 'SafeRoute-college-project' } });
  const d = await r.json();
  if (d.code !== 'Ok') return res.status(502).json({ error: 'No walking route found between those points.' });
  const all = d.routes.flatMap(x => x.geometry.coordinates), pad = 0.003;
  const [x0, x1] = [Math.min(...all.map(c => c[0])) - pad, Math.max(...all.map(c => c[0])) + pad];
  const [y0, y1] = [Math.min(...all.map(c => c[1])) - pad, Math.max(...all.map(c => c[1])) + pad];
  const ring = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
  const reports = await Report.find({ spam: false, location: { $geoWithin: { $geometry: { type: 'Polygon', coordinates: [ring] } } } }).lean();
  const nodes = x1 - x0 < 0.2 && y1 - y0 < 0.2 ? await fetchContext([y0, x0, y1, x1]) : null;
  const routes = d.routes.map(x => ({ geometry: x.geometry, distance: x.distance, duration: x.duration, ...scoreRoute(x.geometry.coordinates, reports), context: nodes && routeContext(x.geometry.coordinates, nodes, x.distance) }));
  const si = routes.reduce((b, x, i) => (x.distance < routes[b].distance ? i : b), 0);
  const sa = routes.reduce((b, x, i) => (x.avgRisk < routes[b].avgRisk || (x.avgRisk === routes[b].avgRisk && x.distance < routes[b].distance) ? i : b), 0);
  routes.forEach((x, i) => { x.label = i === si && i === sa ? 'Shortest and lowest risk' : i === si ? 'Shortest' : i === sa ? 'Lowest reported risk' : 'Alternative'; });
  res.json({ routes, explanation: await explainRoutes(routes) });
}));

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saferoute');
app.listen(process.env.PORT || 5000, () => console.log('SafeRoute API on port ' + (process.env.PORT || 5000)));
