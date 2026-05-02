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
import { REALISTIC_RECIPES, REALISTIC_SCHEDULE_RECIPES } from './realistic-recipes';

import { MOCK_IDS } from './mock-ids';
export { MOCK_IDS };

/**
 * Schema-compliant builders for mock data.
 * These ensure that mock objects match the generated API client models.
 */
export const builders = {
  recipe: (overrides: Partial<RecipeDto> = {}): RecipeDto => {
    const base =
      overrides.id && REALISTIC_RECIPES[overrides.id]
        ? REALISTIC_RECIPES[overrides.id]
        : {
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
            recipeInstructions: [
              'Real Step 1: Chop the onions',
              'Real Step 2: Saute until golden',
            ] as any,
            createdAt: new Date(),
          };
    return { ...base, ...overrides };
  },

  scheduleRecipe: (overrides: Partial<ScheduleRecipeDto> = {}): ScheduleRecipeDto => {
    const base =
      overrides.id && REALISTIC_SCHEDULE_RECIPES[overrides.id]
        ? REALISTIC_SCHEDULE_RECIPES[overrides.id]
        : {
            id: MOCK_IDS.RECIPE_LASAGNA,
            name: 'Mock Schedule Recipe',
            image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
            voteCount: 0,
            ingredients: [],
          };
    return { ...base, ...overrides };
  },

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
/** Pins the test environment to a fixed Monday (May 4th, 2026) to prevent test drift. */
export const currentMonday = () => {
  const d = new Date('2026-05-04T12:00:00Z');
  return d;
};

export const toDateStr = (d: Date) => d.toISOString().split('T')[0];

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
  await page.route(/\/(?:backend\/)?api\/schedule(?:\?.*)?$/, async (route) => {
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

  // Single family member details
  await page.route(/\/(?:backend\/)?api\/family\/[0-9a-f-]+(?:\?.*)?$/, async (route) => {
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
  await page.route(/\/(?:backend\/)?api\/recipes(?:\?.*)?$/, async (route) => {
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
  // POST /api/recipes/describe — returns a stub RecipeDto; synthesis workflow is triggered server-side
  await page.route(/\/(?:backend\/)?api\/recipes\/describe/, async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { name?: string; description?: string };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: builders.recipe({
            id: MOCK_IDS.RECIPE_GOTO_STUB,
            name: body?.name ?? 'Described Recipe',
            description: body?.description ?? null,
            imageUrl: null,
          }),
        }),
      });
    } else {
      await route.continue();
    }
  });
  // GET /api/recipes/{id}/status — returns pending by default; tests can override per-route
  await page.route(/\/(?:backend\/)?api\/recipes\/[0-9a-f-]+\/status/, async (route) => {
    if (route.request().method() === 'GET') {
      const id =
        route
          .request()
          .url()
          .match(/\/recipes\/([0-9a-f-]+)\/status/)?.[1] ?? MOCK_IDS.RECIPE_GOTO_STUB;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id,
            name: 'Mock Recipe',
            status: 'ready',
            imageCount: 1,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
  await page.route(/\/(?:backend\/)?api\/recipes\/[0-9a-f-]+(?:\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ recipe: builders.recipe(), updatedAt: new Date().toISOString() }),
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
  await page.route(/\/(?:backend\/)?api\/schedule\/move/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { message: 'Moved' } }),
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

  // Settings — per-test in-memory store (reset each time setupCommonRoutes is called in beforeEach)
  const settingsStore: Record<string, unknown> = {
    family_goto: null, // default: no GOTO configured
  };
  await page.route(/\/(?:backend\/)?api\/settings\/(.+)/, async (route) => {
    const key = new URL(route.request().url()).pathname.split('/').pop()!;
    if (route.request().method() === 'GET') {
      if (settingsStore[key] == null) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { key, value: null } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { key, value: settingsStore[key] } }),
        });
      }
    } else {
      const body = route.request().postDataJSON();
      settingsStore[key] = body.value;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { key, value: body.value } }),
      });
    }
  });
}
