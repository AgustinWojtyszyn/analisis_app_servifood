import { describe, expect, it } from 'vitest';
import {
  buildCustomerNcRecordFromRawRow,
  countBy,
  detectCustomerNcHeaderRowFromRows,
  getCustomerNcWarnings,
  normalizeArea,
  normalizeMonth,
  normalizeStatus,
  sortMonthData
} from './customerNonconformities';

describe('customerNonconformities', () => {
  it('detects headers below administrative rows', () => {
    const rows = [
      ['Reporte de reclamos'],
      ['KPI 1 - Reclamos Mes'],
      ['Mes', 'Reclamo', 'Tipo de peligro', 'Severidad', 'Causa probable', 'Area', 'Cliente', 'ESTADO']
    ];

    const detected = detectCustomerNcHeaderRowFromRows(rows);

    expect(detected.rowIndex).toBe(2);
    expect(detected.columns).toMatchObject({
      month: 0,
      claim: 1,
      hazardType: 2,
      area: 5,
      status: 7
    });
  });

  it('normalizes areas, months and status values', () => {
    expect(normalizeArea(' Area Caliente ')).toBe('Área caliente');
    expect(normalizeArea('Área fria')).toBe('Área fría');
    expect(normalizeMonth(' abril ')).toBe('Abril');
    expect(normalizeStatus('CERRADO')).toBe('Cerrado');
    expect(normalizeStatus(' abierto ')).toBe('Abierto');
  });

  it('builds a normalized record from a row', () => {
    const columns = {
      month: 0,
      claim: 1,
      hazardType: 2,
      severity: 3,
      probableCause: 4,
      area: 5,
      client: 6,
      status: 7
    };

    const record = buildCustomerNcRecordFromRawRow(
      ['Abril', 'Pollo crudo/ Rosáceo', 'Cocción insuficiente', 'Mayor', 'Falta de cocción', 'Area caliente', 'Calidra', 'CERRADO'],
      columns,
      'No conformidades clientes.xlsx',
      '2026-06-29T00:00:00.000Z'
    );

    expect(record).toMatchObject({
      month: 'Abril',
      claim: 'Pollo Crudo/ Rosáceo',
      hazardType: 'Cocción Insuficiente',
      severity: 'Mayor',
      probableCause: 'Falta De Cocción',
      area: 'Área caliente',
      client: 'Calidra',
      status: 'Cerrado'
    });
  });

  it('warns when optional year/date columns are absent', () => {
    const warnings = getCustomerNcWarnings({
      month: 0,
      claim: 1,
      hazardType: 2,
      area: 3
    });

    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('columnas opcionales');
    expect(warnings[1]).toContain('año ni fecha exacta');
  });

  it('sorts month chart data by calendar order', () => {
    expect(sortMonthData([
      { name: 'Junio', value: 1 },
      { name: 'Abril', value: 2 },
      { name: 'Mayo', value: 1 }
    ])).toEqual([
      { name: 'Abril', value: 2 },
      { name: 'Mayo', value: 1 },
      { name: 'Junio', value: 1 }
    ]);
  });

  it('counts normalized grouped values', () => {
    expect(countBy([
      { area: 'Área caliente' },
      { area: 'Área fría' },
      { area: 'Área caliente' }
    ], 'area')).toEqual([
      { name: 'Área caliente', value: 2 },
      { name: 'Área fría', value: 1 }
    ]);
  });
});
