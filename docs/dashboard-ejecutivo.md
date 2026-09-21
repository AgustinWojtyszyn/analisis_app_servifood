# Dashboard ejecutivo ServiFood

El inicio `/gestion-interna` muestra el dashboard a administradores. Nutricionistas y colaboradores conservan sus pantallas y permisos. `Dashboard.jsx` y sus indicadores de análisis individuales se conservan completos.

## Fuentes y criterios

- **Desvíos, sectores y tendencia:** última carga de `annual_deviation_uploads` por cada año comprendido en los últimos seis meses. Se usan los meses de los incidentes, no las fechas de importación. Se reutilizan `getCanonicalAnnualDeviationRows` y `buildSummary` del análisis anual para no sumar las hojas de especialidad a la hoja anual. Cargas anteriores del mismo año no se suman a la última.
- **Cobertura:** `metadata.validThroughMonth` determina el período cubierto. Fuera de él el resultado es desconocido (`null`). Para cargas antiguas sin esa metadata, solo se muestran meses con filas. Dentro de una cobertura declarada, un mes sin filas vale cero. La serie no conecta meses desconocidos.
- **Comparación:** la fórmula `buildMetricChange` del comparador existente calcula el porcentaje. El mes actual es parcial y se compara con el anterior completo; esto se indica junto al gráfico. Una base anterior de cero con nuevos desvíos no produce un porcentaje ficticio. El comparador de períodos de análisis individuales mantiene su criterio existente por fecha de carga.
- **NC:** lectura paginada de `customer_nonconformities`. Abierto/a, pendiente, en proceso y vencido/a cuentan como abiertos; cerrado/a como cerrados. Otros estados son desconocidos. El esquema no contiene fechas límite: no se puede calcular mora por fecha. Solo se destacan como vencidas las NC cuyo estado lo declara explícitamente. La pantalla NC Clientes permite consultar la misma tabla, respetando RLS. La carga local de Excel sigue siendo una vista previa sin persistencia y se informa al usuario.
- **Certificaciones:** lectura paginada de `certifications`, reutilizando el cálculo de días del servicio de notificaciones. Incluye desde hoy hasta 30 días inclusive, usando el calendario de Argentina. Las vencidas se cuentan aparte y generan alertas. Se muestran las tres próximas más urgentes: rojo hasta 7 días, ámbar hasta 15 y verde hasta 30. El dashboard no envía notificaciones.

Los análisis individuales siguen disponibles en Historial. No se suman a la fuente anual porque podrían representar los mismos incidentes.

## Alertas

Se muestran entre tres y cinco señales reales, ordenadas por severidad: vencimientos, NC declaradas vencidas, aumento mensual de al menos 15%, presencia del sector principal en meses consecutivos, crecimiento de una categoría en tres meses completos y NC abiertas. La reiteración de sector significa presencia en ambos meses, no una identidad comprobada de causa raíz. Si faltan incidentes para generar alertas, se muestran mensajes de cobertura y disponibilidad; no se inventan riesgos para completar la lista.

## API y estados

`GET /api/analysis/executive-dashboard` es de solo lectura y usa `authenticateToken` y `requireAdmin`, igual que el historial y el comparador. Responde con `deviations`, `nonconformities`, `certifications`, `alerts`, `errors` y `generatedAt`. Cada fuente puede fallar sin ocultar las otras; la respuesta indica qué fuente no está disponible. Las lecturas se paginan con orden estable y no modifican datos ni requieren migraciones.

El frontend diferencia carga, ausencia de cobertura, consulta fallida y cero confirmado; permite actualizar/reintentar y cancela solicitudes al desmontarse. Los accesos usan la navegación existente.

## Validación

- Tests backend: cobertura mensual, cambio de año y calendario argentino, selección canónica, porcentajes sin base, estados de NC, ventana inclusiva de certificaciones, prioridad de alertas, paginación y errores parciales.
- Tests frontend: carga sin ceros ficticios, vacío, navegación, reintento, errores parciales y cancelación.
- Revisión en Chromium a 1440, 820 y 390 píxeles, con fixtures exclusivamente de prueba: sin errores de JavaScript ni desbordamiento horizontal. Ningún fixture ni pantalla de prueba forma parte del producto.
