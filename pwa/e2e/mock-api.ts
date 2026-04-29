import { type Page } from '@playwright/test';
import {
  type RecipeDto,
  type ScheduleRecipeDto,
  type ScheduleDays,
  type SmartDefaultsDto,
} from '../src/lib/api/generated/models/index';
import {
  type FamilyGetResponse,
  type FamilyGetResponse_data,
} from '../src/lib/api/generated/api/family/index';

/**
 * Standard MOCK_IDS for E2E tests.
 * Always use these GUIDs instead of hardcoded strings like "recipe-1".
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
};

/**
 * Schema-compliant builders for mock data.
 * These ensure that mock objects match the generated API client models.
 */
export const builders = {
  recipe: (overrides: Partial<RecipeDto> = {}): RecipeDto => ({
    id: MOCK_IDS.RECIPE_LASAGNA,
    name: 'Mock Recipe',
    description: 'A delicious mock recipe for testing.',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    totalTime: 'PT30M',
    difficulty: 'Medium',
    category: 'Italian',
    rating: 0,
    isVegetarian: false,
    isHealthyChoice: false,
    ingredients: ['Ingredient 1', 'Ingredient 2'],
    createdAt: new Date(),
    ...overrides,
  }),

  scheduleRecipe: (overrides: Partial<ScheduleRecipeDto> = {}): ScheduleRecipeDto => ({
    id: MOCK_IDS.RECIPE_LASAGNA,
    name: 'Mock Schedule Recipe',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    voteCount: 0,
    ingredients: [],
    ...overrides,
  }),

  familyMember: (overrides: Partial<FamilyGetResponse_data> = {}): FamilyGetResponse_data => ({
    id: MOCK_IDS.MEMBER_ALEX,
    name: 'Alex',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

/**
 * Common date utilities for schedule mocking.
 */
export function currentMonday(): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon...
  const offset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

export function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Setup common API routes with sane defaults.
 */
export async function setupCommonRoutes(page: Page) {
  // Family
  await page.route(/\/(?:backend\/)?api\/family(?:\?|$)/, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            builders.familyMember({ name: 'Alex' }),
            builders.familyMember({ id: MOCK_IDS.MEMBER_JORDAN, name: 'Jordan' }),
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Discovery Categories
  await page.route(/\/(?:backend\/)?api\/discovery\/categories/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: ['Italian', 'Asian', 'Mexican'] }),
    });
  });

  // Default Schedule (Empty)
  await page.route(/\/(?:backend\/)?api\/schedule(?:\?|$)/, async (route) => {
    if (route.request().method() === 'GET' && !route.request().url().includes('smart-defaults')) {
      const monday = currentMonday();
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setUTCDate(monday.getUTCDate() + i);
        return {
          day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          date: toDateStr(d),
          recipe: null,
          status: 0,
        };
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            weekOffset: 0,
            locked: false,
            status: 0,
            days,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}
