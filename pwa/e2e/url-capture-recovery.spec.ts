import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';

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
