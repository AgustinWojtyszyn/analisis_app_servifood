import { describe, expect, it } from 'vitest';
import { buildChartsData, normalizeCategoryKey } from './charts.utils.js';

describe('charts category normalization', () => {
  it('normalizes new classification categories with spacing and casing variants', () => {
    expect(normalizeCategoryKey('  INCUMPLIMIENTO de PROCEDIMIENTO  ')).toBe('Incumplimientos de procedimiento');
    expect(normalizeCategoryKey('Procedimiento')).toBe('Incumplimientos de procedimiento');
    expect(normalizeCategoryKey('medioambiente')).toBe('Medio ambiente');
    expect(normalizeCategoryKey('Ambiental')).toBe('Medio ambiente');
  });

  it('includes new categories in classification chart data without dropping existing categories', () => {
    const data = buildChartsData({
      records: [
        { clasificacionDesvio: 'Incumplimientos de procedimiento' },
        { clasificacionDesvio: 'Medio ambiente' },
        { clasificacionDesvio: 'Inocuidad' },
        { clasificacionDesvio: 'Logística' },
        { clasificacionDesvio: 'Calidad' }
      ],
      summary: {}
    });

    const values = Object.fromEntries(data.desviosPorCategoria.map((item) => [item.name, item.value]));
    expect(values['Incumplimientos de procedimiento']).toBe(1);
    expect(values['Medio ambiente']).toBe(1);
    expect(values.Inocuidad).toBe(1);
    expect(values['Logística']).toBe(1);
    expect(values.Calidad).toBe(1);
  });

  it('keeps unknown categories from summary data after known categories', () => {
    const data = buildChartsData({
      records: [],
      summary: {
        byCategoria: {
          Inocuidad: 2,
          'Categoría futura': 3
        }
      }
    });

    expect(data.desviosPorCategoria).toEqual([
      { name: 'Inocuidad', value: 2 },
      { name: 'Categoría futura', value: 3 }
    ]);
  });
});
