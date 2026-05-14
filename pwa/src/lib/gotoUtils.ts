/**
 * Utility for managing multiple GOTO recipes.
 * Supports legacy single-object format and new list-based format.
 */

export interface GotoValue {
  recipeId: string;
  description: string;
  imageUrl?: string;
  status?: 'pending' | 'ready' | null;
}

/**
 * Normalizes the family_goto setting into a list of GotoValue objects.
 * TODO: Clean up single-object family_goto format after migration (Task: 2026-GOTO-CLEANUP)
 */
export function normalizeGotos(value: unknown): GotoValue[] {
  if (!value) return [];

  // New format: { items: [...] }
  if (typeof value === 'object' && value !== null && 'items' in value) {
    const items = (value as { items: unknown }).items;
    if (Array.isArray(items)) {
      return items.filter(isValidGoto);
    }
  }

  // Intermediate format: [...]
  if (Array.isArray(value)) {
    return value.filter(isValidGoto);
  }

  // Legacy format: { recipeId, description, ... }
  if (isValidGoto(value)) {
    return [value];
  }

  return [];
}

export function isValidGoto(v: unknown): v is GotoValue {
  return (
    v != null && typeof v === 'object' && 'recipeId' in v && typeof (v as any).recipeId === 'string'
  );
}
