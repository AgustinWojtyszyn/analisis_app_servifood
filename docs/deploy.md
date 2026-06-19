# Deploy

Este proyecto se despliega como un servicio Node unico: Express sirve la API bajo `/api` y el build de Vite desde `frontend/dist`.

## Render

El blueprint versionado esta en `render.yaml`.

Build command:

```bash
npm ci && npm run build
```

Start command:

```bash
npm start
```

Health check:

```text
/api/health
```

## Variables requeridas

Backend:

```bash
NODE_ENV=production
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
FRONTEND_URL=
CORS_ORIGIN=
ALLOWED_ORIGINS=
INTERNAL_CRON_SECRET=
DOCUMENTS_NOTIFICATIONS_WORKER_TOKEN=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
DOCUMENT_NOTIFICATION_RECIPIENTS=
CERTIFICATION_NOTIFICATION_RECIPIENTS=
EMAIL_LOGO_URL=
```

Frontend durante build:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
VITE_PUBLIC_SITE_URL=
VITE_CUSTOM_DOMAIN_URL=
```

Si frontend y backend se sirven desde el mismo dominio, `VITE_API_URL` puede quedar vacia o `/api`.

## Seguridad operativa

- `SUPABASE_SERVICE_ROLE_KEY` debe existir solo en backend.
- `VITE_SUPABASE_ANON_KEY` es la clave publica/anonima de Supabase.
- `FRONTEND_URL`, `CORS_ORIGIN` o `ALLOWED_ORIGINS` deben incluir los origenes web productivos.
- `DOCUMENTS_NOTIFICATIONS_WORKER_TOKEN` protege `POST /api/internal/nutrition-modules/process-notifications`. Si falta, el worker responde 401 y no procesa notificaciones.
- `INTERNAL_CRON_SECRET` protege `POST /api/internal/certifications/notification-job`.
- No configurar flags de debug en produccion salvo diagnostico temporal acotado.

## Pendientes tecnicos no bloqueantes

- `frontend/src/components/NutritionModulesPage.jsx` es grande y conviene partirlo por vistas/acciones.
- `frontend/src/components/AnalysisHistory.jsx` concentra filtros, tabla y acciones destructivas.
- `frontend/src/App.jsx` concentra routing manual y guards.
- `exceljs` sigue siendo un chunk pesado; mantener importacion lazy donde sea posible.
- Revisar code splitting futuro para graficos y exportaciones.
