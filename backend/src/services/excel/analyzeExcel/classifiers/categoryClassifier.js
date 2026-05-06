import { normalizeCellValue, normalizeIncidentText, containsAny } from '../../../analyzeExcel/normalizers.js';
import { isExplicitNoFindingText } from './outcomeClassifier.js';
import { hasAnyIsoTerm, mergeCompositeIsoLabels } from './isoClassifier.js';

function classifyCategoriaDesvio({
  hallazgoDetectado = '',
  actividadRealizada = '',
  resultadoClasificado = '',
  tipoDesvio = '',
  iso22000 = ''
} = {}) {
  const text = normalizeIncidentText([hallazgoDetectado, actividadRealizada].filter(Boolean).join(' | '));
  const hasAny = (terms) => containsAny(text, terms);
  const resultado = normalizeCellValue(resultadoClasificado).trim();
  const iso = normalizeIncidentText(iso22000 || '');
  const tipo = normalizeCellValue(tipoDesvio).trim();

  if (!text || isExplicitNoFindingText(text) || resultado === 'Conforme') return 'Conforme';

  if (hasAny([
    'habilitacion', 'habilitación', 'municipal', 'bromatologia', 'bromatología', 'carnet', 'carnet manipulador', 'libreta sanitaria', 'documentacion legal', 'documentación legal', 'certificado', 'vencimiento de habilitacion', 'vencimiento de habilitación', 'normativa legal', 'incumplimiento legal', 'requisito legal', 'rotulo legal', 'rótulo legal', 'informacion legal', 'información legal'
  ])) return 'Desvío Legal';

  if (hasAny([
    'faltante', 'faltantes', 'faltaron', 'falto', 'faltó', 'unidades',
    'menu', 'menú', 'pedido incompleto', 'pedidos incompletos', 'viandas faltantes',
    'bifes', 'callia', 'caliia', 'entrega', 'distribucion', 'distribución',
    'logistica', 'logística', 'remito', 'despacho'
  ])) return 'Desvío de Logística';

  if (hasAny([
    'sin rotular', 'falta rotulacion', 'falta rotulación', 'rotulacion', 'rotulación', 'rotulo', 'rótulo',
    'sin identificar', 'trazabilidad', 'vencimiento', 'fecha de vencimiento', 'fecha de elaboracion',
    'fecha de elaboración', 'temperatura fuera de rango', 'sin registro de temperatura',
    'alimentos', 'comida', 'producto no conforme', 'contaminacion', 'contaminación',
    'contaminado', 'contaminada', 'sucio', 'sucia', 'sucios', 'sucias', 'restos de alimentos',
    'charcos', 'higiene', 'falta limpieza', 'residuos', 'basura', 'plaga', 'plagas', 'manipulacion',
    'manipulación', 'elementos sucios', 'instalaciones sucias', 'carteleria de producto no conforme',
    'cartelería de producto no conforme'
  ])) return 'Desvío de Inocuidad';

  if (hasAny([
    'mal estado', 'defectuoso', 'defectuosa', 'producto defectuoso', 'presentacion', 'presentación',
    'mala presentacion', 'mala presentación', 'gramaje', 'peso incorrecto', 'porcion incorrecta',
    'porción incorrecta', 'textura', 'sabor', 'color', 'aspecto', 'calidad', 'envase dañado',
    'envase roto', 'bandeja rota', 'bandejas rotas', 'sin integridad', 'envases sin integridad'
  ])) return 'Desvío de Inocuidad';

  if (hasAny(['falta de orden', 'falta orden', 'desorden', 'desordenado', 'desordenada', 'desordenados', 'desordenadas'])) {
    return 'Desvío de Inocuidad';
  }

  if (tipo === 'NC' && containsAny(iso, [
    '8.2 prp limpieza',
    '8.2 prp higiene',
    '8.2 prp identificacion',
    '8.2 prp identificación',
    '8.2 prp manejo residuos',
    '8.5.2 trazabilidad',
    '8.7 control de salidas no conformes'
  ])) return 'Desvío de Inocuidad';

  if (tipo === 'NC' && iso.includes('8.5.1 control operacional') && hasAny([
    'temperatura', 'registro', 'control sanitario', 'inocuidad', 'heladera', 'camara', 'cámara', 'freezer'
  ])) return 'Desvío de Inocuidad';

  if (['NC', 'OBS', 'OM'].includes(tipo) || resultado === 'No conforme' || resultado === 'Observación' || resultado === 'Oportunidad de mejora') {
    return 'Desvío de Inocuidad';
  }

  return 'Revisar manualmente';
}

function normalizeToTriadClassification({ categoriaDesvio = '', resultadoClasificado = '', tipoDesvio = '' }) {
  const categoria = normalizeCellValue(categoriaDesvio).trim();
  if (categoria === 'Desvío Legal') return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: 'Desvío Legal' };
  if (categoria === 'Desvío de Logística') return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: 'Desvío de Logística' };
  if (categoria === 'Desvío de Inocuidad') return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: 'Desvío de Inocuidad' };

  const tipo = normalizeCellValue(tipoDesvio).trim();
  if (['NC', 'OBS', 'OM'].includes(tipo)) return { resultadoClasificado, tipoDesvio: tipo, categoriaDesvio: 'Desvío de Inocuidad' };
  if (tipo === '-') return { resultadoClasificado, tipoDesvio: '-', categoriaDesvio: categoria || 'Conforme' };

  return { resultadoClasificado, tipoDesvio, categoriaDesvio };
}

function mapTipoFromCategoria(categoriaDesvio = '', fallbackTipo = '') {
  const categoria = normalizeCellValue(categoriaDesvio).trim();
  if (categoria === 'Desvío de Inocuidad') return 'IN';
  if (categoria === 'Desvío Legal') return 'LE';
  if (categoria === 'Desvío de Logística') return 'LGT';
  return normalizeCellValue(fallbackTipo).trim();
}

function hasStrongNcIndicatorForGovernance(text = '') {
  return hasAnyIsoTerm(text, [
    'falta', 'faltante', 'ausencia', 'ausente', 'inexistente', 'sin', 'vencido', 'vencida', 'no presenta', 'incumple', 'incumplimiento', 'obligatorio', 'requerido', 'critico', 'critica'
  ]);
}

function hasOmIndicatorForGovernance(text = '') {
  return hasAnyIsoTerm(text, [
    'oportunidad de mejora', 'mejorar', 'mejora', 'desactualizado', 'desactualizada', 'actualizar', 'reforzar', 'revisar', 'optimizar', 'sugerencia'
  ]);
}

function applyGovernanceTypeAndCategory({
  hallazgoDetectado = '',
  actividadRealizada = '',
  areaClasificada = '',
  resultadoClasificado = '',
  tipoDesvio = '',
  iso22000 = '',
  categoriaDesvio = ''
}) {
  const text = normalizeIncidentText([hallazgoDetectado, actividadRealizada, areaClasificada].filter(Boolean).join(' | '));
  if (!text || isExplicitNoFindingText(text)) return { resultadoClasificado, tipoDesvio, iso22000, categoriaDesvio };

  const hasCompetenciaLegal = hasAnyIsoTerm(text, [
    'carnet de manipulador', 'carne de manipulador', 'manipulador de alimentos', 'carnet sanitario', 'libreta sanitaria', 'carnet vencido', 'carnet faltante', 'sin carnet', 'no presenta carnet', 'personal sin carnet'
  ]);
  const hasConcienciaCapacitacion = hasAnyIsoTerm(text, [
    'capacitacion', 'capacitaciones', 'personal no capacitado', 'falta de capacitacion', 'capacitacion vencida', 'capacitacion desactualizada', 'bpm', 'buenas practicas de manufactura', 'poe', 'poes', 'procedimiento operativo estandarizado', 'toma de conciencia', 'induccion', 'entrenamiento'
  ]);
  const hasInformacionDocumentada = hasAnyIsoTerm(text, [
    'procedimiento documentado', 'falta procedimiento', 'falta de procedimiento', 'procedimiento inexistente', 'procedimiento desactualizado', 'documentacion desactualizada', 'informacion documentada', 'registros incompletos', 'registros ausentes', 'falta de registros', 'control de versiones', 'version desactualizada', 'documento sin actualizar', 'planilla incompleta', 'evidencia documental', 'sin evidencia documental'
  ]);

  const hasGovernanceSignal = hasCompetenciaLegal || hasConcienciaCapacitacion || hasInformacionDocumentada;
  if (!hasGovernanceSignal) return { resultadoClasificado, tipoDesvio, iso22000, categoriaDesvio };

  let nextTipo = tipoDesvio;
  let nextResultado = resultadoClasificado;
  let nextCategoria = categoriaDesvio;

  const strongNc = hasStrongNcIndicatorForGovernance(text);
  const omSignal = hasOmIndicatorForGovernance(text);

  if (nextTipo !== 'NC') {
    if (hasCompetenciaLegal || strongNc) {
      nextTipo = 'NC';
      nextResultado = 'No conforme';
    } else if (hasConcienciaCapacitacion || hasInformacionDocumentada || omSignal) {
      nextTipo = 'OM';
      nextResultado = 'Oportunidad de mejora';
    }
  }

  if (hasCompetenciaLegal) nextCategoria = 'Desvío Legal';

  const nextIso = mergeCompositeIsoLabels({
    iso22000,
    hallazgoDetectado,
    actividadRealizada,
    areaClasificada
  });

  return {
    resultadoClasificado: nextResultado,
    tipoDesvio: nextTipo,
    iso22000: nextIso,
    categoriaDesvio: nextCategoria
  };
}

export {
  classifyCategoriaDesvio,
  normalizeToTriadClassification,
  mapTipoFromCategoria,
  hasStrongNcIndicatorForGovernance,
  hasOmIndicatorForGovernance,
  applyGovernanceTypeAndCategory
};
