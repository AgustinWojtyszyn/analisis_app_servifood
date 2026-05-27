import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCategoriaDesvio } from '../src/services/excel/analyzeExcel/classifiers/categoryClassifier.js';
import { classifyIso22000FromDescription, resolveIsoWithContextFallback } from '../src/services/excel/analyzeExcel/classifiers/isoClassifier.js';

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
