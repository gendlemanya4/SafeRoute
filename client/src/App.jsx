import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

const COL = { good: '#2a9d6f', mid: '#d98e04', bad: '#c8384f', flat: '#2f6fb0' };
const flip = c => [c[1], c[0]];
const tone = (rs, i) => {
  if (rs.length < 2) return COL.flat;
  const v = rs.map(r => r.avgRisk), lo = Math.min(...v), hi = Math.max(...v);
  if (hi - lo < 0.01) return COL.flat;
  return rs[i].avgRisk === lo ? COL.good : rs[i].avgRisk === hi ? COL.bad : COL.mid;
};
const START = 'Click the map to set your start point.', SPOT = 'Click the spot you want to report.';

export default function App() {
  const el = useRef(), map = useRef(), group = useRef(), onClick = useRef(() => {});
  const [mode, setMode] = useState('route'), [pts, setPts] = useState([]), [data, setData] = useState(null), [sel, setSel] = useState(0);
  const [reports, setReports] = useState([]), [form, setForm] = useState(null), [text, setText] = useState('');
  const [msg, setMsg] = useState(START), [busy, setBusy] = useState(false);

  const loadReports = () => fetch('/api/reports').then(r => r.json()).then(setReports).catch(() => setMsg('Could not load reports. Is the server running?'));

  useEffect(() => {
    map.current = L.map(el.current).setView([19.076, 72.8777], 12); // Mumbai; change for another city
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map.current);
    group.current = L.layerGroup().addTo(map.current);
    map.current.on('click', e => onClick.current(e.latlng));
    loadReports();
    return () => map.current.remove();
  }, []);

  onClick.current = async p => {
    if (mode === 'report') { setForm({ lat: p.lat, lng: p.lng }); setMsg('Describe what happened or what feels unsafe here.'); return; }
    if (pts.length >= 2 || busy) return;
    const next = [...pts, [p.lat, p.lng]];
    setPts(next);
    if (next.length < 2) { setMsg('Now click your destination.'); return; }
    setBusy(true); setMsg('Finding routes…');
    try {
      const r = await fetch(`/api/routes?from=${next[0]}&to=${next[1]}`), d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d); setSel(d.routes.reduce((b, x, i) => (x.avgRisk < d.routes[b].avgRisk ? i : b), 0)); setMsg('');
    } catch (e) { setMsg(e.message || 'Could not get routes.'); }
    setBusy(false);
  };

  useEffect(() => {
    const g = group.current; g.clearLayers();
    reports.forEach(r => L.circleMarker(flip(r.location.coordinates), { radius: 4, weight: 0, fillOpacity: .55, fillColor: '#6b4a8f' })
      .bindTooltip(`${r.category.replace('_', ' ')}, severity ${r.severity}`).addTo(g));
    data?.routes.forEach((r, i) => L.polyline(r.geometry.coordinates.map(flip), { color: tone(data.routes, i), weight: i === sel ? 7 : 4, opacity: i === sel ? .95 : .55 })
      .on('click', () => setSel(i)).addTo(g));
    pts.forEach((p, i) => L.circleMarker(p, { radius: 9, color: '#1c2430', weight: 2, fillColor: '#fff', fillOpacity: 1 })
      .bindTooltip(i ? 'Destination' : 'Start', { permanent: true, direction: 'top' }).addTo(g));
    if (form) L.circleMarker([form.lat, form.lng], { radius: 9, color: '#6b4a8f', weight: 3, fillOpacity: .1 }).addTo(g);
  }, [reports, data, sel, pts, form]);

  useEffect(() => {
    if (data) map.current.fitBounds(L.polyline(data.routes.flatMap(r => r.geometry.coordinates).map(flip)).getBounds(), { padding: [40, 40] });
  }, [data]);

  const submit = async () => {
    setBusy(true);
    const r = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, text }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg(d.error || 'Could not save the report.');
    setForm(null); setText(''); setMsg(`Report saved as ${d.category.replace('_', ' ')}, severity ${d.severity}. It now counts toward route scores.`); loadReports();
  };
  const pick = m => { setMode(m); setPts([]); setData(null); setForm(null); setMsg(m === 'route' ? START : SPOT); };

  return (
    <div className="app">
      <aside>
        <h1>SafeRoute</h1>
        <p className="sub">Compare walking routes using what other women have reported along the way.</p>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'route'} onClick={() => pick('route')}>Plan a route</button>
          <button role="tab" aria-selected={mode === 'report'} onClick={() => pick('report')}>Report a concern</button>
        </div>
        <p className="msg" aria-live="polite">{msg}</p>
        {form && (
          <div>
            <label htmlFor="t">What happened?</label>
            <textarea id="t" rows="4" maxLength="500" value={text} onChange={e => setText(e.target.value)} />
            <button className="primary" disabled={busy} onClick={submit}>Save report</button>
          </div>
        )}
        {mode === 'route' && pts.length > 0 && <button onClick={() => pick('route')}>Start over</button>}
        {data && (
          <>
            {data.routes.map((r, i) => (
              <button key={i} className={'card' + (i === sel ? ' on' : '')} style={{ borderColor: tone(data.routes, i) }} onClick={() => setSel(i)}>
                <b>{r.label}</b>
                <span>{(r.distance / 1000).toFixed(1)} km, {Math.round(r.duration / 60)} min</span>
                <span>Reported risk: average {r.avgRisk}, peak {r.maxRisk}</span>
                {r.context && <small>Context, not in the score: {r.context.lampsPerKm} mapped lamps/km, {r.context.poiPerKm} shops and services/km. OpenStreetMap coverage varies, so low numbers mean unknown, not unsafe.</small>}
                {r.nearby < 3 && <em>Few reports near this route, so the score is uncertain.</em>}
              </button>
            ))}
            <p className="why">{data.explanation}</p>
          </>
        )}
        {reports.some(r => r.synthetic) && <p className="note">Demo mode: some reports on the map are synthetic sample data.</p>}
        <p className="note">Scores come from community reports, not official crime data. No reports does not mean a route is safe. Use this to compare options, not as a guarantee.</p>
      </aside>
      <div ref={el} className="map" role="application" aria-label="Map" />
    </div>
  );
}
