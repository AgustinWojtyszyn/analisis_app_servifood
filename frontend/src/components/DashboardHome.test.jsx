import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardHome from './DashboardHome';
import { getExecutiveDashboard } from '../services/analysis';

vi.mock('../services/analysis', () => ({ getExecutiveDashboard: vi.fn() }));
const emptyPayload = () => ({
  generatedAt: '2026-09-21T15:00:00Z', errors: {},
  deviations: {
    current: { label: 'septiembre de 2026', total: null }, previous: { label: 'agosto de 2026' },
    months: [], topSectors: [], sources: [], change: null
  },
  nonconformities: { total: 0, open: 0, overdue: 0, unknown: 0 },
  certifications: { total: 0, count: 0, urgent: [], expired: 0, invalidDates: 0 },
  alerts: [{ id: 'missing', severity: 'info', title: 'Faltan registros anuales', detail: 'Revisá la cobertura.', target: 'annualAnalysis' }]
});

beforeEach(() => vi.clearAllMocks());

test('loading never presents invented zero counts', () => {
  getExecutiveDashboard.mockReturnValue(new Promise(() => {}));
  const { container } = render(<DashboardHome user={{ id: 'admin' }} />);
  expect(screen.getByText('Consultando fuentes…')).toBeInTheDocument();
  expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  expect(screen.queryByText('0')).not.toBeInTheDocument();
});

test('empty data explains coverage and navigates to source modules', async () => {
  getExecutiveDashboard.mockResolvedValue(emptyPayload());
  const onNavigate = vi.fn();
  render(<DashboardHome user={{ id: 'admin', name: 'Dirección' }} onNavigate={onNavigate} />);
  expect(await screen.findByText('Información por completar')).toBeInTheDocument();
  expect(screen.getByText('Sin registros persistidos')).toBeInTheDocument();
  expect(screen.getByText('Sin base comparable')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Faltan registros anuales' }));
  expect(onNavigate).toHaveBeenCalledWith('annualAnalysis');
  fireEvent.click(screen.getByRole('button', { name: 'Ver todos' }));
  expect(onNavigate).toHaveBeenCalledWith('certifications');
});

test('network error allows recovery with retry', async () => {
  getExecutiveDashboard.mockRejectedValueOnce(new Error('Error de red')).mockResolvedValueOnce(emptyPayload());
  render(<DashboardHome user={{ id: 'admin' }} />);
  expect(await screen.findByText('Error de red')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByText('Información por completar');
  expect(screen.queryByText('Error de red')).not.toBeInTheDocument();
  expect(getExecutiveDashboard).toHaveBeenCalledTimes(2);
});

test('partial source failure preserves NC counts and explicitly marks unavailable information', async () => {
  const data = emptyPayload();
  data.errors.certifications = 'No se pudieron consultar las certificaciones';
  data.certifications = null;
  data.nonconformities = { total: 17, open: 12, overdue: 2, unknown: 1 };
  data.alerts = [{ id: 'nc-overdue', severity: 'error', title: '2 NC declaradas vencidas', detail: 'Revisá los casos.', target: 'customerNonconformities' }];
  getExecutiveDashboard.mockResolvedValue(data);
  render(<DashboardHome user={{ id: 'admin' }} />);
  expect(await screen.findByText('Atención prioritaria')).toBeInTheDocument();
  expect(screen.getByText('12')).toBeInTheDocument();
  expect(screen.getByText('Agenda no disponible')).toBeInTheDocument();
  expect(screen.getByText(/1 NC sin estado reconocido/)).toBeInTheDocument();
});

test('unmount aborts in-flight requests', async () => {
  getExecutiveDashboard.mockReturnValue(new Promise(() => {}));
  const { unmount } = render(<DashboardHome user={{ id: 'admin' }} />);
  await waitFor(() => expect(getExecutiveDashboard).toHaveBeenCalledOnce());
  const { signal } = getExecutiveDashboard.mock.calls[0][0];
  unmount();
  expect(signal.aborted).toBe(true);
});
