# DASHBOARD DE USO · COTIZADORES WINDMAR

Dashboard interno de telemetría para Windmar Home PR que centraliza el uso de los cotizadores (Roofing, Water, Anker, Solar LOAN, Solar Lease PPA y Proyecto Completo). Lee la tabla `app_usage` del proyecto Supabase `windmar-dashboards` y muestra, en vivo, cuántas cotizaciones se generan, cuántos leads/correos entran y cuánto pipeline se cotiza, con exportación a Excel/CSV.

## ✨ Características
- KPIs en tiempo real: cotizaciones totales, correos/leads únicos, pipeline cotizado y asesores activos.
- Gráfica de cotizaciones por día y desglose de uso por app (con colores por producto).
- Tabla de detalle por app (cotizaciones, leads, pipeline) y ranking de Top consultores.
- Listado de cotizaciones recientes (hasta 300) con fecha, app, consultor, agente, cliente, correo y monto.
- Filtros por rango de fechas (desde/hasta) y por app.
- Refresco automático cada 30 segundos.
- Exportación a CSV compatible con Excel (incluye BOM para respetar acentos).
- Acceso protegido con contraseña compartida (HTTP Basic Auth) vía middleware.

## 🛠️ Stack
- **Framework:** Next.js 15 (App Router) + React 18.
- **Lenguaje:** TypeScript.
- **Datos:** Supabase (PostgREST) sobre la tabla `app_usage`; acceso server-side con la llave `service_role`.
- **UI:** CSS propio (sin librería de componentes), gráficas renderizadas con HTML/CSS.
- **Deploy:** Vercel.

## 🚀 Setup local
```bash
npm install
cp .env.example .env.local
npm run dev
```

## 🔑 Variables de entorno
| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase `windmar-dashboards`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave **secreta** `service_role` de Supabase. Solo se usa en el servidor para leer `app_usage`; **nunca** debe exponerse al cliente. |
| `DASHBOARD_USER` | Usuario para el Basic Auth del dashboard (por defecto `windmar`). |
| `DASHBOARD_PASS` | Contraseña compartida del dashboard. Si se deja vacía, el middleware no bloquea (evita lockout en el primer deploy). |

> Solo placeholders. Nunca subas valores reales de llaves o contraseñas: `.env.local` está en `.gitignore`.

## 📜 Scripts
- `npm run dev` — entorno de desarrollo.
- `npm run build` — build de producción.
- `npm run start` — sirve el build.

## 🌐 Deploy
- Pensado para Vercel. Configura `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DASHBOARD_USER` y `DASHBOARD_PASS` como variables de entorno del proyecto.
- El endpoint de exportación (`/api/export`) y la API de uso (`/api/usage`) corren como rutas dinámicas en el servidor.

## 📄 Licencia
Propietario — Windmar Home PR. Uso interno.
