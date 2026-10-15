// Heuristic parameters (our choices, not empirically derived): tune and justify them in your report.
export const R = 150;          // metres: a report affects route points within this distance
const DECAY_DAYS = 30;         // reports lose influence with age
const NIGHT_MISMATCH = 0.5;    // night report vs day trip (or reverse) counts half

const fmt = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' });
export const hourIST = d => parseInt(fmt.format(d), 10);
export const isNight = h => h >= 20 || h < 5;

export const haversine = ([a, b], [c, d]) => {
  const r = Math.PI / 180, x = Math.sin((d - b) * r / 2) ** 2 + Math.cos(b * r) * Math.cos(d * r) * Math.sin((c - a) * r / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(x));
};

export function densify(c, step = 40) {
  const out = [c[0]];
  for (let i = 1; i < c.length; i++) {
    const n = Math.max(1, Math.ceil(haversine(c[i - 1], c[i]) / step));
    for (let k = 1; k <= n; k++) out.push([c[i - 1][0] + (c[i][0] - c[i - 1][0]) * k / n, c[i - 1][1] + (c[i][1] - c[i - 1][1]) * k / n]);
  }
  return out;
}

// coords: [[lng,lat],...]; reports: [{location:{coordinates},severity,createdAt}]
export function scoreRoute(coords, reports, now = new Date()) {
  const nightNow = isNight(hourIST(now));
  const rs = reports.map((rp, i) => ({
    i, c: rp.location.coordinates,
    w: rp.severity * Math.exp(-Math.max((now - rp.createdAt) / 864e5, 0) / DECAY_DAYS) * (isNight(hourIST(rp.createdAt)) === nightNow ? 1 : NIGHT_MISMATCH)
  }));
  const pts = densify(coords), seen = new Set();
  let total = 0, max = 0;
  for (const p of pts) {
    let r = 0;
    for (const q of rs) { const d = haversine(p, q.c); if (d <= R) { seen.add(q.i); r += q.w * (1 - d / R); } }
    total += r; max = Math.max(max, r);
  }
  // avgRisk is per 40 m sample point, so it is comparable across routes of different length
  return { avgRisk: +(total / pts.length).toFixed(3), maxRisk: +max.toFixed(3), nearby: seen.size };
}
