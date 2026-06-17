import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCategoriaDesvio } from '../src/services/excel/analyzeExcel/classifiers/categoryClassifier.js';
import {
  classifyIso22000FromDescription,
  resolveIsoWithContextFallback,
  resolveSupplierFruitIsoRule,
  isIsoClauseAvailable,
  findIsoCatalogEntry
} from '../src/services/excel/analyzeExcel/classifiers/isoClassifier.js';

function classifyCategoryAndIso({ text, immediateAction = '', correctiveAction = '' }) {
  const categoriaDesvio = classifyCategoriaDesvio({
    textoCompleto: text,
    descripcion: text,
    hallazgoDetectado: text,
    actividadRealizada: text,
    accionInmediata: immediateAction,
    accionCorrectiva: correctiveAction,
    resultadoClasificado: 'No conforme',
    tipoDesvio: 'NC'
  });

  const isoDetected = classifyIso22000FromDescription({
    descripcionDetectada: text,
    actividadRealizada: [text, immediateAction, correctiveAction].filter(Boolean).join(' | '),
    areaClasificada: '',
    resultadoClasificado: 'No conforme'
  });

  const iso22000 = resolveIsoWithContextFallback({
    iso22000: isoDetected,
    hallazgoDetectado: text,
    actividadRealizada: [immediateAction, correctiveAction].filter(Boolean).join(' | '),
    areaClasificada: '',
    resultadoClasificado: 'No conforme'
  });

  return { categoriaDesvio, iso22000 };
}

test('Apariencia no fresca => Calidad + 8.5.1 Control operacional', () => {
  const result = classifyCategoryAndIso({
    text: 'Personal de easy devuelve ensalada de tomate porque no tiene apariencia de fresco'
  });
  assert.equal(result.categoriaDesvio, 'Desvío de Calidad');
  assert.equal(result.iso22000, '8.5.1 Control operacional');
});

test('No respetar receta => Calidad + 8.5.1 Control operacional', () => {
  const result = classifyCategoryAndIso({
    text: 'Se desarma menu de zapallito por no respetar la receta'
  });
  assert.equal(result.categoriaDesvio, 'Desvío de Calidad');
  assert.equal(result.iso22000, '8.5.1 Control operacional');
});

test('Unidades/porciones/gramaje incorrecto => Calidad + 8.5.1 Control operacional', () => {
  const result = classifyCategoryAndIso({
    text: 'Se detecta gramaje incorrecto y porciones de más en viandas'
  });
  assert.equal(result.categoriaDesvio, 'Desvío de Calidad');
  assert.equal(result.iso22000, '8.5.1 Control operacional');
});

test('Decomiso por vida útil => Inocuidad + 8.5 HACCP', () => {
  const result = classifyCategoryAndIso({
    text: 'Se merman 100 raciones de ensalada de fruta por no enviarla en el postre del día',
    immediateAction: 'Se decomisa debido a que no son enviadas dentro de las 24 hs de vida útil.'
  });
  assert.equal(result.categoriaDesvio, 'Desvío de Inocuidad');
  assert.equal(result.iso22000, '8.5 HACCP');
});

test('Decomisar fuera de vida útil => Inocuidad + 8.5 HACCP', () => {
  const result = classifyCategoryAndIso({
    text: 'Se merman raciones por despacho tardío',
    immediateAction: 'Se procede a decomisar por fuera de vida útil y riesgo para el consumidor'
  });
  assert.equal(result.categoriaDesvio, 'Desvío de Inocuidad');
  assert.equal(result.iso22000, '8.5 HACCP');
});

test('Vida útil/decomiso prioriza 8.5 HACCP aunque ISO previo sea 8.5.1', () => {
  const iso22000 = resolveIsoWithContextFallback({
    iso22000: '8.5.1 Control operacional',
    hallazgoDetectado: 'Se merman 100 raciones por no enviarla en el postre del día',
    actividadRealizada: 'Se decomisa debido a que no son enviadas dentro de las 24 hs de vida útil.',
    areaClasificada: '',
    resultadoClasificado: 'No conforme'
  });
  assert.equal(iso22000, '8.5 HACCP');
});

test('Contaminación/higiene/temperatura insegura => Inocuidad', () => {
  const result = classifyCategoryAndIso({
    text: 'Se detecta contaminación con bichos y temperatura insegura por falta de higiene'
  });
  assert.equal(result.categoriaDesvio, 'Desvío de Inocuidad');
});

test('Carne rígida/dura en menú => 8.5.1 Control operacional', () => {
  const result = classifyCategoryAndIso({
    text: 'adium reclama que la carne del menu estaba rigida y dura'
  });
  assert.equal(result.iso22000, '8.5.1 Control operacional');
});

test('Postre repetido toda la semana => 8.1 Planificación y control operacional', () => {
  const result = classifyCategoryAndIso({
    text: 'Reclamo de adium porque se les envió queso y dulce y ensalada de frutas como postre toda la semana'
  });
  assert.equal(result.iso22000, '8.1 Planificación y control operacional');
});

test('Refrigerio salió tarde => 8.1 Planificación y control operacional', () => {
  const result = classifyCategoryAndIso({
    text: 'Refrigerio de Adium Salio tarde'
  });
  assert.equal(result.iso22000, '8.1 Planificación y control operacional');
});

test('Reorganizar personal y definir prioridades => 8.1 Planificación y control operacional', () => {
  const result = classifyCategoryAndIso({
    text: 'Al re organizar al personal, definir prioridades para evitar reclamos'
  });
  assert.equal(result.iso22000, '8.1 Planificación y control operacional');
});

const catalogWith84 = [
  { code: '8.4', description: 'Control de los procesos, productos y servicios suministrados externamente' },
  { code: '8.5.1', description: 'Control operacional' }
];

test('Proveedor + fruta con 8.4 activo => asigna 8.4', () => {
  const rule = resolveSupplierFruitIsoRule({
    descripcionDetectada: 'Reclamo al proveedor por fruta recibida en mal estado',
    actividadRealizada: 'Se devuelve al proveedor'
  }, { isoCatalog: catalogWith84 });
  assert.equal(rule.iso, '8.4 Control de los procesos, productos y servicios suministrados externamente');
  assert.equal(rule.selectedClause, '8.4');
  assert.equal(rule.fallbackUsed, false);
});

test('Manzanas verdes con 8.4 activo => asigna 8.4', () => {
  const iso = classifyIso22000FromDescription({
    descripcionDetectada: 'Se reciben manzanas verdes para producción',
    actividadRealizada: 'Control de recepción de mercadería',
    areaClasificada: '',
    resultadoClasificado: 'No conforme',
    isoCatalog: catalogWith84
  });
  assert.equal(iso, '8.4 Control de los procesos, productos y servicios suministrados externamente');
});

test('Manzanas chicas/calibre con 8.4 activo => asigna 8.4', () => {
  const rule = resolveSupplierFruitIsoRule({
    descripcionDetectada: 'Manzanas chicas con calibre insuficiente',
    actividadRealizada: 'Se reclama al proveedor'
  }, { isoCatalog: catalogWith84 });
  assert.equal(rule.iso, '8.4 Control de los procesos, productos y servicios suministrados externamente');
});

test('Caso válido sin 8.4 pero con 8.5.1 => fallback 8.5.1', () => {
  const rule = resolveSupplierFruitIsoRule({
    descripcionDetectada: 'Proveedor entrega manzanas verdes',
    actividadRealizada: 'Control de recepción'
  }, { isoCatalog: [{ code: '8.5.1', description: 'Control operacional' }] });
  assert.equal(rule.iso, '8.5.1 Control operacional');
  assert.equal(rule.selectedClause, '8.5.1');
  assert.equal(rule.fallbackUsed, true);
  assert.equal(rule.decisionReason, '8.4_not_available_in_active_catalog');
});

test('Sin 8.4 ni 8.5.1 => fallback seguro a revisión manual', () => {
  const rule = resolveSupplierFruitIsoRule({
    descripcionDetectada: 'Proveedor entrega manzanas verdes',
    actividadRealizada: 'Control de recepción'
  }, { isoCatalog: [{ code: '8.2', description: 'PRP' }] });
  assert.equal(rule.iso, 'Revisar manualmente');
  assert.equal(rule.selectedClause, null);
});

test('Texto ambiguo con verde sin fruta/proveedor no aplica regla', () => {
  const rule = resolveSupplierFruitIsoRule({
    descripcionDetectada: 'El sector verde requiere revisión de pintura',
    actividadRealizada: ''
  }, { isoCatalog: catalogWith84 });
  assert.equal(rule, null);
});

test('Texto ambiguo con chico sin producto/recepción no aplica regla', () => {
  const rule = resolveSupplierFruitIsoRule({
    descripcionDetectada: 'El espacio de oficina quedó chico',
    actividadRealizada: ''
  }, { isoCatalog: catalogWith84 });
  assert.equal(rule, null);
});

test('Catálogo con 8.4.1 sin entrada 8.4 no valida 8.4 padre', () => {
  const catalog = [{ code: '8.4.1', description: 'Control específico' }, { code: '8.5.1', description: 'Control operacional' }];
  assert.equal(isIsoClauseAvailable('8.4', catalog), false);
  const rule = resolveSupplierFruitIsoRule({
    descripcionDetectada: 'Proveedor entrega manzanas verdes'
  }, { isoCatalog: catalog });
  assert.equal(rule.selectedClause, '8.5.1');
});

test('Catálogo con código y descripción separados', () => {
  assert.equal(
    findIsoCatalogEntry('8.4', [{ code: '8.4', description: 'Control externo' }]),
    '8.4 Control externo'
  );
});

test('Catálogo con cláusula en texto completo', () => {
  assert.equal(
    findIsoCatalogEntry('8.4', ['8.4 Control de procesos, productos y servicios externos']),
    '8.4 Control de procesos, productos y servicios externos'
  );
});

test('Reglas ISO existentes no cambian para casos no relacionados con proveedor/fruta', () => {
  assert.equal(classifyCategoryAndIso({ text: 'Carne rígida en el menú' }).iso22000, '8.5.1 Control operacional');
  assert.equal(classifyCategoryAndIso({ text: 'Reclamo porque se envió el mismo postre toda la semana' }).iso22000, '8.1 Planificación y control operacional');
  assert.equal(classifyCategoryAndIso({ text: 'Se decomisa producto por fuera de vida útil' }).iso22000, '8.5 HACCP');
});
