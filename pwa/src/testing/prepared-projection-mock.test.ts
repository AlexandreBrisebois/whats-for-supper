import { expect, it, vi } from 'vitest';
import type { Page, Route } from '@playwright/test';
import { builders, MOCK_IDS, setupCommonRoutes } from '../../e2e/mock-api';

async function fixture(known = false, recovery: Parameters<typeof setupCommonRoutes>[2] = {}) {
  const handlers = new Map<any, (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(async (key, handler) => handlers.set(key, handler)),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
  await setupCommonRoutes(
    page as unknown as Page,
    builders.deploymentCalendar({ today: '2026-05-05' }),
    known
      ? {
          supperServings: {
            knownRecipe: {
              id: MOCK_IDS.RECIPE_SPAGHETTI,
              basis: 2,
              quantity: 200,
              ingredient: 'pasta',
              unit: 'g',
            },
          },
        }
      : recovery
  );
  async function call(method: string, path: string, body?: any) {
    const url = new URL('http://localhost' + path);
    const candidates = [...handlers].reverse().filter(([key]) =>
      typeof key === 'function'
        ? key(url)
        : key instanceof RegExp
          ? key.test(url.href)
          : new RegExp(
              '^' +
                key
                  .split('**')
                  .map((part: string) =>
                    part
                      .split('*')
                      .map((s: string) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
                      .join('[^/]*')
                  )
                  .join('.*') +
                '$'
            ).test(url.href)
    );
    let output: any;
    async function dispatch(index: number): Promise<unknown> {
      if (!candidates[index]) throw new Error('No mock route: ' + path);
      return candidates[index][1]({
        request: () => ({ method: () => method, url: () => url.href, postDataJSON: () => body }),
        fulfill: async (value: any) => {
          output = value;
        },
        fallback: () => dispatch(index + 1),
      } as unknown as Route);
    }
    await dispatch(0);
    return {
      status: output.status ?? 200,
      json: output.json ?? (output.body ? JSON.parse(output.body) : undefined),
    };
  }
  const read = async () =>
    (await call('GET', '/api/schedule?referenceWeekStartDate=2026-05-04')).json.data;
  await call('POST', '/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
    weekOffset: 0,
    dayIndex: 4,
    recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
  });
  const projection = async (context = 'assigned') =>
    call(
      'GET',
      `/api/recipes/${MOCK_IDS.RECIPE_SPAGHETTI}/ingredient-projection?supperDate=2026-05-08&context=${context}&occurrenceId=${(await read()).days[4].occurrenceId}`
    );
  const prepare = async () => {
    const p = (await projection()).json;
    return call('POST', '/api/schedule/day/2026-05-08/prepare', {
      recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
      expectedOccurrenceId: p.occurrenceId,
      expectedPlanToken: p.preparationPlanToken,
      expectedServingVersion: p.preparationServingVersion,
    });
  };
  return { page, call, read, projection, prepare };
}

it('prepares generic recipe sources with displayed guards and rereads frozen original context', async () => {
  const f = await fixture();
  // No members is the unavailable usual case; an unknown recipe basis alone does not erase a known usual.
  for (const member of (await f.call('GET', '/api/family')).json.data)
    await f.call('DELETE', `/api/family/${member.id}`);
  const p = (await f.projection()).json;
  expect(p.preparationPlanToken).toMatch(/^v1\./);
  expect(p.preparationServingVersion).toMatch(/^[A-F0-9]{64}$/);
  expect(p.preparation).toBeNull();
  const result = await f.prepare();
  expect(result.status).toBe(200);
  expect(result.json.data.preparation).toMatchObject({
    preparedOn: '2026-05-05',
    portionContext: 'original',
    servings: null,
    originalServings: p.baseServings,
  });
  const reread = (await f.projection()).json;
  expect(reread.preparation).toEqual(result.json.data.preparation);
  expect(reread.editable).toBe(false);
  expect((await f.read()).days[4].preparation).toEqual(reread.preparation);
});

it('retains an unknown recipe basis while automatic family size supplies the dated preparation count', async () => {
  const f = await fixture();
  const p = (await f.projection()).json;
  expect(p.baseServings).toBeNull();
  expect(p.targetServings).toBe(2);
  expect(p.factor).toBeNull();
  expect(p.lines.some((line: any) => line.issues.includes('missing_basis'))).toBe(true);
  expect((await f.prepare()).json.data.preparation).toMatchObject({
    portionContext: 'dated',
    servings: 2,
    originalServings: null,
  });
});

it.each([false, true])('keeps proposed preparation context null (known=%s)', async (known) => {
  const f = await fixture(known);
  await f.prepare();
  const p = (await f.projection('proposed')).json;
  expect(p.occurrenceId).toBeNull();
  expect(p.preparationPlanToken).toBeNull();
  expect(p.preparationServingVersion).toBeNull();
  expect(p.preparation).toBeNull();
});

it('uses generic current recipe source/basis and dated count without guessing fallback text amounts', async () => {
  const f = await fixture();
  const id = MOCK_IDS.RECIPE_SPAGHETTI;
  await f.call('PATCH', `/api/recipes/${id}`, {
    servings: 2,
    ingredients: ['200 g pasta', 'salt to taste'],
  });
  const serving = (await f.call('GET', '/api/schedule/servings?referenceWeekStartDate=2026-05-04'))
    .json.data;
  await f.call('PUT', '/api/schedule/servings', {
    referenceWeekStartDate: '2026-05-04',
    weekOffset: 0,
    expectedVersion: serving.version,
    defaultServings: 6,
    days: [],
  });
  const p = (await f.projection()).json;
  expect(p).toMatchObject({ baseServings: 2, targetServings: 6, factor: 3, status: 'unresolved' });
  expect(p.lines[0]).toMatchObject({
    originalText: '200 g pasta',
    quantity: null,
    status: 'unresolved',
  });
  expect(p.lines[1]).toMatchObject({ quantity: null, status: 'unquantified', issues: [] });
  expect((await f.prepare()).json.data.preparation.servings).toBe(6);
});

it('repeat prepared legacy validation preserves identity/receipt and publishes no fake update', async () => {
  const f = await fixture(true);
  await f.prepare();
  const before = (await f.read()).days[4];
  f.page.evaluate.mockClear();
  const result = await f.call('POST', '/api/schedule/day/2026-05-08/validate', {
    status: 2,
    recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
  });
  expect(result.json.data.mealMarkedCooked).toBe(true);
  expect((await f.read()).days[4]).toEqual(before);
  expect(f.page.evaluate).not.toHaveBeenCalled();
});

it('ordinary legacy completion retains existing identity and publishes honest nullable metadata', async () => {
  const f = await fixture();
  const before = (await f.read()).days[4];
  f.page.evaluate.mockClear();
  await f.call('POST', '/api/schedule/day/2026-05-08/validate', {
    status: 2,
    recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
  });
  const after = (await f.read()).days[4];
  expect(after.occurrenceId).toBe(before.occurrenceId);
  expect(after.preparation).toBeNull();
  expect(
    f.page.evaluate.mock.calls.some(
      ([, payload]) =>
        payload?.occurrenceId === before.occurrenceId && payload?.preparation === null
    )
  ).toBe(true);
});

it('retains a committed receipt after a deliberately lost mock preparation reply', async () => {
  const f = await fixture(false, { schedulePreparationReplyLost: () => true } as any);
  const reply = await f.prepare();
  expect(reply.status).toBe(504);
  expect((await f.read()).days[4].preparation).toMatchObject({ preparedOn: '2026-05-05' });
  expect((await f.projection()).json.preparation).toBeTruthy();
});

it('returns the known preparation receipt when post-commit publication fails', async () => {
  const f = await fixture(false, {
    schedulePostCommitFailure: (operation: string) => operation === 'prepare',
  } as any);
  f.page.evaluate.mockClear();
  expect((await f.prepare()).status).toBe(200);
  expect((await f.read()).days[4].preparation).toBeTruthy();
  expect(f.page.evaluate).not.toHaveBeenCalled();
});

it('returns an exact stored retry before current source/default checks without another publication', async () => {
  const f = await fixture();
  const p = (await f.projection()).json;
  const request = {
    recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
    expectedOccurrenceId: p.occurrenceId,
    expectedPlanToken: p.preparationPlanToken,
    expectedServingVersion: p.preparationServingVersion,
  };
  const first = await f.call('POST', '/api/schedule/day/2026-05-08/prepare', request);
  await f.call('PATCH', `/api/recipes/${MOCK_IDS.RECIPE_SPAGHETTI}`, {
    servings: 8,
    ingredients: ['Changed source'],
  });
  f.page.evaluate.mockClear();
  expect((await f.call('POST', '/api/schedule/day/2026-05-08/prepare', request)).json).toEqual(
    first.json
  );
  expect(f.page.evaluate).not.toHaveBeenCalled();
});

it('previews through the real mock handler without changing saved portions or grocery state', async () => {
  const { call, read } = await fixture(true);
  const before = JSON.stringify(await read());
  for (const target of [2, 4, 6, 4]) {
    const reply = await call(
      'GET',
      `/api/recipes/${MOCK_IDS.RECIPE_SPAGHETTI}/ingredient-preview?targetServings=${target}`
    );
    expect(reply.status).toBe(200);
    expect(reply.json.targetServings).toBe(target);
    expect(reply.json.lines[0].quantity).toBe(target * 100);
    expect(reply.json).not.toHaveProperty('preparationPlanToken');
    expect(JSON.stringify(await read())).toBe(before);
  }
  expect(
    (
      await call(
        'GET',
        `/api/recipes/${MOCK_IDS.RECIPE_SPAGHETTI}/ingredient-preview?targetServings=5`
      )
    ).status
  ).toBe(400);
});

it('rejects a default-only draft captured before the saved supper was prepared', async () => {
  const f = await fixture(true);
  const baseline = (await f.call('GET', '/api/schedule/servings?referenceWeekStartDate=2026-05-04'))
    .json.data;
  const receipt = (await f.prepare()).json.data.preparation;
  expect(
    (
      await f.call('PUT', '/api/schedule/servings', {
        referenceWeekStartDate: '2026-05-04',
        weekOffset: 0,
        expectedVersion: baseline.version,
        defaultServings: 7,
        days: [],
      })
    ).status
  ).toBe(409);
  expect((await f.read()).days[4].preparation).toEqual(receipt);
  expect(
    (await f.call('GET', '/api/schedule/servings?referenceWeekStartDate=2026-05-04')).json.data
      .defaultServingsSource
  ).toBe('family');
});
