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
});
