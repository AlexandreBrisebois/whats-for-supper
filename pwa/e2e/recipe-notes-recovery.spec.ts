import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

test('notes acknowledge persistence, restore A, flush close and retain failed drafts', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const id = MOCK_IDS.RECIPE_LASAGNA;
  let stored = 'A';
  let reject = false;
  let release: (() => void) | undefined;
  let hold = false;
  const writes: string[] = [];
  const recipe = () => builders.recipe({ id, name: 'Notes pasta', notes: stored, isReady: true });
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  await page.addInitScript((member) => {
    localStorage.setItem(
      'family-storage',
      JSON.stringify({
        state: {
          selectedFamilyMemberId: member,
          familyMembers: [{ id: member, name: 'Alex', browseViewMode: 'stack' }],
          hasLoaded: true,
        },
        version: 0,
      })
    );
  }, MOCK_IDS.MEMBER_ALEX);
  await setupCommonRoutes(page);
  await page.route('**/api/recipes/library-summary', (route) =>
    route.fulfill({
      json: {
        data: { total: 1, neverCooked: 1, ratings: { love: 0, like: 0, dislike: 0, unrated: 1 } },
      },
    })
  );
  await page.route('**/api/recipes?**order=explore**', (route) =>
    route.fulfill({
      json: {
        updatedAt: '2026-05-04T12:00:00Z',
        recipes: [recipe()],
        pagination: { page: 1, limit: 20, total: 1 },
      },
    })
  );
  await page.route(`**/api/recipes/${id}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      const text = route.request().postDataJSON().notes as string;
      writes.push(text);
      if (hold)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      if (reject) {
        await route.fulfill({ status: 400, json: { message: 'Cannot save now' } });
        return;
      }
      stored = text;
    }
    await route.fulfill({ json: { updatedAt: '2026-05-04T12:00:00Z', recipe: recipe() } });
  });
  await page.goto('/browse-all-stack');
  const open = async () => {
    await page.getByTestId('stack-card-front').click();
    await expect(page.getByTestId('recipe-notes-input')).toBeVisible();
  };
  await open();
  hold = true;
  await page.getByTestId('recipe-notes-input').fill('B');
  await expect.poll(() => writes).toEqual(['B']);
  await expect(page.getByTestId('recipe-notes-saved')).toHaveCount(0);
  await page.getByTestId('recipe-notes-input').fill('A');
  hold = false;
  release!();
  await expect.poll(() => stored).toBe('A');
  await expect.poll(() => writes).toEqual(['B', 'A']);
  await expect(page.getByTestId('recipe-notes-saved')).toBeVisible();
  await page.getByTestId('action-close-sheet').click();
  await open();
  await expect(page.getByTestId('recipe-notes-input')).toHaveValue('A');

  reject = true;
  await page.getByTestId('recipe-notes-input').fill(' retained draft ');
  await page.getByTestId('action-close-sheet').click();
  await expect.poll(() => writes.length).toBe(3);
  await open();
  await expect(page.getByTestId('recipe-notes-input')).toHaveValue(' retained draft ');
  await expect(page.getByTestId('recipe-notes-retry')).toBeVisible();
  await expect(page.getByTestId('recipe-notes-saved')).toHaveCount(0);
  reject = false;
  await page.getByTestId('recipe-notes-retry').click();
  await expect(page.getByTestId('recipe-notes-saved')).toBeVisible();
  await expect.poll(() => stored).toBe(' retained draft ');
  await page.getByTestId('action-close-sheet').click();
  await page.reload();
  await open();
  await expect(page.getByTestId('recipe-notes-input')).toHaveValue(' retained draft ');
});
