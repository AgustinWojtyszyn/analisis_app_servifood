# Resumen de Cambios - Clasificación de Desvíos (2026-05-11)

## Objetivo
Corregir la clasificación automática para evitar que `Calidad` funcione como comodín, implementar prioridad contextual real y asegurar consistencia entre backend, frontend, dashboard/exportación e histórico.

## Problemas detectados
- El frontend priorizaba campos legacy/originales (`classification_original`) en varios flujos visuales.
- El reproceso histórico recalculaba categorías pero no todos los totales del `summary`.
- Faltaban keywords críticas para casos reales (higiene, etiquetado, refrigeración, roturas, RRHH, logística, legales, calidad percibida).
- En varios caminos el fallback terminaba en `Calidad` por normalizaciones parciales.

## Cambios Implementados

### 1) Clasificador central único
Se creó una función centralizada y testeable:

- `classifyDeviation(text, area, immediateAction, correctiveAction, iso)`

Retorna:

- `clasificacion`: `Inocuidad | Logística | Calidad | Mantenimiento | Recursos Humanos | Legales | Revisar manualmente`
- `confidence`: `number`
- `matchedRules`: `string[]`

Prioridad aplicada:

1. Inocuidad
2. Mantenimiento
3. Recursos Humanos
4. Logística
5. Legales
6. Calidad
7. Revisar manualmente

Archivo nuevo:
- `backend/src/services/excel/analyzeExcel/classifiers/deviationClassifier.js`

---

### 2) Integración del clasificador central en el motor actual
Se actualizó el clasificador existente para que use la función central como decisión final de categoría.

Archivo actualizado:
- `backend/src/services/excel/analyzeExcel/classifiers/categoryClassifier.js`

Resultado:
- Se evita caída implícita en `Calidad`.
- Si no hay certeza suficiente, queda `Revisar manualmente`.

---

### 3) Reproceso histórico real + persistente
Se implementó reprocesamiento del histórico en `analysis_history`:

- Recalcula categorías para registros existentes.
- Respeta manual override (`classification_manual`, `clasificacionManual`, `manualOverride`).
- Persiste resultados recalculados en DB.
- Recalcula totales del summary:
  - `totalInocuidad`
  - `totalLogistica`
  - `totalCalidad`
  - `totalLegal`
  - `totalMantenimiento`
  - `totalRRHH`
  - `totalRevisionManual`
  - `totalRecords`
  - `totalDesvios`
  - `byCategoria`

Archivos actualizados:
- `backend/src/controllers/analysisController.js`
- `backend/src/routes/analysis.js`

Endpoint nuevo:
- `POST /analysis/reprocess-history`

---

### 4) Corrección de lectura de categoría en frontend
Se ajustó la prioridad de lectura para evitar que se vea la clasificación original legacy por encima de la normalizada.

Antes: se podía priorizar `classification_original`.
Ahora: prioriza `clasificacionDesvio / classification_normalized / categoriaDesvio` y solo luego fallback legacy.

Archivo actualizado:
- `frontend/src/components/AnalysisResults.jsx`

Además:
- si no matchea una categoría válida, muestra `Revisar manualmente` (no `Calidad`).

---

## Reglas/Keywords incorporadas (resumen)

### Inocuidad
higiene, limpieza, desinfección, sucio, platina(s), mesón(es), contaminación, fuera de refrigeración, sin etiquetar, trazabilidad, BPM, manipulación, decomiso, HACCP, PRP, cocción, crudo, etc.

### Mantenimiento
rompe, roto/rota, deja de funcionar, no funciona, falla, avería, batidora, horno, calefón, máquina, equipo, movilidad rota/dañada, mantenimiento.

### Recursos Humanos
ausenta, ausencia, falta personal, personal de lavadero, llamado de atención, sanción, reorganiza personal, conflicto laboral.

### Logística
falta de entrega, faltaron, falta de aceite, falta de postre/producto, no se envía, no trajo pedido, segunda movilidad, despacho, entrega, tardanzas, recorrido, distribución.

### Legales
documentación, plataformas, actualización en plataformas, habilitación, permiso, autorización/ingreso, credencial, etc.

### Calidad
no fresco/no fresca, chicas y verdes, exceso de grasa, mal estado, sabor, textura, presentación, producto/fruta pasada, calidad del producto.

---

## Casos esperados verificados
- Falta de higiene en mesones -> Inocuidad
- Platinas sucias -> Inocuidad
- Alimentos sin etiquetar -> Inocuidad
- Fuera de refrigeración -> Inocuidad
- Batidora deja de funcionar -> Mantenimiento
- Horno deja de funcionar -> Mantenimiento
- Se rompe movilidad -> Mantenimiento
- German Ramírez se ausenta -> Recursos Humanos
- Falta personal de lavadero -> Recursos Humanos
- Segunda movilidad por faltantes -> Logística
- Tardanzas y falta de postre -> Logística
- Falta aceite de oliva -> Logística
- Falta actualización en plataformas -> Legales
- Manzanas chicas y verdes -> Calidad
- Ensalada no fresca -> Calidad

---

## Tests ejecutados
Backend:
- `npm test --silent`
- Resultado final: **52/52 passing**

---

## Archivos modificados/creados

Modificados:
- `backend/src/controllers/analysisController.js`
- `backend/src/routes/analysis.js`
- `backend/src/services/excel/analyzeExcel/classifiers/categoryClassifier.js`
- `frontend/src/components/AnalysisResults.jsx`

Nuevos:
- `backend/src/services/excel/analyzeExcel/classifiers/deviationClassifier.js`
- `backend/test/deviationClassifier.test.js`

---

## Nota operativa
Para aplicar reclasificación persistente a históricos, ejecutar:

- `POST /analysis/reprocess-history`

Luego refrescar historial/dashboard para visualizar contadores recalculados.
