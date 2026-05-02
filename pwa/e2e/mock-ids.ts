/**
 * Standard MOCK_IDS for E2E tests.
 * Always use these GUIDs instead of hardcoded strings like "recipe-1".
 *
 * This is in a separate file to avoid circular dependencies between mock-api.ts
 * and realistic-recipes.ts.
 */
export const MOCK_IDS = {
  // Members
  MEMBER_ALEX: '550e8400-e29b-41d4-a716-446655440001',
  MEMBER_JORDAN: '550e8400-e29b-41d4-a716-446655440002',
  MEMBER_TEST: '550e8400-e29b-41d4-a716-446655440003',

  // Recipes
  RECIPE_LASAGNA: '660e8400-e29b-41d4-a716-446655440010',
  RECIPE_CHICKEN: '660e8400-e29b-41d4-a716-446655440011',
  RECIPE_GNOCCHI: '660e8400-e29b-41d4-a716-446655440012',
  RECIPE_CARBONARA: '660e8400-e29b-41d4-a716-446655440013',
  RECIPE_STIR_FRY: '660e8400-e29b-41d4-a716-446655440014',
  RECIPE_TACOS: '660e8400-e29b-41d4-a716-446655440015',
  RECIPE_GOTO_STUB: '660e8400-e29b-41d4-a716-446655440020', // stub created by POST /api/recipes/describe
};
