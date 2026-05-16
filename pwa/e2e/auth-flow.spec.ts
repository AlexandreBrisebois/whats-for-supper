import { test, expect } from './fixtures';
import { generateSecretToken } from './auth-utils';

test.describe('Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start fresh for each test
    await page.context().clearCookies();
  });

  test('unauthenticated user is redirected to /welcome', async ({ page }) => {
    await page.goto('/');
    // Use a regex to allow for potential trailing slashes or query params
    await expect(page).toHaveURL(/\/welcome/);
  });

  test('user can log in with passphrase', async ({ page }) => {
    await page.goto('/welcome');

    const secret = process.env.HEARTH_SECRET || 'Paris-Montreal';
    const input = page.getByTestId('passphrase-input');
    await expect(input).toBeVisible();
    await input.fill(secret);

    const enterBtn = page.getByTestId('welcome-enter-btn');
    await enterBtn.click();

    // Should redirect to onboarding
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test('magic invite link works and redirects to home', async ({ page }) => {
    const secret = process.env.HEARTH_SECRET || 'Paris-Montreal';
    const token = await generateSecretToken(secret);
    const memberId = '550e8400-e29b-41d4-a716-446655440001';

    await page.goto(`/invite?secret=${token}&memberId=${memberId}`);

    // Should set cookie and redirect to home
    await expect(page).toHaveURL(/\/home/);
  });

  test('magic voting link redirects to discovery', async ({ page }) => {
    const secret = process.env.HEARTH_SECRET || 'Paris-Montreal';
    const token = await generateSecretToken(secret);

    await page.goto(`/invite?secret=${token}&redirect=/discovery`);

    await expect(page).toHaveURL(/\/discovery/);
  });
});
