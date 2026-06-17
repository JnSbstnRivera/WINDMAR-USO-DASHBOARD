import { NextRequest, NextResponse } from 'next/server';
import { fetchRows, computeStats } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const app = searchParams.get('app') || undefined;

  try {
    const rows = await fetchRows({ from, to, app });
    const stats = computeStats(rows);
    // La tabla muestra hasta 300 filas; el export trae todo.
    const recientes = rows.slice(0, 300);
    return NextResponse.json({ ok: true, stats, recientes, total: rows.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error desconocido' }, { status: 500 });
  }
}
