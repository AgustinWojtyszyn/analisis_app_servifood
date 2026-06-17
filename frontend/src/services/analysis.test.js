import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    }
  }
}));

const { supabase } = await import('../lib/supabaseClient');
const {
  deleteAllAnalyses,
  deleteAnalysesBulk,
  getAnalysisHistory,
  reprocessIsoAllAnalyses
} = await import('./analysis.js');

function mockSession(token = 'token-123') {
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { access_token: token } }
  });
}

function mockJsonResponse(payload, init = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status || 200,
    json: vi.fn().mockResolvedValue(payload)
  };
}

describe('analysis service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession();
    globalThis.fetch = vi.fn().mockResolvedValue(mockJsonResponse({ success: true }));
  });

  it('construye la llamada principal de historial con query y autorización', async () => {
    globalThis.fetch.mockResolvedValueOnce(mockJsonResponse([{ id: 'a1' }]));

    const result = await getAnalysisHistory({ page: 2, status: 'archived', empty: '' });

    expect(result).toEqual({ data: [{ id: 'a1' }], error: null });
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/analysis/history?page=2&status=archived', {
      cache: 'no-store',
      headers: {
        Authorization: 'Bearer token-123'
      }
    });
  });

  it('ejecuta reproceso ISO debug con PATCH', async () => {
    await reprocessIsoAllAnalyses({ debug: true });

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/analysis/reprocess-iso-all?debug=1', {
      method: 'PATCH',
      cache: 'no-store',
      headers: {
        Authorization: 'Bearer token-123'
      }
    });
  });

  it('ejecuta borrado masivo con ids JSON', async () => {
    await deleteAnalysesBulk(['a1', 'a2']);

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/analysis/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ ids: ['a1', 'a2'] }),
      cache: 'no-store',
      headers: {
        Authorization: 'Bearer token-123',
        'Content-Type': 'application/json'
      }
    });
  });

  it('ejecuta borrado de análisis procesados con confirmación y usuario opcional', async () => {
    await deleteAllAnalyses('BORRAR', { userId: ' user-1 ' });

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/analysis/all', {
      method: 'DELETE',
      body: JSON.stringify({ confirmText: 'BORRAR', userId: 'user-1' }),
      cache: 'no-store',
      headers: {
        Authorization: 'Bearer token-123',
        'Content-Type': 'application/json'
      }
    });
  });

  it('devuelve error user-friendly cuando el backend no envía detalle', async () => {
    globalThis.fetch.mockResolvedValueOnce(mockJsonResponse({}, { ok: false, status: 500 }));

    await expect(deleteAnalysesBulk(['a1'])).rejects.toThrow('Error en la solicitud');
  });
});
