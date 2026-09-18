# Landing de ServiFood Analysis

La landing se implementa en `frontend/src/components/PublicLanding.jsx` y su CSS está aislado bajo `.sf-landing`. Conserva los callbacks `onLogin` y `onRegister`; no modifica rutas, autenticación, permisos ni módulos internos.

## Capturas

Los WebP de `frontend/public/landing/` son capturas de Chromium a 1440 × 960 de los componentes reales con `AppLayout`, `appTheme` e `index.css`. No son interfaces reconstruidas ni imágenes generadas. Se capturaron el 18/09/2026 en un entorno local aislado, con respuestas de servicios de demostración y sin conexiones a producción.

| Archivo | Componente de origen |
| --- | --- |
| internalManagement.webp | InternalManagementPortal |
| charts.webp | ChartsPage (vista desplazada para mostrar los gráficos) |
| annualAnalysis.webp | AnnualDeviationAnalysisPage |
| customerNonconformities.webp | CustomerNonconformitiesPage (estado previo a cargar un archivo) |
| nutritionModules.webp | NutritionModulesPage |
| adminUsers.webp | AdminUsersPage |
| certifications.webp | CertificationsPage |

Los registros, documentos, certificaciones y usuarios son ejemplos, no métricas ni certificaciones empresariales publicadas. Los correos usan `example.com`. La landing identifica las vistas como demostración.

Para actualizar las imágenes, renderizar los mismos componentes con datos de demostración aislados, capturar a 1440 × 960 y exportar a WebP (calidad 88). Mantener los nombres de archivo. No introducir sesiones, contactos ni documentos de producción en los assets públicos.

## Composición y accesibilidad

- Hero tipográfico con dos capturas superpuestas y una CTA principal.
- Recorrido Cargar → Analizar → Documentar → Gestionar.
- Visor de Gráficos, Análisis anual y NC Clientes; índice de Documentos SGC, Certificaciones y Usuarios.
- Selectores accesibles con roles de pestañas, flechas, Inicio/Fin y foco visible.
- Enlace para saltar al contenido y soporte para `prefers-reduced-motion`.
- Imágenes con dimensiones declaradas, WebP y carga diferida fuera del hero.

Validación: build, 28 pruebas existentes, lint del componente, navegación de ingreso/registro y revisión en Chromium a 390, 768, 1024 y 1440 px. El lint global tiene un error previo `no-control-regex` en `src/lib/safeExcelCell.js` y una advertencia previa de Fast Refresh en `PeriodComparisonPage.jsx`.
