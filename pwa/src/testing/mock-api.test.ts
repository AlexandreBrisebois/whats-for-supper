import { describe, expect, it, vi } from 'vitest';
import type { Page, Route } from '@playwright/test';
import { MOCK_IDS, builders, setupCommonRoutes } from '../../e2e/mock-api';
import { fractionCookingRecipe } from '../../e2e/cooking-step-fixture';
import { canonicalRecipePatchIsValid } from '../../e2e/canonical-content-input';
import { originalInstructions } from '../lib/recipes/instruction-draft';

async function sharedImportRoutes() {
  const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(
      async (
        pattern: Parameters<Page['route']>[0],
        handler: (route: Route) => Promise<unknown>
      ) => {
        handlers.set(pattern, handler);
      }
    ),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
  await setupCommonRoutes(page as unknown as Page);
  return async (pattern: string, method: string, path: string, body?: unknown) => {
    const fulfill = vi.fn();
    await handlers.get(pattern)!({
      request: () => ({
        method: () => method,
        url: () => 'http://localhost' + path,
        postDataJSON: () => body,
      }),
      fulfill,
      fallback: vi.fn(),
    } as unknown as Route);
    const response = fulfill.mock.calls[0][0];
    return {
      status: response.status ?? 200,
      json: response.json ?? (typeof response.body === 'string' ? JSON.parse(response.body) : null),
      body: response.body,
      contentType: response.contentType,
    };
  };
}

const protectedSharedFacts = [
  'description',
  'amount',
  'amountText',
  'unit',
  'scaling',
  'package',
  'shopping',
];
function textOnlySharedBundle() {
  const bundle = structuredClone(builders.recipeShareBundle());
  Object.assign(bundle.recipe!, {
    name: 'Shared exact pasta',
    ingredients: ['⅓ cup flour', '2 eggs', 'oil'],
    instructions: [
      {
        name: 'Mix exactly',
        itemListElement: [{ text: 'Mix all the flour.' }, { text: 'Keep the wording.' }],
      },
    ],
    notes: 'Imported private note',
    rating: 3,
  });
  bundle.info!.recipeId = '09000000-0000-4000-8000-000000000011';
  return bundle;
}

it.each([4, null, 'omitted'] as const)(
  'shared import persists declared basis %j and canonical unknown facts through detail, editor and share',
  async (basis) => {
    const call = await sharedImportRoutes();
    const bundle = textOnlySharedBundle();
    if (basis === 'omitted') delete bundle.recipe!.servings;
    else bundle.recipe!.servings = basis;
    const result = await call(
      '**/api/recipes/import-bundle',
      'POST',
      '/api/recipes/import-bundle',
      bundle
    );
    expect(result.status).toBe(201);
    const imported = result.json.data;
    expect(imported.servings).toBe(basis === 'omitted' ? null : basis);
    expect(imported.contentSchemaVersion).toBe(2);
    expect(imported.id).toBe(bundle.info!.recipeId);
    expect(imported.contentRevision).toEqual(expect.any(String));
    expect(imported.ingredients).toEqual(bundle.recipe!.ingredients);
    expect(imported.ingredientLines).toHaveLength(3);
    expect(imported.ingredientLines.map((line: any) => line.description)).toEqual(
      bundle.recipe!.ingredients
    );
    for (const line of imported.ingredientLines)
      expect(line).toMatchObject({
        amount: null,
        amountText: null,
        unit: null,
        package: null,
        scaling: 'proportional',
        shopping: { name: line.description, foodId: null, mappingRevision: null },
        provenance: {
          origin: 'legacy_unknown',
          sourceRef: null,
          protectedFields: protectedSharedFacts,
        },
      });
    expect(imported.instructionSections[0].steps.map((step: any) => step.text)).toEqual([
      'Mix all the flour.',
      'Keep the wording.',
    ]);
    expect(
      imported.instructionSections[0].steps.every((step: any) => step.bindings.length === 0)
    ).toBe(true);
    const read = (await call('**/api/recipes/*', 'GET', '/api/recipes/' + imported.id)).json.recipe;
    expect(read).toMatchObject(imported);
    const originalIds = imported.ingredientLines.map((line: any) => line.id);
    const edited = await call('**/api/recipes/*', 'PATCH', '/api/recipes/' + imported.id, {
      expectedContentRevision: imported.contentRevision,
      ingredientLines: imported.ingredientLines.map(
        ({ provenance: _provenance, ...line }: any) => line
      ),
    });
    expect(edited.status).toBe(200);
    expect(edited.json.recipe.ingredientLines.map((line: any) => line.id)).toEqual(originalIds);
    expect(
      edited.json.recipe.ingredientLines.every(
        (line: any) => line.amount === null && line.provenance.sourceRef === null
      )
    ).toBe(true);
    const exported = (
      await call('**/api/recipes/*/share', 'GET', '/api/recipes/' + imported.id + '/share')
    ).json.data;
    expect(exported.recipe.ingredients).toEqual(bundle.recipe!.ingredients);
    expect(exported.recipe.instructions).toEqual(bundle.recipe!.instructions);
    expect(exported.recipe.servings).toBeNull();
    expect(exported.recipe.notes).toBeNull();
    expect(exported.recipe.rating).toBeNull();
    expect(exported.hero).toEqual(bundle.hero);
    expect(exported.originals).toEqual(bundle.originals);
    expect(JSON.stringify(exported)).not.toContain('legacy_unknown');
    expect(JSON.stringify(exported)).not.toContain('Imported private note');
    const hero = await call(
      '**/api/recipes/*/hero',
      'GET',
      '/api/recipes/' + imported.id + '/hero'
    );
    expect(hero.body).toEqual(Buffer.from(bundle.hero!.base64!, 'base64'));
    const original = await call(
      '**/api/recipes/*/original/*',
      'GET',
      '/api/recipes/' + imported.id + '/original/0'
    );
    expect(original.body).toEqual(Buffer.from(bundle.originals![0].base64!, 'base64'));
  }
);

it.each([0, -1])(
  'shared import rejects declared basis %s before creating saved membership',
  async (basis) => {
    const call = await sharedImportRoutes();
    const bundle = textOnlySharedBundle();
    bundle.recipe!.servings = basis;
    expect(
      (await call('**/api/recipes/import-bundle', 'POST', '/api/recipes/import-bundle', bundle))
        .status
    ).toBe(400);
    bundle.recipe!.servings = 4;
    const imported = (
      await call('**/api/recipes/import-bundle', 'POST', '/api/recipes/import-bundle', bundle)
    ).json.data;
    expect(imported.id).toBe(bundle.info!.recipeId);
    expect(imported.servings).toBe(4);
  }
);

it('shared import rejects unsupported version before saving any recipe', async () => {
  const call = await sharedImportRoutes();
  const bundle = textOnlySharedBundle();
  bundle.version = '1.1';
  expect(
    (await call('**/api/recipes/import-bundle', 'POST', '/api/recipes/import-bundle', bundle))
      .status
  ).toBe(400);
  bundle.version = '1.0';
  expect(
    (await call('**/api/recipes/import-bundle', 'POST', '/api/recipes/import-bundle', bundle)).json
      .data.id
  ).toBe(bundle.info!.recipeId);
});

it('shared imports keep separate local identities when requested recipe membership collides', async () => {
  const call = await sharedImportRoutes();
  const bundle = textOnlySharedBundle();
  bundle.info!.recipeId = MOCK_IDS.RECIPE_LASAGNA;
  const first = (
    await call('**/api/recipes/import-bundle', 'POST', '/api/recipes/import-bundle', bundle)
  ).json.data;
  const second = (
    await call('**/api/recipes/import-bundle', 'POST', '/api/recipes/import-bundle', bundle)
  ).json.data;
  expect(first.id).not.toBe(MOCK_IDS.RECIPE_LASAGNA);
  expect(second.id).not.toBe(first.id);
  const firstIds = new Set(first.ingredientLines.map((line: any) => line.id));
  expect(second.ingredientLines.every((line: any) => !firstIds.has(line.id))).toBe(true);
  expect(
    (await call('**/api/recipes/*', 'GET', '/api/recipes/' + first.id)).json.recipe.contentRevision
  ).toBe(first.contentRevision);
});

it('fraction binding negatives retain valid saved ingredient, section and step identities', () => {
  const recipe = fractionCookingRecipe();
  expect(
    canonicalRecipePatchIsValid({
      ingredientLines: recipe.ingredientLines.map(
        ({ provenance: _provenance, ...line }: any) => line
      ),
      instructionSections: originalInstructions(recipe),
    })
  ).toBe(true);
  // These are the intended negative proofs, independent of row identity validity.
  const steps = recipe.instructionSections[0].steps;
  expect(steps[2].bindings[0].payload.fraction.d).toBe('0');
  expect(steps[3].bindings[0].validatedTextRevision).not.toBe(steps[3].textRevision);
});

it('workflow reset mock returns the existing recovery-busy contract and preserves method routing', async () => {
  const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(
      async (pattern: Parameters<Page['route']>[0], handler: (route: Route) => Promise<unknown>) =>
        handlers.set(pattern, handler)
    ),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
  await setupCommonRoutes(page as unknown as Page, undefined, { busy: true });
  const fulfill = vi.fn();
  const fallback = vi.fn();
  const call = async (method: string) =>
    handlers.get('**/api/workflows/tasks/*/reset')!({
      request: () => ({
        method: () => method,
        url: () => `http://localhost/api/workflows/tasks/${MOCK_IDS.RECIPE_LASAGNA}/reset`,
      }),
      fulfill,
      fallback,
    } as unknown as Route);
  await call('GET');
  expect(fallback).toHaveBeenCalledOnce();
  expect(fulfill).not.toHaveBeenCalled();
  await call('POST');
  const response = fulfill.mock.calls[0][0];
  expect(response.status).toBe(503);
  expect(response.headers['Retry-After']).toBe('5');
  expect(JSON.parse(response.body)).toEqual({
    errorCode: 'RECOVERY_BUSY',
    message: expect.any(String),
  });
});

it('share mock refuses pending media delivery before returning a bundle', async () => {
  const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(
      async (pattern: Parameters<Page['route']>[0], handler: (route: Route) => Promise<unknown>) =>
        handlers.set(pattern, handler)
    ),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
  let pending = true;
  await setupCommonRoutes(page as unknown as Page, undefined, {
    recipePublicationPending: () => pending,
  });
  const fulfill = vi.fn();
  const request = {
    request: () => ({
      method: () => 'GET',
      url: () => `http://localhost/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/share`,
    }),
    fulfill,
  } as unknown as Route;
  await handlers.get('**/api/recipes/*/share')!(request);
  expect(fulfill.mock.calls[0][0].status).toBe(409);
  expect(fulfill.mock.calls[0][0].json.code).toBe('recipe_content_conflict');
  pending = false;
  fulfill.mockClear();
  await handlers.get('**/api/recipes/*/share')!(request);
  expect(fulfill.mock.calls[0][0].status).toBe(200);
});

it('share mock exports current saved text and scrubs household fields after editing', async () => {
  const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(
      async (pattern: Parameters<Page['route']>[0], handler: (route: Route) => Promise<unknown>) =>
        handlers.set(pattern, handler)
    ),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
  await setupCommonRoutes(page as unknown as Page);
  const id = MOCK_IDS.RECIPE_LASAGNA;
  const fulfill = vi.fn();
  await handlers.get('**/api/recipes/*')!({
    request: () => ({
      method: () => 'PATCH',
      url: () => `http://localhost/api/recipes/${id}`,
      postDataJSON: () => ({
        name: 'Current saved name',
        ingredients: ['⅓ cup flour', 'oil'],
        recipeInstructions: [
          {
            '@type': 'HowToSection',
            name: 'Current section',
            itemListElement: [{ '@type': 'HowToStep', text: 'Current corrected step' }],
          },
        ],
        notes: 'Private note',
        rating: 3,
        servings: 3,
      }),
    }),
    fulfill,
  } as unknown as Route);
  fulfill.mockClear();
  await handlers.get('**/api/recipes/*/share')!({
    request: () => ({ method: () => 'GET', url: () => `http://localhost/api/recipes/${id}/share` }),
    fulfill,
  } as unknown as Route);
  const bundle = JSON.parse(fulfill.mock.calls[0][0].body).data;
  expect(bundle.recipe.name).toBe('Current saved name');
  expect(bundle.recipe.ingredients).toEqual(['⅓ cup flour', 'oil']);
  expect(bundle.recipe.instructions[0].itemListElement[0].text).toBe('Current corrected step');
  expect(bundle.recipe.notes).toBeNull();
  expect(bundle.recipe.rating).toBeNull();
  expect(bundle.recipe.servings).toBeNull();
  expect(JSON.stringify(bundle)).not.toContain('Private note');
});

it.each([
  { ingredientName: 'Water', checked: true },
  {
    rowId: MOCK_IDS.GROCERY_ROW_01,
    weekStartDate: '2026-05-04',
    expectedRowVersion: '1',
    checked: true,
    clientMutationId: MOCK_IDS.GROCERY_ROW_02,
  },
  {
    rowId: MOCK_IDS.GROCERY_ROW_01,
    weekStartDate: '2026-05-11',
    expectedRowVersion: '1',
    checked: true,
    clientMutationId: MOCK_IDS.GROCERY_ROW_02,
  },
])(
  'grocery mocks reject missing, absent or wrong-week row guards without a write: %j',
  async (body) => {
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
    await setupCommonRoutes(page as unknown as Page);
    const fulfill = vi.fn().mockResolvedValue(undefined);
    await handlers.get('**/api/schedule/*/grocery/item**')!({
      request: () => ({
        method: () => 'PATCH',
        url: () => 'http://localhost/api/schedule/0/grocery/item',
        postDataJSON: () => body,
      }),
      fulfill,
    } as unknown as Route);
    expect(fulfill.mock.calls[0][0].status).toBe(409);
  }
);

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

it.each(['ingredientLines', 'instructionSections'])(
  'canonical %s stays gated atomically before qualified cutover',
  async (collection) => {
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
    await setupCommonRoutes(page as unknown as Page);
    const id = MOCK_IDS.RECIPE_SPAGHETTI;
    const read = async () => {
      const fulfill = vi.fn().mockResolvedValue(undefined);
      await handlers.get('**/api/recipes/*')!({
        request: () => ({ method: () => 'GET', url: () => `http://localhost/api/recipes/${id}` }),
        fulfill,
      } as unknown as Route);
      const reply = fulfill.mock.calls[0][0];
      return reply.json ?? JSON.parse(reply.body);
    };
    const before = await read();
    expect(before.recipe.contentSchemaVersion).toBeNull();
    expect(before.recipe.ingredientLines).toBeNull();
    expect(before.recipe.instructionSections).toBeNull();
    const fulfill = vi.fn().mockResolvedValue(undefined);
    await handlers.get('**/api/recipes/*')!({
      request: () => ({
        method: () => 'PATCH',
        url: () => `http://localhost/api/recipes/${id}`,
        postDataJSON: () => ({
          name: 'Cannot partially apply',
          servings: 7,
          expectedContentRevision: 'not-activated',
          [collection]: [],
        }),
      }),
      fulfill,
    } as unknown as Route);
    const reply = fulfill.mock.calls[0][0];
    expect(reply.status).toBe(409);
    expect(reply.json.code).toBe('recipe_content_conflict');
    expect(reply.json.upgradeRequired).toBe(true);
    expect(reply.json.currentContentRevision).toBeTruthy();
    expect((await read()).recipe).toEqual(before.recipe);
  }
);

it.each([
  {
    clientId: 'row',
    description: 'pasta',
    amount: { kind: 'scalar', value: { n: '2', d: '4' } },
    amountText: '1/2',
    unit: null,
    scaling: 'proportional',
    package: null,
    shopping: { name: 'pasta', foodId: null, mappingRevision: null },
  },
  {
    clientId: 'row',
    description: 'pasta',
    amount: null,
    amountText: null,
    scaling: 'proportional',
    package: null,
    shopping: { name: 'pasta', foodId: null, mappingRevision: null },
  },
])('canonical mock rejects invalid supplied facts atomically: %j', async (row) => {
  const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(
      async (pattern: Parameters<Page['route']>[0], handler: (route: Route) => Promise<unknown>) =>
        handlers.set(pattern, handler)
    ),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
  await setupCommonRoutes(page as unknown as Page);
  const fulfill = vi.fn().mockResolvedValue(undefined);
  await handlers.get('**/api/recipes/*')!({
    request: () => ({
      method: () => 'PATCH',
      url: () => `http://localhost/api/recipes/${MOCK_IDS.RECIPE_SPAGHETTI}`,
      postDataJSON: () => ({ name: 'Cannot save', ingredientLines: [row] }),
    }),
    fulfill,
  } as unknown as Route);
  expect(fulfill.mock.calls[0][0].status).toBe(400);
});

it.each([false, true])(
  'original upload mock retains truthful append state (pending=%s)',
  async (pending) => {
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
    await setupCommonRoutes(page as unknown as Page, undefined, {
      recipePublicationPending: () => pending,
    } as Parameters<typeof setupCommonRoutes>[2]);
    const url = `http://localhost/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`;
    const read = async () => {
      const fulfill = vi.fn().mockResolvedValue(undefined);
      await handlers.get('**/api/recipes/*')!({
        request: () => ({ method: () => 'GET', url: () => url }),
        fulfill,
      } as unknown as Route);
      return JSON.parse(fulfill.mock.calls[0][0].body).recipe;
    };
    const before = await read();
    const fulfill = vi.fn().mockResolvedValue(undefined);
    await handlers.get('**/api/recipes/*/originals')!({
      request: () => ({ method: () => 'POST', url: () => `${url}/originals` }),
      fulfill,
    } as unknown as Route);
    const response = fulfill.mock.calls[0][0];
    expect(response.status).toBe(pending ? 409 : 201);
    const after = await read();
    if (pending) {
      expect(response.json.code).toBe('recipe_content_conflict');
      expect(after).toEqual(before);
    } else {
      expect(JSON.parse(response.body).data.id).toBe(before.imageCount ?? 0);
      expect(after.imageCount).toBe((before.imageCount ?? 0) + 1);
      expect(after.images).toEqual([...(before.images ?? []), before.imageCount ?? 0]);
      expect(after.finishedDishIndex).toBe(before.finishedDishIndex);
    }
  }
);

it('isolated canonical editor saves exact rows atomically and subsequent reads retain the authoritative revision', async () => {
  const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(
      async (pattern: Parameters<Page['route']>[0], handler: (route: Route) => Promise<unknown>) =>
        handlers.set(pattern, handler)
    ),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
  const row = {
    id: MOCK_IDS.RECIPE_CARBONARA,
    description: 'pasta',
    amount: { kind: 'scalar', value: { n: '200', d: '1' } },
    amountText: '200',
    unit: { text: 'g', definitionId: null },
    scaling: 'proportional',
    package: null,
    shopping: { name: 'pasta', foodId: null, mappingRevision: null },
  };
  const id = MOCK_IDS.RECIPE_LASAGNA;
  await setupCommonRoutes(page as unknown as Page, undefined, {
    canonicalEditor: {
      id,
      contentSchemaVersion: 2,
      contentRevision: 'initial',
      servings: 4,
      ingredients: ['200 g pasta'],
      ingredientLines: [row],
    } as any,
  });
  const call = async (method: string, body?: unknown) => {
    const fulfill = vi.fn();
    await handlers.get('**/api/recipes/*')!({
      request: () => ({
        method: () => method,
        url: () => `http://localhost/api/recipes/${id}`,
        postDataJSON: () => body,
      }),
      fulfill,
    } as unknown as Route);
    const reply = fulfill.mock.calls[0][0];
    return { status: reply.status ?? 200, body: reply.json ?? JSON.parse(reply.body) };
  };
  const saved = await call('PATCH', {
    name: 'Saved',
    rating: 3,
    isDiscoverable: true,
    mealTypes: ['Supper'],
    expectedContentRevision: 'initial',
    ingredientLines: [
      { ...row, amountText: '250', amount: { kind: 'scalar', value: { n: '250', d: '1' } } },
    ],
  });
  expect(saved.status).toBe(200);
  expect(saved.body.recipe.rating).toBe(3);
  expect(saved.body.recipe.isDiscoverable).toBe(true);
  expect(saved.body.recipe.ingredients).toEqual(['250 g pasta']);
  expect(saved.body.recipe.ingredientLines[0].id).toBe(row.id);
  expect(saved.body.recipe.contentRevision).not.toBe('initial');
  expect(
    (
      await call('PATCH', {
        name: 'Stale',
        expectedContentRevision: 'initial',
        ingredientLines: [],
      })
    ).status
  ).toBe(409);
  expect((await call('PATCH', { name: 'Old editor', ingredients: ['old'] })).status).toBe(409);
  const reread = await call('GET');
  expect(reread.body.recipe.name).toBe('Saved');
  expect(reread.body.recipe.contentRevision).toBe(saved.body.recipe.contentRevision);
  expect(reread.body.recipe.ingredients).toEqual(['250 g pasta']);
  for (const invalid of [{ rating: 4 }, { mealTypes: ['Lunch'], isDiscoverable: true }]) {
    expect(
      (
        await call('PATCH', {
          expectedContentRevision: saved.body.recipe.contentRevision,
          name: 'Invalid',
          ingredientLines: [],
          ...invalid,
        })
      ).status
    ).toBe(400);
    expect((await call('GET')).body.recipe).toEqual(reread.body.recipe);
  }
  const basis = await call('PATCH', {
    expectedContentRevision: saved.body.recipe.contentRevision,
    servings: 5,
    rating: 2,
  });
  expect(basis.status).toBe(200);
  expect(basis.body.recipe.servings).toBe(5);
  expect(basis.body.recipe.rating).toBe(2);
  expect(basis.body.recipe.ingredientLines).toEqual(saved.body.recipe.ingredientLines);
});

it('known-recipe recompute replaces its source rows once and preserves unrelated contributors', async () => {
  const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(
      async (pattern: Parameters<Page['route']>[0], handler: (route: Route) => Promise<unknown>) =>
        handlers.set(pattern, handler)
    ),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
  const id = MOCK_IDS.RECIPE_CARBONARA;
  const control = await setupCommonRoutes(page as unknown as Page, undefined, {
    supperServings: {
      knownRecipe: { id, basis: 2, quantity: 200, ingredient: 'pasta', unit: 'g' },
    },
  });
  const assign = async (recipeId: string, dayIndex: number) => {
    const fulfill = vi.fn();
    await handlers.get('**/api/schedule/assign**')!({
      request: () => ({
        method: () => 'POST',
        url: () => 'http://localhost/api/schedule/assign?referenceWeekStartDate=2026-05-04',
        postDataJSON: () => ({ weekOffset: 0, dayIndex, recipeId }),
      }),
      fulfill,
    } as unknown as Route);
    expect(fulfill).toHaveBeenCalledOnce();
  };
  await assign(id, 2);
  let snapshot = control.groceryRows.snapshot('2026-05-04');
  expect(snapshot.groceryItems).toHaveLength(1);
  expect(snapshot.groceryItems[0]).toMatchObject({
    normalizedKey: 'pasta',
    quantity: { kind: 'scalar', value: { n: '200', d: '1' } },
    recipeIds: [id],
  });
  const rowId = snapshot.groceryItems[0].rowId;
  await assign(MOCK_IDS.RECIPE_LASAGNA, 1);
  snapshot = control.groceryRows.snapshot('2026-05-04');
  const projected = snapshot.groceryItems.filter((row) => row.recipeIds?.includes(id));
  expect(projected).toHaveLength(1);
  expect(projected[0].rowId).toBe(rowId);
  const unrelated = snapshot.groceryItems.filter((row) => row.rowId !== rowId);
  expect(unrelated.length).toBeGreaterThan(0);
  for (const row of unrelated) expect(row.recipeIds).toEqual([MOCK_IDS.RECIPE_LASAGNA]);
});

it('reported-only search finds an incomplete flagged recipe without promoting it or losing its flag on detail read', async () => {
  const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(
      async (pattern: Parameters<Page['route']>[0], handler: (route: Route) => Promise<unknown>) =>
        handlers.set(pattern, handler)
    ),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
  const recipe = builders.recipe({
    id: MOCK_IDS.RECIPE_LASAGNA,
    isReady: false,
    importIssue: {
      reasons: ['ingredients', 'steps'],
      note: null,
      status: 'reported',
      isReimporting: false,
    },
  });
  await setupCommonRoutes(page as unknown as Page, undefined, { canonicalEditor: recipe });
  const fulfill = vi.fn();
  const call = async (filters: Record<string, unknown>) => {
    fulfill.mockClear();
    await handlers.get('**/api/recipes/search')!({
      request: () => ({ method: () => 'POST', postDataJSON: () => ({ query: '', filters }) }),
      fulfill,
    } as unknown as Route);
    const result = fulfill.mock.calls[0][0];
    return result.json ?? JSON.parse(result.body);
  };
  expect((await call({})).data.results.some((item: any) => item.id === recipe.id)).toBe(false);
  const reported = (await call({ reportedOnly: true })).data;
  expect(reported.topPick).toBeNull();
  expect(reported.results).toEqual([
    expect.objectContaining({ id: recipe.id, importIssueStatus: 'reported' }),
  ]);
  fulfill.mockClear();
  await handlers.get('**/api/recipes/*')!({
    request: () => ({
      method: () => 'GET',
      url: () => `http://localhost/api/recipes/${recipe.id}`,
    }),
    fulfill,
  } as unknown as Route);
  const result = fulfill.mock.calls[0][0];
  expect(JSON.parse(result.body).recipe.importIssue).toEqual(recipe.importIssue);
});

it('food category mock preserves checks and conflicts on stale revisions across weeks', async () => {
  const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(
      async (
        pattern: Parameters<Page['route']>[0],
        handler: (route: Route) => Promise<unknown>
      ) => {
        handlers.set(pattern, handler);
      }
    ),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
  const common = await setupCommonRoutes(page as unknown as Page);
  const foodId = '09000000-0000-4000-8000-000000000001';
  const weeks = ['2026-11-09', '2026-11-16'];
  const row = {
    foodId,
    displayName: 'onion',
    normalizedKey: 'onion',
    section: 'Produce',
    quantity: 2,
    quantityComplete: true,
    unitText: 'piece',
    categoryScope: 'food',
    categoryStatus: 'conflict',
    categoryRevision: null,
    categoryChoices: [{ normalizedKey: 'oignon', grocerySection: 'Pantry', source: 'legacy' }],
  };
  for (const weekStartDate of weeks)
    common.groceryRows.decorate({ weekStartDate, groceryItems: [{ ...row }] });
  const initial = common.groceryRows.snapshot(weeks[0]);
  const item = initial.groceryItems[0];
  const checkedBody = {
    clientMutationId: '09000000-0000-4000-8000-000000000002',
    weekStartDate: weeks[0],
    rowId: item.rowId,
    expectedRowVersion: item.rowVersion,
    checked: true,
  };
  expect(common.groceryRows.mutate(weeks[0], 'item', checkedBody).status).toBe(200);
  const before = weeks.map((week) => common.groceryRows.snapshot(week));
  const call = async (body: unknown) => {
    const fulfill = vi.fn();
    const handler = handlers.get('**/api/foods/*/category');
    if (!handler) return { status: 404 };
    await handler({
      request: () => ({
        method: () => 'PATCH',
        url: () => `http://localhost/api/foods/${foodId}/category`,
        postDataJSON: () => body,
      }),
      fulfill,
      fallback: vi.fn(),
    } as unknown as Route);
    const response = fulfill.mock.calls[0][0];
    return { status: response.status ?? 200, json: response.json };
  };
  expect((await call({ grocerySection: 'Produce', expectedCategoryRevision: null })).status).toBe(
    204
  );
  const after = weeks.map((week) => common.groceryRows.snapshot(week));
  for (let i = 0; i < weeks.length; i++) {
    expect(after[i].groceryListVersion).toBe(before[i].groceryListVersion);
    expect(after[i].groceryState).toEqual(before[i].groceryState);
    expect(after[i].groceryItems[0].rowVersion).toBe(before[i].groceryItems[0].rowVersion);
    expect(BigInt(after[i].presentationVersion)).toBeGreaterThan(
      BigInt(before[i].presentationVersion)
    );
    expect(after[i].groceryItems[0]).toMatchObject({
      categoryStatus: 'resolved',
      categoryChoices: row.categoryChoices,
    });
    expect(after[i].groceryItems[0].categoryRevision).toBeTruthy();
  }
  expect((await call({ grocerySection: 'Pantry', expectedCategoryRevision: null })).status).toBe(
    409
  );
  expect((await call({ grocerySection: 'Pantry' })).status).toBe(409);
  expect(weeks.map((week) => common.groceryRows.snapshot(week))).toEqual(after);
  expect(page.evaluate).toHaveBeenCalledTimes(2);
  expect(
    (
      await call({
        grocerySection: 'Pantry',
        expectedCategoryRevision: after[0].groceryItems[0].categoryRevision,
      })
    ).status
  ).toBe(204);
  expect(common.groceryRows.snapshot(weeks[0]).groceryState).toEqual(before[0].groceryState);
  expect(common.groceryRows.snapshot(weeks[0]).groceryListVersion).not.toBe(
    after[0].groceryListVersion
  );
  common.groceryRows.decorate({ weekStartDate: weeks[0], groceryItems: [{ ...row }] });
  expect(common.groceryRows.snapshot(weeks[0]).groceryItems[0].section).toBe('Pantry');
  const replay = common.groceryRows.mutate(weeks[0], 'item', checkedBody);
  expect(replay.json).toMatchObject({
    rows: [
      {
        section: 'Pantry',
        categoryRevision: common.groceryRows.snapshot(weeks[0]).groceryItems[0].categoryRevision,
      },
    ],
  });
});
