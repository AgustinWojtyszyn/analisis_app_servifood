import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDeviation } from '../src/services/excel/analyzeExcel/classifiers/deviationClassifier.js';

const c = (text) => classifyDeviation(text, '', '', '', '').clasificacion;

test('Se detecta falta de higiene en mesones de area fria => Inocuidad', () => {
  assert.equal(c('Se detecta falta de higiene en mesones de area fria'), 'Inocuidad');
});

test('Se detecta falta de higiene en platinas => Inocuidad', () => {
  assert.equal(c('Se detecta falta de higiene en platinas'), 'Inocuidad');
});

test('Se encuentra en el recorrido de camaras y heladeras alimentos sin etiquetar => Inocuidad', () => {
  assert.equal(c('Se encuentra en el recorrido de camaras y heladeras alimentos sin etiquetar'), 'Inocuidad');
});

test('Se decomisa platina de papas fritas por encontrarse fuera de refrigeracion => Inocuidad', () => {
  assert.equal(c('Se decomisa platina de papas fritas por encontrarse fuera de refrigeracion'), 'Inocuidad');
});

test('La batidora en area caliente deja de funcionar => Mantenimiento', () => {
  assert.equal(c('La batidora en area caliente deja de funcionar'), 'Mantenimiento');
});

test('Deja de funcionar horno a gas en area caliente => Mantenimiento', () => {
  assert.equal(c('Deja de funcionar horno a gas en area caliente'), 'Mantenimiento');
});

test('Se rompe una movilidad => Mantenimiento', () => {
  assert.equal(c('Se rompe una movilidad'), 'Mantenimiento');
});

test('German ramirez se ausenta en el dia => Recursos Humanos', () => {
  assert.equal(c('German ramirez se ausenta en el dia'), 'Recursos Humanos');
});

test('Falta el personal de lavadero => Recursos Humanos', () => {
  assert.equal(c('Falta el personal de lavadero'), 'Recursos Humanos');
});

test('Se envia segunda movilidad al easy por falta de milanesa de soja y tartas => Logística', () => {
  assert.equal(c('Se envia segunda movilidad al easy por falta de milanesa de soja y tartas'), 'Logística');
});

test('El cliente Vicunha reclama tardanzas y falta de entrega de postre => Logística', () => {
  assert.equal(c('El cliente Vicunha reclama tardanzas y falta de entrega de postre'), 'Logística');
});

test('El gerente de callia reclama la falta de aceite de oliva => Logística', () => {
  assert.equal(c('El gerente de callia reclama la falta de aceite de oliva'), 'Logística');
});

test('No dejan entrar a personal de scop por falta de actualizacion en plataformas => Legales', () => {
  assert.equal(c('No dejan entrar a personal de scop por falta de actualizacion en plataformas'), 'Legales');
});

test('Adium reclama que las manzanas estaban chicas y verdes => Calidad', () => {
  assert.equal(c('Adium reclama que las manzanas estaban chicas y verdes'), 'Calidad');
});

test('Igarreta reclama que la ensalada de tomate no estaba fresca => Calidad', () => {
  assert.equal(c('Igarreta reclama que la ensalada de tomate no estaba fresca'), 'Calidad');
});
