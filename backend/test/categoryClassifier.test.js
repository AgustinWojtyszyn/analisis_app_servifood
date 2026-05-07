import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCategoriaDesvio, classifyDeviationAreaDetailed } from '../src/services/excel/analyzeExcel/classifiers/categoryClassifier.js';

const classify = (text) => classifyCategoriaDesvio({
  textoCompleto: text,
  descripcion: text,
  hallazgoDetectado: text,
  resultadoClasificado: 'No conforme',
  tipoDesvio: 'NC'
});

test('Llega fruta sin sanitizar a Adium => Inocuidad', () => {
  assert.equal(classify('Llega fruta sin sanitizar a Adium'), 'Desvío de Inocuidad');
});

test('No se envía limonada a SCOP por falta de materia prima => Logística', () => {
  assert.equal(classify('No se envía limonada a SCOP por falta de materia prima'), 'Desvío de Logística');
});

test('Hay problemas de cocción => Inocuidad', () => {
  assert.equal(classify('Hay problemas de cocción'), 'Desvío de Inocuidad');
});

test('No se enviaron pizzas al Easy => Logística', () => {
  assert.equal(classify('No se enviaron pizzas al Easy'), 'Desvío de Logística');
});

test('Se encuentra pelo en la tarta de cliente Adium => Inocuidad', () => {
  assert.equal(classify('Se encuentra pelo en la tarta de cliente Adium'), 'Desvío de Inocuidad');
});

test('Las viandas están pasadas de peso => Calidad', () => {
  assert.equal(classify('Las viandas están pasadas de peso'), 'Desvío de Calidad');
});

test('El cubre franco del Easy no pudo ingresar por documentación de plataforma => Legal', () => {
  assert.equal(classify('El cubre franco del Easy no pudo ingresar por documentación de plataforma'), 'Desvío Legal');
});

test('Faltan cajones para despacho => Logística', () => {
  assert.equal(classify('Faltan cajones para despacho'), 'Desvío de Logística');
});

test('Banana oxidada o pasada en bandejas de refrigerio => Inocuidad', () => {
  assert.equal(classify('Banana oxidada o pasada en bandejas de refrigerio'), 'Desvío de Inocuidad');
});

test('Carne no apta por exceder gramaje solicitado => Calidad', () => {
  assert.equal(classify('Carne no apta por exceder gramaje solicitado'), 'Desvío de Calidad');
});

test('Pizzas se queman en el establecimiento => Calidad', () => {
  assert.equal(classify('Las pizzas de SCOP se queman en el establecimiento'), 'Desvío de Calidad');
});

test('Falta de aceite de oliva => Logística', () => {
  assert.equal(classify('El gerente de callia reclama la falta de aceite de oliva'), 'Desvío de Logística');
});

test('Se rompe sifón de bacha => Inocuidad', () => {
  assert.equal(classify('Se rompe sifon de bacha'), 'Desvío de Inocuidad');
});

test('Detailed classifier returns technical reason and confidence', () => {
  const detailed = classifyDeviationAreaDetailed({
    textoCompleto: 'Llega fruta sin sanitizar a Adium',
    descripcion: 'Llega fruta sin sanitizar a Adium',
    resultadoClasificado: 'No conforme',
    tipoDesvio: 'NC'
  });

  assert.equal(detailed.area, 'Desvío de Inocuidad');
  assert.equal(typeof detailed.reason, 'string');
  assert.ok(detailed.reason.length > 10);
  assert.equal(typeof detailed.confidence, 'number');
  assert.ok(detailed.confidence >= 0 && detailed.confidence <= 1);
});
