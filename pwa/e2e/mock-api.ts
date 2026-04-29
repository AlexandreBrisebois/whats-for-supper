import { type Page } from '@playwright/test';

/**
 * Standard GUIDs for consistent testing across suites.
 */
export const MOCK_IDS = {
  MEMBER_ALEX: '550e8400-e29b-41d4-a716-446655440001',
  MEMBER_JORDAN: '550e8400-e29b-41d4-a716-446655440002',
  RECIPE_LASAGNA: '00000000-0000-0000-0000-000000000001',
  RECIPE_CARBONARA: '00000000-0000-0000-0000-000000000002',
  RECIPE_STIR_FRY: '00000000-0000-0000-0000-000000000003',
  RECIPE_TACOS: '00000000-0000-0000-0000-000000000004',
};

/**
 * Builders for common API objects to ensure they match openapi.yaml.
 */
export const builders = {
  recipe: (overrides: any = {}) => ({
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
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  scheduleRecipe: (overrides: any = {}) => ({
    id: MOCK_IDS.RECIPE_LASAGNA,
    name: 'Mock Recipe',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    description: 'A delicious mock recipe.',
    voteCount: 0,
    ...overrides,
  }),

  familyMember: (overrides: any = {}) => ({
    id: MOCK_IDS.MEMBER_ALEX,
    name: 'Alex',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
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
