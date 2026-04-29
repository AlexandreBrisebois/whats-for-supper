import { test, expect } from './fixtures';
import { MOCK_IDS, builders } from './mock-api';

const MOCK_RECIPES = {
  topPick: {
    id: MOCK_IDS.RECIPE_LASAGNA,
    name: 'Homemade Lasagna',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3',
    tags: ['italian', 'dinner'],
  },
  secondary: [
    {
      id: MOCK_IDS.RECIPE_STIR_FRY,
      name: 'Chicken Stir Fry',
      rating: 4,
      image: 'https://images.unsplash.com/photo-1559847844-5315695dadae',
      tags: ['asian', 'quick'],
    },
    {
      id: MOCK_IDS.RECIPE_TACOS,
      name: 'Beef Tacos',
      rating: 4,
      image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47',
      tags: ['mexican', 'dinner'],
    },
  ],
};

test.describe('Recipes Search Page', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: id },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await page.route(/\/(?:backend\/)?api\/recipes/, async (route) => {
      const url = route.request().url();

      if (url.includes('/recommendations')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              topPick: {
                ...MOCK_RECIPES.topPick,
                imageUrl: MOCK_RECIPES.topPick.image,
                description: 'A classic favorite.',
                prepTime: '45 min',
                difficulty: 'Medium',
              },
              results: MOCK_RECIPES.secondary.map((r) => ({
                ...r,
                time: '20 min',
              })),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              builders.recipe({ ...MOCK_RECIPES.topPick }),
              builders.recipe({ ...MOCK_RECIPES.secondary[0] }),
              builders.recipe({ ...MOCK_RECIPES.secondary[1] }),
            ],
            total: 3,
          }),
        });
      }
    });
  });

  test('should display search UI and mock data correctly', async ({ page }) => {
    await page.goto('/recipes');

    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId('recipe-search-input')).toBeVisible();

    await expect(page.getByTestId('recipe-card-top-pick')).toBeVisible();
    await expect(page.getByTestId('recipe-card-top-pick')).toContainText(/Homemade Lasagna/i);

    await expect(page.getByTestId(`recipe-card-${MOCK_IDS.RECIPE_STIR_FRY}`)).toBeVisible();
    await expect(page.getByTestId(`recipe-card-${MOCK_IDS.RECIPE_TACOS}`)).toBeVisible();
  });
});
