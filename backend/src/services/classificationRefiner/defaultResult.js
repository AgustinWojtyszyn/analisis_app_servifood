function buildSafeRefinementResult(input) {
  return {
    areaFinal: input?.areaDetectada || 'Área no identificada',
    resultadoFinal: input?.resultadoDetectado || 'Revisar manualmente',
    tipoFinal: input?.tipoDetectado || '-',
    isoFinal: input?.isoDetectado || 'Sin clasificar',
    accionInmediataFinal: input?.accionInmediataDetectada || '',
    accionCorrectivaFinal: input?.accionCorrectivaDetectada || '',
    cambioRealizado: false,
    explicacion: 'Refinador en modo sin override.',
    confianza: 'Media'
  };
}

export {
  buildSafeRefinementResult
};
