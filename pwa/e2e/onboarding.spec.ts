import { test, expect } from './fixtures';
import { MOCK_IDS, builders } from './mock-api';

const NEW_MEMBER_ID = '550e8400-e29b-41d4-a716-446655440099';

test.describe('Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/\/(?:backend\/)?api\/family(?:\?|$)/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [builders.familyMember({ name: 'Alex' })] }),
        });
      } else if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { name?: string };
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: builders.familyMember({
              id: NEW_MEMBER_ID,
              name: body.name ?? 'New Member',
            }),
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(/\/(?:backend\/)?api\/schedule/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { weekOffset: 0, locked: false, days: [], status: 0 } }),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('fresh user visiting / is redirected to /onboarding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test('onboarding page displays the family member list', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByRole('heading', { name: /who are you/i })).toBeVisible();
    await expect(page.getByTestId('family-list')).toBeVisible();
  });

  test('selecting a family member redirects to /home with a welcome message', async ({ page }) => {
    await page.goto('/onboarding');

    const familyList = page.getByTestId('family-list');
    await expect(familyList).toBeVisible({ timeout: 10_000 });

    const alexMember = page.getByTestId(`family-member-${MOCK_IDS.MEMBER_ALEX}`);
    await expect(alexMember).toBeVisible({ timeout: 10_000 });
    await alexMember.click();

    await expect(page).toHaveURL(/\/home/);
    await expect(
      page.getByTestId('tonight-menu-card').or(page.getByTestId('smart-pivot-card'))
    ).toBeVisible({ timeout: 10_000 });
  });

  test('adding a new family member saves it and redirects to /home', async ({ page }) => {
    const newName = `TestUser-${Date.now()}`;

    await page.goto('/onboarding');
    await expect(page.getByTestId('family-list')).toBeVisible({ timeout: 10_000 });

    const addButton = page.getByRole('button', { name: /Don't see your name/i });
    await addButton.click();

    const nameInput = page.getByRole('textbox');
    await nameInput.fill(newName);

    const submitButton = page.getByRole('button', { name: 'Add Member', exact: true });
    await submitButton.click();

    await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
  });
});
