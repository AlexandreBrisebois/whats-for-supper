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

  // Family Detail
  await page.route(/\/(?:backend\/)?api\/family\/[0-9a-f-]+(?:\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Discovery Vote
  await page.route(/\/(?:backend\/)?api\/discovery\/.*\/vote/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Recipes (Generic & Detail)
  await page.route(/\/(?:backend\/)?api\/recipes(?:\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], total: 0 }),
    });
  });
  await page.route(/\/(?:backend\/)?api\/recipes\/recommendations/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { topPick: null, results: [] } }),
    });
  });
  await page.route(/\/(?:backend\/)?api\/recipes\/[0-9a-f-]+(?:\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: builders.recipe() }),
    });
  });
  await page.route(/\/(?:backend\/)?api\/recipes\/[0-9a-f-]+\/hero/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from([]) });
  });
  await page.route(/\/(?:backend\/)?api\/recipes\/[0-9a-f-]+\/import/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ importId: MOCK_IDS.RECIPE_LASAGNA }),
    });
  });
  await page.route(/\/(?:backend\/)?api\/recipes\/import-status/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ importedCount: 0, queueCount: 0, failedCount: 0 }),
    });
  });
  await page.route(/\/(?:backend\/)?api\/recipes\/imports\/bulk/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ queuedCount: 0, instanceIds: [] }),
    });
  });
  await page.route(/\/(?:backend\/)?api\/recipes\/.*\/original\/.*/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from([]) });
  });

  // Schedule Operations
  await page.route(/\/(?:backend\/)?api\/schedule\/assign/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
  await page.route(/\/(?:backend\/)?api\/schedule\/lock/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
  await page.route(/\/(?:backend\/)?api\/schedule\/fill-the-gap/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  // Management & Workflows (Specific mocks for parity)
  await page.route(/\/(?:backend\/)?api\/management\/backup/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ taskId: MOCK_IDS.RECIPE_LASAGNA }),
    });
  });
  await page.route(/\/(?:backend\/)?api\/management\/disaster-recovery/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ taskId: MOCK_IDS.RECIPE_LASAGNA }),
    });
  });
  await page.route(/\/(?:backend\/)?api\/management\/seed/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ taskId: MOCK_IDS.RECIPE_LASAGNA }),
    });
  });
  await page.route(/\/(?:backend\/)?api\/management\/status/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'Idle' }),
    });
  });
  await page.route(
    /\/(?:backend\/)?api\/workflows\/instances\/[0-9a-f-]+(?:\?|$)/,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: MOCK_IDS.RECIPE_LASAGNA,
          workflowId: 'recipe-import',
          status: 'Completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tasks: [],
        }),
      });
    }
  );
  await page.route(/\/(?:backend\/)?api\/workflows\/tasks\/[0-9a-f-]+\/reset/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
  await page.route(/\/(?:backend\/)?api\/workflows\/active/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
  await page.route(/\/(?:backend\/)?api\/workflows\/[0-9a-f-]+\/trigger/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ instanceId: MOCK_IDS.RECIPE_LASAGNA }),
    });
  });
  await page.route(/\/(?:backend\/)?health/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'Healthy' }),
    });
  });
}
