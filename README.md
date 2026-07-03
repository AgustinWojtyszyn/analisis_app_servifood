# Servifood Analysis App

Aplicacion web para gestion interna de Servifood: carga y analisis de archivos Excel, historial de analisis, documentos SGC, certificaciones, declaraciones de salud, politicas y administracion de usuarios.

## Arquitectura actual

### Frontend

- React 18 con Vite.
- Material UI para componentes visuales.
- Supabase Auth desde el cliente con clave anonima/publica.
- Consume el backend Express por `/api` o por `VITE_API_URL`.

### Backend

- Node.js 20 con Express.
- Supabase como base de datos operativa.
- Supabase Auth para validar sesiones.
- Supabase Service Role solo en backend para operaciones administrativas y consultas protegidas.
- ExcelJS para lectura principal de archivos Excel.
- Rutas API para analisis, reglas, documentos SGC, certificaciones, declaraciones de salud y usuarios admin.

### Roles

- `admin`: acceso a gestion interna, cargas Excel, historial, reglas, usuarios, documentos SGC, certificaciones y gestor de declaraciones.
- `nutricionista`: acceso a gestion interna, documentos SGC, certificaciones, declaracion propia y politicas.
- `user`: acceso al portal colaborador, declaracion propia y politicas.

Los permisos efectivos se resuelven desde la tabla `profiles` en Supabase. El backend revalida el token y el perfil en endpoints protegidos.

## Variables de entorno

No commitear archivos `.env` ni valores reales.

### Backend (`backend/.env`)

```bash
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
```

Notas:

- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son obligatorias para endpoints protegidos del backend.
- `DATABASE_URL` se mantiene porque el proyecto aun genera Prisma Client para compatibilidad de partes legacy.
- `FRONTEND_URL`, `CORS_ORIGIN` o `ALLOWED_ORIGINS` deben configurarse en produccion para CORS.
- `DOCUMENTS_NOTIFICATIONS_WORKER_TOKEN` protege el worker interno de notificaciones de Documentos SGC.
- Variables SMTP y destinatarios son necesarias solo para notificaciones por email.

### Frontend (`frontend/.env.local`)

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
VITE_PUBLIC_SITE_URL=
VITE_CUSTOM_DOMAIN_URL=
```

Notas:

- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` son obligatorias.
- `VITE_API_URL` es opcional si frontend y backend se sirven bajo el mismo dominio con `/api`.

## Instalacion local

### Backend

```bash
cd backend
npm install
npm run build
npm run dev
```

Por defecto el backend usa `PORT=5000` si no se define otra variable.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite publica normalmente en `http://localhost:5173`.

## Build y verificacion

```bash
cd frontend
npm run build

cd ../backend
npm run build
npm test
```

## Deploy

El backend puede servir el build de Vite desde `frontend/dist` y exponer las APIs bajo `/api`.

Pasos esperados para despliegue:

1. Configurar variables de entorno del backend.
2. Configurar variables de entorno del frontend durante el build.
3. Ejecutar build del frontend.
4. Ejecutar build del backend.
5. Iniciar `node backend/src/bootstrap.js` o `npm start` desde `backend`.

## Datos y migraciones

La base operativa actual esta en Supabase. Los scripts SQL versionados viven en `backend/sql`.

El directorio `backend/prisma` describe una estructura SQLite legacy y no representa por si solo todo el esquema productivo actual. No usarlo como fuente unica de verdad para Supabase.

### Análisis anual de desvíos

Antes de usar el módulo, aplicar en Supabase el script `backend/sql/20260703_annual_deviation_analysis.sql`.

Uso:

1. Ingresar con un usuario `admin` o `nutricionista`.
2. Abrir la sección `Análisis anual`.
3. Cargar un archivo `.xlsx` anual con hojas de desvíos anuales, calidad y logística. El sistema detecta nombres similares, por ejemplo `Desvíos anuales`, `Calidad` o `Desvios de logistica`.
4. Consultar las pestañas `Resumen anual`, `Desvíos de calidad`, `Desvíos de logística`, `Tabla completa` y `Cargar Excel anual`.
5. Usar los filtros por año, mes, área/sector, clasificación y tipo. El resumen completo o la tabla filtrada se pueden exportar a Excel.

## Referencias legacy

Referencias antiguas a SQLite local, autenticacion JWT/bcrypt propia y credenciales `admin@example.com / admin123` pertenecen a versiones previas del proyecto. La autenticacion vigente es Supabase Auth y los usuarios/roles se administran por Supabase y la tabla `profiles`.

## Seguridad operativa

- No imprimir ni commitear secretos.
- Mantener `SUPABASE_SERVICE_ROLE_KEY` solo en backend.
- Configurar CORS explicitamente en produccion.
- Validar perfiles y roles en backend, no solo en UI.
