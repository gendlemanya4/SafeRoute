// Hotspot-style evaluation: rank grid cells using older reports, then check how many NEWER reports land in the top 10% of cells.
// Compares our weighted model against a raw-count baseline and random. Run: npm run eval
import 'dotenv/config';
import mongoose from 'mongoose';
import { Report } from './models.js';
const CELL = 0.0015, TOP = 0.1, DAYS = 14;
await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saferoute');
const all = await Report.find({ spam: false }).lean();
const cut = Date.now() - DAYS * 864e5;
const train = all.filter(r => +r.createdAt < cut), test = all.filter(r => +r.createdAt >= cut);
if (train.length < 20 || test.length < 5) { console.log('Not enough reports for a split (need 20+ older, 5+ recent).'); process.exit(0); }
const cx = r => Math.floor(r.location.coordinates[0] / CELL), cy = r => Math.floor(r.location.coordinates[1] / CELL);
const xs = all.map(cx), ys = all.map(cy), [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
const cells = (x1 - x0 + 1) * (y1 - y0 + 1), k = Math.ceil(cells * TOP), id = (x, y) => (x - x0) * (y1 - y0 + 1) + (y - y0);
const hit = scoreOf => {
  const s = new Float64Array(cells).map(() => Math.random() * 1e-9);
  train.forEach(r => { s[id(cx(r), cy(r))] += scoreOf(r); });
  const top = new Set([...s.keys()].sort((a, b) => s[b] - s[a]).slice(0, k));
  return test.filter(r => top.has(id(cx(r), cy(r)))).length / test.length;
};
const avg = f => Array.from({ length: 50 }, f).reduce((a, b) => a + b) / 50;
console.table({
  'Our model (severity x recency)': { 'share of recent reports in top 10% cells': +avg(() => hit(r => r.severity * Math.exp(-(cut - r.createdAt) / 864e5 / 30))).toFixed(3) },
  'Baseline: raw report count': { 'share of recent reports in top 10% cells': +avg(() => hit(() => 1)).toFixed(3) },
  'Random ranking': { 'share of recent reports in top 10% cells': +avg(() => hit(() => 0)).toFixed(3) }
});
console.log(`${train.length} train / ${test.length} test reports, ${cells} cells. Synthetic hotspots never move, so seeded data flatters every method: rerun on real survey data.`);
await mongoose.disconnect();
