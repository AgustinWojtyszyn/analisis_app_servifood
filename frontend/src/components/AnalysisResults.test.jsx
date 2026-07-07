import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/analysisResultsExcel.js', () => ({
  downloadAnalysisResultsWorkbook: vi.fn().mockResolvedValue(undefined)
}));

const { downloadAnalysisResultsWorkbook } = await import('../lib/analysisResultsExcel.js');
const { default: AnalysisResults } = await import('./AnalysisResults.jsx');

function buildRecord(index, classification = 'Calidad') {
  return {
    fecha: `2026-06-${String(index).padStart(2, '0')}`,
    areaSector: index % 2 ? 'Depósito' : 'Área fría',
    desvioDetectado: `Desvío ${classification} ${index}`,
    clasificacionDesvio: classification,
    tipoDesvioOrigen: 'Interno',
    accionInmediata: 'Acción inmediata',
    accionCorrectiva: 'Acción correctiva',
    relacionIso22000: '8.5.1 Control operacional',
    estadoAcciones: 'Abierto'
  };
}

describe('AnalysisResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exporta todos los registros filtrados y no solo la página visible', async () => {
    const records = [
      ...Array.from({ length: 15 }, (_, index) => buildRecord(index + 1, 'Calidad')),
      ...Array.from({ length: 3 }, (_, index) => buildRecord(index + 16, 'Logística'))
    ];

    render(<AnalysisResults records={records} analysisId="analysis-1" />);

    fireEvent.click(screen.getByRole('tab', { name: /Calidad/i }));
    fireEvent.click(screen.getByText('Sección avanzada'));
    fireEvent.change(screen.getByLabelText('Exportación'), {
      target: { value: 'filtered' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Exportar Calidad/i }));

    await waitFor(() => {
      expect(downloadAnalysisResultsWorkbook).toHaveBeenCalledTimes(1);
    });

    const [{ rows, fileName }] = downloadAnalysisResultsWorkbook.mock.calls[0];
    expect(rows).toHaveLength(15);
    expect(fileName).toBe('analisis_desvio_calidad.xlsx');
    expect(rows.every((row) => row['Clasificación del desvío'] === 'Calidad')).toBe(true);
  });
});
