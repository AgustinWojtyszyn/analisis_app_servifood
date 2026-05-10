import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDeviationScope } from '../src/services/excel/analyzeExcel/classifiers/scopeClassifier.js';

function scopeOf(text, detectedArea = '') {
  return classifyDeviationScope({ text, detectedArea }).scope;
}

test('Externos por cliente detectado', () => {
  assert.equal(scopeOf('Cliente reclama entrega incompleta'), 'Externo');
  assert.equal(scopeOf('No se enviaron pizzas por falla de despacho'), 'Externo');
  assert.equal(scopeOf('Evento enviado en fecha incorrecta al cliente'), 'Externo');
  assert.equal(scopeOf('Problema de transporte del proveedor'), 'Externo');
  assert.equal(scopeOf('No pudo ingresar al establecimiento externo por credencial vencida'), 'Externo');
});

test('Internos por proceso/equipo/planta', () => {
  assert.equal(scopeOf('Se rompe el batidor'), 'Interno');
  assert.equal(scopeOf('Se rompe sifon de bacha'), 'Interno');
  assert.equal(scopeOf('La camara 5 no funciona'), 'Interno');
  assert.equal(scopeOf('Personal de area caliente llega tarde'), 'Interno');
  assert.equal(scopeOf('El deposito se encuentra cerrado por tardanza de personal'), 'Interno');
  assert.equal(scopeOf('Falla de mantenimiento detectada en planta antes de entregar al cliente'), 'Interno');
});

test('Ajuste fino de alcance logístico interno/externo', () => {
  assert.equal(scopeOf('Falta de cajones para despacho'), 'Interno');
  assert.equal(scopeOf('La Laja sale tarde'), 'Externo');
  assert.equal(scopeOf('No sale cena de bodega'), 'Interno');
  assert.equal(scopeOf('No se envió fruta al Easy'), 'Externo');
  assert.equal(scopeOf('No se enviaron almuerzos para celíacos para Monteverde'), 'Externo');
  assert.equal(
    scopeOf('Se manda una segunda movilidad a La Laja por falta de entrega de almuerzo para celíacos'),
    'Externo'
  );
});

test('Alcance externo para riesgo en dieta especial con empresa/cliente', () => {
  assert.equal(scopeOf('Easy reporta menú sin TACC mal rotulado y no apto para celíacos'), 'Externo');
});
