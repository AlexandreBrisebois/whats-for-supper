import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';

const NEW_MEMBER_ID = MOCK_IDS.MEMBER_TEST;

test.describe.configure({ mode: 'serial' });

test.describe('Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonRoutes(page);
    await page.route('**/api/schedule', async (route) => {
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

  test('selecting a family member is clickable', async ({ page }) => {
    // Seam: member appears in list and is interactive.
    // The /home redirect requires the full backend (HttpOnly cookie + SSR fetch);
    // that flow is covered by auth-flow.spec.ts.
    await page.goto('/onboarding');
    await expect(page.getByTestId('family-list')).toBeVisible({ timeout: 10_000 });

    const alexMember = page.getByTestId(`family-member-${MOCK_IDS.MEMBER_ALEX}`);
    await expect(alexMember).toBeVisible({ timeout: 10_000 });
    await alexMember.click();
  });

  test('adding a new family member shows the form and accepts input', async ({ page }) => {
    // Seam: the add-member form renders, accepts input, and POSTs to /api/family.
    // This checks the browser API seam; durable Home arrival is separate.
    await page.goto('/onboarding');
    await expect(page.getByTestId('family-list')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('add-member-trigger').click();

    const nameInput = page.getByTestId('family-name-input');
    await nameInput.fill(' TestUser-Pinned ');
    await expect(nameInput).toHaveValue(' TestUser-Pinned ');

    const responsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/family' && response.request().method() === 'POST'
    );
    await page.getByTestId('add-member-submit').click();
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    expect(response.request().postDataJSON()).toEqual({ name: 'TestUser-Pinned' });
    expect((await response.json()).data).toMatchObject({
      id: NEW_MEMBER_ID,
      name: 'TestUser-Pinned',
    });
    // The store appends the returned member without reloading.
    await expect(page.getByTestId(`family-member-${NEW_MEMBER_ID}`)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('duplicate member creation returns 409 without adding a duplicate to the list', async ({
    page,
  }) => {
    await page.goto('/onboarding');
    await expect(page.getByTestId('family-list')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('add-member-trigger').click();

    const nameInput = page.getByTestId('family-name-input');
    await nameInput.fill(' Alex ');

    const responsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/family' && response.request().method() === 'POST'
    );
    await page.getByTestId('add-member-submit').click();
    const response = await responsePromise;
    expect(response.status()).toBe(409);

    // Initial 2 members (Alex and Jordan) remain, no duplicate Alex added
    await expect(page.getByTestId('family-list').locator('li')).toHaveCount(2);
  });
});
