import { test, expect } from './fixtures';
import { setupCommonRoutes, MOCK_IDS, builders } from './mock-api';

const id = MOCK_IDS.RECIPE_LASAGNA;
test.beforeEach(async ({ page }) => {
  await setupCommonRoutes(page);
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
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
});

test('failed cooking read is honest and Retry loads actual instructions', async ({ page }) => {
  let readFails = false;
  await page.route(`**/api/recipes/${id}`, async (route) => {
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
              recipe: {
                ...builders.recipe({ id, name: 'Recovery pasta' }),
                recipeInstructions: ['Actual cooking instruction'],
              },
              updatedAt: new Date().toISOString(),
            },
          }
    );
  });
  await page.goto('/browse-all-stack');
  await page.getByTestId('stack-card-front').click();
  await expect(page.getByTestId('time-cook-btn')).toBeVisible();
  readFails = true;
  await page.getByTestId('time-cook-btn').click();
  await expect(page.getByTestId('cooks-mode-no-steps')).toContainText(
    'Could not load cooking instructions.'
  );
  await expect(page.getByRole('button', { name: 'Mark recipe as cooked' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'All steps', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Step by step', exact: true })).toBeVisible();
  readFails = false;
  await page.getByTestId('cooks-mode-content-retry').click();
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
    'Actual cooking instruction'
  );
});

test('missing steps reuse the report form to launch reimport and Retry reads recovered content', async ({
  page,
}, testInfo) => {
  let recovered = false;
  const recipe = () => ({
    ...builders.recipe({
      id,
      name: 'Recovery pasta',
      canReimport: true,
      sourceType: 'url',
      sourceUrl: 'https://example.com/pasta',
    }),
    recipeInstructions: recovered ? ['Recovered cooking instruction'] : [],
  });
  await page.route(`**/api/recipes/${id}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      json: { recipe: recipe(), updatedAt: new Date().toISOString() },
    });
  });
  await page.route(`**/api/recipes/${id}/import-report`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    expect(route.request().postDataJSON()).toEqual({
      reasons: ['steps'],
      note: 'Missing cooking steps',
    });
    await route.fulfill({
      status: 200,
      json: {
        recipe: {
          ...recipe(),
          importIssue: {
            reasons: ['steps'],
            note: 'Missing cooking steps',
            status: 'reported',
            isReimporting: true,
          },
        },
        reimportStarted: true,
        reimportLaunchFailed: false,
        importId: MOCK_IDS.PHOTO_NEW,
      },
    });
  });
  await page.goto('/browse-all-stack');
  await page.getByTestId('stack-card-front').click();
  await page.getByTestId('time-cook-btn').click();
  await expect(page.getByTestId('cooks-mode-no-steps')).toContainText(
    'Cooking instructions are not available'
  );
  await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: testInfo.outputPath('missing-instructions.png') });
  await page.getByRole('button', { name: 'Recipe details', exact: true }).click();
  await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(2);
  await expect(page.getByTestId('action-view-original').last()).toBeVisible();
  await page.getByTestId('action-close-sheet').last().click();
  await page.getByRole('button', { name: 'Report steps', exact: true }).click();
  await page.getByTestId('import-issue-note-disclosure').click();
  await page.getByTestId('import-issue-note').fill('Missing cooking steps');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Reimporting in background' })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark recipe as cooked' })).toBeEnabled();
  recovered = true;
  await page.getByTestId('cooks-mode-content-retry').click();
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
    'Recovered cooking instruction'
  );
});
