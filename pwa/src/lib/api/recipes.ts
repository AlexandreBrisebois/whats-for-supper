import { apiClient, requestAdapter } from './api-client';
import { useFamilyStore } from '@/store/familyStore';
import { usePlannerStore } from '@/store/plannerStore';
import { getFamilyMemberIdCookie } from '@/lib/identity/cookie';
import { RecipeShareInfoDto_bundleSourceObject } from './generated/models/index';
import type {
  ImportedRecipeDto,
  RecipeDto,
  RecipeShareBundleDto,
  RecipeShareInfoDto_bundleSource,
  RecommendationResultDto,
  RecipeSearchRequestDto,
  RecipeSearchResponseDto,
  RecipeSearchResultDto,
  SharedImageDto,
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

export async function getRecipeShareBundle(id: string): Promise<RecipeShareBundleDto> {
  const result = await apiClient.api.recipes.byId(id as any).share.get();
  if (!result?.data) {
    throw new Error('Could not export this recipe right now.');
  }
  return result.data;
}

export async function importRecipeShareBundle(bundle: RecipeShareBundleDto): Promise<Recipe> {
  const result = await apiClient.api.recipes.importBundle.post(bundle);
  if (!result?.data) {
    throw new Error('Could not import this recipe right now.');
  }
  return mapToRecipe(result.data);
}

export async function downloadRecipeBundleFile(
  recipeName: string,
  bundle: RecipeShareBundleDto
): Promise<void> {
  const file = createRecipeBundleFile(recipeName, bundle);
  const canNativeShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (canNativeShare) {
    await navigator.share({
      files: [file],
      title: recipeName,
    });
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function parseRecipeBundleFile(file: File): Promise<RecipeShareBundleDto> {
  const rawText = await readFileAsText(file);
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('This .recipe file could not be read.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('This .recipe file is not valid.');
  }

  const bundle = parsed as Record<string, unknown>;
  const recipe = bundle.recipe as Record<string, unknown> | undefined;
  const info = bundle.info as Record<string, unknown> | undefined;
  const hero = bundle.hero as Record<string, unknown> | null | undefined;
  const originals = Array.isArray(bundle.originals) ? bundle.originals : null;

  if (
    typeof bundle.version !== 'string' ||
    !recipe ||
    typeof recipe.name !== 'string' ||
    !Array.isArray(recipe.ingredients) ||
    !recipe.ingredients.every((item) => typeof item === 'string') ||
    !Array.isArray(recipe.instructions) ||
    !recipe.instructions.every((item) => typeof item === 'string') ||
    typeof recipe.isSynthesized !== 'boolean' ||
    !info ||
    typeof info.exportedAtUtc !== 'string' ||
    Number.isNaN(Date.parse(info.exportedAtUtc)) ||
    info.bundleSource !== 'wfs-share' ||
    !originals ||
    !originals.every(isPortableSharedImage) ||
    (hero !== null && hero !== undefined && !isPortableSharedImage(hero))
  ) {
    throw new Error('This .recipe file is not valid.');
  }

  return {
    version: bundle.version,
    recipe: {
      name: recipe.name,
      description: typeof recipe.description === 'string' ? recipe.description : null,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prepTimeMinutes: typeof recipe.prepTimeMinutes === 'number' ? recipe.prepTimeMinutes : null,
      cookTimeMinutes: typeof recipe.cookTimeMinutes === 'number' ? recipe.cookTimeMinutes : null,
      totalTimeMinutes:
        typeof recipe.totalTimeMinutes === 'number' ? recipe.totalTimeMinutes : null,
      servings: typeof recipe.servings === 'number' ? recipe.servings : null,
      sourceUrl: typeof recipe.sourceUrl === 'string' ? recipe.sourceUrl : null,
      sourceName: typeof recipe.sourceName === 'string' ? recipe.sourceName : null,
      category: typeof recipe.category === 'string' ? recipe.category : null,
      isSynthesized: recipe.isSynthesized,
    } satisfies ImportedRecipeDto,
    info: {
      exportedAtUtc: new Date(info.exportedAtUtc),
      bundleSource: RecipeShareInfoDto_bundleSourceObject.WfsShare as RecipeShareInfoDto_bundleSource,
      appVersion: typeof info.appVersion === 'string' ? info.appVersion : null,
    },
    hero: hero ? toSharedImage(hero) : null,
    originals: originals.map((image) => toSharedImage(image as Record<string, unknown>)),
  };
}

function createRecipeBundleFile(recipeName: string, bundle: RecipeShareBundleDto): File {
  const payload = {
    version: bundle.version ?? '1.0',
    recipe: {
      name: bundle.recipe?.name ?? '',
      description: bundle.recipe?.description ?? null,
      ingredients: bundle.recipe?.ingredients ?? [],
      instructions: bundle.recipe?.instructions ?? [],
      prepTimeMinutes: bundle.recipe?.prepTimeMinutes ?? null,
      cookTimeMinutes: bundle.recipe?.cookTimeMinutes ?? null,
      totalTimeMinutes: bundle.recipe?.totalTimeMinutes ?? null,
      servings: bundle.recipe?.servings ?? null,
      sourceUrl: bundle.recipe?.sourceUrl ?? null,
      sourceName: bundle.recipe?.sourceName ?? null,
      category: bundle.recipe?.category ?? null,
      isSynthesized: bundle.recipe?.isSynthesized ?? false,
    },
    info: {
      exportedAtUtc: bundle.info?.exportedAtUtc
        ? new Date(bundle.info.exportedAtUtc).toISOString()
        : new Date().toISOString(),
      bundleSource: 'wfs-share',
      appVersion: bundle.info?.appVersion ?? null,
    },
    hero: bundle.hero ? toPortableSharedImage(bundle.hero as SharedImageDto) : null,
    originals: (bundle.originals ?? []).map((image) => toPortableSharedImage(image)),
  };

  return new File([JSON.stringify(payload, null, 2)], `${slugifyRecipeName(recipeName)}.recipe`, {
    type: 'application/json',
  });
}

function toPortableSharedImage(image: SharedImageDto): { mimeType: string | null; base64: string | null } {
  return {
    mimeType: image.mimeType ?? null,
    base64: image.base64 ?? null,
  };
}

function toSharedImage(image: Record<string, unknown>): SharedImageDto {
  return {
    mimeType: image.mimeType as string,
    base64: image.base64 as string,
  };
}

function isPortableSharedImage(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>).mimeType === 'string' &&
    typeof (value as Record<string, unknown>).base64 === 'string'
  );
}

function slugifyRecipeName(recipeName: string): string {
  return (recipeName || 'recipe')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file.'));
    reader.readAsText(file);
  });
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
