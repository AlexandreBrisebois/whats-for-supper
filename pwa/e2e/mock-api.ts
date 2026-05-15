import { type Page } from '@playwright/test';
import {
  type RecipeDto,
  type RecipeShareBundleDto,
  RecipeDto_sourceType,
  RecipeDto_sourceTypeObject,
  type ScheduleRecipeDto,
  type ScheduleDays,
  type SmartDefaultsDto,
} from '../src/lib/api/generated/models/index';
import {
  type FamilyGetResponse,
  type FamilyGetResponse_data,
} from '../src/lib/api/generated/api/family/index';
import { type UntypedNode } from '@microsoft/kiota-abstractions';
import { REALISTIC_RECIPES, REALISTIC_SCHEDULE_RECIPES } from './realistic-recipes';

import { MOCK_IDS } from './mock-ids';
export { MOCK_IDS };

// ---------------------------------------------------------------------------
// SSE helpers — internal
// ---------------------------------------------------------------------------

/**
 * Builds a single SSE message frame.
 * Format: "event: <type>\ndata: <json>\n\n"
 */
function buildSseFrame(eventType: string, payload: object): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
}

/**
 * Builds a full SSE response body from an array of pre-formatted frames.
 */
function buildSseBody(frames: string[]): string {
  return frames.join('');
}

function buildDefaultConnectedSchedule(): ScheduleDays {
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

  return { weekOffset: 0, locked: false, status: 0, days } as ScheduleDays;
}

/**
 * Builds the default `connected` event payload with a 7-day empty schedule
 * anchored to the fixed test Monday (2026-05-04).
 */
function buildConnectedEvent(schedule: ScheduleDays = buildDefaultConnectedSchedule()): string {
  return buildSseFrame('connected', { type: 'connected', schedule });
}

export async function mockSseWithConnectedSchedule(
  page: Page,
  schedule: ScheduleDays
): Promise<void> {
  await page.route(/\/([^/]+\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([buildConnectedEvent(schedule)]),
    });
  });
}

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
            category: 'Italian',
            rating: 0,
            isVegetarian: false,
            isHealthyChoice: false,
            isDiscoverable: false,
            sourceType: RecipeDto_sourceTypeObject.Url,
            canReimport: true,
            imageCount: 0,
            finishedDishIndex: -1,
            sourceUrl: 'https://example.com/recipe',
            ingredients: ['Ingredient 1', 'Ingredient 2'],
            recipeInstructions: [
              {
                '@type': 'HowToSection',
                name: 'Instructions',
                itemListElement: [
                  { '@type': 'HowToStep', text: 'Chop the onions and mince the garlic.' },
                  { '@type': 'HowToStep', text: 'Saute until golden and fragrant.' },
                ],
              },
            ] as unknown as UntypedNode,
            isReady: true,
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
    browseViewMode: 'stack',
    preferredLanguage: 'en' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  /**
   * Converts a list of ingredient display names into GroceryLineItemDto objects.
   * Each ingredient defaults to the 'Pantry' section unless a section map is provided.
   * Use this to populate `groceryItems` on mock schedule responses so that
   * `weekStore.groceryItems` is populated and `GroceryList` renders items.
   */
  groceryItems: (
    names: string[],
    sectionMap: Record<string, string> = {}
  ): Array<{
    displayName: string;
    normalizedKey: string;
    section: string;
    quantity: number | null;
    unitText: string | null;
    recipeIds: string[];
  }> =>
    names.map((name) => ({
      displayName: name,
      normalizedKey: name.toLowerCase().replace(/\s+/g, '_'),
      section: sectionMap[name] ?? 'Pantry',
      quantity: null,
      unitText: null,
      recipeIds: [],
    })),

  recipeShareBundle: (overrides: Partial<RecipeShareBundleDto> = {}): RecipeShareBundleDto => ({
    version: '1.0',
    recipe: {
      name: 'Mock Recipe',
      description: 'A delicious mock recipe for testing.',
      ingredients: ['Ingredient 1', 'Ingredient 2'],
      instructions: ['Step 1', 'Step 2'],
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      totalTimeMinutes: 30,
      servings: 4,
      sourceUrl: 'https://example.com/recipe',
      sourceName: 'Example Kitchen',
      category: 'Italian',
      isSynthesized: false,
    },
    info: {
      exportedAtUtc: new Date('2026-05-14T16:00:00Z'),
      bundleSource: 'wfs-share' as any,
      appVersion: '0.1.0',
    },
    hero: {
      mimeType: 'image/jpeg',
      base64: 'ZmFrZS1oZXJv',
    },
    originals: [
      {
        mimeType: 'image/jpeg',
        base64: 'ZmFrZS1vcmlnaW5hbC0x',
      },
    ],
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
      await route.fallback();
    }
  });

  // GET /api/family/me
  await page.route('**/api/family/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: builders.familyMember() }),
    });
  });

  // PUT /api/family/{id}/preferences
  await page.route('**/api/family/*/preferences', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as {
        browseViewMode?: 'stack' | 'list';
        preferredLanguage?: string;
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: builders.familyMember({
            browseViewMode: body.browseViewMode ?? 'stack',
            preferredLanguage: (body.preferredLanguage ?? 'en') as any,
          }),
        }),
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

  // GET /api/schedule (default empty week) — predicate used to match URLs with query strings (e.g. ?weekOffset=0)
  await page.route(
    (url) => url.pathname === '/api/schedule',
    async (route) => {
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
              groceryState: {},
            },
          }),
        });
      } else {
        await route.continue();
      }
    }
  );

  // GET /api/recipes/library-summary — registered AFTER the wildcard so LIFO gives it priority
  await page.route('**/api/recipes/library-summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          total: 3,
          neverCooked: 1,
          ratings: { love: 1, like: 1, dislike: 0, unrated: 1 },
        },
      }),
    });
  });

  // GET /api/recipes?order=explore (Browse All Stack paged loading) — registered AFTER the wildcard so LIFO gives it priority
  await page.route('**/api/recipes?**order=explore**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        updatedAt: new Date().toISOString(),
        recipes: [builders.recipe(), builders.recipe(), builders.recipe()],
        pagination: { page: 1, limit: 20, total: 3 },
      }),
    });
  });

  // GET /api/recipes/recommendations
  await page.route('**/api/recipes/recommendations', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { topPick: null, results: [] } }),
    });
  });

  // POST /api/recipes/search
  await page.route('**/api/recipes/search', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          topPick: null,
          results: [],
          appliedFilters: {},
          searchMode: 'standard',
          resultPath: 'lexical-only',
        },
      }),
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

  // POST /api/recipes/{id}/import
  await page.route('**/api/recipes/*/import', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'queued' }),
      });
    } else {
      await route.fallback();
    }
  });

  // POST /api/recipes/{id}/originals
  await page.route('**/api/recipes/*/originals', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: MOCK_IDS.PHOTO_NEW }),
      });
    } else {
      await route.fallback();
    }
  });

  // POST /api/recipes/{id}/hero/regenerate
  await page.route('**/api/recipes/*/hero/regenerate', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'queued' }),
      });
    } else {
      await route.fallback();
    }
  });

  // GET /api/recipes/{id}/share
  await page.route('**/api/recipes/*/share', async (route) => {
    if (route.request().method() === 'GET') {
      const id =
        route
          .request()
          .url()
          .match(/\/recipes\/([0-9a-f-]+)\/share/)?.[1] ?? MOCK_IDS.RECIPE_LASAGNA;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: builders.recipeShareBundle({
            recipe: {
              ...builders.recipeShareBundle().recipe,
              name: REALISTIC_RECIPES[id]?.name ?? 'Mock Recipe',
            },
          }),
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // GET /api/recipes/{recipeId}/original/{photoIndex}
  await page.route('**/api/recipes/*/original/*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from([]) });
  });

  // GET /api/recipes (List) — registered BEFORE **/api/recipes/* to take priority
  await page.route(
    (url) => url.pathname.endsWith('/api/recipes'),
    async (route) => {
      const url = new URL(route.request().url());
      const order = url.searchParams.get('order');

      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: builders.recipe(), updatedAt: new Date().toISOString() }),
        });
      } else {
        const isDiscoverableOnly = url.searchParams.get('discoverableOnly') === 'true';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            recipes:
              order === 'explore'
                ? [
                    builders.recipe({
                      id: isDiscoverableOnly ? MOCK_IDS.RECIPE_GOTO_STUB : MOCK_IDS.RECIPE_LASAGNA,
                      name: isDiscoverableOnly ? 'Discoverable Recipe' : 'Mock Recipe',
                    }),
                  ]
                : [],
            updatedAt: new Date().toISOString(),
            pagination: { page: 1, limit: 20, total: order === 'explore' ? 1 : 0 },
          }),
        });
      }
    }
  );

  // GET /api/recipes/library-summary — registered BEFORE **/api/recipes/* to take priority
  await page.route(
    (url) => url.pathname.endsWith('/api/recipes/library-summary'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            total: 1,
            neverCooked: 1,
            ratings: { love: 0, like: 0, dislike: 0, unrated: 1 },
          },
        }),
      });
    }
  );

  // GET /api/recipes/{id}, PATCH /api/recipes/{id}, DELETE /api/recipes/{id}
  await page.route('**/api/recipes/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      const id =
        route
          .request()
          .url()
          .match(/\/recipes\/([0-9a-f-]+)$/)?.[1] ?? MOCK_IDS.RECIPE_LASAGNA;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: builders.recipe({ id, deletedAt: new Date() }),
        }),
      });
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

  // POST /api/recipes/import-bundle — registered AFTER **/api/recipes/* so LIFO gives it priority
  await page.route('**/api/recipes/import-bundle', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as RecipeShareBundleDto;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: builders.recipe({
            id: MOCK_IDS.RECIPE_GOTO_STUB,
            name: body.recipe?.name ?? 'Imported Recipe',
            description: body.recipe?.description ?? null,
            imageUrl: null,
            ingredients: body.recipe?.ingredients ?? [],
            sourceUrl: body.recipe?.sourceUrl ?? null,
            sourceType: body.recipe?.sourceUrl
              ? RecipeDto_sourceTypeObject.Url
              : RecipeDto_sourceTypeObject.Synthesized,
            canReimport: false,
            isReady: true,
          }),
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // GET /api/recipes/trash — registered AFTER the wildcard so LIFO gives it priority
  await page.route('**/api/recipes/trash', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items: [] } }),
    });
  });

  // POST /api/recipes/*/restore — registered AFTER the wildcard so LIFO gives it priority
  await page.route('**/api/recipes/*/restore', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: builders.recipe() }),
    });
  });

  // DELETE /api/recipes/*/purge
  await page.route('**/api/recipes/*/purge', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { purged: true } }),
    });
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

  // PATCH /api/schedule/{weekOffset}/grocery/item
  await page.route('**/api/schedule/*/grocery/item', async (route) => {
    await route.fulfill({ status: 204 });
  });

  // PATCH /api/schedule/{weekOffset}/grocery
  await page.route('**/api/schedule/*/grocery', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
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

  // POST /api/management/backfill-search
  await page.route('**/api/management/backfill-search', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Search index backfill triggered in the background.' }),
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

  // POST /api/management/demo-capture
  await page.route('**/api/management/demo-capture', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Demo capture task enqueued.',
        taskId: MOCK_IDS.RECIPE_LASAGNA,
      }),
    });
  });

  // POST /api/management/demo-restore
  await page.route('**/api/management/demo-restore', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Demo restore task enqueued.',
        taskId: MOCK_IDS.RECIPE_LASAGNA,
      }),
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

  // GET /api/health
  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'Healthy',
        timestamp: new Date().toISOString(),
        checks: {},
        demoMode: false,
      }),
    });
  });

  // GET /api/stream — SSE endpoint
  //
  // BS-10 NOTE: route.fulfill() closes the HTTP response immediately after the body is sent.
  // This causes the browser's EventSource to see a dropped connection and automatically
  // reconnect. The reconnect loop is harmless because every reconnect receives the same
  // `connected` event with the same snapshot. Tests that assert on UI state MUST do so
  // AFTER the `connected` event has been processed (use waitFor on the resulting DOM state,
  // not on connection state). Do NOT assert on the EventSource being "open" — it will
  // always be in a reconnecting state after fulfill() closes the response.
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([buildConnectedEvent()]),
    });
  });

  // PATCH /api/ingredients/{normalizedKey}/category
  await page.route('**/api/ingredients/*/category', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({ status: 204 });
    } else {
      await route.continue();
    }
  });

  // GET /api/goto and PUT /api/goto
  // Per-test in-memory store for GOTO items
  let gotoItems: any[] = [];
  await page.route('**/api/goto', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: gotoItems } }),
      });
    } else if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      gotoItems = body.items || [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: body }),
      });
    } else {
      await route.fallback();
    }
  });

  // GET /api/goto/active
  await page.route('**/api/goto/active', async (route) => {
    const readyItem = gotoItems.find((i) => i.status === 'ready');
    if (readyItem) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: readyItem }),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      });
    }
  });

  // GET /api/settings/{key} and POST /api/settings/{key}
  // Per-test in-memory store (reset each time setupCommonRoutes is called in beforeEach)
  const settingsStore: Record<string, unknown> = {
    // family_goto is now handled via /api/goto
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

  // POST /api/photo-search
  await page.route('**/api/photo-search', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          intent: 'inventory',
          query: 'chicken pasta tomatoes',
          inferredIngredients: ['chicken', 'pasta', 'tomatoes'],
          confidence: 0.85,
          pantrySnapshotId: MOCK_IDS.INVENTORY_CAPTURE,
        },
      }),
    });
  });

  // POST /api/inventory-captures (Task 13)
  await page.route('**/api/inventory-captures', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          snapshotId: MOCK_IDS.INVENTORY_CAPTURE,
          inferredIngredients: ['chicken', 'pasta', 'tomatoes'],
          confidence: 0.85,
        },
      }),
    });
  });

  // GET /api/inventory-captures/{id} (Task 13)
  await page.route('**/api/inventory-captures/*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          snapshotId: MOCK_IDS.INVENTORY_CAPTURE,
          inferredIngredients: ['chicken', 'pasta', 'tomatoes'],
          confidence: 0.85,
        },
      }),
    });
  });

  // GET /api/captures/failures (Task 18)
  await page.route('**/api/captures/failures', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items: [] } }),
    });
  });

  // POST /api/captures/failures/*/retry (Task 18)
  await page.route('**/api/captures/failures/*/retry', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ data: { queued: true } }),
    });
  });

  // DELETE /api/captures/failures/{id} (Task 18)
  await page.route('**/api/captures/failures/*', async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          cleared: true,
          cleanupCommandId: MOCK_IDS.CLEANUP_COMMAND,
        },
      }),
    });
  });
}

// ---------------------------------------------------------------------------
// SSE mock helpers — exported for per-test overrides
// ---------------------------------------------------------------------------
//
// All helpers override the /api/stream route for the given page. They always
// emit the `connected` event first (with the default 7-day empty schedule),
// then the target event, in a single body string. This satisfies the
// EventSource contract: the client receives the snapshot before any push.
//
// BS-10 REMINDER: route.fulfill() closes the connection. EventSource will
// reconnect automatically. Tests must assert on DOM state (via waitFor),
// not on connection state. The reconnect loop is harmless — every reconnect
// receives the same `connected` event.

/**
 * Mocks the SSE stream to emit a `slot_updated` event after the initial
 * `connected` snapshot. Use this to simulate a recipe being assigned or
 * removed from a specific day slot.
 *
 * @param page - Playwright Page instance
 * @param slotUpdate - The slot update payload: date (YYYY-MM-DD), recipe (or null), status
 */
export async function mockSseWithSlotUpdate(
  page: Page,
  slotUpdate: { date: string; recipe: ScheduleRecipeDto | null; status: number }
): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('slot_updated', { type: 'slot_updated', ...slotUpdate }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit a `week_updated` event after the initial
 * `connected` snapshot. Use this to simulate a full week snapshot push
 * (e.g. after lock, voting open, or move).
 *
 * @param page - Playwright Page instance
 * @param schedule - The full ScheduleDays snapshot to push
 */
export async function mockSseWithWeekUpdate(page: Page, schedule: ScheduleDays): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('week_updated', { type: 'week_updated', schedule }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit a `slot_updated` event representing an
 * "Order In" action (recipe: null, status: 3) for the given date.
 *
 * @param page - Playwright Page instance
 * @param date - The date string (YYYY-MM-DD) of the ordered-in slot
 */
export async function mockSseWithOrderIn(page: Page, date: string): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('slot_updated', { type: 'slot_updated', date, recipe: null, status: 3 }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit a `fill_the_gap_invalidated` event after the
 * initial `connected` snapshot. Use this to simulate a recipe being assigned
 * or removed, invalidating any open Quick Find modal's suggestion list.
 *
 * @param page - Playwright Page instance
 * @param weekOffset - The week offset that was invalidated (defaults to 0)
 */
export async function mockSseWithFillTheGapInvalidated(page: Page, weekOffset = 0): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('fill_the_gap_invalidated', {
          type: 'fill_the_gap_invalidated',
          weekOffset,
        }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit a `smart_defaults_updated` event after the
 * initial `connected` snapshot. Use this to simulate the smart-defaults
 * threshold being crossed and pre-selected recipes being pushed to clients.
 *
 * @param page - Playwright Page instance
 * @param defaults - The SmartDefaultsDto payload to push
 */
export async function mockSseWithSmartDefaultsUpdated(
  page: Page,
  defaults: SmartDefaultsDto
): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('smart_defaults_updated', {
          type: 'smart_defaults_updated',
          weekOffset: defaults.weekOffset ?? 0,
          defaults,
        }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit a `recipe_ready` event after the initial
 * `connected` snapshot. Use this to simulate a GOTO recipe synthesis
 * completing — replaces the polling-based GOTO status check.
 *
 * The `connected` event is emitted first so the store is seeded before the
 * `recipe_ready` event arrives. Both frames are sent in a single body string
 * (BS-10: route.fulfill() closes the connection; EventSource reconnects, but
 * the UI state is already set from the first connection's events).
 *
 * @param page     - Playwright Page instance
 * @param recipeId - The recipe ID that has finished synthesis
 */
export async function mockSseWithRecipeReady(page: Page, recipeId: string): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('recipe_ready', { type: 'recipe_ready', recipeId }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit a `vote_updated` event after the initial
 * `connected` snapshot. Use this to simulate a family member voting on a
 * discovery recipe — triggers `hasFamilyInterest` update and re-ranking in
 * `discoveryStore.applyVoteUpdate`.
 *
 * @param page      - Playwright Page instance
 * @param recipeId  - The recipe ID that received the vote
 * @param voteCount - The new total vote count for the recipe
 */
export async function mockSseWithVoteUpdated(
  page: Page,
  recipeId: string,
  voteCount: number
): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('vote_updated', { type: 'vote_updated', recipeId, voteCount }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit a `grocery_updated` event after the initial
 * `connected` snapshot. Use this to simulate a family member toggling a
 * grocery item — triggers `plannerStore.setGroceryState` on all connected
 * clients for the given week.
 *
 * @param page         - Playwright Page instance
 * @param weekOffset   - The week offset the grocery state belongs to
 * @param groceryState - Map of ingredient name → checked boolean
 */
export async function mockSseWithGroceryUpdated(
  page: Page,
  weekOffset: number,
  groceryState: Record<string, boolean>
): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('grocery_updated', { type: 'grocery_updated', weekOffset, groceryState }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit an enriched `recipe_ready` event (with name
 * and imageUrl) after the initial `connected` snapshot.
 *
 * Use this to test the MinimalCapture success screen transition from "queued"
 * to "ready" — the enriched payload is required so the screen can show
 * "[Name] is ready!" and `captureStore.addPending` is matched by recipeId.
 *
 * @param page      - Playwright Page instance
 * @param recipeId  - The recipe ID that has finished synthesis
 * @param name      - The recipe name to display in the ready heading
 * @param imageUrl  - Optional hero image URL
 */
export async function mockSseWithRecipeReadyEnriched(
  page: Page,
  recipeId: string,
  name: string,
  imageUrl?: string
): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('recipe_ready', {
          type: 'recipe_ready',
          recipeId,
          name,
          imageUrl: imageUrl ?? null,
        }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit a `recipe_failed` event after the initial
 * `connected` snapshot. Use this to test the RecipeFailureBanner appearing
 * when a recipe synthesis workflow fails (all retries exhausted).
 *
 * The `recipe_failed` handler in `useScheduleStream` only pushes a notification
 * if the recipe is in `captureStore.pendingRecipes`. Tests must seed the store
 * via `page.evaluate` before navigating.
 *
 * @param page         - Playwright Page instance
 * @param recipeId     - The recipe ID that failed synthesis
 * @param errorMessage - Human-readable error description
 * @param failedStep   - The workflow step that failed
 * @param partialData  - Optional partial recipe data (name, imageUrl) recovered before failure
 */
export async function mockSseWithRecipeFailed(
  page: Page,
  recipeId: string,
  errorMessage: string,
  failedStep: string,
  partialData?: { name?: string; imageUrl?: string }
): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('recipe_failed', {
          type: 'recipe_failed',
          recipeId,
          errorMessage,
          failedStep,
          partialData: partialData ?? null,
        }),
      ]),
    });
  });
}
