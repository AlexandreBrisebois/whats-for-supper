import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetState, fetchMock } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('@/store/familyStore', () => ({
  useFamilyStore: {
    getState: mockGetState,
  },
}));

vi.mock('./api-client', () => ({
  apiClient: {
    api: {
      recipes: {
        byId: () => ({ get: vi.fn(), delete: vi.fn(), patch: vi.fn() }),
        get: vi.fn(),
        captureUrl: { post: vi.fn() },
        recommendations: { get: vi.fn() },
      },
    },
  },
  requestAdapter: {
    baseUrl: 'http://localhost:5052',
  },
}));

import { createRecipe } from './recipes';

describe('createRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetState.mockReturnValue({ selectedFamilyMemberId: 'family-123' });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('returns the recipe id when the API responds with a top-level id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'recipe-top-level-id' }),
    });

    const result = await createRecipe(new FormData());

    expect(result).toEqual({ id: 'recipe-top-level-id' });
  });

  it('still supports the wrapped data.id response shape', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'recipe-wrapped-id' } }),
    });

    const result = await createRecipe(new FormData());

    expect(result).toEqual({ id: 'recipe-wrapped-id' });
  });
});
