import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDeviationScope } from '../src/services/excel/analyzeExcel/classifiers/scopeClassifier.js';

function scopeOf(text, detectedArea = '') {
  return classifyDeviationScope({ text, detectedArea }).scope;
}

test('Externos por cliente detectado', () => {
  assert.equal(scopeOf('Llega fruta sin sanitizar a Adium'), 'Externo');
  assert.equal(scopeOf('No se enviaron pizzas al Easy'), 'Externo');
  assert.equal(scopeOf('La Laja sale tarde'), 'Externo');
  assert.equal(scopeOf('Evento de Comeca programado para el 27-12, salio 26-12'), 'Externo');
  assert.equal(scopeOf('Gerente de Callia reclama aceite de oliva'), 'Externo');
});

test('Internos por proceso/equipo/planta', () => {
  assert.equal(scopeOf('Se rompe el batidor'), 'Interno');
  assert.equal(scopeOf('Se rompe sifon de bacha'), 'Interno');
  assert.equal(scopeOf('La camara 5 no funciona'), 'Interno');
  assert.equal(scopeOf('Personal de area caliente llega tarde'), 'Interno');
  assert.equal(scopeOf('El deposito se encuentra cerrado por tardanza de personal'), 'Interno');
  assert.equal(scopeOf('Falta de cajones para despacho'), 'Interno');
});
