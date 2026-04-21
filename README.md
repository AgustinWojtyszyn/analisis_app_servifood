# Analysis App - Sistema de Análisis de Archivos Excel

Una aplicación web moderna para cargar, procesar y analizar archivos Excel con reglas de negocio configurable.

## 🚀 Características

- ✅ Login y gestión de usuarios (Admin y Usuario común)
- ✅ Carga de archivos Excel (drag & drop)
- ✅ Análisis automático con reglas de negocio
- ✅ Dashboard con métricas y gráficos
- ✅ Historial de análisis
- ✅ Configuración de reglas (solo admin)
- ✅ Exportación a CSV
- ✅ Interfaz moderna y responsive

## 🛠️ Stack Tecnológico

### Backend
- **Node.js** + **Express.js**
- **SQLite** con **Prisma ORM**
- **ExcelJS** para parsear Excel
- **JWT** para autenticación
- **bcryptjs** para hash de contraseñas

### Frontend
- **React 18** + **Vite**
- **Material-UI** para componentes
- **Axios** para requests HTTP

## 📋 Requisitos

- Node.js >= 16
- npm o yarn
- Navegador moderno

## 🔧 Instalación y Ejecución

### 1. Clonar o descargar el proyecto

```bash
cd /home/aggustin/analysis-app
```

### 2. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 3. Configurar la base de datos

```bash
# Generar cliente Prisma
npm run prisma:generate

# Crear y migrar la BD (SQLite)
npm run prisma:migrate
# O simplemente:
npx prisma migrate dev
```

### 4. Iniciar el backend

```bash
npm run dev
# O en producción:
npm start
```

El backend estará en `http://localhost:5000`

**Credenciales por defecto:**
- Email: `admin@example.com`
- Contraseña: `admin123`

### 5. Instalar dependencias del frontend

```bash
cd ../frontend
npm install
```

### 6. Iniciar el frontend

```bash
npm run dev
```

El frontend estará en `http://localhost:3000`

## 📁 Estructura de Carpetas

```
analysis-app/
├── backend/                    # Servidor Express
│   ├── src/
│   │   ├── controllers/       # Controladores
│   │   ├── services/          # Lógica de negocio
│   │   ├── routes/            # Rutas API
│   │   ├── middlewares/       # Autenticación, etc
│   │   ├── utils/             # Utilidades (JWT, auth)
│   │   └── server.js          # Entrada principal
│   ├── prisma/
│   │   └── schema.prisma      # Modelo de datos
│   └── package.json
│
├── frontend/                   # App React
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── pages/             # Páginas
│   │   ├── services/          # Servicios API
│   │   ├── hooks/             # Custom hooks
│   │   ├── styles/            # Temas y estilos
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── shared/                     # Código compartido
│   ├── businessRules/
│   │   └── defaultRules.json  # Reglas por defecto
│   └── types/
│
└── README.md
```

## 📊 Flujo de Uso

1. **Login**: Usuario inicia sesión con email y contraseña
2. **Cargar archivo**: Arrastra o selecciona un archivo Excel (.xlsx, .xls)
3. **Procesamiento**: El sistema valida y analiza el archivo
4. **Resultados**: Ve métricas, tabla de registros y recomendaciones
5. **Historial**: Accede a análisis previos
6. **Configurar** (solo admin): Edita las reglas de análisis

## 🎯 Reglas de Análisis Incluidas

- **Logística**: "faltó mercadería", "falta de", "demora", "retraso"
- **Inocuidad**: "producto en mal estado", "defectuoso", "producto defectuoso"
- **Calidad**: "problema de calidad", "defecto", "control de calidad"
- **Reclamo Externo**: "cliente reclamó", "reclamo cliente", "queja cliente"
- **Reclamo Interno**: "incumplimiento interno", "incumplimiento"

Las reglas son completamente configurables desde la UI.

## 📈 Acciones Sugeridas

- **1 incidencia**: Aviso
- **2 incidencias**: Seguimiento
- **3+ incidencias**: Medida correctiva

## 💾 Estructura del Excel Esperado

El archivo debe tener las siguientes columnas (en cualquier orden):

| Fecha | Empleado | Sector | Descripción | Tipo | Observación | Responsable |
|-------|----------|--------|-------------|------|-------------|-------------|
| 2024-04-01 | Juan | Logística | Faltó mercadería | Falta | - | Pedro |
| 2024-04-02 | Ana | Calidad | Producto en mal estado | Reclamo | - | Laura |

## 🔐 Seguridad

- Contraseñas hasheadas con bcryptjs
- JWT para autenticación sin estado
- Validación de permisos (rol-based)
- Manejo de errores seguro

## 🚀 Próximos Pasos / Mejoras

- [ ] Exportar a PDF
- [ ] Gráficos avanzados (charts.js, recharts)
- [ ] Integración con base de datos PostgreSQL
- [ ] Autenticación con Supabase Auth
- [ ] Análisis con IA (opcional)
- [ ] Webhooks para notificaciones
- [ ] Tests unitarios e integración

## 📞 Soporte

Si encuentras problemas:

1. Verifica que Node.js esté instalado: `node --version`
2. Asegúrate de que los puertos 5000 y 3000 estén disponibles
3. Verifica los logs en la terminal

## 📄 Licencia

MIT - Libre para usar y modificar

---

¡Gracias por usar Analysis App! 🎉
