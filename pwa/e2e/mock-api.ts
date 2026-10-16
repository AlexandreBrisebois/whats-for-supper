import { type Page, type Route } from '@playwright/test';
import type { CalendarContext } from '../src/lib/deployment-calendar';
import {
  type RecipeDto,
  type RecipeImportIssueDto,
  type RecipeImportIssueRequest,
  RecipeImportIssueReasonObject,
  RecipeImportIssueStatusObject,
  type RecipeShareBundleDto,
  RecipeDto_sourceType,
  RecipeDto_sourceTypeObject,
  type ScheduleRecipeDto,
  type ScheduleDays,
  type SmartDefaultsDto,
  WorkflowInstanceDetailDto_statusObject,
} from '../src/lib/api/generated/models/index';
import {
  type FamilyGetResponse,
  type FamilyGetResponse_data,
} from '../src/lib/api/generated/api/family/index';
import type { FeatureFlagDto } from '../src/lib/api/generated/models/index';
import { type UntypedNode } from '@microsoft/kiota-abstractions';
import { MOCK_IDS } from '../src/testing/mock-ids';
import { REALISTIC_RECIPES, REALISTIC_SCHEDULE_RECIPES } from '../src/testing/realistic-recipes';
import { builders, currentMonday, toDateStr } from '../src/testing/builders';

export { MOCK_IDS, builders, currentMonday, toDateStr };

const FIXED_E2E_TIMESTAMP = '2026-05-04T12:00:00.000Z';

const FILTER_MAIN_IDS = {
  BEEF: 'beef',
  POULTRY: 'poultry',
  PORK: 'pork',
  FISH: 'fish',
  PASTA: 'pasta',
  VEGETARIAN: 'vegetarian',
} as const;

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
  return builders.scheduleDays() as unknown as ScheduleDays;
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
 * Stateful feature-flag API mock. PATCH updates the selected member's override,
 * and subsequent GET requests return the confirmed effective state.
 */
export async function mockFeatureFlags(
  page: Page,
  initialFlags: FeatureFlagDto[] = []
): Promise<void> {
  const definitions = new Map(
    initialFlags.filter((flag) => flag.key).map((flag) => [flag.key as string, { ...flag }])
  );
  const overrides = new Map<string, Map<string, boolean>>();

  const memberIdFor = (request: { headers(): Record<string, string> }) =>
    request.headers()['x-family-member-id'] || MOCK_IDS.MEMBER_ALEX;

  const snapshotFor = (memberId: string) =>
    [...definitions.values()].map((definition) => {
      if (definition.mode === 'on') return { ...definition, enabled: true };
      if (definition.mode === 'off') return { ...definition, enabled: false };
      const memberEnabled =
        overrides.get(memberId)?.get(definition.key as string) ?? definition.memberEnabled ?? false;
      return { ...definition, enabled: memberEnabled, memberEnabled };
    });

  await page.route('**/api/feature-flags/*', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    const key = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() ?? '');
    const definition = definitions.get(key);
    if (!definition) {
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    }
    if (definition.mode !== 'opt-in') {
      return route.fulfill({ status: 409, contentType: 'application/json', body: '{}' });
    }

    const body = route.request().postDataJSON() as { enabled?: unknown };
    if (typeof body.enabled !== 'boolean') {
      return route.fulfill({ status: 400, contentType: 'application/json', body: '{}' });
    }

    const memberId = memberIdFor(route.request());
    const memberOverrides = overrides.get(memberId) ?? new Map<string, boolean>();
    memberOverrides.set(key, body.enabled);
    overrides.set(memberId, memberOverrides);
    const updated = snapshotFor(memberId).find((flag) => flag.key === key);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: updated }),
    });
  });

  await page.route('**/api/recipes/capture-pdf', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') return route.fallback();
    const reject = (status: number, message: string) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ status, message }),
      });
    const memberId = request.headers()['x-family-member-id'];
    if (!memberId || ![MOCK_IDS.MEMBER_ALEX, MOCK_IDS.MEMBER_JORDAN].includes(memberId))
      return reject(400, 'An established family member is required.');
    if (
      !snapshotFor(memberId).some(
        (flag) => flag.key === 'preview-pdf-recipe-import' && flag.enabled
      )
    )
      return reject(409, "PDF import preview isn't enabled. This file hasn't been added.");
    if (!request.headers()['content-type']?.startsWith('multipart/form-data'))
      return reject(415, 'Choose a PDF file.');
    try {
      const payload = request.postDataBuffer();
      const form = await new Response(payload ? new Uint8Array(payload) : null, {
        headers: { 'content-type': request.headers()['content-type'] },
      }).formData();
      const files = [...form.values()].filter((value) => typeof value !== 'string');
      const file = form.get('file');
      if (
        files.length !== 1 ||
        !file ||
        typeof file === 'string' ||
        form.getAll('file').length !== 1
      )
        return reject(400, 'Choose exactly one PDF.');
      if (file.size > 20971520) return reject(413, 'Choose a PDF up to 20 MiB.');
      if (!file.size) return reject(400, 'Choose a PDF file.');
      if (
        !file.name.toLowerCase().endsWith('.pdf') ||
        file.type.toLowerCase() !== 'application/pdf'
      )
        return reject(415, 'Choose a PDF file.');
      if (
        [...form.keys()].some((key) => !['file', 'rating', 'notes'].includes(key)) ||
        form.getAll('rating').length > 1 ||
        form.getAll('notes').length > 1
      )
        return reject(400, 'The upload metadata is invalid.');
      const raw = form.get('rating');
      if (
        raw !== null &&
        (typeof raw !== 'string' ||
          !/^[+-]?\d+$/.test(raw.trim()) ||
          Number(raw) < 0 ||
          Number(raw) > 3)
      )
        return reject(400, 'Choose a rating between 0 and 3.');
      return route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: MOCK_IDS.RECIPE_LASAGNA } }),
      });
    } catch {
      return reject(400, 'The upload form is invalid.');
    }
  });

  await page.route('**/api/feature-flags', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const items = snapshotFor(memberIdFor(route.request()));
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items } }),
    });
  });
}

/**
 * Setup common API routes with sane defaults.
 */
export async function setupCommonRoutes(page: Page, calendarContext?: CalendarContext) {
  const scheduleEntries = new Map<
    string,
    { recipe: ScheduleRecipeDto | null; status: number; nonCooking?: any }
  >();
  const weekStatuses = new Map<string, number>();
  const scheduleCalendar = calendarContext ?? builders.deploymentCalendar();
  function readReference(url: URL): string | null {
    const reference =
      url.searchParams.get('referenceWeekStartDate') ?? scheduleCalendar.referenceWeekStartDate;
    const date = new Date(`${reference}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(reference) &&
      Number.isFinite(date.getTime()) &&
      toDateStr(date) === reference &&
      date.getUTCDay() === 1
      ? reference
      : null;
  }
  const addDays = (date: string, days: number) =>
    toDateStr(new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000));
  const makeSchedule = (weekOffset: number, reference: string) => {
    const schedule = builders.scheduleDays(weekOffset, {
      ...scheduleCalendar,
      referenceWeekStartDate: reference,
    });
    schedule.status = weekStatuses.get(schedule.weekStartDate) ?? 0;
    schedule.locked = schedule.status === 2;
    for (const day of schedule.days) {
      const entry = scheduleEntries.get(day.date);
      if (entry) Object.assign(day, entry);
    }
    return schedule;
  };
  const emitSchedule = async (weekOffset: number, reference: string) =>
    page.evaluate(
      (schedule) => {
        const source = (window as any).__sseSource as EventSource | undefined;
        source?.dispatchEvent(
          new MessageEvent('week_updated', {
            data: JSON.stringify({ type: 'week_updated', schedule }),
          })
        );
      },
      makeSchedule(weekOffset, reference)
    );
  let activeImportIssue: RecipeImportIssueDto | null = null;
  let activeImportId: string | null = null;
  let importStatusReads = 0;

  await mockFeatureFlags(page);

  // Stateful family creation: POST 201 is visible in subsequent GETs.
  const familyMembers = [
    builders.familyMember({ name: 'Alex' }),
    builders.familyMember({ id: MOCK_IDS.MEMBER_JORDAN, name: 'Jordan' }),
  ];
  let createdMemberCount = 0;
  // GET /api/family
  await page.route('**/api/family', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: familyMembers,
        }),
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { name: string };
      const trimmed = (body.name || '').trim();
      const normalized = trimmed.toLowerCase();
      const duplicate = familyMembers.some(
        (m) => (m.name ?? '').trim().toLowerCase() === normalized
      );
      if (duplicate) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 409,
            message: 'A family member with this name already exists.',
          }),
        });
        return;
      }
      // Deterministic distinct GUIDs based on the shared test-member namespace.
      const id =
        MOCK_IDS.MEMBER_TEST.slice(0, -12) +
        String(Number(MOCK_IDS.MEMBER_TEST.slice(-12)) + createdMemberCount++).padStart(12, '0');
      const member = builders.familyMember({
        id,
        name: trimmed,
        preferredLanguage: null,
      });
      familyMembers.push(member);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: member }),
      });
    } else {
      await route.fallback();
    }
  });

  // GET /api/family/me - Dynamic based on cookie
  await page.route('**/api/family/me', async (route) => {
    const cookies = await page.context().cookies();
    const cookie = cookies.find((c) => c.name === 'x-family-member-id');
    const memberId = cookie?.value || MOCK_IDS.MEMBER_ALEX;
    const name = memberId === MOCK_IDS.MEMBER_JORDAN ? 'Jordan' : 'Alex';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      body: JSON.stringify({ data: builders.familyMember({ id: memberId, name }) }),
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
        const url = new URL(route.request().url());
        const reference = readReference(url);
        if (!reference)
          return route.fulfill({
            status: 400,
            json: { message: 'referenceWeekStartDate must be a yyyy-MM-dd Monday.' },
          });
        const weekOffset = Number(url.searchParams.get('weekOffset') ?? 0);
        const schedule = makeSchedule(weekOffset, reference);
        await route.fulfill({ json: { data: schedule } });
      } else {
        await route.continue();
      }
    }
  );

  // POST /api/schedule/day/{date} (Assign/Validate recipe)
  await page.route('**/api/schedule/day/*', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { message: 'Day updated' } }),
      });
    } else {
      await route.continue();
    }
  });

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

  // GET /api/recipes/search/filters — materialized metadata fallback
  await page.route('**/api/recipes/search/filters', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        generatedAt: null,
        main: [
          { id: FILTER_MAIN_IDS.BEEF, concept: 'beef', label: null },
          { id: FILTER_MAIN_IDS.POULTRY, concept: 'poultry', label: null },
          { id: FILTER_MAIN_IDS.PORK, concept: 'pork', label: null },
          { id: FILTER_MAIN_IDS.FISH, concept: 'fish', label: null },
          { id: FILTER_MAIN_IDS.PASTA, concept: 'pasta', label: null },
          { id: FILTER_MAIN_IDS.VEGETARIAN, concept: 'vegetarian', label: null },
        ],
        mealTypes: ['Supper', 'Lunch', 'Breakfast', 'Dessert'],
        cuisines: { promoted: [], all: [] },
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
      const id =
        route
          .request()
          .url()
          .match(/\/recipes\/([0-9a-f-]+)$/)?.[1] ?? MOCK_IDS.RECIPE_LASAGNA;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipe: builders.recipe({ id, importIssue: activeImportIssue }),
          updatedAt: FIXED_E2E_TIMESTAMP,
        }),
      });
    }
  });

  // POST/DELETE /api/recipes/{id}/import-report — registered after the recipe wildcard for priority
  await page.route('**/api/recipes/*/import-report', async (route) => {
    const request = route.request();
    const method = request.method();
    const id =
      request.url().match(/\/recipes\/([0-9a-f-]+)\/import-report/)?.[1] ?? MOCK_IDS.RECIPE_LASAGNA;

    if (method === 'POST') {
      const body = request.postDataJSON() as RecipeImportIssueRequest;
      const reasons = body.reasons ?? [];
      const note = body.note?.trim() || null;
      const contentOnly =
        reasons.length > 0 &&
        reasons.every(
          (reason) =>
            reason === RecipeImportIssueReasonObject.Ingredients ||
            reason === RecipeImportIssueReasonObject.Steps
        );
      const reimportStarted =
        builders.recipe({ id }).canReimport === true && contentOnly && note !== null;
      activeImportIssue = {
        reasons,
        note,
        isReimporting: reimportStarted,
        status: RecipeImportIssueStatusObject.Reported,
      };
      activeImportId = reimportStarted ? MOCK_IDS.PHOTO_NEW : null;
      importStatusReads = 0;
    } else if (method === 'DELETE') {
      activeImportIssue = null;
      activeImportId = null;
    } else {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        updatedAt: FIXED_E2E_TIMESTAMP,
        recipe: builders.recipe({ id, importIssue: activeImportIssue }),
        reimportStarted: activeImportId !== null,
        ...(activeImportId ? { importId: activeImportId } : {}),
        reimportLaunchFailed: false,
      }),
    });
  });

  // GET /api/recipe-imports/{importId} — deterministic pending then completed polling.
  await page.route('**/api/recipe-imports/*', async (route) => {
    if (route.request().method() !== 'GET' || activeImportId === null) {
      await route.fallback();
      return;
    }

    importStatusReads += 1;
    const completed = importStatusReads > 1;
    if (completed && activeImportIssue) {
      activeImportIssue = {
        ...activeImportIssue,
        isReimporting: false,
        status: RecipeImportIssueStatusObject.ReadyToReview,
      };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: activeImportId,
        workflowId: 'recipe-import',
        status: completed
          ? WorkflowInstanceDetailDto_statusObject.Completed
          : WorkflowInstanceDetailDto_statusObject.Processing,
        tasks: [],
        createdAt: FIXED_E2E_TIMESTAMP,
        updatedAt: FIXED_E2E_TIMESTAMP,
      }),
    });
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

  await mockFeatureFlags(page);

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
  await page.route('**/api/schedule/assign**', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const reference = readReference(new URL(route.request().url()));
    if (!reference)
      return route.fulfill({
        status: 400,
        json: { message: 'referenceWeekStartDate must be a yyyy-MM-dd Monday.' },
      });
    const body = route.request().postDataJSON();
    const schedule = builders.scheduleDays(body.weekOffset, {
      ...scheduleCalendar,
      referenceWeekStartDate: reference,
    });
    const day = schedule.days[body.dayIndex];
    if (!day) return route.fulfill({ status: 400, json: { message: 'Invalid dayIndex.' } });
    const existing = scheduleEntries.get(day.date);
    let displacedRecipe = null;
    if (body.dayIndex === 6 && existing?.recipe) {
      const nextWeek = builders.scheduleDays(body.weekOffset + 1, {
        ...scheduleCalendar,
        referenceWeekStartDate: reference,
      });
      scheduleEntries.set(nextWeek.days[0].date, existing);
      displacedRecipe = {
        id: existing.recipe.id,
        name: existing.recipe.name,
        movedToWeekOffset: body.weekOffset + 1,
        movedToDayIndex: 0,
      };
    }
    scheduleEntries.set(day.date, {
      recipe: builders.scheduleRecipe({ id: body.recipeId }),
      status: 0,
    });
    await route.fulfill({ json: { data: { message: 'Recipe assigned', displacedRecipe } } });
    for (const slot of schedule.days) {
      const entry = scheduleEntries.get(slot.date);
      if (entry) Object.assign(slot, entry);
    }
    await page.evaluate((snapshot) => {
      const source = (window as any).__sseSource as EventSource | undefined;
      source?.dispatchEvent(
        new MessageEvent('week_updated', {
          data: JSON.stringify({ type: 'week_updated', schedule: snapshot }),
        })
      );
    }, schedule);
  });

  const setWeekStatus = (status: number) => async (route: Route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const url = new URL(route.request().url());
    const reference = readReference(url);
    if (!reference)
      return route.fulfill({
        status: 400,
        json: { message: 'Invalid referenceWeekStartDate.' },
      });
    const offset = Number(url.searchParams.get('weekOffset') ?? 0);
    const schedule = makeSchedule(offset, reference);
    weekStatuses.set(schedule.weekStartDate, status);
    if (status === 2)
      for (const day of schedule.days) {
        const entry = scheduleEntries.get(day.date);
        if (entry?.recipe && entry.status === 0) entry.status = 1;
      }
    await route.fulfill({
      json: { data: { message: status === 2 ? 'Schedule locked' : 'Voting opened' } },
    });
    await emitSchedule(offset, reference);
  };
  await page.route('**/api/schedule/lock**', setWeekStatus(2));
  await page.route('**/api/schedule/voting/open**', setWeekStatus(1));

  await page.route('**/api/schedule/move**', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const reference = readReference(new URL(route.request().url()));
    if (!reference)
      return route.fulfill({ status: 400, json: { message: 'Invalid referenceWeekStartDate.' } });
    const body = route.request().postDataJSON();
    const monday = addDays(reference, body.weekOffset * 7);
    const targetOffset = body.targetWeekOffset ?? body.weekOffset;
    let sourceDate = body.fromIndex == null ? undefined : addDays(monday, body.fromIndex);
    if (!sourceDate || !scheduleEntries.has(sourceDate))
      sourceDate = [...scheduleEntries].find(
        ([date, entry]) =>
          entry.recipe?.id === body.recipeId &&
          (targetOffset !== body.weekOffset || (date >= monday && date <= addDays(monday, 6)))
      )?.[0];
    const source = sourceDate ? scheduleEntries.get(sourceDate) : undefined;
    if (sourceDate && source && source.recipe?.id === body.recipeId) {
      let destination = addDays(reference, targetOffset * 7 + body.toIndex);
      let canMove = true;
      if (targetOffset !== body.weekOffset) {
        let index = body.toIndex;
        while (index < 7 && scheduleEntries.has(addDays(reference, targetOffset * 7 + index)))
          index++;
        canMove = index < 7;
        destination = addDays(reference, targetOffset * 7 + index);
      } else if (body.intent === 'push') {
        let index = body.toIndex;
        while (index < 14 && scheduleEntries.has(addDays(monday, index))) index++;
        if (index < 14) {
          for (let position = index; position > body.toIndex; position--) {
            const previous = addDays(monday, position - 1);
            const entry = scheduleEntries.get(previous);
            if (entry) {
              scheduleEntries.delete(previous);
              scheduleEntries.set(addDays(monday, position), entry);
            }
          }
        } else {
          const occupied = scheduleEntries.get(destination);
          if (occupied) scheduleEntries.set(sourceDate, occupied);
        }
      } else {
        const occupied = scheduleEntries.get(destination);
        if (occupied) scheduleEntries.set(sourceDate, occupied);
      }
      if (canMove) {
        for (const [date, entry] of scheduleEntries)
          if (entry === source) scheduleEntries.delete(date);
        if (source.status === 3) {
          scheduleEntries.set(sourceDate, { ...source, recipe: null });
          scheduleEntries.set(destination, { recipe: source.recipe, status: 0 });
        } else scheduleEntries.set(destination, source);
      }
    }
    await route.fulfill({ json: { data: { message: 'Recipe moved' } } });
    await emitSchedule(body.weekOffset, reference);
  });

  await page.route('**/api/schedule/defer**', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const url = new URL(route.request().url());
    const reference = readReference(url);
    if (!reference)
      return route.fulfill({ status: 400, json: { message: 'Invalid referenceWeekStartDate.' } });
    const rawOffset = url.searchParams.get('targetWeekOffset');
    const targetOffset = rawOffset === null ? 1 : Number(rawOffset);
    const destinationTime = Date.parse(`${reference}T00:00:00Z`) + targetOffset * 7 * 86400000;
    if (
      (rawOffset !== null && !/^[+-]?\d+$/.test(rawOffset)) ||
      !Number.isInteger(targetOffset) ||
      targetOffset < -2147483648 ||
      targetOffset > 2147483647 ||
      !Number.isFinite(destinationTime) ||
      destinationTime < Date.parse('0001-01-01T00:00:00Z') ||
      destinationTime > Date.parse('9999-12-31T00:00:00Z')
    )
      return route.fulfill({ status: 400, json: { message: 'Invalid targetWeekOffset.' } });
    const start = toDateStr(new Date(destinationTime));
    const body = route.request().postDataJSON();
    const source = scheduleEntries.get(body.sourceDate);
    if (!source || !source.recipe || source.recipe.id !== body.recipeId)
      return route.fulfill({ status: 404, json: { message: 'Scheduled recipe not found.' } });
    if (source.status === 4)
      return route.fulfill({
        status: 409,
        json: { message: 'Meals awaiting consensus cannot be deferred.' },
      });
    let destination = start;
    while (scheduleEntries.has(destination)) destination = addDays(destination, 1);
    if (source.status === 3) scheduleEntries.set(body.sourceDate, { ...source, recipe: null });
    else scheduleEntries.delete(body.sourceDate);
    scheduleEntries.set(destination, { recipe: source.recipe, status: 0 });
    const destinationOffset = Math.floor(
      (Date.parse(destination) - Date.parse(reference)) / (7 * 86400000)
    );
    await route.fulfill({
      json: {
        data: {
          scheduledDate: destination,
          scheduledWeekOffset: destinationOffset,
          message: `${destinationOffset > targetOffset ? 'Next week is full. ' : ''}Moved meal to ${destination}.`,
        },
      },
    });
    await emitSchedule(
      Math.floor((Date.parse(body.sourceDate) - Date.parse(reference)) / (7 * 86400000)),
      reference
    );
    await emitSchedule(destinationOffset, reference);
  });

  await page.route('**/api/schedule/fill-the-gap**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    if (!readReference(new URL(route.request().url())))
      return route.fulfill({ status: 400, json: { message: 'Invalid referenceWeekStartDate.' } });
    await route.fulfill({ json: { data: [] } });
  });

  await page.route('**/api/schedule/day/*/remove', async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    const date = new URL(route.request().url()).pathname.split('/')[4];
    const removed = scheduleEntries.delete(date);
    await route.fulfill({ status: 204 });
    if (removed)
      await emitSchedule(
        Math.floor(
          (Date.parse(date) - Date.parse(scheduleCalendar.referenceWeekStartDate)) / (7 * 86400000)
        ),
        scheduleCalendar.referenceWeekStartDate
      );
  });

  await page.route(
    (url) => /^\/api\/schedule\/day\/[^/]+\/validate$/.test(url.pathname),
    async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const date = new URL(route.request().url()).pathname.split('/')[4];
      const body = route.request().postDataJSON();
      const previous = scheduleEntries.get(date);
      if (body.nonCooking && previous && (previous.recipe || previous.status !== 3))
        return route.fulfill({ status: 409, json: { status: 409, message: 'Day occupied' } });
      const viewedId = body.recipeId ?? previous?.recipe?.id;
      if (body.status === 2) {
        const knownRecipe = Object.entries(MOCK_IDS).some(
          ([key, id]) => key.startsWith('RECIPE_') && id === viewedId
        );
        if (!knownRecipe)
          return route.fulfill({ status: 404, json: { message: 'Recipe not found' } });
      }
      const mealMarkedCooked = body.status === 2 && previous?.recipe?.id === viewedId;
      if (body.status !== 2 || mealMarkedCooked) {
        const entry = {
          recipe: previous?.recipe ?? null,
          status: body.status,
          nonCooking:
            body.status === 3 && !previous?.recipe
              ? (body.nonCooking ?? previous?.nonCooking ?? { kind: 'order_in', customLabel: null })
              : null,
        };
        scheduleEntries.set(date, entry);
      }
      await route.fulfill({
        json: { data: { message: 'Cooking status updated', mealMarkedCooked } },
      });
      const entry = scheduleEntries.get(date);
      if (body.status !== 2 || mealMarkedCooked)
        await page.evaluate(
          (payload) => {
            const source = (window as any).__sseSource as EventSource | undefined;
            source?.dispatchEvent(
              new MessageEvent('slot_updated', { data: JSON.stringify(payload) })
            );
          },
          {
            date,
            recipe: entry?.recipe ?? null,
            status: body.status,
            nonCooking: entry?.nonCooking ?? null,
          }
        );
    }
  );

  await page.route('**/api/schedule/*/smart-defaults**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const url = new URL(route.request().url());
    const reference = readReference(url);
    if (!reference)
      return route.fulfill({ status: 400, json: { message: 'Invalid referenceWeekStartDate.' } });
    const offset = Number(url.pathname.split('/')[3]);
    const schedule = makeSchedule(offset, reference);
    await route.fulfill({
      json: {
        data: {
          weekOffset: offset,
          weekStartDate: schedule.weekStartDate,
          familySize: 2,
          consensusThreshold: 2,
          preSelectedRecipes: [],
          consensusRecipesCount: 0,
          openSlots: schedule.days.flatMap((day, dayIndex) =>
            scheduleEntries.has(day.date) ? [] : [{ dayIndex }]
          ),
        },
      },
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
      body: JSON.stringify({
        workflowId: MOCK_IDS.RECIPE_LASAGNA,
        workflowType: 'demo-restore',
        status: 0,
        createdAt: FIXED_E2E_TIMESTAMP,
        updatedAt: FIXED_E2E_TIMESTAMP,
        demoSnapshotReady: true,
        demoSnapshotMissing: [],
        demoRestoreSeederHealthy: true,
        demoRestoreSeederErrorCode: null,
      }),
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
        createdAt: FIXED_E2E_TIMESTAMP,
        updatedAt: FIXED_E2E_TIMESTAMP,
        tasks: [],
      }),
    });
  });

  // GET /api/workflows/tasks/{taskId}/diagnostics
  await page.route('**/api/workflows/tasks/*/diagnostics', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          taskId: MOCK_IDS.RECIPE_LASAGNA,
          instanceId: MOCK_IDS.RECIPE_LASAGNA,
          workflowId: 'recipe-import',
          taskName: 'extract-recipe',
          processorName: 'RecipeExtractionProcessor',
          status: 'Failed',
          retryCount: 1,
          errorMessage: 'The extractor returned no steps.',
          stackTrace: 'System.InvalidOperationException: missing steps',
          createdAt: FIXED_E2E_TIMESTAMP,
          updatedAt: FIXED_E2E_TIMESTAMP,
        },
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
        timestamp: FIXED_E2E_TIMESTAMP,
        checks: {},
        demoMode: false,
        demoModeRawValue: 'false',
        demoRestoreCronValid: true,
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
      body: buildSseBody([
        buildConnectedEvent(
          makeSchedule(0, scheduleCalendar.referenceWeekStartDate) as unknown as ScheduleDays
        ),
      ]),
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
 * Returns a `triggerWeekUpdated` function. Call it *after* `page.goto()`
 * and after a stable element is visible — this guarantees useScheduleStream
 * is mounted and `window.__sseSource` is set before the event fires,
 * eliminating the mount-race that caused flaky failures on CI.
 *
 * @param page - Playwright Page instance
 * @param schedule - The full ScheduleDays snapshot to push
 * @returns triggerWeekUpdated - call after page navigation to fire the event
 */
export async function mockSseWithWeekUpdate(
  page: Page,
  schedule: ScheduleDays
): Promise<{ triggerWeekUpdated: () => Promise<void> }> {
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

  const triggerWeekUpdated = async () => {
    await page.evaluate(
      (sched) => {
        const source = (window as unknown as Record<string, EventSource>).__sseSource;
        if (!source) throw new Error('__sseSource not found — useScheduleStream not mounted yet');
        const event = new MessageEvent('week_updated', {
          data: JSON.stringify({ type: 'week_updated', schedule: sched }),
        });
        source.dispatchEvent(event);
      },
      schedule as unknown as Record<string, unknown>
    );
  };

  return { triggerWeekUpdated };
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
          weekStartDate: builders.scheduleDays(weekOffset).weekStartDate,
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
          defaults: {
            ...defaults,
            weekStartDate:
              defaults.weekStartDate ??
              builders.scheduleDays(defaults.weekOffset ?? 0).weekStartDate,
          },
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
        buildSseFrame('grocery_updated', {
          type: 'grocery_updated',
          weekOffset,
          weekStartDate: builders.scheduleDays(weekOffset).weekStartDate,
          groceryState,
        }),
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

/** Stateful schedule boundary for non-cooking planner acceptance. */
export async function mockNonCookingSchedule(
  page: Page,
  schedule: import('../src/lib/api/generated/models').ScheduleDays
) {
  await mockSseWithConnectedSchedule(page, schedule);
  await page.route('**/api/schedule**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const days = schedule.days ?? [];
    const date = url.pathname.match(/\/day\/([^/]+)\//)?.[1];
    const day = days.find((item) => item.date === date);
    if (url.pathname === '/api/schedule' && method === 'GET') {
      await route.fulfill({ json: { data: schedule } });
      return;
    }
    if (url.pathname.endsWith('/smart-defaults')) {
      await route.fulfill({
        json: {
          data: {
            weekOffset: schedule.weekOffset,
            familySize: 3,
            consensusThreshold: 2,
            preSelectedRecipes: [],
            openSlots: days.flatMap((item, dayIndex) =>
              item.status !== 3 && !item.recipe ? [{ dayIndex }] : []
            ),
            consensusRecipesCount: 0,
          },
        },
      });
      return;
    }
    if (url.pathname.endsWith('/validate') && method === 'POST' && day) {
      if (day.recipe) {
        await route.fulfill({ status: 409, json: { status: 409, message: 'Day occupied' } });
        return;
      }
      const body = route.request().postDataJSON();
      day.status = body.status;
      day.nonCooking = body.nonCooking ?? day.nonCooking ?? { kind: 'order_in', customLabel: null };
      day.recipe = null;
      await route.fulfill({
        json: { data: { message: 'Day validated', mealMarkedCooked: false } },
      });
      return;
    }
    if (url.pathname.endsWith('/remove') && method === 'DELETE' && day) {
      day.status = 0;
      day.recipe = null;
      day.nonCooking = null;
      await route.fulfill({ status: 204 });
      return;
    }
    if (url.pathname.endsWith('/voting/open') && method === 'POST') {
      schedule.status = 1;
      schedule.locked = false;
      await route.fulfill({ json: { data: { message: 'Voting opened' } } });
      return;
    }
    if (url.pathname.endsWith('/lock') && method === 'POST') {
      schedule.status = 2;
      schedule.locked = true;
      for (const item of days) if (item.status !== 3) item.status = 1;
      await route.fulfill({ json: { data: { message: 'Schedule locked' } } });
      return;
    }
    if (url.pathname.endsWith('/move') && method === 'POST') {
      const body = route.request().postDataJSON();
      const source = days[body.fromIndex],
        target = days[body.toIndex];
      if (source && target) {
        for (const field of ['recipe', 'status', 'nonCooking'] as const) {
          const value = source[field];
          (source as any)[field] = target[field];
          (target as any)[field] = value;
        }
      }
      await route.fulfill({ json: { data: { message: 'Recipe moved' } } });
      return;
    }
    if (url.pathname.endsWith('/assign') && method === 'POST') {
      const body = route.request().postDataJSON();
      const target = days[body.dayIndex];
      if (target) {
        target.recipe = builders.scheduleRecipe({ id: body.recipeId });
        target.status = 0;
        target.nonCooking = null;
      }
      await route.fulfill({
        json: { data: { message: 'Recipe assigned', displacedRecipe: null } },
      });
      return;
    }
    await route.fallback();
  });
  return schedule;
}
