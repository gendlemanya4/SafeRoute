// Context layer from OpenStreetMap (lamps, shops/services). Shown beside the score, NOT part of it:
// OSM coverage varies, so "0 lamps mapped" means unknown, not dark.
import { densify, haversine } from './scoring.js';
const URL_ = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const cache = new Map();

export async function fetchContext(bbox) { // [south, west, north, east]
  const key = bbox.map(v => v.toFixed(3)).join(), hit = cache.get(key);
  if (hit && Date.now() - hit.t < 36e5) return hit.v;
  const q = `[out:json][timeout:20];(node["highway"="street_lamp"](${bbox});node["shop"](${bbox});node["amenity"~"^(restaurant|cafe|pharmacy|bank|atm|fast_food|bus_station)$"](${bbox}););out;`;
  try {
    const r = await fetch(URL_, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'content-type': 'application/x-www-form-urlencoded', 'User-Agent': 'SafeRoute-college-project' } });
    const v = (await r.json()).elements.map(e => ({ c: [e.lon, e.lat], lamp: e.tags?.highway === 'street_lamp' }));
    cache.set(key, { t: Date.now(), v });
    return v;
  } catch { return null; }
}

export function routeContext(coords, nodes, lengthM) {
  const pts = densify(coords, 40); let lamps = 0, pois = 0;
  for (const n of nodes) if (pts.some(p => haversine(p, n.c) <= 40)) n.lamp ? lamps++ : pois++;
  const km = Math.max(lengthM / 1000, 0.1);
  return { lampsPerKm: +(lamps / km).toFixed(1), poiPerKm: +(pois / km).toFixed(1) };
}
