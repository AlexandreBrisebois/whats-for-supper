import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

const NEW_MEMBER_ID = '550e8400-e29b-41d4-a716-446655440099';

test.describe('Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonRoutes(page);
    const members = [builders.familyMember({ name: 'Alex' })];

    // Override the family mock to handle the stateful members list
    await page.route(/\/api\/family/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: members }),
        });
      } else if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { name?: string };
        const newMember = builders.familyMember({
          id: NEW_MEMBER_ID,
          name: body.name ?? 'New Member',
        });
        members.push(newMember);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: newMember }),
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
    await expect(page.getByTestId('onboarding-title')).toBeVisible();
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

    const addButton = page.getByTestId('add-member-trigger');
    await addButton.click();

    const nameInput = page.getByTestId('family-name-input');
    await nameInput.fill(newName);

    const submitButton = page.getByTestId('add-member-submit');
    await Promise.all([page.waitForURL(/\/home/), submitButton.click()]);

    await expect(page).toHaveURL(/\/home/);
  });
});
