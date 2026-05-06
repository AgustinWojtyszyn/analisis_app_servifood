import {
  normalizeCellValue,
  normalizeForMatch,
  containsAny,
  normalizeIncidentText
} from '../../../analyzeExcel/normalizers.js';

function hasOperationalDeviationSignal(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized || normalized.length <= 20) return false;
  const signals = [
    'falta',
    'faltaron',
    'faltante',
    'mal estado',
    'devuelve',
    'fallando',
    'no hay',
    'sucio',
    'demora',
    'demorada',
    'no funciona',
    'sin',
    'problema'
  ];
  return containsAny(normalized, signals);
}

function shouldUseAreaProcesoAsHallazgo({ actividadRealizada, areaProceso, hallazgoDetectado }) {
  const actividad = normalizeCellValue(actividadRealizada || '').trim();
  const area = normalizeCellValue(areaProceso || '').trim();
  const hallazgo = normalizeForMatch(hallazgoDetectado || '');
  const hallazgoVacio = !hallazgo || hallazgo === normalizeForMatch('Sin hallazgo detectado');
  return !actividad && hallazgoVacio && hasOperationalDeviationSignal(area);
}

function applyOperationalOverrides({ hallazgoDetectado, areaClasificada, resultadoClasificado, tipoDesvio, iso22000 }) {
  const hallazgoText = normalizeIncidentText(hallazgoDetectado || '');
  let areaFinal = areaClasificada;
  let resultadoFinal = resultadoClasificado;
  let tipoFinal = tipoDesvio;
  let isoFinal = iso22000;

  if (containsAny(hallazgoText, [
    'faltaron almuerzos',
    'faltante de mercaderia',
    'demora de entrega',
    'cliente',
    'servicio',
    'scop',
    'easy',
    'hospital',
    'pocito',
    'la laja'
  ])) {
    areaFinal = 'Logística / Distribución';
  }

  if (containsAny(hallazgoText, ['mal estado', 'devuelve', 'ensaladas'])) {
    resultadoFinal = 'No conforme';
    tipoFinal = 'NC';
  }

  if (containsAny(hallazgoText, ['cucarachas', 'plagas', 'cebos'])) {
    resultadoFinal = 'No conforme';
    tipoFinal = 'NC';
    isoFinal = '8.2 Programas prerrequisito / POES / BPM';
  }

  if (containsAny(hallazgoText, ['fallando', 'no funciona', 'no hay agua caliente'])) {
    resultadoFinal = 'No conforme';
    tipoFinal = 'NC';
    if (containsAny(hallazgoText, ['fallando', 'no funciona'])) isoFinal = '7.1 Recursos';
    if (containsAny(hallazgoText, ['no hay agua caliente'])) isoFinal = '8.2 Programas prerrequisito / POES / BPM';
  }

  if (containsAny(hallazgoText, ['sucio', 'sin limpiar', 'restos de carne'])) {
    resultadoFinal = 'No conforme';
    tipoFinal = 'NC';
    isoFinal = '8.2 Programas prerrequisito / POES / BPM';
  }

  if (containsAny(hallazgoText, ['tomate en mal estado', 'ensaladas en mal estado'])) {
    isoFinal = '8.5 Control de peligros / HACCP / OPRP / PCC';
  }

  if (containsAny(hallazgoText, ['falta de personal', 'falto personal', 'faltó personal', 'sin personal'])) {
    resultadoFinal = 'No conforme';
    tipoFinal = 'NC';
    isoFinal = '7.1 Recursos';
  }
  if (containsAny(hallazgoText, ['ausencia de personal'])) {
    resultadoFinal = 'No conforme';
    tipoFinal = 'NC';
    isoFinal = '7.1 Recursos';
  }

  if (containsAny(hallazgoText, ['faltante', 'faltaron', 'demora de entrega'])) {
    isoFinal = 'Revisar manualmente';
  }

  if (hasOperationalDeviationSignal(hallazgoText) && resultadoFinal !== 'No conforme') {
    resultadoFinal = 'No conforme';
    tipoFinal = 'NC';
  }

  return {
    areaClasificada: areaFinal,
    resultadoClasificado: resultadoFinal,
    tipoDesvio: tipoFinal,
    iso22000: isoFinal
  };
}

function extractCamaras(texto) {
  const input = normalizeForMatch(texto || '');
  const regex = /camara\s*(n°|nº|numero)?\s*([0-9, y]+)/gi;
  const all = [];
  let match = regex.exec(input);

  while (match) {
    const numeros = (match[2] || '').match(/\d+/g) || [];
    all.push(...numeros);
    match = regex.exec(input);
  }

  const unique = [...new Set(all.filter((n) => /^\d+$/.test(n)))];
  return unique.map((n) => Number(n))
    .filter((n) => n >= 1 && n <= 7)
    .map((n) => `Cámara ${n}`);
}

const OPERATIONAL_AREAS = [
  'Área fría', 'Área caliente', 'Depósito', 'Cámara 1', 'Cámara 2', 'Cámara 3', 'Cámara 4', 'Cámara 5', 'Cámara 6', 'Cámara 7', 'Baños', 'Pasillo principal', 'Áreas comunes', 'Comedor', 'Logística', 'Área de residuos', 'Área de pre elaborados', 'Lavadero', 'Área no identificada'
];

const OPERATIONAL_AREA_PRIORITY = OPERATIONAL_AREAS.filter((area) => area !== 'Área no identificada');
const OPERATIONAL_AREA_SET = new Set(OPERATIONAL_AREAS);
const AREA_PRIORITY = OPERATIONAL_AREA_PRIORITY;

function toOperationalArea(area) {
  const raw = normalizeCellValue(area || '').trim();
  if (!raw) return null;
  const normalized = normalizeForMatch(raw);
  if (!normalized) return null;

  const cameraMatch = normalized.match(/camara\s*([0-9]+)/);
  if (cameraMatch) {
    const number = Number(cameraMatch[1]);
    if (number >= 1 && number <= 7) return `Cámara ${number}`;
    return 'Área fría';
  }

  if (normalized.includes('area fria')) return 'Área fría';
  if (normalized.includes('area caliente')) return 'Área caliente';
  if (normalized.includes('deposito')) return 'Depósito';
  if (normalized.includes('pasillo')) return 'Pasillo principal';
  if (normalized.includes('bano') || normalized.includes('banos') || normalized.includes('sanitario')) return 'Baños';
  if (normalized.includes('sector general') || normalized === 'en general') return 'Áreas comunes';
  if (normalized.includes('area comun') || normalized.includes('areas comunes')) return 'Áreas comunes';
  if (normalized.includes('comedor')) return 'Comedor';
  if (normalized.includes('logistica')) return 'Logística';
  if (normalized.includes('residuos') || normalized.includes('desecho') || normalized.includes('basura')) return 'Área de residuos';
  if (normalized.includes('pre elaborados') || normalized.includes('preelaborados') || normalized.includes('pre elaborado')) return 'Área de pre elaborados';
  if (normalized.includes('lavadero') || normalized.includes('bacha')) return 'Lavadero';
  if (normalized === normalizeForMatch('Planta') || normalized.includes('recorrida de planta')) return 'Áreas comunes';
  if (normalized === normalizeForMatch('Área no identificada')) return 'Área no identificada';

  if (
    normalized.includes('calidad')
    || normalized.includes('documentacion')
    || normalized.includes('rrhh')
    || normalized.includes('personal')
    || normalized.includes('higiene')
    || normalized.includes('sanitizacion')
    || normalized.includes('mantenimiento')
  ) return null;

  return null;
}

function sanitizeOperationalAreaList(parts = []) {
  const seen = new Set();
  const finalAreas = [];

  parts.flatMap((part) => String(part || '').split(','))
    .flatMap((part) => part.split('/'))
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const operational = toOperationalArea(part);
      if (!operational || !OPERATIONAL_AREA_SET.has(operational)) return;
      const key = normalizeForMatch(operational);
      if (seen.has(key)) return;
      seen.add(key);
      finalAreas.push(operational);
    });

  return finalAreas.length ? finalAreas : ['Área no identificada'];
}

function detectExactLocations(text) {
  const normalized = normalizeIncidentText(text);
  if (!normalized) return { cameraLocations: [], heladeraAreas: [], hotEquipmentAreas: [], sectorAreas: [], clientAreas: [] };

  const cameraLocations = extractCamaras(normalized);
  const heladeraAreas = [];
  const hotEquipmentAreas = [];
  const sectorAreas = [];
  const clientAreas = [];

  const hasHeladera = normalized.includes('heladera') || normalized.includes('heladeras');
  const hasAF = /\baf\b/.test(` ${normalized} `) || normalized.includes('area fria') || normalized.includes('área fria');
  const hasAC = /\bac\b/.test(` ${normalized} `) || normalized.includes('area caliente') || normalized.includes('área caliente');
  if (hasHeladera && hasAF) heladeraAreas.push('Área fría');
  if (hasHeladera && hasAC) heladeraAreas.push('Área caliente');

  if (containsAny(normalized, ['horno','hornos','cocina','coccion','cocción','marmita','marmitas','freidora','freidoras','plancha','planchas','olla','ollas','preparacion caliente','preparación caliente','linea caliente','línea caliente','costillas','almuerzos calientes'])) hotEquipmentAreas.push('Área caliente');
  if (containsAny(normalized, ['deposito', 'depósito'])) sectorAreas.push('Depósito');
  if (containsAny(normalized, ['pre elaborados', 'preelaborados', 'pre elaborado', 'pre-elaborados'])) sectorAreas.push('Área de pre elaborados');
  if (containsAny(normalized, ['linea de bachas', 'línea de bachas', 'bachas', 'lavadero', 'lavado'])) sectorAreas.push('Lavadero');
  if (containsAny(normalized, ['residuo', 'residuos', 'basura', 'desechos'])) sectorAreas.push('Área de residuos');
  if (containsAny(normalized, ['cebro exterior', 'cebros exteriores', 'cebo', 'cebos', 'exterior'])) sectorAreas.push('Área de residuos');
  if (containsAny(normalized, ['baño', 'bano', 'baños', 'banos', 'sanitario'])) sectorAreas.push('Baños');
  if (containsAny(normalized, ['comedor'])) sectorAreas.push('Comedor');
  if (containsAny(normalized, ['pasillo', 'pasillos'])) sectorAreas.push('Pasillo principal');
  if (containsAny(normalized, ['planta', 'recorrida de planta', 'area comun', 'área común', 'áreas comunes', 'sector general', 'en general'])) sectorAreas.push('Áreas comunes');
  if (containsAny(normalized, ['easy', 'scop', 'hospital mental', 'pocito', 'la laja'])) clientAreas.push('Logística');

  return {
    cameraLocations: [...new Set(cameraLocations)],
    heladeraAreas: [...new Set(heladeraAreas)],
    hotEquipmentAreas: [...new Set(hotEquipmentAreas)],
    sectorAreas: [...new Set(sectorAreas)],
    clientAreas: [...new Set(clientAreas)]
  };
}

function sortAreasByPriority(areaScores) {
  return [...areaScores.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return AREA_PRIORITY.indexOf(a[0]) - AREA_PRIORITY.indexOf(b[0]);
  });
}

function sortAreasByPriorityList(areaList = []) {
  const operational = sanitizeOperationalAreaList(areaList);
  if (operational.length === 1 && operational[0] === 'Área no identificada') return operational;

  operational.sort((a, b) => {
    const ia = AREA_PRIORITY.indexOf(a);
    const ib = AREA_PRIORITY.indexOf(b);
    const pa = ia === -1 ? 999 : ia;
    const pb = ib === -1 ? 999 : ib;
    return pa - pb;
  });
  return operational;
}

function detectAreasFromDescription(descripcionDetectada, areaProceso = '') {
  const text = normalizeIncidentText(descripcionDetectada);
  const areaProcesoText = normalizeIncidentText(areaProceso);
  const areaOriginalNorm = normalizeIncidentText(areaProceso);

  if (!text) return { areas: ['Área no identificada'], evidence: [] };
  const exact = detectExactLocations(text);
  if (exact.cameraLocations.length > 0) return { areas: [exact.cameraLocations[0]], evidence: ['cámara específica detectada en hallazgo'] };

  const hasGenericDirtyFloorSignals = containsAny(text, ['sector desordenado', 'pisos sucios', 'charcos de agua', 'restos de alimentos en el piso']);
  if (hasGenericDirtyFloorSignals) {
    const originalArea = toOperationalArea(areaProceso);
    if (originalArea === 'Lavadero') return { areas: ['Lavadero'], evidence: ['lavadero heredado desde área original'] };
    return { areas: ['Área no identificada'], evidence: ['higiene general sin pista de área específica'] };
  }

  if (containsAny(text, ['ambas camaras', 'ambas cámaras'])) {
    const originalArea = toOperationalArea(areaProceso);
    if (originalArea && originalArea.startsWith('Cámara')) return { areas: [originalArea], evidence: ['cámaras múltiples con cámara específica heredada desde Excel'] };
    return { areas: ['Área fría'], evidence: ['cámaras múltiples sin número específico'] };
  }

  if (containsAny(text, ['baño', 'baños', 'bano', 'banos', 'sanitario', 'sanitarios', 'armario de baños', 'armario de banos'])) return { areas: ['Baños'], evidence: ['señales de baños/sanitarios'] };
  if (containsAny(text, ['residuos','basura','contenedor','contenedores','carton','cartón','tacho','tachos','bolsas vacias','bolsas vacías','cajas vacias','cajas vacías'])) return { areas: ['Área de residuos'], evidence: ['señales de residuos/basura'] };
  if (containsAny(text, ['lavadero','bacha','bachas','lavado','utensilios sucios','elementos sucios','charcos de agua'])) return { areas: ['Lavadero'], evidence: ['señales de lavadero/bachas/lavado'] };
  if (containsAny(text, ['deposito','depósito','almacen','almacén','mercaderia','mercadería','stock','pedidos llegaron'])) return { areas: ['Depósito'], evidence: ['señales de depósito/almacén/stock'] };
  if (containsAny(text, ['faltante','faltantes','faltaron','faltó','falto','unidades','menu','menú','pedido incompleto','pedidos incompletos','callia','caliia','bifes','entrega'])) return { areas: ['Logística'], evidence: ['señales de logística/faltantes/entrega'] };
  if (containsAny(text, ['pre elaborado','pre elaborados','preelaborado','preelaborados','riñonera','rinonera','productos ajenos'])) return { areas: ['Área de pre elaborados'], evidence: ['señales de pre elaborados'] };
  if (containsAny(text, ['platina','platinas','caliente','coccion','cocción','horno','hornos','olla','ollas','produccion caliente','producción caliente','preparacion caliente','preparación caliente'])) return { areas: ['Área caliente'], evidence: ['señales de cocción/proceso caliente'] };
  if (containsAny(text, ['sandwich','sanguches','ensalada','ensaladas','postre','postres','vianda','viandas','heladera','heladeras','frio','fría','fria','refrigerado','refrigerados','camara','cámara'])) return { areas: ['Área fría'], evidence: ['señales de productos/almacenamiento en frío'] };
  if (containsAny(text, ['pasillo', 'pasillos'])) return { areas: ['Pasillo principal'], evidence: ['señales de pasillo'] };
  if (containsAny(text, ['zona de circulacion','zona de circulación','circulacion','circulación','areas comunes','áreas comunes','sector comun','sector común','sector general','en general'])) return { areas: ['Áreas comunes'], evidence: ['señales de circulación/áreas comunes'] };

  return { areas: ['Área no identificada'], evidence: [areaProcesoText || areaOriginalNorm ? 'sin señales claras; área original no concluyente' : 'sin señales claras'] };
}

function composeAreaClasificada({ areaProcesoOriginal, areaOperativaDetectada, contextText = '' }) {
  const detectedRaw = normalizeCellValue(areaOperativaDetectada || '').trim();
  const original = normalizeCellValue(areaProcesoOriginal || '').trim();
  const context = normalizeCellValue(contextText || '').trim();
  const detectedAreas = sanitizeOperationalAreaList([detectedRaw]);
  const nonUnknownDetected = detectedAreas.filter((area) => area !== 'Área no identificada');
  if (nonUnknownDetected.length > 0) return sortAreasByPriorityList(nonUnknownDetected).join(' / ');

  const fallbackAreas = sanitizeOperationalAreaList([original]).filter((area) => area !== 'Área no identificada');
  if (fallbackAreas.length > 0) return sortAreasByPriorityList(fallbackAreas).join(' / ');

  const combinedText = normalizeIncidentText([original, context].filter(Boolean).join(' | '));
  if (combinedText && containsAny(combinedText, ['sector desordenado en general', 'sector en general', 'en general', 'sector general'])) return 'Áreas comunes';

  return 'Área no identificada';
}

function normalizeBrunoArea(areaValue, contextText = '') {
  const raw = normalizeCellValue(areaValue || '').trim();
  const area = normalizeIncidentText(raw);
  const context = normalizeIncidentText(contextText || '');
  if (!area || containsAny(area, ['n/a', 'na', 'sin area', 'sin sector', 'no aplica'])) return '';

  if (containsAny(area, ['areas comunes', 'áreas comunes'])) return 'Áreas comunes';
  if (containsAny(area, ['pasillo', 'pasillos'])) return 'Pasillo principal';
  if (containsAny(area, ['sector general', 'en general'])) return 'Áreas comunes';
  if (containsAny(area, ['zona fria', 'área fria', 'area fria'])) return 'Área fría';
  if (containsAny(area, ['zona caliente', 'área caliente', 'area caliente'])) return 'Área caliente';
  if (containsAny(area, ['area lavadero', 'lavadero'])) return 'Lavadero';
  if (containsAny(area, ['deposito', 'depósito'])) return 'Depósito';
  if (containsAny(area, ['vestuarios', 'banos', 'baños', 'vestuarios/baños'])) return 'Baños';
  if (containsAny(area, ['area residuos', 'área residuos', 'residuos'])) return 'Área de residuos';
  if (containsAny(area, ['area pre elaborado', 'pre elaborado', 'preelaborado'])) return 'Área de pre elaborados';
  if (containsAny(area, ['logistica', 'logística'])) return 'Logística';
  if (containsAny(area, ['callia', 'caliia'])) return 'Logística';
  if (containsAny(area, ['comedor'])) return 'Comedor';
  if (containsAny(area, ['armarios', 'armario'])) {
    if (containsAny(`${area} ${context}`, ['armario de banos', 'armario de baños', 'baños'])) return 'Baños';
    return 'Áreas comunes';
  }
  if (containsAny(area, ['camaras 1 y 2', 'cámaras 1 y 2'])) return 'Cámara 1 / Cámara 2';
  if (containsAny(area, ['camaras 3,4,5,6', 'cámaras 3,4,5,6', 'camaras 3 4 5 6', 'cámaras 3 4 5 6'])) return 'Cámara 3 / Cámara 4 / Cámara 5 / Cámara 6';
  const cameraNumbers = [...new Set((area.match(/\b[1-6]\b/g) || []))];
  if (containsAny(area, ['camara', 'cámara']) && cameraNumbers.length > 0) return cameraNumbers.map((n) => `Cámara ${n}`).join(' / ');

  return '';
}

export {
  OPERATIONAL_AREAS,
  hasOperationalDeviationSignal,
  shouldUseAreaProcesoAsHallazgo,
  applyOperationalOverrides,
  toOperationalArea,
  sanitizeOperationalAreaList,
  detectAreasFromDescription,
  composeAreaClasificada,
  normalizeBrunoArea,
  sortAreasByPriority,
  sortAreasByPriorityList,
  detectExactLocations,
  extractCamaras
};
