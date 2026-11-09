import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadRecipeOriginal } from './recipes';

it('reads the authoritative zero image index from the upload response envelope', async () => {
  mockGetState.mockReturnValue({ selectedFamilyMemberId: 'member-id' });
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 0 } }) });
  try {
    expect(
      await uploadRecipeOriginal(
        'recipe-id',
        new File(['image'], 'photo.png', { type: 'image/png' })
      )
    ).toEqual({ id: 0 });
  } finally {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  }
});

const { mockGetState, fetchMock } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
  fetchMock: vi.fn(),
}));

const recipesApiMocks = vi.hoisted(() => {
  const searchPost = vi.fn();
  const byIdGet = vi.fn();
  const projectionGet = vi.fn();
  const previewGet = vi.fn();
  const byIdDelete = vi.fn();
  const byIdPatch = vi.fn();
  const recipesGet = vi.fn();
  const captureUrlPost = vi.fn();
  const recommendationsGet = vi.fn();

  return {
    searchPost,
    byIdGet,
    projectionGet,
    previewGet,
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
          ingredientProjection: { get: recipesApiMocks.projectionGet },
          ingredientPreview: { get: recipesApiMocks.previewGet },
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

import {
  getRecipe,
  getIngredientProjection,
  getIngredientPreview,
  createRecipe,
  updateRecipe,
  searchRecipes,
  parseRecipeBundleFile,
  createRecipeBundleFile,
} from './recipes';
import { builders } from '@/testing/builders';

import { JsonSerializationWriter } from '@microsoft/kiota-serialization-json';
import { serializeUpdateRecipeDto } from './generated/models';

describe('updateRecipe instruction serialization', () => {
  it.each([
    { instructions: ['Plain instruction', 'Second instruction'] },
    {
      instructions: [
        {
          '@type': 'HowToSection',
          name: 'Sauce',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Stir gently', position: 1, enabled: true, image: null },
          ],
        },
      ],
    },
    { instructions: [] },
  ])(
    'preserves instruction JSON through the generated serializer: $instructions',
    async ({ instructions }) => {
      recipesApiMocks.byIdPatch.mockClear();
      await updateRecipe('recipe-1', { recipeInstructions: instructions });
      const writer = new JsonSerializationWriter();
      writer.writeObjectValue(
        undefined,
        recipesApiMocks.byIdPatch.mock.calls[0][0],
        serializeUpdateRecipeDto
      );
      const wire = JSON.parse(new TextDecoder().decode(writer.getSerializedContent()));
      expect(wire).toEqual({ recipeInstructions: instructions });
    }
  );
});

describe('servings update serialization', () => {
  it.each([3, 2, 2147483647, undefined])('serializes an optional count %s', async (servings) => {
    recipesApiMocks.byIdPatch.mockClear();
    await updateRecipe('recipe-1', servings === undefined ? { name: 'Keep' } : { servings });
    const writer = new JsonSerializationWriter();
    writer.writeObjectValue(
      undefined,
      recipesApiMocks.byIdPatch.mock.calls[0][0],
      serializeUpdateRecipeDto
    );
    const wire = JSON.parse(new TextDecoder().decode(writer.getSerializedContent()));
    expect(wire).toEqual(servings === undefined ? { name: 'Keep' } : { servings });
  });
});

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

  it('retains optional descriptions returned directly or through Kiota additional data', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          topPick: { id: 'first', name: 'First', description: 'A family recipe' },
          results: [
            { additionalData: { id: 'second', name: 'Second', description: 'A quick meal' } },
          ],
          appliedFilters: {},
        },
      }),
    });

    const response = await searchRecipes({ query: 'meal', limit: 12 });
    expect(response.topPick?.description).toBe('A family recipe');
    expect(response.results[0]?.description).toBe('A quick meal');
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
            },
          ],
          appliedFilters: {},
          searchMode: 'explicit',
          resultPath: 'lexical-only',
        },
      }),
    });

    const result = await searchRecipes({ query: 'chicken', limit: 5 });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5052/api/recipes/search',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Family-Member-Id': 'family-123',
        },
        body: JSON.stringify({ query: 'chicken', limit: 5 }),
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
        },
        results: [],
        appliedFilters: {},
        searchMode: 'explicit',
        resultPath: 'lexical-only',
      }),
    });

    const result = await searchRecipes({ query: 'chicken', limit: 5 });

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
            },
          },
          results: [],
          appliedFilters: {},
          searchMode: 'explicit',
          resultPath: 'lexical-only',
        },
      }),
    });

    const recovered = await searchRecipes({ query: 'lasagna', limit: 5 });
    expect(recovered.topPick?.name).toBe('Homemade Lasagna');
    expect(recovered.topPick?.reasons[0]?.label).toBe('Name matches your search');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          topPick: { additionalData: {} },
          results: [],
          appliedFilters: {},
          searchMode: 'explicit',
          resultPath: 'lexical-only',
        },
      }),
    });

    const emptyMarker = await searchRecipes({ query: 'missing', limit: 5 });
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

function readFileAsJson(
  file: File
): Promise<{ recipe: Record<string, unknown>; [key: string]: unknown }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(JSON.parse(String(reader.result ?? '')));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

describe('createRecipeBundleFile / privacy scrubbing', () => {
  it('includes notes and rating in the serialized JSON payload', async () => {
    const bundle = builders.recipeShareBundle({
      recipe: {
        name: 'Chicken Soup',
        description: null,
        ingredients: ['chicken'],
        instructions: [{ name: 'Cook', itemListElement: [{ text: 'Simmer' }] }],
        totalTimeMinutes: 45,
        servings: 2,
        sourceUrl: null,
        sourceName: null,
        category: null,
        isSynthesized: false,
        notes: 'Great for winter',
        rating: 5,
      },
    });

    const file = createRecipeBundleFile('Chicken Soup', bundle);
    const payload = await readFileAsJson(file);

    expect(payload.recipe.notes).toBe('Great for winter');
    expect(payload.recipe.rating).toBe(5);
  });

  it('serializes notes and rating as null when absent', async () => {
    const bundle = builders.recipeShareBundle({
      recipe: {
        name: 'Plain Recipe',
        description: null,
        ingredients: ['water'],
        instructions: [{ name: 'Prepare', itemListElement: [{ text: 'Add water' }] }],
        totalTimeMinutes: null,
        servings: null,
        sourceUrl: null,
        sourceName: null,
        category: null,
        isSynthesized: false,
        notes: null,
        rating: null,
      },
    });

    const file = createRecipeBundleFile('Plain Recipe', bundle);
    const payload = await readFileAsJson(file);

    expect(payload.recipe.notes).toBeNull();
    expect(payload.recipe.rating).toBeNull();
  });

  it('preserves isSynthesized faithfully', async () => {
    const synthesized = builders.recipeShareBundle({
      recipe: {
        name: 'AI Recipe',
        description: null,
        ingredients: ['magic'],
        instructions: [{ name: 'Conjure', itemListElement: [{ text: 'Imagine it' }] }],
        totalTimeMinutes: null,
        servings: null,
        sourceUrl: null,
        sourceName: null,
        category: null,
        isSynthesized: true,
        notes: null,
        rating: null,
      },
    });

    const file = createRecipeBundleFile('AI Recipe', synthesized);
    const payload = await readFileAsJson(file);

    expect(payload.recipe.isSynthesized).toBe(true);
  });

  it('omits private fields not present in the bundle schema', async () => {
    const bundle = builders.recipeShareBundle({
      recipe: {
        name: 'Shared Recipe',
        description: 'Tasty',
        ingredients: ['flour'],
        instructions: [{ name: 'Bake', itemListElement: [{ text: 'Mix and bake' }] }],
        totalTimeMinutes: 30,
        servings: 8,
        sourceUrl: 'https://example.com',
        sourceName: 'Test Kitchen',
        category: 'Baking',
        isSynthesized: false,
        notes: null,
        rating: null,
      },
    });

    const file = createRecipeBundleFile('Shared Recipe', bundle);
    const payload = await readFileAsJson(file);

    // Fields that must not leak into the shared bundle
    expect(payload.recipe).not.toHaveProperty('id');
    expect(payload.recipe).not.toHaveProperty('imageUrl');
    expect(payload.recipe).not.toHaveProperty('isDiscoverable');
    expect(payload.recipe).not.toHaveProperty('isReady');
  });

  it('slugifies the recipe name for the filename', () => {
    const bundle = builders.recipeShareBundle();
    const file = createRecipeBundleFile('Tarte Flambée', bundle);
    expect(file.name).toBe('tarte-flambee.txt');
    expect(file.type).toBe('text/plain');
  });
});

describe('recipe servings detail mapping', () => {
  it.each([4, 1, null, undefined])('retains the server ingredient basis %s', async (servings) => {
    recipesApiMocks.byIdGet.mockResolvedValue({
      recipe: { id: 'recipe-1', servings, ingredients: ['510 g beef', '340 g pasta'] },
    });
    const recipe = await getRecipe('recipe-1');
    expect(recipe).toHaveProperty('servings', servings ?? null);
    expect(recipe.ingredients).toEqual(['510 g beef', '340 g pasta']);
  });
});

it('rejects an assigned projection for a different recreated occurrence', async () => {
  const context = {
    context: 'assigned' as const,
    supperDate: '2026-05-06',
    occurrenceId: 'captured',
  };
  recipesApiMocks.projectionGet.mockResolvedValue({
    recipeId: 'recipe',
    supperDate: '2026-05-06',
    context: 'assigned',
    occurrenceId: 'recreated',
    version: 'new',
    lines: [],
  });
  await expect(getIngredientProjection('recipe', context)).rejects.toThrow(
    'Could not confirm ingredients'
  );
});

it('does not treat an empty decoded nullable preparation as an observed preparation', async () => {
  const context = {
    supperDate: '2026-10-16',
    context: 'assigned' as const,
    occurrenceId: 'captured',
  };
  recipesApiMocks.projectionGet.mockResolvedValue({
    recipeId: 'recipe',
    ...context,
    version: 'displayed',
    preparation: {},
    lines: [],
  });
  expect((await getIngredientProjection('recipe', context)).preparation).toBeNull();
});

it('normalizes a decoded null instruction projection without hiding original-step feedback', async () => {
  const context = { supperDate: '2026-10-16', context: 'proposed' as const };
  recipesApiMocks.projectionGet.mockResolvedValue({
    recipeId: 'recipe',
    ...context,
    version: 'v',
    lines: [],
    instructionProjection: {},
  });
  expect((await getIngredientProjection('recipe', context)).instructionProjection).toBeNull();
});

it('reads an explicit preview through the generated client and rejects mismatched targets', async () => {
  const data = {
    recipeId: MOCK_PREVIEW_ID,
    baseServings: 2,
    targetServings: 4,
    factor: 2,
    status: 'scaled',
    version: 'current-ingredients',
    lines: [],
  };
  recipesApiMocks.previewGet.mockResolvedValue(data);
  expect(await getIngredientPreview(MOCK_PREVIEW_ID, 4)).toEqual(data);
  expect(recipesApiMocks.previewGet).toHaveBeenCalledWith({
    queryParameters: { targetServings: 4 },
  });
  recipesApiMocks.previewGet.mockResolvedValue({ ...data, targetServings: 6 });
  await expect(getIngredientPreview(MOCK_PREVIEW_ID, 4)).rejects.toThrow(
    'Could not confirm ingredient preview.'
  );
});
const MOCK_PREVIEW_ID = '550e8400-e29b-41d4-a716-446655440111';

it('normalizes Kiota nullable package objects before an original ingredient is edited', async () => {
  const { JsonParseNode } = await import('@microsoft/kiota-serialization-json');
  const { createRecipeDtoFromDiscriminatorValue } = await import('./generated/models');
  const parsed = new JsonParseNode({
    id: '550e8400-e29b-41d4-a716-446655440212',
    contentSchemaVersion: 2,
    ingredientLines: [
      {
        id: '550e8400-e29b-41d4-a716-446655440213',
        description: 'sauce',
        amount: null,
        amountText: null,
        unit: null,
        package: null,
        scaling: 'proportional',
        shopping: { name: 'sauce', foodId: null, mappingRevision: null },
      },
    ],
  }).getObjectValue(createRecipeDtoFromDiscriminatorValue)!;
  recipesApiMocks.byIdGet.mockResolvedValueOnce({ recipe: parsed });
  const recipe = await getRecipe('550e8400-e29b-41d4-a716-446655440212');
  expect(recipe.ingredientLines![0].packageEscaped).toBeNull();
  expect(recipe.ingredientLines![0].unit).toBeNull();
});
