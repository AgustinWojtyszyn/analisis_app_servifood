import { buildSafeRefinementResult } from './classificationRefiner/defaultResult.js';

export function refinePreClassification(input) {
  // Modo seguro: no reclasificar. Solo completar campos vacíos.
  return buildSafeRefinementResult(input);
}
