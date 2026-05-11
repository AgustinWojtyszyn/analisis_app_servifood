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

test('Input realista desde parser (texto + area + acciones + ISO) matchea Inocuidad', () => {
  const result = classifyDeviation(
    'Se detecta falta de higiene en mesones',
    'Area Fria',
    'Limpiar y desinfectar mesones',
    'Refuerzo de POES',
    '8.2 PRP higiene'
  );
  assert.equal(result.clasificacion, 'Inocuidad');
  assert.ok(result.matchedRules.length > 0);
});

test('Se envia una segunda movilidad de bifes => Logística', () => {
  assert.equal(c('Se envia una segunda movilidad de bifes'), 'Logística');
});

test('No se envia postre a callia => Logística', () => {
  assert.equal(c('No se envia postre a callia'), 'Logística');
});

test('No se enviaron las papas fritas => Logística', () => {
  assert.equal(c('No se enviaron las papas fritas'), 'Logística');
});

test('Almuerzo no llega a tiempo => Logística', () => {
  assert.equal(c('Almuerzo no llega a tiempo'), 'Logística');
});

test('Demora del camion => Logística', () => {
  assert.equal(c('Demora del camion'), 'Logística');
});

test('Falta de bebidas => Logística', () => {
  assert.equal(c('Falta de bebidas'), 'Logística');
});

test('Cambio en recorrido y logística => Logística', () => {
  assert.equal(c('Cambio en recorrido y logística'), 'Logística');
});

test('Control de despacho => Logística', () => {
  assert.equal(c('Control de despacho'), 'Logística');
});

test('La carne del menú estaba rígida => Calidad', () => {
  assert.equal(c('La carne del menú estaba rígida'), 'Calidad');
});

test('Las tartas le falta dorado => Calidad', () => {
  assert.equal(c('Las tartas le falta dorado'), 'Calidad');
});

test('Producto seco => Calidad', () => {
  assert.equal(c('Producto seco'), 'Calidad');
});

test('Comida fría => Calidad', () => {
  assert.equal(c('Comida fría'), 'Calidad');
});

test('Mal sabor => Calidad', () => {
  assert.equal(c('Mal sabor'), 'Calidad');
});

test('No llegan cucharitas descartables => Logística', () => {
  assert.equal(c('No llegan cucharitas descartables'), 'Logística');
});

test('Tomates picados => Calidad', () => {
  assert.equal(c('Tomates picados'), 'Calidad');
});

test('Apariencia no fresca => Calidad', () => {
  assert.equal(c('Apariencia no fresca'), 'Calidad');
});

test('Fruta pasada => Calidad', () => {
  assert.equal(c('Fruta pasada'), 'Calidad');
});
