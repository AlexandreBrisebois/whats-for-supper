import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';

test('demo management mocks refuse visitor capture, reset and retry', async ({ page, baseURL }) => {
  const origin = new URL(baseURL || 'http://127.0.0.1:3000').origin;
  if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname))
    throw new Error('Demo management tests require loopback hosting.');
  await page.route(/^https?:\/\//, (route) =>
    new URL(route.request().url()).origin === origin ? route.fallback() : route.abort()
  );
  await setupCommonRoutes(page, undefined, {
    demoMode: true,
    demoManagementTaskIds: [MOCK_IDS.RECIPE_LASAGNA],
  });
  await page.goto('/welcome');
  const outcomes = await page.evaluate(async (taskId) => {
    const paths = [
      '/api/management/demo-capture',
      '/api/management/demo-restore',
      '/api/workflows/demo-capture/trigger',
      '/api/workflows/demo-restore/trigger',
      `/api/workflows/tasks/${taskId}/reset`,
    ];
    const results = [];
    for (const path of paths) {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters: {} }),
      });
      results.push({ status: response.status, body: await response.json() });
    }
    return results;
  }, MOCK_IDS.RECIPE_LASAGNA);
  expect(outcomes).toHaveLength(5);
  for (const result of outcomes) {
    expect(result.status).toBe(403);
    expect(result.body.code).toBe('DEMO_MANAGEMENT_UNAVAILABLE');
  }
});
