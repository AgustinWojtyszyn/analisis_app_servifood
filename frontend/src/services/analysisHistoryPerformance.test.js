import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    }
  }
}));

const { supabase } = await import('../lib/supabaseClient');
const { getAnalysisHistory } = await import('./analysis.js');

function mockJsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(payload)
  };
}

describe('history request performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } }
    });
    globalThis.fetch = vi.fn().mockResolvedValue(mockJsonResponse({ data: [] }));
  });

  it('agrupa búsquedas rápidas y consulta solo el último texto', async () => {
    vi.useFakeTimers();
    try {
      const first = getAnalysisHistory({ page: 1, search: 'sept' });
      const second = getAnalysisHistory({ page: 1, search: 'septiembre' });

      expect(globalThis.fetch).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(250);
      const [firstResult, secondResult] = await Promise.all([first, second]);

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/analysis/history?page=1&search=septiembre', {
        cache: 'no-store',
        headers: { Authorization: 'Bearer token-123' }
      });
      expect(firstResult).toEqual(secondResult);
    } finally {
      vi.useRealTimers();
    }
  });

  it('mantiene separados dos lotes cuando la búsqueda anterior sigue en vuelo', async () => {
    vi.useFakeTimers();
    try {
      let resolveFirstFetch;
      globalThis.fetch = vi.fn()
        .mockImplementationOnce(() => new Promise((resolve) => {
          resolveFirstFetch = () => resolve(mockJsonResponse({ marker: 'old' }));
        }))
        .mockResolvedValueOnce(mockJsonResponse({ marker: 'new' }));

      const first = getAnalysisHistory({ search: 'viejo' });
      await vi.advanceTimersByTimeAsync(250);

      const second = getAnalysisHistory({ search: 'nuevo' });
      await vi.advanceTimersByTimeAsync(250);
      const secondResult = await second;

      resolveFirstFetch();
      const firstResult = await first;

      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(firstResult.data).toEqual({ marker: 'old' });
      expect(secondResult.data).toEqual({ marker: 'new' });
    } finally {
      vi.useRealTimers();
    }
  });
});
