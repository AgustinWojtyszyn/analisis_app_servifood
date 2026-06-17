import { describe, expect, it } from 'vitest';
import { MANUAL_ISO_VALUE, isIsoManualValue, readCanonicalIso } from './isoFields.js';

describe('isoFields', () => {
  it('lee el campo canónico relacionIso22000', () => {
    expect(readCanonicalIso({
      relacionIso22000: '8.5 HACCP',
      iso22000: '8.1 Planificación'
    })).toBe('8.5 HACCP');
  });

  it('usa iso22000 como fallback legado', () => {
    expect(readCanonicalIso({ iso22000: '8.4 Proveedores' })).toBe('8.4 Proveedores');
  });

  it('prioriza el canónico cuando ambos campos divergen', () => {
    expect(readCanonicalIso({
      relacionIso22000: '8.1 Planificación',
      iso22000: 'Revisar manualmente'
    })).toBe('8.1 Planificación');
  });

  it('devuelve revisión manual cuando no hay valor ISO', () => {
    expect(readCanonicalIso({})).toBe(MANUAL_ISO_VALUE);
  });

  it('detecta revisión manual con variantes acentuadas y legado', () => {
    expect(isIsoManualValue('Revisar manualmente')).toBe(true);
    expect(isIsoManualValue('Revisión manual requerida')).toBe(true);
    expect(isIsoManualValue('8.5 HACCP')).toBe(false);
  });
});
