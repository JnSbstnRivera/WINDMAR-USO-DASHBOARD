import { NextRequest, NextResponse } from 'next/server';

// Protección por contraseña compartida (Basic Auth) en todo el dashboard.
export function middleware(req: NextRequest) {
  const USER = process.env.DASHBOARD_USER || 'windmar';
  const PASS = process.env.DASHBOARD_PASS || '';

  // Si no hay clave configurada, no bloquea (evita lockout en primer deploy).
  if (!PASS) return NextResponse.next();

  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    try {
      const [u, p] = atob(auth.slice(6)).split(':');
      if (u === USER && p === PASS) return NextResponse.next();
    } catch {
      /* credenciales mal formadas */
    }
  }
  return new NextResponse('Autenticación requerida', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Dashboard de Uso Windmar"' },
  });
}

export const config = {
  // Aplica a todo excepto assets estáticos de Next.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
