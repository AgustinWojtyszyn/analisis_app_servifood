import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';

const deviations = [
  'La laja sale tarde',
  'No sale cena de bodega',
  'Falta de cajones para despacho',
  'No estan listas las empanadas del evento de placo a la hora del despacho',
  'No se envio junto con el recorrido la limonada y fruta a scop',
  'No se envio junto con el recorrido  y fruta al easy',
  'Se rompe sifon de bacha',
  'Se rompe el batidor',
  'No se enviaron pizzas al easy',
  'No se enviaron los almuerzos para celiacos para monteverde',
  'Las pizzas de scop se queman en el establecimiento',
  'El deposito se encuentra cerrado por tardanza de personal',
  'Llegan tarde los refrigerios de calidra y los berros',
  'Llega fruta sin sanitizar a adium',
  'La camara 5 no funciona',
  'Las viandas estan pasadas de peso',
  'Banana oxidada o pasada en bandejas de refrigerio fruta lista para despacho',
  'El cubre franco del easy no pudo ingresar',
  'Se detecta elaboracion de supremas no conformes por falta de coccion y dorado',
  'No se envia limonada a scop por falta de materia prima',
  'Adium reclama falta de coccion en el sanguche de milanesa',
  'Carne de MG no apta Exceder el gramaje solicitado en los bifes',
  'El gerente de callia reclama la falta de aceite de oliva',
  'Personal de area caliente llega tarde',
  'Faltan platinas y cajones para despacho',
  'Falto comida para celiaco en la laja (1)',
  'No se envian guarniciones al easy',
  'Gerente de callia reclama aceite de oliva',
  'La camara 5 no funciona',
  'Las viandas estan pasadas de peso',
  'Reclamo de adium por naranjas picadas',
  'Reclamo de Clorox',
  'Evento de comeca programado para el 27-12, salio 26-12',
  'Se encuentra pelo en la tarta de cliente adium'
];

async function buildRealLikeBuffer() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja1');

  ws.getCell('A1').value = 'Fecha';
  ws.getCell('B1').value = 'Área / Sector';
  ws.getCell('C1').value = 'Desvío detectado';
  ws.getCell('D1').value = 'Clasificacion del desvio';
  ws.getCell('E1').value = 'Desvio externo/ Interno';
  ws.getCell('F1').value = 'Accion inmediata';
  ws.getCell('G1').value = 'Acción Correctiva Propuesta';
  ws.getCell('H1').value = '';
  ws.getCell('I1').value = 'ISO 22000';

  for (let i = 0; i < deviations.length; i += 1) {
    const row = i + 2;
    ws.getCell(`A${row}`).value = i < 5 ? `2025-12-0${i + 1}` : '';
    ws.getCell(`B${row}`).value = i < 5 ? 'Logística' : '';
    ws.getCell(`C${row}`).value = deviations[i];
    ws.getCell(`D${row}`).value = '';
    ws.getCell(`E${row}`).value = '';
    ws.getCell(`F${row}`).value = '';
    ws.getCell(`G${row}`).value = '';
    ws.getCell(`I${row}`).value = '';
  }

  wb.addWorksheet('Resumen').addRow(['Resumen']);
  return wb.xlsx.writeBuffer();
}

test('A1:I35 real-like fixture must produce 34 records and no discards for deviation rows', async () => {
  process.env.DEBUG_EXCEL_ANALYSIS = 'true';
  const { analyzeExcel } = await import('../src/services/analyzeExcel.js');
  const buffer = await buildRealLikeBuffer();

  const result = await analyzeExcel(buffer, {});
  assert.equal(result.success, true);
  assert.ok(result.diagnostics);

  assert.equal(result.diagnostics.worksheetSelected, 'Hoja1');
  assert.equal(result.diagnostics.detectedHeaderRow, 1);
  assert.equal(result.diagnostics.deviationColumnIndex, 3);
  assert.equal(result.diagnostics.rowsWithDeviationText, 34);
  assert.equal(result.diagnostics.recordsAfterProcessing, 34);
  assert.equal(result.diagnostics.recordsSentToFrontend, 34);
  assert.equal(result.records.length, 34);
  assert.equal(result.summary?.totalRecords, 34);
  assert.equal(result.summary?.totalDesvios, 34);
  assert.equal(result.summary?.totalInocuidad, 10);
  assert.equal(result.summary?.totalLogistica, 19);
  assert.equal(result.summary?.totalCalidad, 4);
  assert.equal(result.summary?.totalLegal, 1);
  assert.equal(result.summary?.totalInternos, 14);
  assert.equal(result.summary?.totalExternos, 20);
  const hasYear2026 = result.records.some((r) => String(r.fecha || '').startsWith('2026-'));
  assert.equal(hasYear2026, false, 'No deben existir fechas 2026 cuando el contexto del archivo es 2025');

  const rejectedDeviationRows = (result.diagnostics.rowsAudit || []).filter((r) =>
    r.rowNumber >= 2
    && r.rowNumber <= 35
    && r.normalizedDeviationValue
    && !r.accepted
  );

  assert.equal(
    rejectedDeviationRows.length,
    0,
    `Rows discarded unexpectedly: ${JSON.stringify(rejectedDeviationRows.slice(0, 10))}`
  );

  const byFinding = new Map(result.records.map((r) => [String(r.hallazgoDetectado || '').toLowerCase(), r]));
  assert.equal(byFinding.get('la laja sale tarde')?.categoriaDesvio, 'Desvío de Logística');
  assert.equal(byFinding.get('no sale cena de bodega')?.categoriaDesvio, 'Desvío de Logística');
  assert.equal(byFinding.get('llega fruta sin sanitizar a adium')?.categoriaDesvio, 'Desvío de Inocuidad');
  assert.equal(byFinding.get('las viandas estan pasadas de peso')?.categoriaDesvio, 'Desvío de Calidad');
  assert.equal(byFinding.get('carne de mg no apta exceder el gramaje solicitado en los bifes')?.categoriaDesvio, 'Desvío de Calidad');
  assert.equal(byFinding.get('reclamo de adium por naranjas picadas')?.categoriaDesvio, 'Desvío de Inocuidad');
  assert.equal(byFinding.get('se encuentra pelo en la tarta de cliente adium')?.categoriaDesvio, 'Desvío de Inocuidad');
  assert.equal(byFinding.get('se rompe el batidor')?.categoriaDesvio, 'Desvío de Inocuidad');
  assert.equal(byFinding.get('se rompe el batidor')?.alcanceDesvio, 'Interno');
  assert.equal(byFinding.get('no se enviaron los almuerzos para celiacos para monteverde')?.categoriaDesvio, 'Desvío de Logística');
  assert.equal(byFinding.get('no se enviaron los almuerzos para celiacos para monteverde')?.alcanceDesvio, 'Externo');
  assert.equal(byFinding.get('la laja sale tarde')?.areaClasificada, 'La Laja');
  assert.equal(byFinding.get('no se envio junto con el recorrido la limonada y fruta a scop')?.areaClasificada, 'SCOP');
  assert.equal(byFinding.get('falto comida para celiaco en la laja (1)')?.areaClasificada, 'La Laja');
  assert.notEqual(byFinding.get('carne de mg no apta exceder el gramaje solicitado en los bifes')?.areaClasificada, 'Logística');
  const banana = byFinding.get('banana oxidada o pasada en bandejas de refrigerio fruta lista para despacho');
  assert.equal(banana?.categoriaDesvio, 'Desvío de Inocuidad');
  assert.match(String(banana?.accionCorrectiva || '').toLowerCase(), /retirar el producto no conforme/);
  const naranjas = byFinding.get('reclamo de adium por naranjas picadas');
  assert.match(String(naranjas?.accionCorrectiva || '').toLowerCase(), /retirar el producto no conforme/);
  const pizzas = byFinding.get('no se enviaron pizzas al easy');
  assert.match(String(pizzas?.accionCorrectiva || '').toLowerCase(), /verificar el faltante/);
  const viandas = byFinding.get('las viandas estan pasadas de peso');
  assert.match(String(viandas?.accionCorrectiva || '').toLowerCase(), /fuera de especificacion|fuera de especificación|gramaje/);
  assert.ok((result.summary?.totalInternos || 0) > 0);
  assert.ok((result.summary?.totalExternos || 0) > 0);

  const usefulRecords = result.records.filter((r) => String(r.hallazgoDetectado || '').trim() !== '');
  const withDashType = usefulRecords.filter((r) => String(r.tipoDesvio || '').trim() === '-');
  assert.equal(withDashType.length, 0, `Records with tipo '-': ${JSON.stringify(withDashType.slice(0, 5).map((r) => ({ row: r.rawRowNumber, hallazgo: r.hallazgoDetectado, categoria: r.categoriaDesvio })))}`);
});
