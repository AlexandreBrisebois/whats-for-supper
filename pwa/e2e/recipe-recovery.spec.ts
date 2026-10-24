import { test, expect } from './fixtures';
import { setupCommonRoutes, MOCK_IDS, builders } from './mock-api';

const id = MOCK_IDS.RECIPE_LASAGNA;
test.beforeEach(async ({ page }) => {
  await setupCommonRoutes(page);
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
