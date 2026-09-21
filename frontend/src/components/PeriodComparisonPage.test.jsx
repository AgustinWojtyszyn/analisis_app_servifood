import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PeriodComparisonPage from './PeriodComparisonPage';
import { compareAnalysisPeriods } from '../services/analysis';

vi.mock('../services/analysis', () => ({
  compareAnalysisPeriods: vi.fn()
}));

const comparisonPayload = {
  periodA: {
    range: { from: '2026-09-01', to: '2026-09-19', days: 19 },
    metrics: {
      totalAnalyses: 1,
      totalDesvios: 7,
      conformityRate: 50,
      totalNC: 7,
      totalOBS: 0,
      actionClosureRate: 0,
      totalRecords: 14,
      byCategoria: { Calidad: 7 },
      byArea: { 'Área caliente': 4 }
    }
  },
  periodB: {
    range: { from: '2026-08-01', to: '2026-08-30', days: 30 },
    metrics: {
      totalAnalyses: 0,
      totalDesvios: 0,
      conformityRate: 0,
      totalNC: 0,
      totalOBS: 0,
      actionClosureRate: 0,
      totalRecords: 0,
      byCategoria: {},
      byArea: {}
    }
  },
  changes: {
    totalDesvios: { current: 7, previous: 0, absolute: 7, percentage: null, direction: 'up' },
    conformityRate: { current: 50, previous: 0, absolute: 50, percentage: null, direction: 'up' },
    totalNC: { current: 7, previous: 0, absolute: 7, percentage: null, direction: 'up' },
    totalOBS: { current: 0, previous: 0, absolute: 0, percentage: 0, direction: 'same' },
    actionClosureRate: { current: 0, previous: 0, absolute: 0, percentage: 0, direction: 'same' },
    totalRecords: { current: 14, previous: 0, absolute: 14, percentage: null, direction: 'up' }
  },
  insights: [
    { key: 'test', tone: 'negative', text: 'Se detectó un cambio.' }
  ]
};

beforeEach(() => {
  vi.clearAllMocks();
});

test('starts at zero without requesting a comparison', () => {
  render(<PeriodComparisonPage />);

  expect(compareAnalysisPeriods).not.toHaveBeenCalled();
  expect(screen.getAllByText('Sin confirmar')).toHaveLength(6);
  expect(screen.getByText(/Los resultados permanecen en 0 hasta confirmar/i)).toBeInTheDocument();
});

test('only loads comparison data after explicit confirmation', async () => {
  compareAnalysisPeriods.mockResolvedValue(comparisonPayload);
  render(<PeriodComparisonPage />);

  fireEvent.click(screen.getByRole('button', { name: 'Comparar períodos' }));

  await waitFor(() => expect(compareAnalysisPeriods).toHaveBeenCalledTimes(1));
  expect(await screen.findByText('14')).toBeInTheDocument();
  expect(screen.getByText('Se detectó un cambio.')).toBeInTheDocument();
});

test('changing a date invalidates the previous result and returns to zero', async () => {
  compareAnalysisPeriods.mockResolvedValue(comparisonPayload);
  render(<PeriodComparisonPage />);

  fireEvent.click(screen.getByRole('button', { name: 'Comparar períodos' }));
  expect(await screen.findByText('14')).toBeInTheDocument();

  fireEvent.change(screen.getAllByLabelText('Desde')[0], {
    target: { value: '2026-09-02' }
  });

  expect(screen.queryByText('14')).not.toBeInTheDocument();
  expect(screen.getAllByText('Sin confirmar')).toHaveLength(6);
  expect(compareAnalysisPeriods).toHaveBeenCalledTimes(1);
});

test('reset clears confirmed results without launching another request', async () => {
  compareAnalysisPeriods.mockResolvedValue(comparisonPayload);
  render(<PeriodComparisonPage />);

  fireEvent.click(screen.getByRole('button', { name: 'Comparar períodos' }));
  expect(await screen.findByText('14')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));

  expect(screen.queryByText('14')).not.toBeInTheDocument();
  expect(screen.getAllByText('Sin confirmar')).toHaveLength(6);
  expect(compareAnalysisPeriods).toHaveBeenCalledTimes(1);
});
