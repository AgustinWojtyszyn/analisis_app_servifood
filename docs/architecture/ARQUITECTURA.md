# 🏗️ Arquitectura - Analysis App

## Diagrama General

```
┌─────────────────────────────────────────────────────────────┐
│                       USUARIO                               │
└────────────────┬────────────────────────────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
    ┌────▼────┐      ┌───▼──────┐
    │ Browser │      │ NavApp   │
    └────┬────┘      └──────────┘
         │
    ┌────▼──────────────────────────┐
    │  FRONTEND (React + Vite)       │
    │  http://localhost:3000         │
    │  ├─ LoginForm                  │
    │  ├─ FileUpload                 │
    │  ├─ Dashboard (Métricas)       │
    │  ├─ AnalysisResults (Tabla)    │
    │  ├─ AnalysisHistory            │
    │  └─ RulesConfig                │
    └────┬──────────────────────────┘
         │
         │ HTTP/REST (Axios)
         │
    ┌────▼──────────────────────────┐
    │  BACKEND (Express.js)          │
    │  http://localhost:5000         │
    │  ├─ /api/auth                  │
    │  ├─ /api/analysis              │
    │  └─ /api/rules                 │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │  DATABASE (SQLite + Prisma)    │
    │  dev.db                        │
    │  ├─ users                      │
    │  ├─ analyses                   │
    │  ├─ processedRecords           │
    │  ├─ businessRules              │
    │  └─ incidenceCounts            │
    └────────────────────────────────┘
```

## Backend Layers

### 1. Routes Layer (`/routes`)
- **Responsabilidad:** Definir endpoints y validar autenticación
- **Archivos:**
  - `auth.js` - Login, registro, obtener usuario actual
  - `analysis.js` - Subir, obtener análisis, historial
  - `rules.js` - CRUD de reglas de negocio

### 2. Controllers Layer (`/controllers`)
- **Responsabilidad:** Lógica de manejo de requests/responses
- **Archivos:**
  - `authController.js` - Manejo de autenticación
  - `analysisController.js` - Orquestar análisis
  - `rulesController.js` - Gestionar reglas

### 3. Services Layer (`/services`)
- **Responsabilidad:** Lógica de negocio compleja
- **Archivos:**
  - `analyzeExcel.js` - Parsear Excel, clasificar registros, generar resumen

### 4. Models Layer (Prisma ORM)
- **Responsabilidad:** Definir esquema y acceder a BD
- **Archivo:** `/prisma/schema.prisma`
- **Modelos:**
  - `User` - Usuarios (admin, user)
  - `Analysis` - Análisis procesados
  - `ProcessedRecord` - Registros clasificados
  - `BusinessRule` - Reglas de análisis
  - `IncidenceCount` - Conteo de incidencias por empleado

### 5. Middlewares Layer (`/middlewares`)
- **Responsabilidad:** Procesamiento transversal
- **Archivos:**
  - `auth.js` - Verificar JWT, roles

### 6. Utils Layer (`/utils`)
- **Responsabilidad:** Funciones auxiliares reutilizables
- **Archivos:**
  - `auth.js` - JWT, bcrypt, hash
  - `generateMockExcel.js` - Generar Excel de prueba

## Frontend Layers

### 1. Pages Layer (`/pages`)
- **Responsabilidad:** Pantallas completas
- **Estructura:** Una página por vista (opcional en esta MVP)

### 2. Components Layer (`/components`)
- **Responsabilidad:** Componentes UI reutilizables
- **Componentes:**
  - `LoginForm` - Formulario de login/registro
  - `FileUpload` - Drag & drop, upload, barra de progreso
  - `Dashboard` - Tarjetas, métricas, resumen
  - `AnalysisResults` - Tabla de registros procesados
  - `AnalysisHistory` - Historial de análisis
  - `RulesConfig` - CRUD de reglas

### 3. Services Layer (`/services`)
- **Responsabilidad:** Comunicación con backend (API)
- **Archivo:** `api.js`
- **Exports:**
  - `authService` - Login, registro
  - `analysisService` - Upload, obtener análisis
  - `rulesService` - CRUD de reglas

### 4. Hooks Layer (`/hooks`)
- **Responsabilidad:** Lógica reutilizable (React hooks)
- **Archivo:** `useAuth.js`
- **Hooks:**
  - `useAuth()` - Manejo de autenticación
  - `useLocalStorage()` - Persistencia local

### 5. Styles Layer (`/styles`)
- **Responsabilidad:** Temas y estilos globales
- **Archivo:** `theme.js`
- **Contiene:** Material-UI theme (dark mode)

## Flujos de Datos

### Flujo de Login

```
LoginForm (input)
    ↓
authService.login()
    ↓
POST /api/auth/login
    ↓
authController.login()
    ↓
Verificar email en BD
    ↓
Comparar password con bcrypt
    ↓
Generar JWT token
    ↓
Guardar en localStorage
    ↓
Actualizar estado useAuth()
    ↓
Redirigir a dashboard
```

### Flujo de Análisis de Excel

```
FileUpload (seleccionar archivo)
    ↓
analysisService.uploadFile(file)
    ↓
POST /api/analysis/upload (FormData)
    ↓
Middleware: verificar token JWT
    ↓
analysisController.uploadAndAnalyze()
    ↓
ExcelJS: parsear archivo
    ↓
analyzeExcel.js: aplicar reglas
    ↓
Clasificar cada registro
    ↓
Detectar reincidencias
    ↓
Generar resumen
    ↓
Guardar en BD (Analysis + ProcessedRecords)
    ↓
Response con ID análisis
    ↓
Frontend: mostrar resultados
    ↓
AnalysisResults: renderizar tabla
    ↓
Dashboard: mostrar métricas
```

### Flujo de Configuración de Reglas

```
RulesConfig (admin)
    ↓
rulesService.getRules()
    ↓
GET /api/rules
    ↓
rulesController.getRules()
    ↓
Prisma: obtener todas las reglas
    ↓
Response: array de reglas
    ↓
Renderizar tabla editable
    ↓
Usuario edita/crea/elimina
    ↓
rulesService.updateRule()/createRule()/deleteRule()
    ↓
PUT/POST/DELETE /api/rules/:id
    ↓
rulesController actualiza BD
    ↓
Siguiente análisis usa nuevas reglas
```

## Modelo de Datos

### User (Autenticación)
```
id: number (PK)
email: string (UNIQUE)
name: string
password: string (hashed)
role: "admin" | "user"
createdAt: DateTime
updatedAt: DateTime
```

### Analysis (Análisis)
```
id: number (PK)
userId: number (FK)
filename: string
uploadDate: DateTime
totalRecords: number
summaryJson: string (JSON)
rulesUsedJson: string (JSON array)
```

### ProcessedRecord (Registros Procesados)
```
id: number (PK)
analysisId: number (FK)
rowData: string (JSON original)
employee: string
sector: string
description: string
category: string
severity: "baja" | "media" | "alta"
suggestedAction: string
notes: string (JSON array)
```

### BusinessRule (Reglas)
```
id: number (PK)
name: string
keywords: string (JSON array)
category: string
severity: "baja" | "media" | "alta"
suggestedAction: string
enabled: boolean
createdAt: DateTime
updatedAt: DateTime
```

### IncidenceCount
```
id: number (PK)
analysisId: number (FK)
employee: string
count: number
severity: string (CSV)
suggestedMeasure: string
```

## Flujo de Autenticación

```
1. Usuario inicia sesión con email/password
   ↓
2. Backend valida contra BD
   ↓
3. Si es válido, genera JWT (payload: id, email, role)
   ↓
4. Frontend guarda token en localStorage
   ↓
5. Frontend guarda user en localStorage
   ↓
6. Cada request API incluye token en header Authorization
   ↓
7. Backend valida token con middleware authenticateToken
   ↓
8. Si token expirado, user es redirigido a login
```

## Reglas de Negocio

Las reglas se definen en `/shared/businessRules/defaultRules.json`:

```json
[
  {
    "id": 1,
    "name": "Logística - Falta de Mercadería",
    "keywords": ["faltó mercadería", "falta mercader"],
    "category": "logística",
    "severity": "media",
    "suggestedAction": "seguimiento"
  }
]
```

**Algoritmo de clasificación:**
1. Normalizar descripción a minúsculas
2. Iterar sobre reglas habilitadas
3. Verificar si alguna palabra clave está en la descripción
4. Usar la primera coincidencia (break)
5. Si no hay coincidencia, categoría = "otros"

**Algoritmo de reincidencias:**
- 1 incidencia = "aviso"
- 2 incidencias = "seguimiento"
- 3+ incidencias = "medida_correctiva"

## Seguridad

### Contraseñas
- Hasheadas con bcryptjs (10 rounds de salt)
- Nunca se guardan en texto plano
- Se comparan durante login

### Tokens
- JWT con secret key del .env
- Expiran en 24 horas
- Se validan en cada request protegido
- Se almacenan en localStorage (vulnerable a XSS, pero simple para MVP)

### Permisos (RBAC)
- `requireAdmin()` middleware para endpoints administrativos
- Las reglas solo pueden editarlas admins
- Los usuarios solo ven sus propios análisis

### Validación
- Archivos: solo .xlsx/.xls
- Tamaño máximo: 50MB
- Encabezados detectados automáticamente

## Escalabilidad Futura

- [ ] Migrar SQLite → PostgreSQL
- [ ] Redis para cacheo de análisis
- [ ] Queue (Bull/RabbitMQ) para archivos grandes
- [ ] WebSockets para notificaciones real-time
- [ ] Análisis asíncrono con workers
- [ ] Autenticación con Supabase/Auth0
- [ ] Logging centralizado (Winston, Pino)
- [ ] APM (Application Performance Monitoring)

## Testing

Por implementar:
- Unit tests (Jest)
- Integration tests
- E2E tests (Cypress)
- Load testing

## Deployment

Consideraciones para producción:
- Usar PostgreSQL en lugar de SQLite
- Configurar CORS correctamente
- Usar HTTPS
- Implementar rate limiting
- Agregar logging
- Usar reverse proxy (Nginx)
- Containerizar con Docker
- Usar PM2 o similar para procesos Node
