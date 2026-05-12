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

test('Banana oxidada o pasada en bandejas de refrigerio => Calidad', () => {
  assert.equal(classify('Banana oxidada o pasada en bandejas de refrigerio'), 'Desvío de Calidad');
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

test('Se rompe sifón de bacha => Mantenimiento', () => {
  assert.equal(classify('Se rompe sifon de bacha sin contacto con producto'), 'Desvío de Mantenimiento');
});

test('Se rompe el batidor => Mantenimiento', () => {
  assert.equal(classify('Se rompe el batidor durante mantenimiento'), 'Desvío de Mantenimiento');
});

test('No se enviaron almuerzos para celíacos => Logística', () => {
  assert.equal(classify('No se enviaron los almuerzos para celiacos para monteverde'), 'Desvío de Logística');
});

test('Menú celíaco contaminado => Inocuidad', () => {
  assert.equal(classify('Menu celiaco contaminado con alergenos y mal rotulado'), 'Desvío de Inocuidad');
});

test('Prioridad: Inocuidad sobre Legales cuando conviven señales', () => {
  assert.equal(classify('No pudo ingresar al establecimiento por credencial vencida y producto crudo detectado'), 'Desvío de Inocuidad');
});

test('Naturaleza manda sobre área: área caliente + falta de cocción => Inocuidad', () => {
  assert.equal(classify('Area caliente: falta de coccion en pollo'), 'Desvío de Inocuidad');
});

test('Naturaleza manda sobre área: área caliente + viandas pasadas de peso => Calidad', () => {
  assert.equal(classify('Area caliente: viandas pasadas de peso'), 'Desvío de Calidad');
});

test('Prioridad RRHH: área caliente + personal llega tarde para despacho => RRHH', () => {
  assert.equal(classify('Area caliente: personal llega tarde y se demora el despacho'), 'Desvío de Recursos Humanos');
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

test('German Ramirez se ausenta => Recursos Humanos', () => {
  assert.equal(classify('German Ramirez se ausenta del turno noche'), 'Desvío de Recursos Humanos');
});

test('Movilidad rota y demora en entrega => Mantenimiento por prioridad', () => {
  assert.equal(classify('Movilidad rota y demora en entrega a cliente'), 'Desvío de Mantenimiento');
});

test('Producto fuera de refrigeración => Inocuidad', () => {
  assert.equal(classify('Producto fuera de refrigeración durante despacho'), 'Desvío de Inocuidad');
});

test('Texto ambiguo no cae en Calidad por fallback', () => {
  assert.equal(classify('Se revisa novedad general del día sin detalle técnico'), 'Revisar manualmente');
});

test('Apariencia no fresca con ISO 8.5 HACCP sigue como Calidad', () => {
  const area = classifyCategoriaDesvio({
    textoCompleto: 'Personal de easy devuelve ensalada de tomate porque no tiene apariencia de fresco',
    descripcion: 'Personal de easy devuelve ensalada de tomate porque no tiene apariencia de fresco',
    hallazgoDetectado: 'Personal de easy devuelve ensalada de tomate porque no tiene apariencia de fresco',
    resultadoClasificado: 'No conforme',
    tipoDesvio: 'NC',
    iso22000: '8.5 HACCP'
  });
  assert.equal(area, 'Desvío de Calidad');
});

test('Origen logístico + decomiso por vida útil => Inocuidad', () => {
  const area = classifyCategoriaDesvio({
    textoCompleto: 'Se merman 100 raciones de ensalada de fruta por no enviarla en el postre del día',
    descripcion: 'Se merman 100 raciones de ensalada de fruta por no enviarla en el postre del día',
    hallazgoDetectado: 'Se merman 100 raciones de ensalada de fruta por no enviarla en el postre del día',
    accionInmediata: 'Se decomisa debido a que no son enviadas dentro de las 24 hs de vida útil.',
    resultadoClasificado: 'No conforme',
    tipoDesvio: 'NC'
  });
  assert.equal(area, 'Desvío de Inocuidad');
});

test('Prioridad sanitaria explícita en acción inmediata gana sobre logística', () => {
  const area = classifyCategoriaDesvio({
    textoCompleto: 'No se envía postre en despacho',
    hallazgoDetectado: 'No se envía postre en despacho',
    accionInmediata: 'Se decomisa por vida útil vencida y riesgo sanitario',
    resultadoClasificado: 'No conforme',
    tipoDesvio: 'NC'
  });
  assert.equal(area, 'Desvío de Inocuidad');
});
