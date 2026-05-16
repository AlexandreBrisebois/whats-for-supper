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

import { createRecipe, searchRecipes, parseRecipeBundleFile } from './recipes';

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

    const result = await searchRecipes({ query: 'chicken', mode: 'standard', limit: 5 });

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

    const result = await searchRecipes({ query: 'chicken', mode: 'standard', limit: 5 });

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

    const recovered = await searchRecipes({ query: 'lasagna', mode: 'standard', limit: 5 });
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

    const emptyMarker = await searchRecipes({ query: 'missing', mode: 'standard', limit: 5 });
    expect(emptyMarker.topPick).toBeNull();
  });
});

describe('parseRecipeBundleFile', () => {

  it('preserves already structured HowToSections', async () => {
    const structuredBundle = {
      version: '1.1',
      recipe: {
        name: 'Structured Recipe',
        ingredients: ['Item 1'],
        instructions: [
          {
            name: 'The Base',
            itemListElement: [{ text: 'Mix it' }],
          },
        ],
        isSynthesized: true,
        notes: 'Good for lunch',
        rating: 3,
      },
      info: {
        exportedAtUtc: '2026-05-15T10:00:00Z',
        bundleSource: 'wfs-share',
      },
      hero: null,
      originals: [],
    };

    const file = new File([JSON.stringify(structuredBundle)], 'structured.recipe', {
      type: 'application/json',
    });
    const result = await parseRecipeBundleFile(file);

    expect(result.recipe?.instructions).toEqual([
      {
        '@type': 'HowToSection',
        name: 'The Base',
        itemListElement: [
          {
            '@type': 'HowToStep',
            text: 'Mix it',
          },
        ],
      },
    ]);
    expect(result.recipe?.notes).toBe('Good for lunch');
    expect(result.recipe?.rating).toBe(3);
  });

  it('throws error for invalid files', async () => {
    const file = new File(['not-json'], 'broken.recipe', { type: 'application/json' });
    await expect(parseRecipeBundleFile(file)).rejects.toThrow(
      'This .recipe file could not be read.'
    );
  });

  it('throws error if structured instructions are missing itemListElement', async () => {
    const invalidBundle = {
      version: '1.0',
      recipe: {
        name: 'Invalid Recipe',
        ingredients: ['Item 1'],
        instructions: [
          {
            name: 'Missing Steps',
            // itemListElement is missing
          },
        ],
        isSynthesized: false,
      },
      info: {
        exportedAtUtc: '2026-05-14T16:00:00Z',
        bundleSource: 'wfs-share',
      },
      hero: null,
      originals: [],
    };

    const file = new File([JSON.stringify(invalidBundle)], 'invalid.recipe', {
      type: 'application/json',
    });
    await expect(parseRecipeBundleFile(file)).rejects.toThrow('This .recipe file is not valid.');
  });

  it('handles @type field in structured instructions', async () => {
    const structuredBundle = {
      version: '1.0',
      recipe: {
        name: 'Type Recipe',
        ingredients: ['Item 1'],
        instructions: [
          {
            '@type': 'HowToSection',
            name: 'Section 1',
            itemListElement: [
              {
                '@type': 'HowToStep',
                text: 'Step 1',
              },
            ],
          },
        ],
        isSynthesized: false,
      },
      info: {
        exportedAtUtc: '2026-05-14T16:00:00Z',
        bundleSource: 'wfs-share',
      },
      hero: null,
      originals: [],
    };

    const file = new File([JSON.stringify(structuredBundle)], 'type.recipe', {
      type: 'application/json',
    });
    const result = await parseRecipeBundleFile(file);

    expect(result.recipe?.instructions?.[0]).toMatchObject({
      '@type': 'HowToSection',
      name: 'Section 1',
    });
    expect(result.recipe?.instructions?.[0].itemListElement?.[0]).toMatchObject({
      '@type': 'HowToStep',
      text: 'Step 1',
    });
  });

  it('is resilient to missing optional fields in recipe', async () => {
    const minimalBundle = {
      version: '1.0',
      recipe: {
        name: 'Minimal Recipe',
        ingredients: ['Item 1'],
        instructions: [
          {
            name: 'Instructions',
            itemListElement: [{ text: 'Step 1' }],
          },
        ],
        isSynthesized: false,
        // Optional fields like description, notes, rating are missing
      },
      info: {
        exportedAtUtc: '2026-05-14T16:00:00Z',
        bundleSource: 'wfs-share',
      },
      hero: null,
      originals: [],
    };

    const file = new File([JSON.stringify(minimalBundle)], 'minimal.recipe', {
      type: 'application/json',
    });
    const result = await parseRecipeBundleFile(file);

    expect(result.recipe?.name).toBe('Minimal Recipe');
    expect(result.recipe?.notes).toBeNull();
    expect(result.recipe?.rating).toBeNull();
    expect(result.recipe?.description).toBeNull();
  });
});
