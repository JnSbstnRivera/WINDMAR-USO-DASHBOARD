// Acceso server-side a Supabase con la llave service_role (NUNCA expuesta al cliente).
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export interface UsageRow {
  id: string;
  created_at: string;
  app: string;
  evento: string | null;
  consultor: string | null;
  agente_telefonico: string | null;
  cliente_nombre: string | null;
  correo_cliente: string | null;
  telefono_cliente: string | null;
  monto_cotizado: number | null;
  idioma: string | null;
  detalle: Record<string, unknown> | null;
}

export interface Filters {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  app?: string;
}

/** Trae las filas de app_usage aplicando filtros (vía PostgREST + service_role). */
export async function fetchRows(f: Filters = {}): Promise<UsageRow[]> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.');
  }
  const params: string[] = ['select=*', 'order=created_at.desc'];
  if (f.app && f.app !== 'todas') params.push(`app=eq.${encodeURIComponent(f.app)}`);
  if (f.from) params.push(`created_at=gte.${encodeURIComponent(f.from + 'T00:00:00')}`);
  if (f.to) params.push(`created_at=lte.${encodeURIComponent(f.to + 'T23:59:59')}`);

  const url = `${SUPABASE_URL}/rest/v1/app_usage?${params.join('&')}`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Supabase respondió ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as UsageRow[];
}

export interface AppStat {
  app: string;
  cotizaciones: number;
  leads: number;
  pipeline: number;
}

export interface Stats {
  totalCotizaciones: number;
  correosUnicos: number;
  pipelineTotal: number;
  asesoresActivos: number;
  porApp: AppStat[];
  serie: { fecha: string; cotizaciones: number }[];
  topConsultores: { nombre: string; cotizaciones: number; pipeline: number }[];
  topAgentes: { nombre: string; cotizaciones: number }[];
}

/** Calcula todas las métricas agregadas a partir de las filas. */
export function computeStats(rows: UsageRow[]): Stats {
  const correos = new Set<string>();
  const asesores = new Set<string>();
  let pipelineTotal = 0;

  const porAppMap = new Map<string, { cotizaciones: number; leads: Set<string>; pipeline: number }>();
  const serieMap = new Map<string, number>();
  const consultorMap = new Map<string, { cotizaciones: number; pipeline: number }>();
  const agenteMap = new Map<string, number>();

  for (const r of rows) {
    const monto = Number(r.monto_cotizado) || 0;
    pipelineTotal += monto;

    const correo = (r.correo_cliente || '').trim().toLowerCase();
    if (correo) correos.add(correo);
    const consultor = (r.consultor || '').trim();
    if (consultor) asesores.add(consultor);

    // por app
    const a = porAppMap.get(r.app) || { cotizaciones: 0, leads: new Set<string>(), pipeline: 0 };
    a.cotizaciones += 1;
    a.pipeline += monto;
    if (correo) a.leads.add(correo);
    porAppMap.set(r.app, a);

    // serie por día
    const fecha = (r.created_at || '').slice(0, 10);
    if (fecha) serieMap.set(fecha, (serieMap.get(fecha) || 0) + 1);

    // top consultores
    if (consultor) {
      const c = consultorMap.get(consultor) || { cotizaciones: 0, pipeline: 0 };
      c.cotizaciones += 1;
      c.pipeline += monto;
      consultorMap.set(consultor, c);
    }
    // top agentes
    const agente = (r.agente_telefonico || '').trim();
    if (agente) agenteMap.set(agente, (agenteMap.get(agente) || 0) + 1);
  }

  const porApp: AppStat[] = [...porAppMap.entries()]
    .map(([app, v]) => ({ app, cotizaciones: v.cotizaciones, leads: v.leads.size, pipeline: v.pipeline }))
    .sort((x, y) => y.cotizaciones - x.cotizaciones);

  const serie = [...serieMap.entries()]
    .map(([fecha, cotizaciones]) => ({ fecha, cotizaciones }))
    .sort((x, y) => x.fecha.localeCompare(y.fecha));

  const topConsultores = [...consultorMap.entries()]
    .map(([nombre, v]) => ({ nombre, cotizaciones: v.cotizaciones, pipeline: v.pipeline }))
    .sort((x, y) => y.cotizaciones - x.cotizaciones)
    .slice(0, 10);

  const topAgentes = [...agenteMap.entries()]
    .map(([nombre, cotizaciones]) => ({ nombre, cotizaciones }))
    .sort((x, y) => y.cotizaciones - x.cotizaciones)
    .slice(0, 10);

  return {
    totalCotizaciones: rows.length,
    correosUnicos: correos.size,
    pipelineTotal,
    asesoresActivos: asesores.size,
    porApp,
    serie,
    topConsultores,
    topAgentes,
  };
}

/** Convierte filas a CSV (con BOM para que Excel respete acentos). */
export function rowsToCSV(rows: UsageRow[]): string {
  const headers = [
    'fecha', 'app', 'consultor', 'agente_telefonico', 'cliente_nombre',
    'correo_cliente', 'telefono_cliente', 'monto_cotizado', 'idioma', 'detalle',
  ];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      esc(r.created_at), esc(r.app), esc(r.consultor), esc(r.agente_telefonico),
      esc(r.cliente_nombre), esc(r.correo_cliente), esc(r.telefono_cliente),
      esc(r.monto_cotizado), esc(r.idioma), esc(r.detalle ? JSON.stringify(r.detalle) : ''),
    ].join(','));
  }
  return '﻿' + lines.join('\r\n');
}
