import { apiClient, requestAdapter } from './api-client';
import { useFamilyStore } from '@/store/familyStore';
import type {
  RecipeDto,
  RecommendationResultDto,
  RecipeSearchRequestDto,
  RecipeSearchResponseDto,
  RecipeSearchResultDto,
} from './generated/models/index';

export interface Recipe {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  totalTime: string;
  difficulty: string;
  category: string;
  rating: number;
  ingredients?: string[];
  isVegetarian?: boolean;
  isHealthyChoice?: boolean;
  recipeInstructions?: unknown[];
}

export type RecommendationResult = {
  id: string;
  name: string;
  time: string;
  image: string;
};

export type RecommendationsResponse = {
  topPick: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    prepTime: string;
    difficulty: string;
  } | null;
  results: RecommendationResult[];
};

export type RecipeSearchResult = {
  id: string;
  name: string;
  imageUrl: string;
  totalTime: string;
  difficulty: string;
  rating: number;
  isDiscoverable: boolean;
  notes: string | null;
  reasons: Array<{ source: string; label: string }>;
  plannerFitNote: string | null;
};

export type RecipeSearchResponse = {
  topPick: RecipeSearchResult | null;
  results: RecipeSearchResult[];
  appliedFilters: Record<string, boolean | null>;
  searchMode: string | null;
  resultPath: string | null;
};

type KiotaAdditionalData = {
  additionalData?: Record<string, unknown>;
};

function readField<T>(source: unknown, key: string): T | undefined {
  if (!source || typeof source !== 'object') return undefined;

  const direct = (source as Record<string, unknown>)[key];
  if (direct !== undefined) return direct as T;

  const additional = (source as KiotaAdditionalData).additionalData;
  if (additional && key in additional) return additional[key] as T;

  return undefined;
}

function unwrapUntypedNode(node: any): any {
  if (node && typeof node.getValue === 'function') {
    const value = node.getValue();
    if (Array.isArray(value)) {
      return value.map(unwrapUntypedNode);
    }
    if (typeof value === 'object' && value !== null) {
      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = unwrapUntypedNode(val);
      }
      return result;
    }
    return value;
  }
  return node;
}

function mapToRecipe(dto: RecipeDto): Recipe {
  const recipeInstructions = unwrapUntypedNode(dto.recipeInstructions);

  return {
    id: dto.id || '',
    name: dto.name || '',
    description: dto.description || '',
    imageUrl: dto.imageUrl || '',
    totalTime: dto.totalTime || '',
    difficulty: dto.difficulty || '',
    category: dto.category || '',
    rating: dto.rating || 0,
    ingredients: dto.ingredients ?? [],
    isVegetarian: dto.isVegetarian ?? false,
    isHealthyChoice: dto.isHealthyChoice ?? false,
    recipeInstructions,
  };
}

function mapSearchResult(dto: RecipeSearchResultDto | null | undefined): RecipeSearchResult | null {
  if (!dto) return null;

  const id = readField<string>(dto, 'id') || '';
  const name = readField<string>(dto, 'name') || '';
  const imageUrl = readField<string>(dto, 'imageUrl') || '';
  const totalTime = readField<string>(dto, 'totalTime') || '';
  const difficulty = readField<string>(dto, 'difficulty') || '';
  const rating = readField<number>(dto, 'rating') || 0;
  const isDiscoverable = readField<boolean>(dto, 'isDiscoverable') ?? false;
  const notes = (readField<string | null>(dto, 'notes') ?? null) as string | null;
  const reasonsValue = readField<Array<{ source?: string | null; label?: string | null }>>(
    dto,
    'reasons'
  );
  const plannerFitNote = (readField<string | null>(dto, 'plannerFitNote') ?? null) as string | null;

  // Kiota currently deserializes nullable union topPick into an empty marker object.
  // Treat that shape as null so the page can show the real empty state.
  if (!id && !name && !imageUrl && !totalTime && !difficulty && !notes && !plannerFitNote) {
    return null;
  }

  return {
    id,
    name,
    imageUrl,
    totalTime,
    difficulty,
    rating,
    isDiscoverable,
    notes,
    reasons: (reasonsValue || []).map((reason) => ({
      source: reason?.source || '',
      label: reason?.label || '',
    })),
    plannerFitNote,
  };
}

export async function getRecipes(
  page = 1,
  limit = 20
): Promise<{ recipes: Recipe[]; total: number }> {
  const result = await apiClient.api.recipes.get({
    queryParameters: { page, limit },
  });
  return {
    recipes: result?.recipes?.map(mapToRecipe) || [],
    total: result?.pagination?.total || 0,
  };
}

export async function getRecipe(id: string): Promise<Recipe> {
  const result = await apiClient.api.recipes.byId(id as any).get();
  if (!result?.recipe) throw new Error('Recipe not found');
  return mapToRecipe(result.recipe);
}

export async function createRecipe(formData: FormData): Promise<{ id: string }> {
  // Use native fetch for multipart FormData to avoid Kiota serialization issues
  const familyMemberId = useFamilyStore.getState().selectedFamilyMemberId;

  const response = await fetch(`${requestAdapter.baseUrl}/api/recipes`, {
    method: 'POST',
    body: formData,
    headers: {
      'X-Family-Member-Id': familyMemberId || '',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to create recipe: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    id: (result?.data as any)?.id || result?.id || '',
  };
}

export async function deleteRecipe(id: string): Promise<void> {
  await apiClient.api.recipes.byId(id as any).delete();
}

export async function captureUrl(
  url: string,
  notes?: string,
  rating?: number
): Promise<{ id: string }> {
  const result = await apiClient.api.recipes.captureUrl.post({
    url,
    notes,
    rating,
  });
  return {
    id: (result?.data as any)?.id || '',
  };
}

export async function updateRecipe(
  id: string,
  updates: { notes?: string; rating?: number }
): Promise<void> {
  await apiClient.api.recipes.byId(id as any).patch({
    notes: updates.notes,
    rating: updates.rating,
  });
}

export async function searchRecipes(
  request: Pick<RecipeSearchRequestDto, 'query' | 'mode' | 'limit' | 'weekOffset' | 'dayIndex'>
): Promise<RecipeSearchResponse> {
  const result = await apiClient.api.recipes.search.post(request);
  const data = ((result as { data?: RecipeSearchResponseDto } | null | undefined)?.data ??
    (result as RecipeSearchResponseDto | null | undefined)) as RecipeSearchResponseDto | undefined;

  return {
    topPick: mapSearchResult((data?.topPick as RecipeSearchResultDto | null | undefined) ?? null),
    results: (data?.results || [])
      .map((recipe) => mapSearchResult(recipe))
      .filter((recipe): recipe is RecipeSearchResult => recipe !== null),
    appliedFilters: (data?.appliedFilters as Record<string, boolean | null> | null) || {},
    searchMode: data?.searchMode || null,
    resultPath: data?.resultPath || null,
  };
}

export async function getRecommendations(): Promise<RecommendationsResponse> {
  const result = await apiClient.api.recipes.recommendations.get();
  const data = result?.data;
  return {
    topPick: data?.topPick
      ? {
          id: data.topPick.id || '',
          name: data.topPick.name || '',
          description: data.topPick.description || '',
          imageUrl: data.topPick.imageUrl || '',
          prepTime: data.topPick.prepTime || '',
          difficulty: data.topPick.difficulty || '',
        }
      : null,
    results: (data?.results || []).map((r: RecommendationResultDto) => ({
      id: r.id || '',
      name: r.name || '',
      time: r.time || '',
      image: r.image || '',
    })),
  };
}

/**
 * Fetches a recipe image by recipe ID and index.
 * Returns the image as a blob URL for use in <img> tags.
 */
export async function getRecipeImage(recipeId: string, index: number): Promise<string> {
  const response = await fetch(
    `${requestAdapter.baseUrl}/api/recipes/${recipeId}/original/${index}`
  );
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
