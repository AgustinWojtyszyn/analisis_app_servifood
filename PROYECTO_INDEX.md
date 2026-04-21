# 📚 Índice de Proyecto - Analysis App

## 📖 Documentación

- **[README.md](README.md)** - Descripción general, instalación, características
- **[QUICKSTART.md](QUICKSTART.md)** - Guía rápida en 5 minutos
- **[PRUEBAS.md](PRUEBAS.md)** - Guía detallada de pruebas y validación
- **[ARQUITECTURA.md](ARQUITECTURA.md)** - Diagrama de arquitectura y explicación de layers
- **[PROYECTO_INDEX.md](PROYECTO_INDEX.md)** - Este archivo

---

## 🏗️ Backend (`/backend`)

### Configuración
- `package.json` - Dependencias y scripts
- `.env` - Variables de entorno (desarrollo)
- `.env.example` - Template de variables
- `vite.config.js` - Configuración de Vite

### Base de Datos
- `/prisma/schema.prisma` - Esquema ORM
  - User
  - Analysis
  - ProcessedRecord
  - BusinessRule
  - IncidenceCount

### Código Principal
```
/src
├── server.js                           # Entrada principal
├── /routes                             # Definición de endpoints
│   ├── auth.js                        # POST /login, /register, GET /me
│   ├── analysis.js                    # POST /upload, GET /:id, GET /user/history
│   └── rules.js                       # GET, POST, PUT, DELETE /rules
├── /controllers                        # Lógica de manejo de requests
│   ├── authController.js              # login, register, getMe
│   ├── analysisController.js          # uploadAndAnalyze, getAnalysis, getHistory
│   └── rulesController.js             # getRules, createRule, updateRule, deleteRule
├── /services                           # Lógica de negocio
│   └── analyzeExcel.js                # parseExcel, analyzeExcel, detectHeaders
├── /middlewares                        # Procesamiento transversal
│   └── auth.js                        # authenticateToken, requireAdmin
└── /utils                              # Utilidades
    ├── auth.js                         # generateToken, verifyToken, hashPassword
    └── generateMockExcel.js            # Script para generar Excel de prueba
```

### Endpoints Principales

```
POST   /api/auth/login                 Login
POST   /api/auth/register              Registro
GET    /api/auth/me                    Obtener usuario actual

POST   /api/analysis/upload            Subir y analizar Excel
GET    /api/analysis/:id               Obtener análisis
GET    /api/analysis/user/history      Obtener historial del usuario

GET    /api/rules                      Obtener todas las reglas
POST   /api/rules                      Crear regla (admin)
PUT    /api/rules/:id                  Actualizar regla (admin)
DELETE /api/rules/:id                  Eliminar regla (admin)
```

### Flujo de Análisis

```
1. ExcelJS parsea archivo
2. analyzeExcel.js itera sobre registros
3. Por cada registro:
   - Normaliza texto
   - Busca palabras clave en reglas
   - Clasifica según primera coincidencia
   - Almacena resultado
4. Detecta reincidencias por empleado
5. Determina medidas (aviso, seguimiento, correctiva)
6. Genera resumen con totales
7. Guarda en BD y retorna al frontend
```

---

## ⚛️ Frontend (`/frontend`)

### Configuración
- `package.json` - Dependencias y scripts
- `.env` - Variables de entorno
- `.env.example` - Template
- `vite.config.js` - Configuración de Vite
- `index.html` - Punto de entrada HTML

### Código Principal
```
/src
├── main.jsx                            # Entrada React
├── App.jsx                             # Componente raíz
├── /components                         # Componentes UI
│   ├── LoginForm.jsx                  # Login/registro
│   ├── FileUpload.jsx                 # Drag & drop, progreso
│   ├── Dashboard.jsx                  # Tarjetas, métricas, resumen
│   ├── AnalysisResults.jsx            # Tabla de registros
│   ├── AnalysisHistory.jsx            # Historial
│   └── RulesConfig.jsx                # CRUD de reglas
├── /services                           # API client
│   └── api.js                         # axios instance, authService, analysisService
├── /hooks                              # Custom hooks
│   └── useAuth.js                     # useAuth, useLocalStorage
└── /styles                             # Temas
    └── theme.js                       # Material-UI dark theme
```

### Flujo Principal

```
App.jsx
├── [Loggeado]
│   └── MainApp
│       ├── Tab 0: FileUpload → uploadAndAnalyze
│       ├── Tab 1: AnalysisHistory
│       ├── Tab 2: AnalysisResults
│       └── Tab 3: RulesConfig (solo admin)
└── [No loggeado]
    └── LoginForm
```

---

## 📦 Compartido (`/shared`)

```
/shared
├── /businessRules
│   └── defaultRules.json               # Reglas por defecto
└── /types
    └── (tipos compartidos si es necesario)
```

---

## 📋 Reglas de Negocio (Incluidas)

1. **Logística** - "faltó mercadería", "falta mercader"
2. **Inocuidad** - "producto en mal estado", "defectuoso"
3. **Calidad** - "problema de calidad", "defecto de calidad"
4. **Reclamo Externo** - "cliente reclamó", "queja cliente"
5. **Reclamo Interno** - "incumplimiento interno"
6. **Retraso** - "demora", "retraso", "atraso"

---

## 🔑 Variables de Entorno

### Backend (`backend/.env`)
```
DATABASE_URL="file:./dev.db"           # SQLite
JWT_SECRET="dev-secret-key-change..."  # Secret JWT
PORT=5000                               # Puerto del servidor
NODE_ENV="development"                  # Ambiente
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:5000/api # URL del backend
```

---

## 🗄️ Base de Datos (SQLite)

**Ubicación:** `backend/dev.db`

**Tablas:**
- User (id, email, name, password, role, createdAt, updatedAt)
- Analysis (id, userId, filename, uploadDate, totalRecords, summaryJson, rulesUsedJson)
- ProcessedRecord (id, analysisId, rowData, employee, sector, description, category, severity, suggestedAction, notes)
- BusinessRule (id, name, keywords, category, severity, suggestedAction, enabled, createdAt, updatedAt)
- IncidenceCount (id, analysisId, employee, count, severity, suggestedMeasure)

---

## 🚀 Scripts Disponibles

### Backend
```bash
npm run dev              # Desarrollo con watch
npm run start            # Producción
npm run prisma:generate # Generar cliente Prisma
npm run prisma:migrate  # Ejecutar migraciones
npm run prisma:studio   # Abrir Prisma Studio (BD visual)
```

### Frontend
```bash
npm run dev             # Desarrollo
npm run build           # Build para producción
npm run preview         # Preview del build
```

---

## 🔐 Autenticación

- **Tipo:** JWT
- **Validación:** Token en header `Authorization: Bearer <token>`
- **Expiración:** 24 horas
- **Almacenamiento:** localStorage (frontend)
- **Hashing:** bcryptjs (10 rounds)

---

## 🎯 Flujos Principales

### 1. Login
```
LoginForm → authService.login() → POST /api/auth/login 
→ Validar credenciales → Generar JWT → Guardar en localStorage
```

### 2. Análisis de Excel
```
FileUpload → analysisService.uploadFile() → POST /api/analysis/upload
→ Parsear con ExcelJS → Aplicar reglas → Detectar reincidencias 
→ Guardar en BD → Mostrar resultados en Dashboard
```

### 3. Configuración de Reglas (Admin)
```
RulesConfig → rulesService.getRules() → GET /api/rules
→ Mostrar tabla → Editar/crear/eliminar → PUT/POST/DELETE /api/rules/:id
```

---

## ✨ Características Implementadas

- [x] Login y registro de usuarios
- [x] RBAC (Admin, Usuario)
- [x] Carga de archivos Excel (drag & drop)
- [x] Análisis automático con reglas
- [x] Clasificación de incidencias
- [x] Detección de reincidencias
- [x] Dashboard con métricas
- [x] Tabla filtrable de registros
- [x] Exportación a CSV
- [x] Historial de análisis
- [x] Configuración de reglas (admin)
- [x] Interfaz dark mode
- [x] Autenticación con JWT
- [x] Validación de archivos
- [x] Barra de progreso (simulada)

---

## 🚧 Próximas Mejoras

- [ ] Exportación a PDF
- [ ] Gráficos avanzados (Chart.js, Recharts)
- [ ] Migración a PostgreSQL
- [ ] Autenticación con Supabase Auth
- [ ] Análisis con IA (opcional)
- [ ] Webhooks para notificaciones
- [ ] Tests unitarios e integración
- [ ] Logging centralizado
- [ ] Rate limiting
- [ ] Caché con Redis

---

## 📱 Responsive

- Desktop: 1920x1080
- Tablet: 768x1024
- Mobile: 375x667

Material-UI proporciona responsividad automática.

---

## 🐛 Troubleshooting

Ver [PRUEBAS.md](PRUEBAS.md#-troubleshooting)

---

## 📞 Contacto / Support

Revisa los archivos de documentación:
- Instalación → README.md
- Quick start → QUICKSTART.md
- Pruebas → PRUEBAS.md
- Arquitectura → ARQUITECTURA.md

---

**Última actualización:** April 2024
**Stack:** React 18 + Node.js + Express + Prisma + SQLite
**Licencia:** MIT

¡Gracias por usar Analysis App! 🎉
