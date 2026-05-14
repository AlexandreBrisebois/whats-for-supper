import { apiClient, requestAdapter } from './api-client';
import { useFamilyStore } from '@/store/familyStore';
import { usePlannerStore } from '@/store/plannerStore';
import { getFamilyMemberIdCookie } from '@/lib/identity/cookie';
import type {
  RecipeDto,
  RecipeSearchRequestDto,
  RecipeSearchResponseDto,
  RecipeSearchResultDto,
  RecipeShareBundleDto,
  RecommendationResultDto,
} from './generated/models/index';

export interface Recipe {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  totalTime: string;
  category: string;
  rating: number;
  notes?: string | null;
  isDiscoverable?: boolean;
  ingredients?: string[];
  isVegetarian?: boolean;
  isHealthyChoice?: boolean;
  recipeInstructions?: unknown[];
  sourceType: 'url' | 'photos' | 'synthesized';
  canReimport: boolean;
  imageCount: number;
  finishedDishIndex: number;
  sourceUrl?: string | null;
  isReady: boolean;
}

export type RecommendationResult = {
  id: string;
  name: string;
  totalTime: string;
  image: string;
};

export type RecommendationsResponse = {
  topPick: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    totalTime: string;
  } | null;
  results: RecommendationResult[];
};

export type RecipeSearchResult = {
  id: string;
  name: string;
  imageUrl: string;
  totalTime: string;
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
    category: dto.category || '',
    rating: dto.rating || 0,
    notes: dto.notes ?? null,
    isDiscoverable: dto.isDiscoverable ?? false,
    ingredients: dto.ingredients ?? [],
    isVegetarian: dto.isVegetarian ?? false,
    isHealthyChoice: dto.isHealthyChoice ?? false,
    recipeInstructions,
    sourceType: (dto.sourceType as any) || 'synthesized',
    canReimport: dto.canReimport ?? false,
    imageCount: dto.imageCount || 0,
    finishedDishIndex: dto.finishedDishIndex ?? -1,
    sourceUrl: dto.sourceUrl ?? null,
    isReady: dto.isReady ?? false,
  };
}

function mapSearchResult(dto: RecipeSearchResultDto | null | undefined): RecipeSearchResult | null {
  if (!dto) return null;

  const id = readField<string>(dto, 'id') || '';
  const name = readField<string>(dto, 'name') || '';
  const imageUrl = readField<string>(dto, 'imageUrl') || '';
  const totalTime = readField<string>(dto, 'totalTime') || '';
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
  if (!id && !name && !imageUrl && !totalTime && !notes && !plannerFitNote) {
    return null;
  }

  return {
    id,
    name,
    imageUrl,
    totalTime,
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

export async function reimportRecipe(id: string): Promise<void> {
  await apiClient.api.recipes.byId(id as any).importEscaped.post();
}

export async function uploadRecipeOriginal(id: string, file: File): Promise<{ id: string }> {
  const familyMemberId = useFamilyStore.getState().selectedFamilyMemberId;
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${requestAdapter.baseUrl}/api/recipes/${id}/originals`, {
    method: 'POST',
    body: formData,
    headers: {
      'X-Family-Member-Id': familyMemberId || '',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to upload photo: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    id: result?.id || '',
  };
}

export async function regenerateHero(id: string): Promise<void> {
  await apiClient.api.recipes.byId(id as any).hero.regenerate.post();
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
  updates: {
    name?: string;
    description?: string;
    ingredients?: string[];
    notes?: string;
    rating?: number;
    isDiscoverable?: boolean | null;
  }
): Promise<void> {
  await apiClient.api.recipes.byId(id as any).patch({
    name: updates.name,
    description: updates.description,
    ingredients: updates.ingredients,
    notes: updates.notes,
    rating: updates.rating,
    isDiscoverable: updates.isDiscoverable,
  });
}

export async function searchRecipes(
  request: Pick<
    RecipeSearchRequestDto,
    | 'query'
    | 'mode'
    | 'limit'
    | 'weekOffset'
    | 'dayIndex'
    | 'similarToRecipeId'
    | 'pantrySnapshotId'
    | 'filters'
  >
): Promise<RecipeSearchResponse> {
  const familyMemberId =
    useFamilyStore.getState().selectedFamilyMemberId || getFamilyMemberIdCookie();
  const { sseConnectionId, localMoveSeq, confirmedMoveSeq } = usePlannerStore.getState();
  const response = await fetch(`${requestAdapter.baseUrl}/api/recipes/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(familyMemberId ? { 'X-Family-Member-Id': familyMemberId } : {}),
      ...(sseConnectionId ? { 'X-SSE-Connection-ID': sseConnectionId } : {}),
      ...(localMoveSeq > confirmedMoveSeq ? { 'X-Move-Seq': String(localMoveSeq) } : {}),
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Recipe search failed with status ${response.status}`);
  }

  const result = (await response.json()) as
    | { data?: RecipeSearchResponseDto }
    | RecipeSearchResponseDto
    | null
    | undefined;
  const data = ((result as { data?: RecipeSearchResponseDto } | null | undefined)?.data ??
    (result as RecipeSearchResponseDto | null | undefined)) as RecipeSearchResponseDto | undefined;

  const results = (readField<RecipeSearchResultDto[]>(data, 'results') || [])
    .map((recipe) => mapSearchResult(recipe))
    .filter((recipe): recipe is RecipeSearchResult => recipe !== null);

  return {
    topPick: mapSearchResult(readField<RecipeSearchResultDto>(data, 'topPick') ?? null),
    results,
    appliedFilters: readField<Record<string, boolean | null>>(data, 'appliedFilters') || {},
    searchMode: readField<string>(data, 'searchMode') || null,
    resultPath: readField<string>(data, 'resultPath') || null,
  };
}

export type TrashItem = {
  id: string;
  name: string | null;
  imageUrl: string | null;
  deletedAt: string;
  deletedBy: string | null;
};

export async function getTrashItems(): Promise<TrashItem[]> {
  const result = await apiClient.api.recipes.trash.get();
  const items = (result?.data as { items?: unknown[] } | null | undefined)?.items ?? [];
  return items.map((item: unknown) => {
    const i = item as Record<string, unknown>;
    return {
      id: (i.id as string) || '',
      name: (i.name as string | null) ?? null,
      imageUrl: (i.imageUrl as string | null) ?? null,
      deletedAt:
        i.deletedAt instanceof Date ? i.deletedAt.toISOString() : (i.deletedAt as string) || '',
      deletedBy: (i.deletedBy as string | null) ?? null,
    };
  });
}

export async function restoreRecipe(id: string): Promise<void> {
  await apiClient.api.recipes.byId(id as any).restore.post();
}

export async function purgeRecipe(id: string, elevatedPin: string): Promise<void> {
  // Use native fetch to ensure we can catch non-2xx status codes reliably in tests
  const response = await fetch(`${requestAdapter.baseUrl}/api/recipes/${id}/purge`, {
    method: 'DELETE',
    headers: {
      'X-Elevated-Pin': elevatedPin,
      'X-Family-Member-Id': useFamilyStore.getState().selectedFamilyMemberId || '',
    },
  });

  if (!response.ok) {
    throw new Error(`Purge failed with status ${response.status}`);
  }
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
          totalTime: data.topPick.totalTime || '',
        }
      : null,
    results: (data?.results || []).map((r: RecommendationResultDto) => ({
      id: r.id || '',
      name: r.name || '',
      totalTime: r.totalTime || '',
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
/**
 * Fetches a recipe share bundle (JSON + Base64 images).
 */
export async function getRecipeShareBundle(id: string): Promise<RecipeShareBundleDto> {
  const result = await apiClient.api.recipes.byId(id as any).share.get();
  if (!result) throw new Error('Failed to fetch share bundle');
  return result;
}

/**
 * Imports a shared recipe bundle.
 */
export async function importRecipeShare(bundle: RecipeShareBundleDto): Promise<{ id: string }> {
  const familyMemberId = useFamilyStore.getState().selectedFamilyMemberId;
  const response = await fetch(`${requestAdapter.baseUrl}/api/recipes/share/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Family-Member-Id': familyMemberId || '',
    },
    body: JSON.stringify(bundle),
  });

  if (!response.ok) {
    throw new Error(`Failed to import shared recipe: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    id: (result?.data as any)?.id || result?.id || '',
  };
}
