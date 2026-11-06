import { describe, expect, it, vi } from 'vitest';
import type { Page, Route } from '@playwright/test';
import { MOCK_IDS, setupCommonRoutes } from '../../e2e/mock-api';

it('projects the actual legacy-supply mock handler without zipping missing ingredient lines', async () => {
  const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(
      async (pattern: Parameters<Page['route']>[0], handler: (route: Route) => Promise<unknown>) =>
        handlers.set(pattern, handler)
    ),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
  const id = MOCK_IDS.RECIPE_SPAGHETTI;
  await setupCommonRoutes(page as unknown as Page, undefined, {
    supperServings: {
      knownRecipe: {
        id,
        basis: 4,
        quantity: 12,
        ingredient: 'shells',
        unit: '',
        source: {
          ingredients: [
            '12 shells',
            '1 onion',
            '1 lime',
            '450 g beef',
            'salt',
            '1 g cumin\u0338',
            '1 g salt to taste',
          ],
          supplies: [
            { name: 'beef', quantity: 450, unitText: 'g' },
            { name: 'shells', quantity: 12, unitText: null },
            { name: 'onion', quantity: 1, unitText: null },
            { name: 'cumin', quantity: 1, unitText: 'g' },
            { name: 'salt to taste', quantity: 1, unitText: 'g' },
          ],
        },
      },
    },
  });
  for (const count of [2, 4, 6]) {
    const fulfill = vi.fn();
    await handlers.get('**/api/recipes/*/ingredient-preview*')!({
      request: () => ({
        method: () => 'GET',
        url: () => `http://localhost/api/recipes/${id}/ingredient-preview?targetServings=${count}`,
      }),
      fulfill,
    } as unknown as Route);
    const body = fulfill.mock.calls[0][0].json;
    expect(body.status).toBe('partial');
    expect(body.lines.map((line: { quantity: number | null }) => line.quantity)).toEqual([
      (12 * count) / 4,
      count / 4,
      null,
      (450 * count) / 4,
      null,
      null,
      count / 4,
    ]);
    expect(body.lines[2].originalText).toBe('1 lime');
    expect(body.lines[6].status).toBe('scaled');
  }
});

async function assignmentWithNotificationError(error: Error, scheduleNotification = false) {
  const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(
      async (pattern: Parameters<Page['route']>[0], handler: (route: Route) => Promise<unknown>) =>
        handlers.set(pattern, handler)
    ),
    evaluate: vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(error),
  };
  if (scheduleNotification)
    page.evaluate.mockReset().mockRejectedValueOnce(error).mockResolvedValue(undefined);
  await setupCommonRoutes(page as unknown as Page);
  const fulfill = vi.fn().mockResolvedValue(undefined);
  const route = {
    request: () => ({
      method: () => 'POST',
      url: () => 'http://localhost/api/schedule/assign',
      postDataJSON: () => ({ weekOffset: 1, dayIndex: 2, recipeId: MOCK_IDS.RECIPE_CHICKEN }),
    }),
    fulfill,
  } as unknown as Route;
  return { handlers, fulfill, assign: () => handlers.get('**/api/schedule/assign**')!(route) };
}

describe('stateful mock post-commit session notifications', () => {
  it.each(['', '.'])(
    'preserves committed state when navigation drops a notification (%s)',
    async (suffix) => {
      const { handlers, fulfill, assign } = await assignmentWithNotificationError(
        new Error(
          `page.evaluate: Execution context was destroyed, most likely because of a navigation${suffix}`
        )
      );
      await expect(assign()).resolves.toBeUndefined();
      expect(fulfill).toHaveBeenCalled();
      const read = vi.fn();
      await handlers.get('**/api/discovery/session')!({
        request: () => ({ method: () => 'GET' }),
        fulfill: read,
      } as unknown as Route);
      expect(read.mock.calls[0][0].json.data.revision).toBe(1);
      const url = new URL('http://localhost/api/schedule?weekOffset=1');
      const scheduleHandler = [...handlers].find(
        ([pattern]) => typeof pattern === 'function' && pattern(url)
      )![1];
      const schedule = vi.fn();
      await scheduleHandler({
        request: () => ({ method: () => 'GET', url: () => url.href }),
        fulfill: schedule,
      } as unknown as Route);
      expect(schedule.mock.calls[0][0].json.data.days[2].recipe.id).toBe(MOCK_IDS.RECIPE_CHICKEN);
    }
  );

  it('preserves committed assignment and readable schedule when navigation drops its week notification', async () => {
    const { handlers, assign } = await assignmentWithNotificationError(
      new Error(
        'page.evaluate: Execution context was destroyed, most likely because of a navigation.'
      ),
      true
    );
    await expect(assign()).resolves.toBeUndefined();
    const url = new URL('http://localhost/api/schedule?weekOffset=1');
    const handler = [...handlers].find(
      ([pattern]) => typeof pattern === 'function' && pattern(url)
    )![1];
    const fulfill = vi.fn();
    await handler({
      request: () => ({ method: () => 'GET', url: () => url.href }),
      fulfill,
    } as unknown as Route);
    expect(fulfill.mock.calls[0][0].json.data.days[2].recipe.id).toBe(MOCK_IDS.RECIPE_CHICKEN);
  });

  it.each([false, true])(
    'surfaces unexpected notification errors (schedule=%s)',
    async (scheduleNotification) => {
      const error = new Error('page.evaluate: snapshot serialization failed');
      const { assign } = await assignmentWithNotificationError(error, scheduleNotification);
      await expect(assign()).rejects.toBe(error);
    }
  );
});

async function recipeDetailHandler() {
  const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(
      async (pattern: Parameters<Page['route']>[0], handler: (route: Route) => Promise<unknown>) =>
        handlers.set(pattern, handler)
    ),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
  await setupCommonRoutes(page as unknown as Page);
  return async (method: 'GET' | 'PATCH', id: string, body?: Record<string, unknown>) => {
    const fulfill = vi.fn().mockResolvedValue(undefined);
    const fallback = vi.fn();
    await handlers.get('**/api/recipes/*')!({
      request: () => ({
        method: () => method,
        url: () => `http://localhost/api/recipes/${id}`,
        postDataJSON: () => body,
      }),
      fulfill,
      fallback,
    } as unknown as Route);
    expect(fallback).not.toHaveBeenCalled();
    expect(fulfill).toHaveBeenCalledTimes(1);
    const response = fulfill.mock.calls[0][0];
    return { status: response.status ?? 200, json: response.json ?? JSON.parse(response.body) };
  };
}

describe('recipe detail mock servings contract', () => {
  it('serves current contributor titles through existing PATCH and GET without changing the recipe basis', async () => {
    const call = await recipeDetailHandler();
    const id = MOCK_IDS.RECIPE_LASAGNA;
    const before = await call('GET', id);
    expect((await call('PATCH', id, { name: 'Lunch-only pasta' })).status).toBe(200);
    const current = await call('GET', id);
    expect(current.json.recipe.name).toBe('Lunch-only pasta');
    expect(current.json.recipe.servings).toBe(before.json.recipe.servings);
    expect((await call('GET', id)).json).toEqual(current.json);
  });

  it('validates supplied counts and preserves omission on PATCH then GET', async () => {
    const call = await recipeDetailHandler();
    const id = MOCK_IDS.RECIPE_LASAGNA;
    for (const servings of [null, 0, -1, 1.5, 2147483648, '3', true]) {
      expect((await call('PATCH', id, { servings })).status).toBe(400);
      expect((await call('GET', id)).json.recipe.servings).toBe(4);
    }
    expect((await call('PATCH', id, { servings: 1 })).status).toBe(200);
    expect((await call('PATCH', id, { notes: 'keep' })).status).toBe(200);
    const read = await call('GET', id);
    expect(read.status).toBe(200);
    expect(read.json.recipe.servings).toBe(1);
    expect(read.json.recipe.notes).toBe('keep');
  });

  it.each([
    { recipeId: MOCK_IDS.RECIPE_LASAGNA, servings: 4 },
    { recipeId: MOCK_IDS.RECIPE_CARBONARA, servings: null },
  ])(
    'preserves $servings across unrelated PATCH and GET with its existing envelope',
    async ({ recipeId, servings }) => {
      const call = await recipeDetailHandler();
      const before = await call('GET', recipeId);
      const patched = await call('PATCH', recipeId, { ingredients: ['510 g beef', '340 g pasta'] });
      const after = await call('GET', recipeId);
      expect(before.status).toBe(200);
      expect(patched.status).toBe(200);
      expect(after.status).toBe(200);
      expect(before.json.recipe.servings).toBe(servings);
      expect(after.json.recipe.servings).toBe(servings);
      expect(after.json.recipe.ingredients).toEqual(['510 g beef', '340 g pasta']);
      expect(after.json.updatedAt).toBeTruthy();
    }
  );
});

describe('usual portions and shared family mock state', () => {
  it('preserves equal explicit choice, resets to automatic and conflicts after membership changes', async () => {
    const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
    const page = {
      route: vi.fn(
        async (
          pattern: Parameters<Page['route']>[0],
          handler: (route: Route) => Promise<unknown>
        ) => handlers.set(pattern, handler)
      ),
      evaluate: vi.fn().mockResolvedValue(undefined),
    };
    const common = await setupCommonRoutes(page as unknown as Page, undefined, {
      supperServings: { delayed: true },
    });
    const call = async (pattern: string, method: string, path: string, body?: unknown) => {
      const fulfill = vi.fn();
      await handlers.get(pattern)!({
        request: () => ({
          method: () => method,
          url: () => `http://localhost${path}`,
          postDataJSON: () => body,
        }),
        fulfill,
        fallback: vi.fn(),
        continue: vi.fn(),
      } as unknown as Route);
      const response = fulfill.mock.calls[0][0];
      return {
        status: response.status ?? 200,
        json: response.json ?? (response.body ? JSON.parse(response.body) : null),
      };
    };
    const get = async () =>
      (await call('**/api/schedule/servings*', 'GET', '/api/schedule/servings')).json.data;
    const save = (state: any, extra: object) =>
      call('**/api/schedule/servings*', 'PUT', '/api/schedule/servings', {
        referenceWeekStartDate: state.referenceWeekStartDate,
        weekOffset: 0,
        expectedVersion: state.version,
        days: [],
        ...extra,
      });
    const family = async () => (await call('**/api/family', 'GET', '/api/family')).json.data;
    expect(common.readFamilyCount()).toBe(2);
    const initial = await get();
    expect(initial.defaultServings).toBe(2);
    expect(initial.defaultServingsSource).toBe('family');
    expect((await save(initial, { defaultServings: 2 })).status).toBe(200);
    const explicit = await get();
    expect(explicit.defaultServingsSource).toBe('explicit');
    expect(explicit.version).not.toBe(initial.version);
    const added = await call('**/api/family', 'POST', '/api/family', { name: 'Taylor' });
    expect(added.status).toBe(201);
    expect(await family()).toHaveLength(3);
    expect(common.readFamilyCount()).toBe(3);
    expect((await get()).defaultServings).toBe(2);
    expect((await get()).version).toBe(explicit.version);
    await save(await get(), { defaultServings: null });
    const automatic = await get();
    expect(automatic.defaultServings).toBe(3);
    expect(automatic.defaultServingsSource).toBe('family');
    await call('**/api/family/*', 'DELETE', `/api/family/${added.json.data.id}`);
    expect(await family()).toHaveLength(2);
    expect((await save(automatic, { defaultServings: 8 })).status).toBe(409);
    expect((await get()).defaultServings).toBe(2);
    await save(await get(), {});
    expect((await get()).defaultServingsSource).toBe('family');
    expect(page.evaluate).toHaveBeenCalled();
    for (const member of await family())
      await call('**/api/family/*', 'DELETE', `/api/family/${member.id}`);
    expect(common.readFamilyCount()).toBe(0);
    expect(await family()).toHaveLength(0);
    expect((await get()).defaultServings).toBeNull();
    expect((await get()).defaultServingsSource).toBe('family');
    await save(await get(), { defaultServings: 4 });
    const explicitBackup = await call(
      '**/api/management/recovery/snapshots',
      'POST',
      '/api/management/recovery/snapshots'
    );
    await save(await get(), { defaultServings: null });
    await call(
      '**/api/management/recovery/restore/*',
      'POST',
      `/api/management/recovery/restore/${explicitBackup.json.snapshotId}`
    );
    expect((await get()).defaultServings).toBe(4);
    expect((await get()).defaultServingsSource).toBe('explicit');
    await save(await get(), { defaultServings: null });
    const automaticBackup = await call(
      '**/api/management/recovery/snapshots',
      'POST',
      '/api/management/recovery/snapshots'
    );
    await call('**/api/family', 'POST', '/api/family', { name: 'After automatic backup' });
    await save(await get(), { defaultServings: 7 });
    await call(
      '**/api/management/recovery/restore/*',
      'POST',
      `/api/management/recovery/restore/${automaticBackup.json.snapshotId}`
    );
    expect(await family()).toHaveLength(0);
    expect((await get()).defaultServings).toBeNull();
    expect((await get()).defaultServingsSource).toBe('family');
  });
});
