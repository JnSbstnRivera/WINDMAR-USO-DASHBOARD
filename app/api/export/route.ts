import { NextRequest, NextResponse } from 'next/server';
import { fetchRows, rowsToCSV } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const app = searchParams.get('app') || undefined;

  try {
    const rows = await fetchRows({ from, to, app });
    const csv = rowsToCSV(rows);
    const hoy = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="uso-cotizadores-${hoy}.csv"`,
      },
    });
  } catch (e: any) {
    return new NextResponse(`Error: ${e?.message || 'desconocido'}`, { status: 500 });
  }
}
