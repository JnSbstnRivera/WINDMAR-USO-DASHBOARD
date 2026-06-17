'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const APP_LABELS: Record<string, { nombre: string; color: string }> = {
  roofing:  { nombre: 'Roofing',          color: '#F89B24' },
  water:    { nombre: 'Water',            color: '#38bdf8' },
  anker:    { nombre: 'Anker',            color: '#a78bfa' },
  loan:     { nombre: 'Solar LOAN',       color: '#34d399' },
  lease:    { nombre: 'Solar Lease PPA',  color: '#f472b6' },
  proyecto: { nombre: 'Proyecto Completo',color: '#fbbf24' },
};
const appLabel = (a: string) => APP_LABELS[a]?.nombre || a;
const appColor = (a: string) => APP_LABELS[a]?.color || '#93a4bd';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
const num = (n: number) => new Intl.NumberFormat('en-US').format(n || 0);

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

interface ApiResp {
  ok: boolean;
  error?: string;
  total?: number;
  recientes?: any[];
  stats?: {
    totalCotizaciones: number; correosUnicos: number; pipelineTotal: number; asesoresActivos: number;
    porApp: { app: string; cotizaciones: number; leads: number; pipeline: number }[];
    serie: { fecha: string; cotizaciones: number }[];
    topConsultores: { nombre: string; cotizaciones: number; pipeline: number }[];
    topAgentes: { nombre: string; cotizaciones: number }[];
  };
}

export default function Page() {
  const hoy = new Date();
  const hace30 = new Date(hoy.getTime() - 30 * 86400000);

  const [from, setFrom] = useState(ymd(hace30));
  const [to, setTo] = useState(ymd(hoy));
  const [app, setApp] = useState('todas');
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState<string>('');

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (app) p.set('app', app);
    return p.toString();
  }, [from, to, app]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/usage?${query}`, { cache: 'no-store' });
      const json: ApiResp = await res.json();
      setData(json);
      setUpdated(new Date().toLocaleTimeString('es-PR'));
    } catch (e: any) {
      setData({ ok: false, error: e?.message || 'Error de red' });
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);
  // En vivo: refresca cada 30s.
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const s = data?.stats;
  const maxApp = Math.max(1, ...(s?.porApp.map(a => a.cotizaciones) || [1]));
  const maxSerie = Math.max(1, ...(s?.serie.map(d => d.cotizaciones) || [1]));

  return (
    <div className="wrap">
      <div className="header">
        <div className="brand">
          <span className="dot" />
          <div>
            <h1>Dashboard de Uso · Windmar</h1>
            <div className="sub">Cotizadores · cotizaciones, leads y pipeline en vivo</div>
          </div>
        </div>
        <div className="controls">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="Desde" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="Hasta" />
          <select value={app} onChange={e => setApp(e.target.value)} aria-label="App">
            <option value="todas">Todas las apps</option>
            {Object.keys(APP_LABELS).map(k => <option key={k} value={k}>{APP_LABELS[k].nombre}</option>)}
          </select>
          <button className="btn ghost" onClick={load}>↻ Actualizar</button>
          <a className="btn" href={`/api/export?${query}`}>📥 Exportar Excel</a>
        </div>
      </div>

      {data && !data.ok && (
        <div className="err">
          ⚠️ {data.error}
          <div className="note">Verifica que el dashboard tenga configuradas <b>SUPABASE_URL</b> y <b>SUPABASE_SERVICE_ROLE_KEY</b> en Vercel.</div>
        </div>
      )}

      {s && (
        <>
          <div className="kpis">
            <div className="kpi"><div className="label">Cotizaciones</div><div className="value">{num(s.totalCotizaciones)}</div></div>
            <div className="kpi"><div className="label">Correos / Leads</div><div className="value">{num(s.correosUnicos)}</div></div>
            <div className="kpi"><div className="label">Pipeline cotizado</div><div className="value">{money(s.pipelineTotal)}</div></div>
            <div className="kpi"><div className="label">Asesores activos</div><div className="value">{num(s.asesoresActivos)}</div></div>
          </div>

          <div className="grid">
            <div className="card">
              <h2>Cotizaciones por día</h2>
              {s.serie.length === 0 ? <div className="empty">Sin datos en el rango.</div> : (
                <div className="chart">
                  {s.serie.map(d => (
                    <div className="col" key={d.fecha} title={`${d.fecha}: ${d.cotizaciones}`}>
                      <div className="b" style={{ height: `${(d.cotizaciones / maxSerie) * 130}px` }} />
                      <div className="d">{d.fecha.slice(5)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h2>Uso por app</h2>
              {s.porApp.length === 0 ? <div className="empty">Sin datos.</div> : s.porApp.map(a => (
                <div className="bar-row" key={a.app}>
                  <span className="name" style={{ color: appColor(a.app) }}>{appLabel(a.app)}</span>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(a.cotizaciones / maxApp) * 100}%` }} /></div>
                  <span className="val">{num(a.cotizaciones)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid">
            <div className="card">
              <h2>Detalle por app</h2>
              <table>
                <thead><tr><th>App</th><th className="num">Cotizaciones</th><th className="num">Leads</th><th className="num">Pipeline</th></tr></thead>
                <tbody>
                  {s.porApp.map(a => (
                    <tr key={a.app}>
                      <td><span className="pill" style={{ background: appColor(a.app) + '22', color: appColor(a.app) }}>{appLabel(a.app)}</span></td>
                      <td className="num">{num(a.cotizaciones)}</td>
                      <td className="num">{num(a.leads)}</td>
                      <td className="num">{money(a.pipeline)}</td>
                    </tr>
                  ))}
                  {s.porApp.length === 0 && <tr><td colSpan={4} className="empty">Sin datos.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h2>Top consultores</h2>
              <table>
                <thead><tr><th>Consultor</th><th className="num">Cotiz.</th><th className="num">Pipeline</th></tr></thead>
                <tbody>
                  {s.topConsultores.map(c => (
                    <tr key={c.nombre}><td>{c.nombre}</td><td className="num">{num(c.cotizaciones)}</td><td className="num">{money(c.pipeline)}</td></tr>
                  ))}
                  {s.topConsultores.length === 0 && <tr><td colSpan={3} className="empty">Sin datos.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2>Cotizaciones recientes {data?.total ? `(mostrando ${Math.min(300, data.total)} de ${data.total})` : ''}</h2>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr>
                  <th>Fecha</th><th>App</th><th>Consultor</th><th>Agente</th><th>Cliente</th><th>Correo</th><th className="num">Monto</th>
                </tr></thead>
                <tbody>
                  {(data?.recientes || []).map((r: any) => (
                    <tr key={r.id}>
                      <td className="muted">{new Date(r.created_at).toLocaleString('es-PR')}</td>
                      <td><span className="pill" style={{ background: appColor(r.app) + '22', color: appColor(r.app) }}>{appLabel(r.app)}</span></td>
                      <td>{r.consultor || '—'}</td>
                      <td>{r.agente_telefonico || '—'}</td>
                      <td>{r.cliente_nombre || '—'}</td>
                      <td className="muted">{r.correo_cliente || '—'}</td>
                      <td className="num">{r.monto_cotizado ? money(Number(r.monto_cotizado)) : '—'}</td>
                    </tr>
                  ))}
                  {(!data?.recientes || data.recientes.length === 0) && <tr><td colSpan={7} className="empty">Aún no hay cotizaciones registradas en este rango. En cuanto un asesor genere un PDF, aparecerá aquí.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span className="live"><span className="ping" /> En vivo · actualiza cada 30s {updated && `· última: ${updated}`}</span>
        {loading && <span className="muted">Cargando…</span>}
      </div>
    </div>
  );
}
