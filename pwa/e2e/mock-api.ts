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
              {
                name: 'Step 1: Prep',
                text: 'Chop the onions and mince the garlic.',
              },
              {
                name: 'Step 2: Cook',
                text: 'Saute until golden and fragrant.',
              },
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
  // GET /api/family
  await page.route('**/api/family', async (route) => {
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
    } else if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: builders.familyMember() }),
      });
    } else {
      await route.continue();
    }
  });

  // PUT /api/family/{id} and DELETE /api/family/{id}
  await page.route('**/api/family/*', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: builders.familyMember() }),
      });
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 204 });
    } else if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: builders.familyMember() }),
      });
    } else {
      await route.continue();
    }
  });

  // GET /api/discovery/categories
  await page.route('**/api/discovery/categories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: ['Italian', 'Asian', 'Mexican'] }),
    });
  });

  // GET /api/discovery
  await page.route('**/api/discovery', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  // POST /api/discovery/{id}/vote
  await page.route('**/api/discovery/*/vote', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { message: 'Vote recorded' } }),
    });
  });

  // GET /api/schedule (default empty week)
  await page.route('**/api/schedule', async (route) => {
    if (route.request().method() === 'GET') {
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

  // GET /api/recipes and POST /api/recipes
  await page.route('**/api/recipes', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ recipe: builders.recipe(), updatedAt: new Date().toISOString() }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipes: [],
          updatedAt: new Date().toISOString(),
          pagination: { page: 1, limit: 20, total: 0 },
        }),
      });
    }
  });

  // GET /api/recipes/recommendations
  await page.route('**/api/recipes/recommendations', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { topPick: null, results: [] } }),
    });
  });

  // POST /api/recipes/describe
  await page.route('**/api/recipes/describe', async (route) => {
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
    }
  });

  // GET /api/recipes/import-status
  await page.route('**/api/recipes/import-status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ importedCount: 0, queueCount: 0, failedCount: 0 }),
    });
  });

  // POST /api/recipes/imports/bulk
  await page.route('**/api/recipes/imports/bulk', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ queuedCount: 0, instanceIds: [] }),
    });
  });

  // GET /api/recipes/{id}/status
  await page.route('**/api/recipes/*/status', async (route) => {
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
    }
  });

  // GET /api/recipes/{id}/hero
  await page.route('**/api/recipes/*/hero', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from([]) });
  });

  // GET /api/recipes/{id}/import and POST /api/recipes/{id}/import
  await page.route('**/api/recipes/*/import', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ importId: MOCK_IDS.RECIPE_LASAGNA }),
    });
  });

  // GET /api/recipes/{recipeId}/original/{photoIndex}
  await page.route('**/api/recipes/*/original/*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from([]) });
  });

  // GET /api/recipes/{id}, PATCH /api/recipes/{id}, DELETE /api/recipes/{id}
  await page.route('**/api/recipes/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 204 });
    } else if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ recipe: builders.recipe(), updatedAt: new Date().toISOString() }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ recipe: builders.recipe(), updatedAt: new Date().toISOString() }),
      });
    }
  });

  // POST /api/recipes/capture-url — registered AFTER the wildcard so LIFO gives it priority
  await page.route('**/api/recipes/capture-url', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: MOCK_IDS.RECIPE_LASAGNA } }),
      });
    } else {
      await route.continue();
    }
  });

  // POST /api/schedule/assign
  await page.route('**/api/schedule/assign', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { success: true } }),
    });
  });

  // POST /api/schedule/lock
  await page.route('**/api/schedule/lock', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { success: true } }),
    });
  });

  // POST /api/schedule/move
  await page.route('**/api/schedule/move', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { message: 'Moved' } }),
    });
  });

  // GET /api/schedule/fill-the-gap
  await page.route('**/api/schedule/fill-the-gap', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  // POST /api/schedule/voting/open
  await page.route('**/api/schedule/voting/open', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { success: true } }),
    });
  });

  // DELETE /api/schedule/day/{date}/remove
  await page.route('**/api/schedule/day/*/remove', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { success: true } }),
    });
  });

  // POST /api/schedule/day/{date}/validate
  await page.route('**/api/schedule/day/*/validate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { valid: true } }),
    });
  });

  // GET /api/schedule/{weekOffset}/smart-defaults
  await page.route('**/api/schedule/*/smart-defaults', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  // PATCH /api/schedule/{weekOffset}/grocery
  await page.route('**/api/schedule/*/grocery', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { success: true } }),
    });
  });

  // POST /api/management/backup
  await page.route('**/api/management/backup', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ taskId: MOCK_IDS.RECIPE_LASAGNA }),
    });
  });

  // POST /api/management/disaster-recovery
  await page.route('**/api/management/disaster-recovery', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ taskId: MOCK_IDS.RECIPE_LASAGNA }),
    });
  });

  // POST /api/management/seed
  await page.route('**/api/management/seed', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ taskId: MOCK_IDS.RECIPE_LASAGNA }),
    });
  });

  // GET /api/management/status
  await page.route('**/api/management/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'Idle' }),
    });
  });

  // GET /api/workflows/instances/{instanceId}
  await page.route('**/api/workflows/instances/*', async (route) => {
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
  });

  // POST /api/workflows/tasks/{taskId}/reset
  await page.route('**/api/workflows/tasks/*/reset', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { success: true } }),
    });
  });

  // GET /api/workflows/active
  await page.route('**/api/workflows/active', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  // POST /api/workflows/{workflowId}/trigger
  await page.route('**/api/workflows/*/trigger', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ instanceId: MOCK_IDS.RECIPE_LASAGNA }),
    });
  });

  // GET /health
  await page.route('**/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'Healthy' }),
    });
  });

  // GET /api/settings/{key} and POST /api/settings/{key}
  // Per-test in-memory store (reset each time setupCommonRoutes is called in beforeEach)
  const settingsStore: Record<string, unknown> = {
    family_goto: null, // default: no GOTO configured
  };
  await page.route('**/api/settings/*', async (route) => {
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
