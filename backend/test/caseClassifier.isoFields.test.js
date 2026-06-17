import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyDeviationCase,
  classifyDeviationCasesFromRecords
} from '../src/services/caseClassifier.js';

const baseRow = {
  areaProceso: 'Planta',
  actividadRealizada: 'Control operativo',
  hallazgoDetectado: 'Registro incompleto detectado',
  resultadoClasificado: 'No conforme',
  tipoDesvio: 'NC'
};

test('caseClassifier ISO: solo relacionIso22000', () => {
  const result = classifyDeviationCase({
    numeroAccion: '1',
    filas: [{ ...baseRow, relacionIso22000: '8.4 Control externo' }]
  });
  assert.equal(result.iso22000, '8.4 Control externo');
});

test('caseClassifier ISO: solo iso22000 legado', () => {
  const result = classifyDeviationCase({
    numeroAccion: '1',
    filas: [{ ...baseRow, iso22000: '8.2 PRP' }]
  });
  assert.equal(result.iso22000, '8.2 PRP');
});

test('caseClassifier ISO: ambos campos coinciden', () => {
  const result = classifyDeviationCase({
    numeroAccion: '1',
    filas: [{ ...baseRow, relacionIso22000: '7.5 Información documentada', iso22000: '7.5 Información documentada' }]
  });
  assert.equal(result.iso22000, '7.5 Información documentada');
});

test('caseClassifier ISO: si divergen prevalece relacionIso22000', () => {
  const result = classifyDeviationCase({
    numeroAccion: '1',
    filas: [{ ...baseRow, relacionIso22000: '8.4 Control externo', iso22000: '8.5.1 Control operacional' }]
  });
  assert.equal(result.iso22000, '8.4 Control externo');
});

test('caseClassifier ISO: sin ISO existente conserva inferencia de casos', () => {
  const result = classifyDeviationCase({
    numeroAccion: '1',
    filas: [{ ...baseRow }]
  });
  assert.equal(result.iso22000, '7.5 Información documentada');
});

test('caseClassifier ISO: classifyDeviationCasesFromRecords usa helper canónico al agrupar', () => {
  const [result] = classifyDeviationCasesFromRecords([
    {
      ...baseRow,
      numeroAccion: '10',
      relacionIso22000: '8.4 Control externo',
      iso22000: '8.5.1 Control operacional'
    }
  ]);
  assert.equal(result.iso22000, '8.4 Control externo');
});
