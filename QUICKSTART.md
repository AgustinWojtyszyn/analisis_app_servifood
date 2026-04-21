# ⚡ Quick Start - Analysis App

## En 5 minutos

### 1. Instalar dependencias

```bash
cd /home/aggustin/analysis-app

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Inicializar BD

```bash
cd backend
npx prisma migrate dev --name init
cd ..
```

### 3. Terminal 1 - Backend

```bash
cd /home/aggustin/analysis-app/backend
npm run dev
```

Espera a ver `✓ Usuario admin creado`

### 4. Terminal 2 - Frontend

```bash
cd /home/aggustin/analysis-app/frontend
npm run dev
```

Espera a ver `ready in XXX ms`

### 5. Abre http://localhost:3000

```
Email: admin@example.com
Contraseña: admin123
```

¡Listo! 🎉

---

## Generador de Datos de Prueba

```bash
cd /home/aggustin/analysis-app/backend
node src/utils/generateMockExcel.js
```

Se generará `ejemplo_analisis.xlsx` en la raíz del backend

---

## Comandos Útiles

```bash
# Backend
cd backend

# Desarrollo con watch
npm run dev

# Abrir Studio de Prisma (ver BD visualmente)
npm run prisma:studio

# Resetear BD (borra todo)
npx prisma migrate reset
```

```bash
# Frontend
cd frontend

# Desarrollo
npm run dev

# Build para producción
npm build

# Preview del build
npm run preview
```

---

## URLs

- **App:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health
- **Prisma Studio:** ejecutar `npm run prisma:studio` en backend

---

## Credenciales

```
ADMIN
Email: admin@example.com
Contraseña: admin123

USUARIO DEMO
Email: user@example.com
Contraseña: user123
```

O crea una cuenta nueva en la app.

---

## Estructura Final

```
/home/aggustin/analysis-app/
├── backend/              # Express + Prisma
├── frontend/             # React + Vite
├── shared/               # Código compartido (reglas, tipos)
├── README.md             # Documentación principal
├── ARQUITECTURA.md       # Diagrama y explicación de arquitectura
├── PRUEBAS.md            # Guía detallada de pruebas
├── QUICKSTART.md         # Este archivo
├── setup.sh              # Script de setup
└── start.sh              # Script para iniciar ambos servidores
```

---

## Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| Error ECONNREFUSED | Backend no está corriendo en puerto 5000 |
| Error SQLITE_CANTOPEN | Ejecuta `npx prisma migrate dev` en backend |
| Módulo no encontrado | Ejecuta `npm install` en ambas carpetas |
| Puerto en uso | Cambia PORT en .env |
| BD vacía | Reinicia el backend, crea usuario admin automáticamente |

---

¡Diviértete analizando Excel! 📊✨
