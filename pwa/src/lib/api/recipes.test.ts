import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetState, fetchMock } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
  fetchMock: vi.fn(),
}));

const recipesApiMocks = vi.hoisted(() => {
  const searchPost = vi.fn();
  const byIdGet = vi.fn();
  const byIdDelete = vi.fn();
  const byIdPatch = vi.fn();
  const recipesGet = vi.fn();
  const captureUrlPost = vi.fn();
  const recommendationsGet = vi.fn();

  return {
    searchPost,
    byIdGet,
    byIdDelete,
    byIdPatch,
    recipesGet,
    captureUrlPost,
    recommendationsGet,
  };
});

vi.mock('@/store/familyStore', () => ({
  useFamilyStore: {
    getState: mockGetState,
  },
}));

vi.mock('@/store/plannerStore', () => ({
  usePlannerStore: {
    getState: () => ({
      sseConnectionId: null,
      localMoveSeq: 0,
      confirmedMoveSeq: 0,
    }),
  },
}));

vi.mock('./api-client', () => ({
  apiClient: {
    api: {
      recipes: {
        byId: () => ({
          get: recipesApiMocks.byIdGet,
          delete: recipesApiMocks.byIdDelete,
          patch: recipesApiMocks.byIdPatch,
        }),
        get: recipesApiMocks.recipesGet,
        captureUrl: { post: recipesApiMocks.captureUrlPost },
        recommendations: { get: recipesApiMocks.recommendationsGet },
        search: { post: recipesApiMocks.searchPost },
      },
    },
  },
  requestAdapter: {
    baseUrl: 'http://localhost:5052',
  },
}));

import { createRecipe, searchRecipes } from './recipes';

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

describe('searchRecipes', () => {
  beforeEach(() => {
    recipesApiMocks.searchPost.mockReset();
    fetchMock.mockReset();
    mockGetState.mockReturnValue({ selectedFamilyMemberId: 'family-123' });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('posts the query to the search endpoint and normalizes the response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          topPick: {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Chicken Soup',
            imageUrl: 'https://example.com/chicken-soup.jpg',
            totalTime: '30 min',
            rating: 2,
            isDiscoverable: true,
            notes: 'weeknight staple',
            reasons: [{ source: 'name-match', label: 'Name matches your search' }],
            plannerFitNote: null,
          },
          results: [
            {
              id: '22222222-2222-2222-2222-222222222222',
              name: 'Chicken Pasta',
              imageUrl: 'https://example.com/chicken-pasta.jpg',
              totalTime: '25 min',
              rating: 1,
              isDiscoverable: true,
              notes: null,
              reasons: [{ source: 'name-match', label: 'Name matches your search' }],
              plannerFitNote: null,
            },
          ],
          appliedFilters: {},
          searchMode: 'standard',
          resultPath: 'lexical-only',
        },
      }),
    });

    const result = await searchRecipes({
      query: 'chicken',
      mode: 'standard',
      limit: 5,
      weekOffset: undefined,
      dayIndex: undefined,
      similarToRecipeId: undefined,
      pantrySnapshotId: undefined,
      filters: undefined,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5052/api/recipes/search',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Family-Member-Id': 'family-123',
        },
        body: JSON.stringify({ query: 'chicken', mode: 'standard', limit: 5 }),
      })
    );
    expect(result.topPick?.name).toBe('Chicken Soup');
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Chicken Pasta',
      totalTime: '25 min',
    });
    expect(result.resultPath).toBe('lexical-only');
  });

  it('also supports a direct RecipeSearchResponseDto shape', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        topPick: {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Chicken Soup',
          imageUrl: 'https://example.com/chicken-soup.jpg',
          totalTime: '30 min',
          rating: 2,
          isDiscoverable: true,
          notes: 'weeknight staple',
          reasons: [{ source: 'name-match', label: 'Name matches your search' }],
          plannerFitNote: null,
        },
        results: [],
        appliedFilters: {},
        searchMode: 'standard',
        resultPath: 'lexical-only',
      }),
    });

    const result = await searchRecipes({
      query: 'chicken',
      mode: 'standard',
      limit: 5,
      weekOffset: undefined,
      dayIndex: undefined,
      similarToRecipeId: undefined,
      pantrySnapshotId: undefined,
      filters: undefined,
    });

    expect(result.topPick?.name).toBe('Chicken Soup');
    expect(result.results).toEqual([]);
    expect(result.resultPath).toBe('lexical-only');
  });

  it('recovers topPick fields from additionalData and treats empty marker objects as null', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          topPick: {
            additionalData: {
              id: '33333333-3333-3333-3333-333333333333',
              name: 'Homemade Lasagna',
              imageUrl: 'https://example.com/lasagna.jpg',
              totalTime: '45 min',
              rating: 3,
              isDiscoverable: true,
              notes: null,
              reasons: [{ source: 'name-match', label: 'Name matches your search' }],
              plannerFitNote: null,
            },
          },
          results: [],
          appliedFilters: {},
          searchMode: 'standard',
          resultPath: 'lexical-only',
        },
      }),
    });

    const recovered = await searchRecipes({
      query: 'lasagna',
      mode: 'standard',
      limit: 5,
      weekOffset: undefined,
      dayIndex: undefined,
      similarToRecipeId: undefined,
      pantrySnapshotId: undefined,
      filters: undefined,
    });
    expect(recovered.topPick?.name).toBe('Homemade Lasagna');
    expect(recovered.topPick?.reasons[0]?.label).toBe('Name matches your search');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          topPick: { additionalData: {} },
          results: [],
          appliedFilters: {},
          searchMode: 'standard',
          resultPath: 'lexical-only',
        },
      }),
    });

    const emptyMarker = await searchRecipes({
      query: 'missing',
      mode: 'standard',
      limit: 5,
      weekOffset: undefined,
      dayIndex: undefined,
      similarToRecipeId: undefined,
      pantrySnapshotId: undefined,
      filters: undefined,
    });
    expect(emptyMarker.topPick).toBeNull();
  });
});
