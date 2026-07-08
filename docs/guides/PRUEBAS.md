# 🧪 Guía de Prueba - Analysis App

## Paso 1: Setup Inicial

### 1.1 Instalar dependencias

```bash
cd /home/aggustin/analysis-app

# Backend
cd backend
npm install

# Frontend (en otra terminal)
cd ../frontend
npm install
```

### 1.2 Inicializar base de datos

```bash
cd backend

# Generar cliente Prisma
npm run prisma:generate

# Crear/migrar BD (SQLite)
npx prisma migrate dev --name init
```

## Paso 2: Ejecutar la Aplicación

### Terminal 1 - Backend

```bash
cd /home/aggustin/analysis-app/backend
npm run dev
```

Espera a ver:
```
🚀 Servidor ejecutándose en http://localhost:5000
✓ Usuario admin creado: admin@example.com / admin123
```

### Terminal 2 - Frontend

```bash
cd /home/aggustin/analysis-app/frontend
npm run dev
```

Espera a ver:
```
VITE v5.0.0  ready in XXX ms
➜  Local:   http://localhost:3000/
```

## Paso 3: Acceder a la Aplicación

1. Abre http://localhost:3000 en tu navegador
2. Deberías ver la pantalla de login

## Paso 4: Pruebas de Login

### Prueba con Admin

```
Email: admin@example.com
Contraseña: admin123
```

**Acceso:** Admin tiene acceso a configuración de reglas y todos los análisis

### Prueba con Usuario Demo

```
Email: user@example.com
Contraseña: user123
```

**Acceso:** Usuario regular solo ve sus propios análisis

### Crear Nueva Cuenta

- Haz clic en "¿No tienes cuenta? Regístrate aquí"
- Completa datos y crea una cuenta
- Los nuevos usuarios se crean con rol "user"

## Paso 5: Pruebas de Análisis

### Opción A: Generar archivo de ejemplo

Desde terminal en `/home/aggustin/analysis-app/backend`:

```bash
node src/utils/generateMockExcel.js
```

Se generará `ejemplo_analisis.xlsx` en el backend

### Opción B: Crear archivo manual

1. Abre un Excel o Google Sheets
2. Crea columnas: **Fecha | Empleado | Sector | Descripción | Tipo | Observación | Responsable**
3. Agrega filas de ejemplo con descripciones como:
   - "Faltó mercadería"
   - "Producto en mal estado"
   - "Cliente reclamó"
   - "Incumplimiento interno"

### Paso 5.1: Subir archivo

1. En la app, ve a pestaña "📤 Cargar Archivo"
2. Arrastra o selecciona el archivo Excel
3. Haz clic en "Subir y Analizar"
4. Observa la barra de progreso (simulada pero funcional)

### Paso 5.2: Ver Resultados

Automáticamente se abrirá la pestaña "📊 Resultados" con:
- **Tarjetas resumen** con totales
- **Categorías** de incidencias
- **Medidas por empleado** (aviso, seguimiento, medida correctiva)
- **Tabla filtrables** de registros procesados
- **Botón Exportar CSV**

## Paso 6: Pruebas del Historial

1. Ve a pestaña "📋 Historial"
2. Verás todos tus análisis previos
3. Haz clic en "Ver Detalles" para revisar un análisis anterior

## Paso 7: Configuración de Reglas (Solo Admin)

1. Inicia sesión como **admin@example.com**
2. Ve a pestaña "⚙️ Configurar Reglas"
3. Verás todas las reglas activas

### Crear Nueva Regla

1. Haz clic en "Nueva Regla"
2. Rellena:
   - **Nombre:** ej. "Problema de Seguridad"
   - **Palabras Clave:** "accidente, lesión, seguridad" (separadas por comas)
   - **Categoría:** ej. "seguridad"
   - **Gravedad:** "baja", "media" o "alta"
   - **Acción Sugerida:** "aviso", "seguimiento" o "medida_correctiva"
3. Haz clic en "Guardar"

### Editar Regla

1. Haz clic en el ícono de editar
2. Modifica los campos
3. Guarda

### Eliminar Regla

1. Haz clic en el ícono de eliminar
2. Confirma la eliminación

## Paso 8: Pruebas de Exportación

En la pestaña de Resultados:
1. Haz clic en "Exportar CSV"
2. Se descargará un archivo `analysis-YYYY-MM-DD.csv`

## Pruebas Adicionales

### Prueba de Validación de Archivos

Intenta subir:
- Un archivo `.txt` → Deberá mostrar error
- Un archivo `.doc` → Deberá mostrar error
- Un Excel vacío → Deberá mostrar error
- Un Excel sin encabezados → Debería procesarse pero con datos vacíos

### Prueba de Seguridad

1. Abre DevTools (F12)
2. Ve a Application → Local Storage
3. Verifica que el token JWT se guarda correctamente
4. Si eliminas el token, deberás hacer login de nuevo

### Prueba de Permisos

1. Crea un usuario regular
2. Intenta acceder a "Configurar Reglas"
3. Deberá mostrar mensaje: "Solo administradores pueden configurar reglas"

## 📊 Datos de Prueba Sugeridos

```
Fecha | Empleado | Sector | Descripción | Tipo | Observación | Responsable
2024-04-01 | Juan | Logística | Faltó mercadería en envío | Falta | Verificar inventario | Pedro
2024-04-02 | Ana | Calidad | Producto en mal estado | Reclamo | Devolver a proveedor | Laura
2024-04-03 | Luis | Ventas | Cliente reclamó demora | Reclamo | Oferta compensación | Pedro
2024-04-04 | Juan | Logística | Retraso en entrega | Demora | Comunicar a cliente | Pedro
2024-04-05 | María | Operaciones | Incumplimiento interno horarios | Observación | Capacitación | Carlos
2024-04-06 | Ana | Calidad | Problema de calidad en proceso | Incidencia | Ajustar parámetros | Laura
```

## 🐛 Troubleshooting

### Error: "ECONNREFUSED" en frontend

**Solución:** Asegúrate de que el backend esté corriendo en puerto 5000

### Error: "SQLITE_CANTOPEN"

**Solución:** Ejecuta `npx prisma migrate dev` en la carpeta backend

### Error: "Module not found"

**Solución:** Ejecuta `npm install` en ambas carpetas

### El frontend no se conecta al backend

**Solución:** Verifica que el proxy en `vite.config.js` está configurado correctamente

### Base de datos vacía después de migrar

**Solución:** Esto es normal. El script `src/server.js` crea el admin automáticamente al iniciar el backend

## 📱 Responsive Design

Prueba la app en diferentes tamaños:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

Usa DevTools (F12) → Device Toolbar

## 🎯 Checklist Final

- [ ] Login con admin@example.com / admin123
- [ ] Crear nueva cuenta
- [ ] Subir archivo Excel
- [ ] Ver métricas en resultados
- [ ] Filtrar tabla de registros
- [ ] Exportar a CSV
- [ ] Ver historial de análisis
- [ ] Como admin: crear nueva regla
- [ ] Como usuario: intentar acceder a reglas (debe fallar)
- [ ] Logout y login nuevamente

¡Listo! 🎉

---

**Notas Importantes:**

1. La BD se crea automáticamente en `backend/dev.db` (SQLite)
2. Los usuarios se guardan con contraseñas hasheadas (bcryptjs)
3. Los tokens JWT expiran en 24 horas
4. Los archivos Excel se procesan en memoria (no se guardan)
5. Los resultados se guardan en BD para acceso posterior
