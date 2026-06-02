import { normalizeCellValue, normalizeIncidentText } from '../../../analyzeExcel/normalizers.js';

function updateNegativeLeadContext({
  contextState,
  rawRecord,
  textForClassification,
  explicitNoFindingRow,
  explicitNegativeInRow,
  neutralTechnicalRow,
  hasRowContinuationSignalFn
}) {
  const shouldOpenNegativeLead = hasRowContinuationSignalFn(rawRecord.hallazgoDetectado)
    && (explicitNegativeInRow || /falta\s*[;:,]?\s*$/i.test(normalizeCellValue(rawRecord.hallazgoDetectado)));
  if (explicitNoFindingRow) {
    contextState.negativeLeadWindow = 0;
    contextState.leadTopicText = '';
  } else if (shouldOpenNegativeLead) {
    contextState.negativeLeadWindow = contextState.maxLeadWindow;
    contextState.leadTopicText = normalizeIncidentText(textForClassification);
  } else if (contextState.negativeLeadWindow > 0) {
    const rowHasOwnCompleteSignal = explicitNegativeInRow || !neutralTechnicalRow;
    if (rowHasOwnCompleteSignal) {
      contextState.negativeLeadWindow = 0;
      contextState.leadTopicText = '';
    } else {
      contextState.negativeLeadWindow -= 1;
    }
  }
}

export {
  updateNegativeLeadContext
};
