import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';
import { assertCookbookVisualA11y } from './visual-a11y-contract';

test('saved URL initialization failure retries its existing workflow and reconciles on reload', async ({
  page,
}) => {
  const workflowId = MOCK_IDS.CAPTURE_FAILURE_URL;
  const recipeId = MOCK_IDS.RECIPE_LASAGNA;
  const reason =
    'Your recipe was saved, but its import has not started. Retry to start importing it.';
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  await page.addInitScript((id) => {
    localStorage.setItem(
      'family-storage',
      JSON.stringify({
        state: {
          selectedFamilyMemberId: id,
          familyMembers: [{ id, name: 'Alex' }],
          _hasHydrated: true,
          hasLoaded: true,
        },
        version: 0,
      })
    );
  }, MOCK_IDS.MEMBER_ALEX);
  await setupCommonRoutes(page);
  let failed = true;
  let retryCount = 0;
  let intakeCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/recipes/capture-url'))
      intakeCount++;
  });
  await page.route('**/api/captures/failures', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      json: {
        data: {
          items: failed
            ? [
                {
                  id: workflowId,
                  workflowInstanceId: workflowId,
                  recipeId,
                  familyMemberId: MOCK_IDS.MEMBER_ALEX,
                  sourceWorkflowId: 'url-import',
                  sourceType: 'url',
                  friendlyReason: reason,
                  previewText: 'https://example.com/supper',
                  status: 'failed',
                  retryCount: 0,
                  createdAt: '2026-05-04T12:00:00Z',
                  lastFailedAt: '2026-05-04T12:00:00Z',
                },
              ]
            : [],
        },
      },
    });
  });
  await page.route(`**/api/captures/failures/${workflowId}/retry`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    retryCount++;
    failed = false;
    await route.fulfill({ status: 202, json: { data: { queued: true } } });
  });
  await page.goto('/profile/settings');
  await expect(page.getByTestId(`failed-capture-reason-${workflowId}`)).toHaveText(reason);
  await page.getByTestId(`action-retry-${workflowId}`).click();
  await expect(page.getByTestId(`action-retry-${workflowId}-retrying`)).toBeVisible();
  expect(retryCount).toBe(1);
  expect(intakeCount).toBe(0);
  await page.reload();
  await expect(page.getByTestId('failed-captures-section')).toHaveCount(0);
  expect(intakeCount).toBe(0);
});

test.describe('URL capture & recovery Family Cookbook dual-mode visual & a11y contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: MOCK_IDS.MEMBER_ALEX,
        url: process.env.BASE_URL || 'http://127.0.0.1:3000',
      },
    ]);
    await page.setViewportSize({ width: 390, height: 844 });
    await setupCommonRoutes(page);
  });

  for (const mode of ['standard', 'high'] as const) {
    const contrastLevel = mode === 'high' ? 'aaa' : 'aa';

    test(`URL review, queued screen, and settings recovery satisfy ${contrastLevel.toUpperCase()} contract in ${mode} mode`, async ({
      page,
    }) => {
      await page.route('**/api/captures/failures', async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        return route.fulfill({
          json: {
            data: {
              items: [
                {
                  id: MOCK_IDS.CAPTURE_FAILURE_URL,
                  workflowInstanceId: MOCK_IDS.CAPTURE_FAILURE_URL,
                  recipeId: MOCK_IDS.RECIPE_LASAGNA,
                  familyMemberId: MOCK_IDS.MEMBER_ALEX,
                  sourceWorkflowId: 'url-import',
                  sourceType: 'url',
                  friendlyReason: 'Your recipe was saved, but its import has not started.',
                  previewText: 'https://example.com/supper',
                  status: 'failed',
                  retryCount: 0,
                  createdAt: '2026-05-04T12:00:00Z',
                  lastFailedAt: '2026-05-04T12:00:00Z',
                },
              ],
            },
          },
        });
      });

      await page.goto('/profile');
      await expect(page.getByTestId('selected-member-name')).toHaveText('Alex');
      const save = page.waitForResponse(
        (r) =>
          r.url().endsWith(`/api/family/${MOCK_IDS.MEMBER_ALEX}/preferences`) &&
          r.request().method() === 'PUT'
      );
      await page.getByTestId(`contrast-btn-${mode}`).click();
      await save;
      await expect(page.locator('html')).toHaveAttribute('data-contrast', mode);

      await page.goto('/capture?url=https%3A%2F%2Fexample.com%2Fsupper');
      await expect(page.getByTestId('capture-url-review-heading')).toBeVisible();
      await page.getByTestId('capture-rating-3').click();
      await page.getByLabel(/notes/i).fill('Serve with crusty bread');
      await assertCookbookVisualA11y(page, { contrastLevel });

      await page.getByTestId('capture-url-save-btn').click();
      await expect(page.getByTestId('capture-success-heading')).toBeVisible();
      await assertCookbookVisualA11y(page, { contrastLevel });

      await page.goto('/profile/settings');
      await expect(
        page.getByTestId(`failed-capture-reason-${MOCK_IDS.CAPTURE_FAILURE_URL}`)
      ).toBeVisible();
      await assertCookbookVisualA11y(page, { contrastLevel });
    });
  }

  test('OS prefers-contrast: more enforces High Contrast AAA on URL capture review & queued views', async ({
    page,
  }) => {
    await page.emulateMedia({ contrast: 'more' });
    await page.goto('/capture?url=https%3A%2F%2Fexample.com%2Fsupper');
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
    await expect(page.getByTestId('capture-url-review-heading')).toBeVisible();
    await assertCookbookVisualA11y(page, { contrastLevel: 'aaa' });

    await page.getByTestId('capture-url-save-btn').click();
    await expect(page.getByTestId('capture-success-heading')).toBeVisible();
    await assertCookbookVisualA11y(page, { contrastLevel: 'aaa' });
  });
});
