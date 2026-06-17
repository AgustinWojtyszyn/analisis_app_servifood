import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFinalRecordOverrides } from '../src/services/excel/analyzeExcel/recordProcessor/finalRecordOverrides.js';

function buildRecord(overrides = {}) {
  return {
    resultadoClasificado: 'No conforme',
    categoriaDesvio: 'Desvío de Calidad',
    clasificacionDesvio: 'Desvío de Calidad',
    hallazgoDetectado: 'Hallazgo de prueba',
    descripcion: 'Hallazgo de prueba',
    actividadRealizada: 'Actividad de prueba',
    accionInmediata: 'Acción inmediata',
    accionCorrectiva: 'Acción correctiva',
    ...overrides
  };
}

function applyOverrides(finalRecord, options = {}) {
  applyFinalRecordOverrides({
    finalRecord,
    hasOriginalClassification: false,
    classificationOriginalRaw: '',
    tipoOriginal: '',
    scopeOriginalRaw: '',
    accionInmediataRaw: '',
    accionCorrectivaRaw: '',
    estadoAccionRaw: '',
    responsableOriginalRaw: '',
    areaOriginalPreservable: '',
    iso22000OriginalRaw: '',
    ...options
  });
  return finalRecord.traceability?.relacionIso22000?.valor_final_usado;
}

test('finalRecordOverrides trazabilidad ISO: solo relacionIso22000', () => {
  const record = buildRecord({ relacionIso22000: '8.4 Control externo' });
  assert.equal(applyOverrides(record), '8.4 Control externo');
});

test('finalRecordOverrides trazabilidad ISO: solo iso22000 legado', () => {
  const record = buildRecord({ iso22000: '8.5.1 Control operacional' });
  assert.equal(applyOverrides(record), '8.5.1 Control operacional');
});

test('finalRecordOverrides trazabilidad ISO: ambos campos coinciden', () => {
  const record = buildRecord({
    relacionIso22000: '8.2 PRP',
    iso22000: '8.2 PRP'
  });
  assert.equal(applyOverrides(record), '8.2 PRP');
});

test('finalRecordOverrides trazabilidad ISO: si divergen prevalece relacionIso22000', () => {
  const record = buildRecord({
    relacionIso22000: '8.4 Control externo',
    iso22000: '8.5.1 Control operacional'
  });
  assert.equal(applyOverrides(record), '8.4 Control externo');
});

test('finalRecordOverrides trazabilidad ISO: revisión manual usa helper canónico', () => {
  const record = buildRecord({ iso22000: 'Revisión manual' });
  assert.equal(applyOverrides(record), 'Revisión manual');
});

test('finalRecordOverrides conserva null cuando no existe ningún ISO', () => {
  const record = buildRecord();
  assert.equal(applyOverrides(record), null);
});
