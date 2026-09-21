import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardHome from './DashboardHome';
import { getCertifications } from '../services/certificationService';
import { getExecutiveDashboard } from '../services/analysis';

vi.mock('../services/certificationService', () => ({ getCertifications: vi.fn() }));
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
  expect(screen.getByRole('button', { name: 'Actualizar dashboard' })).toBeDisabled();
  expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  expect(screen.queryByText('0')).not.toBeInTheDocument();
});

test('empty data explains coverage and navigates to source modules', async () => {
  getExecutiveDashboard.mockResolvedValue(emptyPayload());
  const onNavigate = vi.fn();
  render(<DashboardHome user={{ id: 'admin', name: 'Dirección' }} onNavigate={onNavigate} />);
  expect(await screen.findByText('Comparación pendiente')).toBeInTheDocument();
  expect(screen.getByText('Sin registros')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Análisis anual/ }));
  expect(onNavigate).toHaveBeenCalledWith('annualAnalysis');
  fireEvent.click(screen.getByRole('button', { name: /Ver todos/ }));
  expect(onNavigate).toHaveBeenCalledWith('certifications');
});

test('network error allows recovery with retry', async () => {
  getExecutiveDashboard.mockRejectedValueOnce(new Error('Error de red')).mockResolvedValueOnce(emptyPayload());
  render(<DashboardHome user={{ id: 'admin' }} />);
  expect(await screen.findByText('Error de red')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByText('Comparación pendiente');
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
  expect(await screen.findByText('12')).toBeInTheDocument();
  expect(screen.getByText('Agenda no disponible.')).toBeInTheDocument();
  expect(screen.getByText('2 declaradas vencidas')).toBeInTheDocument();
});

test('unmount aborts in-flight requests', async () => {
  getExecutiveDashboard.mockReturnValue(new Promise(() => {}));
  const { unmount } = render(<DashboardHome user={{ id: 'admin' }} />);
  await waitFor(() => expect(getExecutiveDashboard).toHaveBeenCalledOnce());
  const { signal } = getExecutiveDashboard.mock.calls[0][0];
  unmount();
  expect(signal.aborted).toBe(true);
});


test('attention panel shows the three highest-priority signals', async () => {
  const data = emptyPayload();
  data.alerts = [
    { id: 'expired', severity: 'error', title: 'Repetición de vencidas', detail: 'Resolver', target: 'certifications' },
    ...Array.from({ length: 4 }, (_, index) => ({ id: `signal-${index}`, severity: 'warning', title: `Señal ${index}`, detail: 'Revisar', target: 'annualAnalysis' }))
  ];
  getExecutiveDashboard.mockResolvedValue(data);
  render(<DashboardHome user={{ id: 'admin' }} />);
  expect(await screen.findByText('Repetición de vencidas')).toBeInTheDocument();
  expect(screen.getByText('Señal 0')).toBeInTheDocument();
  expect(screen.getByText('Señal 1')).toBeInTheDocument();
  expect(screen.queryByText('Señal 2')).not.toBeInTheDocument();
});

test('certification KPI includes expired and upcoming, with expired names in the agenda', async () => {
  const data = emptyPayload();
  data.certifications = { total: 10, count: 3, expired: 6, urgent: [], invalidDates: 0 };
  getExecutiveDashboard.mockResolvedValue(data);
  getCertifications.mockResolvedValue({ items: [{ id: 'iso', name: 'ISO 22000', daysUntilExpiration: -8, expirationDate: '2026-09-13' }] });
  render(<DashboardHome user={{ id: 'admin' }} />);
  expect(await screen.findByText('9')).toBeInTheDocument();
  expect(await screen.findByText('ISO 22000')).toBeInTheDocument();
  expect(screen.getAllByText('6 vencidas')).toHaveLength(1);
  expect(screen.getByText('Vencida')).toBeInTheDocument();
});

test('certification detail failure preserves summary and provides a module link', async () => {
  const data = emptyPayload();
  data.certifications = { total: 2, count: 0, expired: 2, urgent: [], invalidDates: 0 };
  getExecutiveDashboard.mockResolvedValue(data);
  getCertifications.mockRejectedValue(new Error('Unavailable'));
  render(<DashboardHome user={{ id: 'admin' }} />);
  expect(await screen.findByRole('button', { name: /Consultar certificaciones vencidas/ })).toBeInTheDocument();
  expect(screen.getByText('2 vencidas')).toBeInTheDocument();
});

test('current leading sector is surfaced as the monthly focus', async () => {
  const data = emptyPayload();
  data.deviations.current = { label: 'septiembre de 2026', total: 12 };
  data.deviations.topSectors = [{ key: 'cocina', name: 'Cocina', value: 5, share: 41.7 }];
  getExecutiveDashboard.mockResolvedValue(data);
  render(<DashboardHome user={{ id: 'admin' }} />);
  expect(await screen.findByText('Foco del mes')).toBeInTheDocument();
  expect(screen.getByText('Cocina')).toBeInTheDocument();
  expect(screen.getByText(/5 desvíos/)).toBeInTheDocument();
});
