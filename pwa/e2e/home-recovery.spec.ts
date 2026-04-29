import { test, expect } from '@playwright/test';

test.describe('Home Command Center — Recovery Flow', () => {
  test.beforeEach(async ({ page }) => {
    const memberId = '550e8400-e29b-41d4-a716-446655440001';
    const domain = '127.0.0.1';

    // Auth cookie for Hearth Secret (Mocked)
    await page.context().addCookies([
      { name: 'h_access', value: 'mock-token', domain, path: '/' },
      { name: 'x-family-member-id', value: memberId, domain, path: '/' },
    ]);

    // Mock API responses BEFORE goto
    await page.route('**/api/family', async (route) => {
      console.log(`[MOCK] Hit /api/family`);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: memberId, name: 'Alex' }] }),
      });
    });

    // Visit a page to initialize the domain context for localStorage
    await page.goto('/onboarding');
    await page.evaluate((id) => {
      localStorage.setItem('x-family-member-id', id); // Just in case
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
    }, memberId);

    await page.route('**/api/schedule?weekOffset=0', async (route) => {
      console.log('MOCK: Hit /api/schedule');
      const today = new Date().toISOString().split('T')[0];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            weekOffset: 0,
            locked: false,
            days: [
              {
                date: today,
                recipe: {
                  id: 'recipe-1',
                  name: 'Test Lasagna',
                  image: '/api/recipes/recipe-1/hero',
                  ingredients: ['Pasta', 'Cheese', 'Sauce'],
                  description: 'A classic test lasagna.',
                },
              },
            ],
          },
        }),
      });
    });

    await page.goto('/home');
  });

  test('Flip card reveals ingredients', async ({ page }) => {
    const card = page.getByTestId('tonight-menu-card');
    await expect(card).toBeVisible();

    // Initially front is visible, back is hidden
    await expect(page.getByText('Ingredients & Info')).not.toBeInViewport();

    // Click to flip
    await card.click();

    // Back should be visible
    await expect(page.getByText('Ingredients & Info')).toBeVisible();
    await expect(page.getByText('Pasta')).toBeVisible();
    await expect(page.getByText('Cheese')).toBeVisible();
  });

  test('Skip tonight -> Tomorrow shifts calendar', async ({ page }) => {
    const card = page.getByTestId('tonight-menu-card');
    await card.click(); // Flip to see Skip button

    const skipBtn = page.getByTestId('skip-tonight-btn');
    await skipBtn.click();

    // Recovery Dialog Step 1
    await expect(page.getByText("What's the backup plan?")).toBeVisible();

    // Select "Ordering In"
    const orderInBtn = page.getByText('Ordering In');

    // Mock the validate (skip) call
    let validateCalled = false;
    await page.route('**/api/schedule/day/*/validate', async (route) => {
      validateCalled = true;
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await orderInBtn.click();
    expect(validateCalled).toBeTruthy();

    // Recovery Dialog Step 2
    await expect(page.getByText("What about tonight's recipe?")).toBeVisible();

    // Mock the move (push) call
    let moveCalled = false;
    await page.route('**/api/schedule/move', async (route) => {
      const body = route.request().postDataJSON();
      if (body.intent === 'push') {
        moveCalled = true;
      }
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    const tomorrowBtn = page.getByText('Tomorrow');
    await tomorrowBtn.click();

    expect(moveCalled).toBeTruthy();

    // Dialog should close and we should be back on home showing SmartPivot (since tonight is skipped)
    await expect(page.getByTestId('smart-pivot-card')).toBeVisible();
  });
});
