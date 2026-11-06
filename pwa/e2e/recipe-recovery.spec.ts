import { test, expect } from './fixtures';
import { setupCommonRoutes, MOCK_IDS, builders } from './mock-api';

const id = MOCK_IDS.RECIPE_LASAGNA;
let lostStage: 'assign' | 'defer' | 'move' | 'remove' | null = null;
let removalRefreshFails = false;
test.beforeEach(async ({ page }) => {
  lostStage = null;
  removalRefreshFails = false;
  await setupCommonRoutes(page, undefined, {
    supperServings: {
      get failRefresh() {
        return removalRefreshFails;
      },
    },
    schedulePostCommitFailure: (stage) => {
      if (stage === 'remove') return removalRefreshFails;
      if (stage !== lostStage) return false;
      lostStage = null;
      return true;
    },
    scheduleRemovalReplyLost: () => {
      if (lostStage !== 'remove') return false;
      lostStage = null;
      return true;
    },
  });
  await page.route('**/api/recipes?**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      json: {
        recipes: [builders.recipe({ id, name: 'Recovery pasta' })],
        updatedAt: new Date().toISOString(),
        pagination: { page: 1, limit: 20, total: 1 },
      },
    });
  });
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
});

test('confirmed 204 removal continues replacement after grocery follow-up fails', async ({
  page,
}) => {
  await seedRecovery(page);
  removalRefreshFails = true;
  const writes: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET' && (path.endsWith('/remove') || path.endsWith('/assign')))
      writes.push(path);
  });
  const removed = page.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' &&
      new URL(response.url()).pathname.endsWith('/remove')
  );
  await page.getByTestId('recovery-action-drop').click();
  expect((await removed).status()).toBe(204);
  await expect(page.getByTestId('planner-planning-confirmation')).toContainText('May 13');
  await expect(page.getByTestId('recovery-retry-save')).toHaveCount(0);
  const saved = await readRecovery(page, 1);
  expect(saved.days[2].recipe.id).toBe(id);
  expect(saved.groceryRefresh.status).toBe('failed');
  expect(writes.filter((path) => path.endsWith('/remove'))).toHaveLength(1);
  expect(writes.filter((path) => path.endsWith('/assign'))).toHaveLength(1);
});

test('detail read failure offers Retry and move failure keeps recipe visible', async ({ page }) => {
  let readFails = true;
  await page.route(`**/api/recipes/${id}`, async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 404, json: { message: 'Unavailable' } });
      return;
    }
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill(
      readFails
        ? { status: 404, json: { message: 'Unavailable' } }
        : {
            status: 200,
            json: {
              recipe: builders.recipe({ id, name: 'Recovery pasta' }),
              updatedAt: new Date().toISOString(),
            },
          }
    );
  });
  await page.goto('/browse-all-stack');
  await page.getByTestId('stack-card-front').click();
  await expect(page.getByTestId('recipe-detail-sheet').getByRole('alert')).toHaveText(
    'Could not load this recipe.'
  );
  await expect(page.getByTestId('action-close-sheet')).toBeEnabled();
  readFails = false;
  await page.getByTestId('recipe-detail-retry').click();
  await expect(page.getByTestId('recipe-detail-name')).toHaveText('Recovery pasta');
  await page.getByTestId('action-gear-menu').click();
  await page.getByTestId('action-move-to-bin').click();
  await expect(page.getByTestId('recipe-detail-sheet').getByRole('alert')).toHaveText(
    'Could not move this recipe to the Recycle Bin. Try again.'
  );
  await expect(page.getByTestId('recipe-detail-name')).toBeVisible();
});

test('bin read failure retries and failed restore preserves the entry until successful retry', async ({
  page,
}) => {
  let readFails = true;
  let restores = 0;
  await page.route('**/api/recipes/trash', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill(
      readFails
        ? { status: 404, json: { message: 'Unavailable' } }
        : {
            status: 200,
            json: {
              data: {
                items: [
                  {
                    id,
                    name: 'Recovery pasta',
                    imageUrl: null,
                    deletedAt: '2026-10-20T12:00:00Z',
                    deletedBy: null,
                  },
                ],
              },
            },
          }
    );
  });
  await page.route(`**/api/recipes/${id}/restore`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    restores += 1;
    await route.fulfill(
      restores === 1
        ? { status: 404, json: { message: 'Unavailable' } }
        : { status: 200, json: { data: builders.recipe({ id }) } }
    );
  });
  await page.goto('/browse-all-stack');
  await page.getByTestId('recycle-bin-entry').click();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not' })).toHaveText(
    'Could not load the Recycle Bin.'
  );
  await expect(page.getByTestId('trash-empty-state')).not.toBeVisible();
  readFails = false;
  await page.getByTestId('trash-retry').click();
  await page.getByTestId(`action-restore-${id}`).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not' })).toHaveText(
    'Could not restore this recipe. Try again.'
  );
  await expect(page.getByTestId(`trash-item-${id}`)).toBeVisible();
  await page.getByTestId(`action-restore-${id}`).click();
  await expect(page.getByTestId('trash-empty-state')).toBeVisible();
});

test('guarded Drop preserves a concurrent changed supper and never assigns the replacement', async ({
  page,
}) => {
  await page.goto('/recipes');
  const assign = async (recipeId: string) =>
    page.evaluate(async (recipeId) => {
      const response = await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 1, dayIndex: 2, recipeId }),
      });
      if (!response.ok) throw new Error('Could not seed supper');
    }, recipeId);
  await assign(MOCK_IDS.RECIPE_CHICKEN);
  await page.goto(`/recipes?addToDay=2&weekOffset=1&referenceWeekStartDate=2026-05-04&open=${id}`);
  await expect(page.getByTestId('recipe-detail-name')).toBeVisible();
  await page.getByTestId('action-add-to-day').click();
  await expect(page.getByTestId('recovery-action-drop')).toBeVisible();
  await assign(MOCK_IDS.RECIPE_CARBONARA);
  let assignments = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/schedule/assign' && request.method() === 'POST')
      assignments++;
  });
  const removal = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith('/remove') &&
      response.request().method() === 'DELETE'
  );
  await page.getByTestId('recovery-action-drop').click();
  const response = await removal;
  expect(response.status()).toBe(409);
  expect(new URL(response.url()).searchParams.get('expectedPlanToken')).toMatch(
    /^v1\.[A-Za-z0-9_-]{43}$/
  );
  await expect(page.getByTestId('recovery-review-plan')).toBeVisible();
  expect(assignments).toBe(0);
  const saved = await page.evaluate(async () => {
    const response = await fetch('/api/schedule?weekOffset=1&referenceWeekStartDate=2026-05-04');
    return (await response.json()).data.days[2].recipe.id;
  });
  expect(saved).toBe(MOCK_IDS.RECIPE_CARBONARA);
});

async function seedRecovery(page: import('@playwright/test').Page, fullFollowingWeek = false) {
  await page.goto('/recipes');
  await page.evaluate(
    async ({ original, fullFollowingWeek }) => {
      const assign = async (weekOffset: number, dayIndex: number) => {
        const response = await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekOffset, dayIndex, recipeId: original }),
        });
        if (!response.ok) throw new Error('Seed failed');
      };
      await assign(1, 2);
      if (fullFollowingWeek) for (let day = 0; day < 7; day++) await assign(2, day);
    },
    { original: MOCK_IDS.RECIPE_CHICKEN, fullFollowingWeek }
  );
  await page.goto(`/recipes?addToDay=2&weekOffset=1&referenceWeekStartDate=2026-05-04&open=${id}`);
  await page.getByTestId('action-add-to-day').click();
  await expect(page.getByTestId('recovery-action-next-week')).toBeVisible();
}

async function readRecovery(page: import('@playwright/test').Page, offset: number) {
  return page.evaluate(
    async (offset) =>
      (
        await (
          await fetch(`/api/schedule?weekOffset=${offset}&referenceWeekStartDate=2026-05-04`)
        ).json()
      ).data,
    offset
  );
}

test('exact-source Next Week spills past a full following week and retains the move after a rejected save', async ({
  page,
}) => {
  await seedRecovery(page, true);
  let defers = 0;
  let assigns = 0;
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST' && path === '/api/schedule/defer') defers++;
    if (request.method() === 'POST' && path === '/api/schedule/assign') assigns++;
  });
  let reject = true;
  await page.route('**/api/schedule/assign**', async (route) => {
    if (route.request().method() === 'POST' && reject) {
      reject = false;
      await route.fulfill({ status: 400, json: { message: 'Save rejected' } });
    } else await route.fallback();
  });
  const deferred = page.waitForRequest(
    (request) =>
      request.method() === 'POST' && new URL(request.url()).pathname === '/api/schedule/defer'
  );
  await page.getByTestId('recovery-action-next-week').click();
  const request = await deferred;
  expect(request.postDataJSON()).toEqual({
    sourceDate: '2026-05-13',
    recipeId: MOCK_IDS.RECIPE_CHICKEN,
  });
  expect(new URL(request.url()).searchParams.get('targetWeekOffset')).toBe('2');
  await expect(page.getByTestId('recovery-retry-save')).toBeVisible();
  await expect(page.getByTestId('replacement-recovery')).toContainText('May 25');
  await page.getByTestId('recovery-retry-save').click();
  await expect(page.getByTestId('planner-planning-confirmation')).toContainText(
    'following week was full'
  );
  await expect(page.getByTestId('planner-planning-confirmation')).toContainText('May 25');
  expect(defers).toBe(1);
  expect(assigns).toBe(2);
  expect((await readRecovery(page, 1)).days[2].recipe.id).toBe(id);
  expect((await readRecovery(page, 3)).days[0].recipe.id).toBe(MOCK_IDS.RECIPE_CHICKEN);
  expect(
    (await readRecovery(page, 2)).days.every(
      (day: any) => day.recipe?.id === MOCK_IDS.RECIPE_CHICKEN
    )
  ).toBe(true);
});

for (const stage of ['remove', 'assign', 'defer', 'move'] as const) {
  test(`lost ${stage} reply is reconciled without replaying a completed stage`, async ({
    page,
  }) => {
    await seedRecovery(page);
    const writes: string[] = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (request.method() !== 'GET' && /schedule\/(assign|defer|move|day\/.+\/remove)$/.test(path))
        writes.push(path);
    });
    lostStage = stage;
    await page
      .getByTestId(
        stage === 'defer'
          ? 'recovery-action-next-week'
          : stage === 'move'
            ? 'recovery-action-tomorrow'
            : 'recovery-action-drop'
      )
      .click();
    if (stage === 'remove') {
      await expect(page.getByTestId('recovery-retry-save')).toBeVisible();
      await page.getByTestId('recovery-retry-save').click();
    }
    if (stage === 'move' || stage === 'defer') {
      await expect(page.getByTestId('recovery-retry-check')).toBeVisible();
      await page.getByTestId('recovery-retry-check').click();
      await expect(page.getByTestId('replacement-feedback')).toContainText(
        'original meal could not be confirmed'
      );
      expect(writes.filter((path) => path === '/api/schedule/assign')).toHaveLength(0);
      await page.getByTestId('recovery-review-plan').click();
      await expect(page.getByTestId('replacement-feedback')).toContainText('unconfirmed');
      await page.getByTestId('recovery-abandon').click();
      await expect(page).toHaveURL(/planner/);
      const destination = await readRecovery(page, stage === 'move' ? 1 : 2);
      expect(destination.days[stage === 'move' ? 3 : 0].recipe.id).toBe(MOCK_IDS.RECIPE_CHICKEN);
    } else {
      await expect(page.getByTestId('planner-planning-confirmation')).toContainText('May 13');
      expect((await readRecovery(page, 1)).days[2].recipe.id).toBe(id);
      expect(writes.filter((path) => path === '/api/schedule/assign')).toHaveLength(1);
    }
    expect(lostStage).toBeNull();
    expect(
      writes.filter((path) =>
        path.endsWith(stage === 'assign' ? '/assign' : stage === 'remove' ? '/remove' : `/${stage}`)
      )
    ).toHaveLength(1);
  });
}

test('Home Drop protects the opening snapshot when the same original becomes Cooked', async ({
  page,
}) => {
  await page.route('**/api/schedule/fill-the-gap**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      status: 200,
      json: { data: [builders.scheduleRecipe({ id, name: 'Recovery pasta' })] },
    });
  });
  await page.goto('/recipes');
  await page.evaluate(async (recipeId) => {
    const response = await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekOffset: 0, dayIndex: 0, recipeId }),
    });
    if (!response.ok) throw new Error('Seed failed');
  }, MOCK_IDS.RECIPE_CHICKEN);
  await page.goto('/home');
  await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
  await page.getByTestId('tonight-menu-card').click();
  await page.getByTestId('skip-tonight-btn').dispatchEvent('click');
  await page.getByTestId('recovery-action-pick-else').click();
  await page.getByTestId('quick-find-select').click();
  await expect(page.getByTestId('recovery-action-drop')).toBeVisible();
  await page.evaluate(async () => {
    const response = await fetch('/api/schedule/day/2026-05-04/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 2 }),
    });
    if (!response.ok) throw new Error('Remote completion failed');
  });
  let assigns = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/schedule/assign')
      assigns++;
  });
  const deletion = page.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' &&
      new URL(response.url()).pathname.endsWith('/remove')
  );
  await page.getByTestId('recovery-action-drop').click();
  expect((await deletion).status()).toBe(409);
  await expect(page.getByTestId('replacement-feedback')).toContainText('Your plan changed');
  expect(assigns).toBe(0);
  expect((await readRecovery(page, 0)).days[0]).toMatchObject({
    status: 2,
    recipe: { id: MOCK_IDS.RECIPE_CHICKEN },
  });
});
