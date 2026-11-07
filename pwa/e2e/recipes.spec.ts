import { writeFile } from 'node:fs/promises';
import { swipeCurrentStackCard } from './helpers/stack-swipe';
import { test, expect } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import { expectDiscoveryGeometry } from './helpers/discovery-geometry';
import {
  MOCK_IDS,
  builders,
  setupCommonRoutes,
  mockNonCookingSchedule,
  mockSupperServings,
} from './mock-api';

const FILTER_MAIN_IDS = {
  BEEF: 'beef',
  POULTRY: 'poultry',
  PORK: 'pork',
  FISH: 'fish',
  PASTA: 'pasta',
  VEGETARIAN: 'vegetarian',
  TACO_NIGHT: 'taco-night',
} as const;

const MOCK_SEARCH_RESULTS = {
  topPick: {
    id: MOCK_IDS.RECIPE_LASAGNA,
    name: 'Homemade Lasagna',
    imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3',
    totalTime: 'PT45M',
    rating: 3,
    isDiscoverable: true,
    notes: null,
    reasons: [{ source: 'name-match', label: 'Name matches your search' }],
    isPromotionEligible: true,
  },
  secondary: [
    {
      id: MOCK_IDS.RECIPE_STIR_FRY,
      name: 'Chicken Stir Fry',
      imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae',
      totalTime: 'PT20M',
      rating: 2,
      isDiscoverable: true,
      notes: null,
      reasons: [{ source: 'name-match', label: 'Name matches your search' }],
      isPromotionEligible: true,
    },
    {
      id: MOCK_IDS.RECIPE_TACOS,
      name: 'Beef Tacos',
      imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47',
      totalTime: 'PT25M',
      rating: 2,
      isDiscoverable: true,
      notes: null,
      reasons: [{ source: 'name-match', label: 'Name matches your search' }],
      isPromotionEligible: true,
    },
  ],
};

const MOCK_DETAIL_RECIPE = builders.recipe({
  id: MOCK_IDS.RECIPE_LASAGNA,
  name: 'Homemade Lasagna',
  description: 'Layered comfort food for the whole family.',
  imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3',
  totalTime: 'PT45M',
  rating: 3,
  notes: 'Family favorite on rainy nights.',
  ingredients: ['Pasta', 'Tomato', 'Cheese'],
});

test.describe('Recipes Search Page', () => {
  let commonRoutes: Awaited<ReturnType<typeof setupCommonRoutes>>;
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

    commonRoutes = await setupCommonRoutes(page);

    await page.route('**/api/recipes/search', async (route) => {
      const body = route.request().postDataJSON() as { query?: string };
      const query = body?.query ?? '';

      const response =
        query === 'chicken'
          ? {
              topPick: MOCK_SEARCH_RESULTS.topPick,
              results: MOCK_SEARCH_RESULTS.secondary,
              appliedFilters: {},
              searchMode: 'explicit',
              resultPath: 'lexical-only',
            }
          : {
              topPick: null,
              results: [],
              appliedFilters: {},
              searchMode: 'explicit',
              resultPath: 'lexical-only',
            };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: response }),
      });
    });

    await page.route('**/api/recipes?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipes: [
            builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Homemade Lasagna' }),
            builders.recipe({ id: MOCK_IDS.RECIPE_STIR_FRY, name: 'Chicken Stir Fry' }),
            builders.recipe({ id: MOCK_IDS.RECIPE_TACOS, name: 'Beef Tacos' }),
          ],
          pagination: { page: 1, limit: 20, total: 3 },
        }),
      });
    });

    await page.route('**/api/recipes/*', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: MOCK_DETAIL_RECIPE }),
        });
        return;
      }

      if (method === 'PATCH') {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: { ...MOCK_DETAIL_RECIPE, ...body } }),
        });
        return;
      }

      await route.fallback();
    });
  });

  for (const locale of ['en', 'fr'] as const) {
    for (const width of [320, 390, 1280]) {
      for (const [id, initial] of [
        [MOCK_IDS.RECIPE_LASAGNA, 4],
        [MOCK_IDS.RECIPE_CARBONARA, null],
      ] as const) {
        test(`servings editor layout ${locale} ${width} ${initial}`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 });
          await setupCommonRoutes(page);
          await page.addInitScript((language) => localStorage.setItem('locale', language), locale);
          await page.goto(`/recipes?open=${id}`);
          await page.getByTestId('action-gear-menu').click();
          await page.getByTestId('action-edit-recipe').click();
          const input = page.getByTestId('recipe-edit-servings-input');
          const label = page.locator('label[for="recipe-edit-servings"]');
          const error = page.locator('#recipe-servings-error');
          const sheet = page.getByTestId('recipe-detail-sheet');
          await expect(input).toHaveAccessibleName(locale === 'en' ? 'Servings' : 'Portions');
          await expect(input).toHaveValue(initial == null ? '' : String(initial));
          await input.focus();
          await expect(input).toBeFocused();

          const expectHorizontalField = async () => {
            await expect(label).toBeVisible();
            await expect(input).toBeVisible();
            await expect(async () => {
              const labelBox = (await label.boundingBox())!;
              const inputBox = (await input.boundingBox())!;
              const sheetBox = (await sheet.boundingBox())!;
              expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(inputBox.x);
              expect(
                Math.abs(labelBox.y + labelBox.height / 2 - inputBox.y - inputBox.height / 2)
              ).toBeLessThanOrEqual(2);
              expect(labelBox.x).toBeGreaterThanOrEqual(Math.max(0, sheetBox.x));
              expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(
                Math.min(width, sheetBox.x + sheetBox.width)
              );
              expect(
                await sheet.evaluate((element) => element.scrollWidth - element.clientWidth)
              ).toBeLessThanOrEqual(1);
            }).toPass({ timeout: 5000 });
          };

          await expectHorizontalField();
          if (initial === 4 && width !== 390) {
            await input
              .locator('..')
              .locator('..')
              .screenshot({
                path: `../.task/servings-label/${locale}-${width}-valid.png`,
              });
          }
          await input.fill('0');
          await expect(input).toHaveAttribute('aria-invalid', 'true');
          await expect(input).toHaveAccessibleDescription(
            locale === 'en'
              ? 'Enter a whole number from 1 to 2147483647.'
              : 'Saisissez un nombre entier de 1 à 2147483647.'
          );
          await expect(page.getByTestId('recipe-save-edits')).toBeDisabled();
          await expect(error).toBeVisible();
          await expectHorizontalField();
          const inputBox = (await input.boundingBox())!;
          expect((await error.boundingBox())!.y).toBeGreaterThanOrEqual(
            inputBox.y + inputBox.height
          );
          if (initial === 4 && width !== 390) {
            await input
              .locator('..')
              .locator('..')
              .screenshot({
                path: `../.task/servings-label/${locale}-${width}-invalid.png`,
              });
          }
          await input.fill('4');
          await expect(input).toHaveAttribute('aria-invalid', 'false');
          await expect(error).toHaveCount(0);
          await expectHorizontalField();
        });
      }
    }
  }

  for (const locale of ['en', 'fr'] as const) {
    for (const [id, initial, next] of [
      [MOCK_IDS.RECIPE_LASAGNA, 4, 3],
      [MOCK_IDS.RECIPE_CARBONARA, null, 2],
    ] as const) {
      test(`servings editing ${locale} ${initial} to ${next}: validation cancel retry save reopen`, async ({
        page,
      }) => {
        await setupCommonRoutes(page);
        await page.addInitScript((language) => localStorage.setItem('locale', language), locale);
        await page.goto(`/recipes?open=${id}&reviewAmounts=true`);
        const edit = async () => {
          await page.getByTestId('action-gear-menu').click();
          await page.getByTestId('action-edit-recipe').click();
          return page.getByTestId('recipe-edit-servings-input');
        };
        let input = await edit();
        await expect(input).toHaveAccessibleName(locale === 'en' ? 'Servings' : 'Portions');
        await expect(input).toHaveValue(initial == null ? '' : String(initial));
        // Untouched unknown omits the field; known blank is invalid.
        if (initial == null) {
          const omitted = page.waitForRequest(
            (r) => r.method() === 'PATCH' && r.url().endsWith(`/recipes/${id}`)
          );
          await page.getByTestId('recipe-save-edits').click();
          expect((await omitted).postDataJSON()).not.toHaveProperty('servings');
          input = await edit();
        }
        for (const value of [
          '0',
          '-1',
          '1.5',
          '2147483648',
          'abc',
          ...(initial == null ? [] : ['']),
        ]) {
          await input.fill(value);
          await expect(input).toHaveAttribute('aria-invalid', 'true');
          await expect(input).toHaveAccessibleDescription(
            locale === 'en'
              ? 'Enter a whole number from 1 to 2147483647.'
              : 'Saisissez un nombre entier de 1 à 2147483647.'
          );
          await expect(page.getByTestId('recipe-save-edits')).toBeDisabled();
        }
        await input.fill(String(next));
        await page.getByTestId('recipe-cancel-edits').click();
        input = await edit();
        await expect(input).toHaveValue(initial == null ? '' : String(initial));
        await input.fill(String(next));
        await page.route(`**/api/recipes/${id}`, async (route) => {
          if (route.request().method() !== 'PATCH') return route.fallback();
          await page.unroute(`**/api/recipes/${id}`);
          await route.fulfill({ status: 500, json: { message: 'Save failed' } });
        });
        await page.getByTestId('recipe-save-edits').click();
        await expect(
          page.getByText(
            locale === 'en'
              ? 'Could not save changes. Try again.'
              : "Impossible d'enregistrer les changements. Réessayez."
          )
        ).toBeVisible();
        await expect(input).toHaveValue(String(next));
        await expect(page.getByTestId('recipe-servings')).toHaveCount(initial == null ? 0 : 1);
        await page.getByTestId('recipe-save-edits').click();
        await expect(input).toHaveCount(0);
        const count = `${next} ${locale === 'en' ? 'servings' : 'portions'}`;
        await expect(page.getByTestId('recipe-servings')).toHaveText(count);
        await expect(page.getByTestId('recipe-original-yield')).toHaveCount(0);
        await page.goto(`/recipes?open=${id}&reviewAmounts=true`);
        await expect(page.getByTestId('recipe-servings')).toHaveText(count);
        await expect(page.getByTestId('recipe-original-yield')).toHaveCount(0);
        const read = await page.evaluate(
          async (id) => (await (await fetch(`/api/recipes/${id}`)).json()).recipe,
          id
        );
        expect(read.servings).toBe(next);
      });
    }
  }

  test('servings editing resets draft and validation on recipe identity changes', async ({
    page,
  }) => {
    await setupCommonRoutes(page);
    await page.goto(`/recipes?open=${MOCK_IDS.RECIPE_LASAGNA}&reviewAmounts=true`);
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-edit-recipe').click();
    await page.getByTestId('recipe-edit-servings-input').fill('0');
    await expect(page.getByTestId('recipe-edit-servings-input')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    await page.evaluate(
      (id) => history.pushState(null, '', `/recipes?open=${id}&reviewAmounts=true`),
      MOCK_IDS.RECIPE_CARBONARA
    );
    await expect(page.getByTestId('recipe-edit-servings-input')).toHaveCount(0);
    await expect(page.getByTestId('recipe-servings')).toHaveCount(0);
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-edit-recipe').click();
    await expect(page.getByTestId('recipe-edit-servings-input')).toHaveValue('');
    await expect(page.getByTestId('recipe-edit-servings-input')).toHaveAttribute(
      'aria-invalid',
      'false'
    );
  });

  for (const locale of ['en', 'fr'] as const) {
    for (const servings of [4, 1, null]) {
      test(`servings heading ${locale} ${servings} remains read-only and preserves quantities`, async ({
        page,
      }) => {
        await page.addInitScript((language) => localStorage.setItem('locale', language), locale);
        await page.route('**/api/recipes/*', async (route) => {
          if (route.request().method() !== 'GET') return route.fallback();
          await route.fulfill({
            json: {
              recipe: {
                ...MOCK_DETAIL_RECIPE,
                servings,
                ingredients: ['510 g beef', '340 g pasta'],
              },
              updatedAt: '2026-05-04T12:00:00Z',
            },
          });
        });
        await page.goto(`/recipes?open=${MOCK_DETAIL_RECIPE.id}&reviewAmounts=true`);
        const title = locale === 'en' ? 'Ingredients' : 'Ingrédients';
        const label =
          servings === null
            ? ''
            : `${servings} ${locale === 'en' ? (servings === 1 ? 'serving' : 'servings') : servings === 1 ? 'portion' : 'portions'}`;
        const heading = page.getByRole('heading', {
          name: label ? `${title} ${label}` : title,
          exact: true,
        });
        await expect(heading).toBeVisible();
        await expect(heading.locator('button,input,[tabindex]')).toHaveCount(0);
        if (label) await expect(page.getByTestId('recipe-servings')).toHaveText(label);
        await expect(page.getByTestId('recipe-original-yield')).toHaveCount(0);
        await expect(page.getByText('510 g beef', { exact: true })).toBeVisible();
        await expect(page.getByText('340 g pasta', { exact: true })).toBeVisible();
        await expect(page.getByTestId('recipe-servings')).toHaveCount(servings === null ? 0 : 1);
        await page.getByTestId('action-gear-menu').click();
        await page.getByTestId('action-edit-recipe').click();
        const editHeading = page.getByRole('heading', {
          name: label ? `${title} ${label}` : title,
          exact: true,
        });
        await expect(editHeading).toBeVisible();
        await expect(page.getByTestId('recipe-edit-ingredient-0')).toHaveValue('510 g beef');
        await expect(page.getByTestId('recipe-edit-ingredient-1')).toHaveValue('340 g pasta');
        await expect(editHeading.locator('button,input,[tabindex]')).toHaveCount(0);
      });
    }
  }

  test('known-to-unknown detail identity drops the prior serving badge', async ({ page }) => {
    // Keep detail and dated-projection reads on the same stateful fixture owner.
    await setupCommonRoutes(page, undefined, {
      supperServings: {
        knownRecipe: {
          id: MOCK_IDS.RECIPE_LASAGNA,
          basis: 4,
          quantity: 200,
          unit: 'g',
          ingredient: 'pasta',
        },
      },
    });
    await page.goto(`/recipes?open=${MOCK_IDS.RECIPE_LASAGNA}&reviewAmounts=true`);
    await expect(page.getByTestId('recipe-servings')).toHaveText('4 servings');
    const unknownRead = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        new URL(response.url()).pathname === `/api/recipes/${MOCK_IDS.RECIPE_CARBONARA}`
    );
    await page.evaluate(
      (id) => history.pushState(null, '', `/recipes?open=${id}&reviewAmounts=true`),
      MOCK_IDS.RECIPE_CARBONARA
    );
    const unknown = (await (await unknownRead).json()).recipe;
    expect(unknown.id).toBe(MOCK_IDS.RECIPE_CARBONARA);
    expect(unknown.servings ?? null).toBeNull();
    await expect(page.getByTestId('recipe-detail-name')).toHaveText(unknown.name);
    await expect(page.getByRole('heading', { name: 'Ingredients', exact: true })).toBeVisible();
    await expect(page.getByTestId('recipe-servings')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Set recipe portions', exact: true })
    ).toBeVisible();
  });

  test('removes a recipe from Browse after moving it to the bin without navigation', async ({
    page,
  }) => {
    let deleted = false;
    await page.route('**/api/recipes?**', async (route) => {
      const recipes = deleted
        ? [builders.recipe({ id: MOCK_IDS.RECIPE_STIR_FRY, name: 'Chicken Stir Fry' })]
        : [
            builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Homemade Lasagna' }),
            builders.recipe({ id: MOCK_IDS.RECIPE_STIR_FRY, name: 'Chicken Stir Fry' }),
          ];
      await route.fulfill({
        json: { recipes, pagination: { page: 1, limit: 20, total: recipes.length } },
      });
    });
    await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`, async (route) => {
      if (route.request().method() !== 'DELETE') {
        await route.fallback();
        return;
      }
      deleted = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_DETAIL_RECIPE }),
      });
    });

    await page.goto('/recipes?focus=search');
    const recipeCard = page.getByTestId('stack-card-front');
    await recipeCard.click();
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-move-to-bin').click();

    await expect(page.getByTestId('recipe-detail-sheet')).not.toBeVisible();
    await expect
      .poll(() =>
        recipeCard.evaluateAll((cards) => cards.map((card) => card.getAttribute('data-recipe-id')))
      )
      .toEqual([MOCK_IDS.RECIPE_STIR_FRY]);
    await expect(recipeCard).toContainText('Chicken Stir Fry');
    await expect(recipeCard).not.toContainText('Homemade Lasagna');
    expect(deleted).toBe(true);
    await expect(page).toHaveURL(/\/recipes\?focus=search$/);
  });

  test('searches on Enter and shows the top pick result', async ({ page }) => {
    await page.goto('/recipes?focus=search');

    await expect(page.getByTestId('browse-all-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('recipe-search-input')).toBeVisible();

    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');

    await expect(page.getByTestId('stack-card-front')).toBeVisible();
    await expect(page.getByTestId('stack-card-front')).toContainText(/Homemade Lasagna/i);
    await expect(page.getByTestId('stack-card-front')).toContainText(/READY IN 45 MINS/i);

    await swipeCurrentStackCard(page, 'left');
    await expect(page.getByTestId('stack-card-front')).toBeVisible();
    await expect(page.getByTestId('stack-card-front')).toContainText(/READY IN 20 MINS/i);
  });

  test('keeps the former Top Pick first without promotional controls or random reordering', async ({
    page,
  }) => {
    await page.goto('/recipes?focus=search');
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');

    await expect(page.getByTestId('stack-card-front')).toContainText('Homemade Lasagna');
    await expect(
      page.getByRole('button', { name: 'Surprise me — show a different pick' })
    ).toHaveCount(0);
    await expect(page.getByText('Name matches your search')).toHaveCount(0);
    await swipeCurrentStackCard(page, 'left');
    await expect(page.getByTestId('stack-card-front').last()).toContainText('Chicken Stir Fry');
  });

  test('planning mode can be cancelled back to the planner', async ({ page }) => {
    await page.goto('/recipes?addToDay=2&weekOffset=0');

    await expect(page.getByTestId('planning-mode-banner')).toBeVisible();
    await page.getByTestId('planning-mode-cancel').click();

    await expect(page).toHaveURL(/\/planner/);
  });

  test('shows the empty state when search returns no matches', async ({ page }) => {
    await page.goto('/recipes?focus=search');

    await expect(page.getByTestId('browse-all-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('recipe-search-input').fill('unfindable');
    await page.getByTestId('recipe-search-input').press('Enter');
    await expect(page.getByTestId('search-empty-state')).toBeVisible();
  });

  test('groups filter discovery choices and applies Vegetarian as a hard filter', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let lastSearch: Record<string, unknown> | null = null;
    await page.unroute('**/api/recipes/search/filters');
    await page.route('**/api/recipes/search/filters', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generatedAt: '2026-09-20T00:00:00Z',
          main: [
            { id: FILTER_MAIN_IDS.BEEF, concept: 'beef', label: null },
            { id: FILTER_MAIN_IDS.POULTRY, concept: 'poultry', label: null },
            { id: FILTER_MAIN_IDS.PORK, concept: 'pork', label: null },
            { id: FILTER_MAIN_IDS.FISH, concept: 'fish', label: null },
            { id: FILTER_MAIN_IDS.PASTA, concept: 'pasta', label: null },
            { id: FILTER_MAIN_IDS.VEGETARIAN, concept: 'vegetarian', label: null },
            { id: FILTER_MAIN_IDS.TACO_NIGHT, concept: 'tacos', label: 'Taco night' },
          ],
          mealTypes: ['Supper', 'Lunch', 'Breakfast', 'Dessert'],
          cuisines: { promoted: ['Japanese'], all: ['French', 'Japanese'] },
        }),
      });
    });
    await page.unroute('**/api/recipes/search');
    await page.route('**/api/recipes/search', async (route) => {
      lastSearch = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: null,
            results: [],
            appliedFilters: {},
            searchMode: 'explicit',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes?focus=search');
    await page.getByTestId('mobile-filters-button').click();
    await expect(page.getByTestId('mobile-filter-quick')).toBeVisible();
    await expect(page.getByTestId('mobile-filter-reported')).not.toBeVisible();
    await page.getByTestId('mobile-more-filters').click();
    await expect(page.getByTestId('mobile-filter-reported')).toBeVisible();
    await page.getByTestId('mobile-all-main-filters').click();
    await expect(page.getByTestId('mobile-filter-main-taco-night')).toBeVisible();
    await page.getByTestId('mobile-all-cuisines').click();
    await page.getByTestId('mobile-filter-main-taco-night').click();
    await page.getByTestId('mobile-filter-main-vegetarian').click();
    await page.getByTestId('mobile-filter-meal-Supper').click();
    await page.getByTestId('mobile-filter-cuisine-French').click();
    await page.getByTestId('mobile-filter-apply').click();

    await expect
      .poll(() => lastSearch)
      .toMatchObject({
        filters: { mealTypes: ['Supper'], cuisines: ['French'], vegetarianOnly: true },
        preferences: { concepts: ['tacos'] },
      });
  });

  test('opens and closes the recipe detail sheet without losing the search results', async ({
    page,
  }) => {
    await page.goto('/recipes?focus=search');

    await expect(page.getByTestId('browse-all-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');

    await page.getByTestId('stack-card-front').click();

    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
    await expect(page.getByTestId('recipe-detail-name')).toContainText(/Homemade Lasagna/i);
    await expect(page.getByTestId('recipe-detail-sheet')).toContainText(/READY IN 45 MINS/i);

    // Verify the new COOK entry point is visible
    await expect(page.getByTestId('action-cooks-mode')).toBeVisible();
    await expect(page.getByTestId('action-cooks-mode')).toContainText(/Cook/i);

    await page.getByTestId('action-close-sheet').click();

    await expect(page.getByTestId('recipe-detail-sheet')).not.toBeVisible();
    await expect(page.getByTestId('stack-card-front')).toBeVisible();
  });

  test('edits notes from the detail sheet and keeps the sheet open', async ({ page }) => {
    let lastPatchBody: Record<string, unknown> | null = null;

    await page.unroute('**/api/recipes/*');
    await page.route('**/api/recipes/*', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: MOCK_DETAIL_RECIPE }),
        });
        return;
      }

      if (method === 'PATCH') {
        lastPatchBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: { ...MOCK_DETAIL_RECIPE, ...lastPatchBody } }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/recipes?focus=search');

    await expect(page.getByTestId('browse-all-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');
    await page.getByTestId('stack-card-front').click();

    await expect(page.getByTestId('recipe-notes-input')).toBeVisible();
    await page.getByTestId('recipe-notes-input').fill('kids loved it');

    await expect.poll(() => lastPatchBody).toMatchObject({ notes: 'kids loved it' });
    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
  });

  test('edits recipe card fields from a single edit mode', async ({ page }) => {
    let lastPatchBody: Record<string, unknown> | null = null;
    const recipe = structuredClone(MOCK_DETAIL_RECIPE);

    await page.unroute('**/api/recipes/*');
    // Detail GET/PATCH and proposed projection must read the same recipe.
    // Keep the real normal-target/dated-edit path after Search -> card activation.
    // Route fixtures keep ISO wire dates; this helper is typed with parsed SDK dates.
    const schedule = builders.scheduleDays() as any;
    await mockNonCookingSchedule(page, schedule);
    await mockSupperServings(page, () => schedule, {
      readFamilyCount: commonRoutes.readFamilyCount,
      readRecipe: (id) => (id === recipe.id ? recipe : builders.recipe({ id })),
    });
    await page.route('**/api/recipes/*', async (route) => {
      const method = route.request().method();
      if (new URL(route.request().url()).pathname !== `/api/recipes/${recipe.id}`)
        return route.fallback();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe }),
        });
        return;
      }

      if (method === 'PATCH') {
        lastPatchBody = route.request().postDataJSON() as Record<string, unknown>;
        Object.assign(recipe, lastPatchBody);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/recipes?focus=search&reviewAmounts=true');

    await expect(page.getByTestId('browse-all-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');
    await page.getByTestId('stack-card-front').click();
    await expect(page.getByTestId('recipe-ingredient-projection').getByRole('listitem')).toHaveText(
      ['Pasta', 'Tomato', 'Cheese']
    );

    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-edit-recipe').click();
    await page.getByTestId('recipe-edit-name-input').fill('Rainy Night Lasagna');
    await page
      .getByTestId('recipe-edit-description-input')
      .fill('Layered comfort food with extra sauce.');
    await page.getByTestId('recipe-edit-ingredient-1').fill('San Marzano tomato');
    await page.getByTestId('recipe-save-edits').click();

    await expect
      .poll(() => lastPatchBody)
      .toMatchObject({
        name: 'Rainy Night Lasagna',
        description: 'Layered comfort food with extra sauce.',
        ingredients: ['Pasta', 'San Marzano tomato', 'Cheese'],
      });
    await expect(page.getByTestId('recipe-detail-name')).toContainText('Rainy Night Lasagna');
    await expect(page.getByText('San Marzano tomato')).toBeVisible();
    await expect(page.getByTestId('recipe-ingredient-projection').getByRole('listitem')).toHaveText(
      ['Pasta', 'San Marzano tomato', 'Cheese']
    );
    const reread = await page.evaluate(
      async (id) => (await (await fetch(`/api/recipes/${id}`)).json()).recipe,
      recipe.id
    );
    expect(reread).toMatchObject({
      name: 'Rainy Night Lasagna',
      description: 'Layered comfort food with extra sauce.',
      ingredients: ['Pasta', 'San Marzano tomato', 'Cheese'],
    });
  });

  test('uses planner mode CTA from the detail sheet and returns to the planner success state', async ({
    page,
  }) => {
    let assignRequestBody: Record<string, unknown> | null = null;

    await page.route(
      (url) => url.pathname === '/api/schedule/assign',
      async (route) => {
        assignRequestBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/recipes?addToDay=2&weekOffset=0');

    await expect(page.getByTestId('browse-all-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');
    await page.getByTestId('stack-card-front').click();

    await expect(page.getByTestId('action-add-to-day')).toBeVisible();
    await page.getByTestId('action-add-to-day').click();

    await expect
      .poll(() => assignRequestBody)
      .toMatchObject({
        weekOffset: 0,
        dayIndex: 2,
        recipeId: MOCK_IDS.RECIPE_LASAGNA,
      });
    await expect(page).toHaveURL(/\/planner\?(?:success=1&)?dayIndex=2/);
  });

  test('applying a filter from the chooser includes it in the next search request', async ({
    page,
  }) => {
    let lastSearchBody: Record<string, unknown> | null = null;

    await page.unroute('**/api/recipes/search');
    await page.route('**/api/recipes/search', async (route) => {
      lastSearchBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: null,
            results: [],
            appliedFilters: { neverCooked: true },
            searchMode: 'explicit',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes?focus=search');
    await expect(page.getByTestId('browse-all-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('mobile-filters-button')).toBeVisible();
    await page.getByTestId('mobile-filters-button').click();
    await page.getByTestId('mobile-filter-never-tried').click();
    await page.getByTestId('mobile-filter-apply').click();
    await expect.poll(() => (lastSearchBody as any)?.filters).toMatchObject({ neverCooked: true });

    await expect(page.getByTestId('search-empty-state')).toBeVisible();
  });

  test('combining two chooser filters sends both filters in the request', async ({ page }) => {
    let lastSearchBody: Record<string, unknown> | null = null;

    await page.unroute('**/api/recipes/search');
    await page.route('**/api/recipes/search', async (route) => {
      lastSearchBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: null,
            results: [],
            appliedFilters: {},
            searchMode: 'explicit',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes?focus=search');
    await expect(page.getByTestId('browse-all-loader')).not.toBeVisible({ timeout: 15_000 });

    await page.getByTestId('mobile-filters-button').click();
    await page.getByTestId('mobile-filter-never-tried').click();
    await page.getByTestId('mobile-filter-quick').click();
    await page.getByTestId('mobile-filter-apply').click();

    await expect
      .poll(() => (lastSearchBody as any)?.filters)
      .toMatchObject({ neverCooked: true, quickOnly: true });
  });

  test('Find Similar fires a new search with similarToRecipeId set and the source recipe excluded', async ({
    page,
  }) => {
    let lastSearchBody: Record<string, unknown> | null = null;

    const SIMILAR_TOP_PICK = {
      id: MOCK_IDS.RECIPE_STIR_FRY,
      name: 'Chicken Stir Fry',
      imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae',
      totalTime: 'PT20M',
      rating: 2,
      isDiscoverable: true,
      notes: null,
      reasons: [{ source: 'name-match', label: 'Name matches your search' }],
    };

    await page.unroute('**/api/recipes/search');
    await page.route('**/api/recipes/search', async (route) => {
      lastSearchBody = route.request().postDataJSON() as Record<string, unknown>;
      const similarId = (lastSearchBody as any)?.similarToRecipeId;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: similarId ? SIMILAR_TOP_PICK : MOCK_SEARCH_RESULTS.topPick,
            results: similarId ? [] : MOCK_SEARCH_RESULTS.secondary,
            appliedFilters: {},
            searchMode: similarId ? 'similar' : 'standard',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes?focus=search');
    await expect(page.getByTestId('browse-all-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');

    await expect(page.getByTestId('stack-card-front')).toBeVisible();
    await page.getByTestId('stack-card-front').click();

    await page.getByTestId('action-gear-menu').click();
    await expect(page.getByTestId('action-find-similar')).toBeVisible();
    await page.getByTestId('action-find-similar').click();

    await expect
      .poll(() => lastSearchBody)
      .toMatchObject({ similarToRecipeId: MOCK_IDS.RECIPE_LASAGNA });

    const similarFront = page.locator(
      `[data-testid="stack-card-front"][data-recipe-id="${MOCK_IDS.RECIPE_STIR_FRY}"]`
    );
    await expect(similarFront).toBeVisible();
    await expect(
      page.locator(`[data-testid="stack-card-front"][data-recipe-id="${MOCK_IDS.RECIPE_LASAGNA}"]`)
    ).toHaveCount(0);
  });

  // ── Discovery toggle ───────────────────────────────────────────────────────

  for (const width of [360, 390, 430]) {
    for (const hasTopPick of [true, false]) {
      test(`compact ordinary search cards at ${width}px with API topPick ${hasTopPick}`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        const names = [
          'Roasted vegetables with lemon and herb couscous for the whole family',
          'Slow cooked tomato and white bean supper with fresh garden herbs',
        ];
        const results = MOCK_SEARCH_RESULTS.secondary.map((recipe, index) => ({
          ...recipe,
          name: names[index],
          imageUrl: '/test-card.svg',
          importIssueStatus: index === 0 ? 'reported' : 'readyToReview',
          isPromotionEligible: false,
        }));
        const topPick = hasTopPick
          ? { ...MOCK_SEARCH_RESULTS.topPick, imageUrl: '/test-card.svg' }
          : null;
        let searchCount = 0;
        await page.route('**/test-card.svg', (route) =>
          route.fulfill({
            contentType: 'image/svg+xml',
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#bcc9a8"/><circle cx="200" cy="150" r="100" fill="#f4e5c5"/><circle cx="200" cy="150" r="70" fill="#c07b46"/></svg>',
          })
        );
        await page.route('**/api/recipes/search', (route) => {
          searchCount++;
          return route.fulfill({
            json: {
              data: {
                topPick,
                results,
                appliedFilters: {},
                searchMode: 'explicit',
                resultPath: 'lexical-only',
              },
            },
          });
        });
        await page.route('**/api/family', (route) =>
          route.fulfill({
            json: {
              data: [
                builders.familyMember({
                  id: MOCK_IDS.MEMBER_ALEX,
                  name: 'Alex',
                  browseViewMode: 'list',
                }),
              ],
            },
          })
        );
        await page.goto('/recipes?focus=search');
        await expect(page.getByTestId('browse-all-loader')).not.toBeVisible({ timeout: 15_000 });
        await page.getByTestId('recipe-search-input').fill('chicken');
        await page.getByTestId('recipe-search-input').press('Enter');
        const cards = results.map((recipe) =>
          page.getByTestId('browse-list-recipe-card').filter({ hasText: recipe.name })
        );
        await expect(cards[0]).toBeVisible();
        await expect(page.getByTestId('browse-list-recipe-card')).toHaveCount(hasTopPick ? 3 : 2);
        if (hasTopPick) {
          await expect(page.getByTestId('browse-list-recipe-card').first()).toContainText(
            'Homemade Lasagna'
          );
          await expect(page.getByText('Name matches your search')).toHaveCount(0);
          await expect(page.getByTestId('top-pick-feeling-lucky')).toHaveCount(0);
        }
        await expect(cards[0].getByTestId('recipe-import-issue-status-reported')).toBeVisible();
        await expect(
          cards[1].getByTestId('recipe-import-issue-status-readyToReview')
        ).toBeVisible();
        const measure = (card: Locator) =>
          card.evaluate((element) => {
            const image = element.querySelector('img')!.parentElement!;
            const content = image.nextElementSibling!;
            const title = content.querySelector('h4, p')!;
            const time = Array.from(content.children).find((child) =>
              child.textContent?.includes('READY IN')
            )!;
            const badge = image.querySelector('[data-testid^="recipe-import-issue-status"]')!;
            const c = element.getBoundingClientRect(),
              i = image.getBoundingClientRect();
            const n = title.getBoundingClientRect(),
              b = badge.getBoundingClientRect();
            const round = (v: number) => Math.round(v * 100) / 100;
            return {
              imageRatio: round(i.width / i.height),
              imageInset: round(i.left - c.left),
              imageToTitle: round(n.top - i.bottom),
              textInset: round(n.left - i.left),
              radius: parseFloat(getComputedStyle(element).borderTopLeftRadius),
              titleLines: round(n.height / parseFloat(getComputedStyle(title).lineHeight)),
              timeSize: parseFloat(getComputedStyle(time).fontSize),
              gridGap: parseFloat(getComputedStyle(element.parentElement!).columnGap),
              badgeContained:
                b.left >= i.left && b.right <= i.right && b.top >= i.top && b.bottom <= i.bottom,
              noOverflow: element.scrollWidth <= element.clientWidth,
            };
          });
        // Geometry can be correct while entrance animations are still transparent.
        // Wait for the actual cards and their ancestors before capturing review proof.
        for (const card of cards) {
          await expect
            .poll(() =>
              card.evaluate((element) => {
                let current: Element | null = element;
                while (current) {
                  if (getComputedStyle(current).opacity !== '1') return false;
                  current = current.parentElement;
                }
                return true;
              })
            )
            .toBe(true);
        }
        const expected = {
          imageRatio: 1.33,
          imageInset: 1,
          imageToTitle: 12,
          textInset: 12,
          radius: 8,
          titleLines: 2,
          timeSize: 12,
          gridGap: 12,
          badgeContained: true,
          noOverflow: true,
        };
        try {
          for (const card of cards) await expect.poll(() => measure(card)).toEqual(expected);
        } finally {
          await testInfo.attach('search-card-geometry', {
            body: JSON.stringify(await measure(cards[0])),
            contentType: 'application/json',
          });
          await testInfo.attach('search-synthetic', {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
          });
        }
        const before = searchCount;
        const url = page.url();
        await cards[0].click();
        await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
        await page.getByTestId('action-close-sheet').click();
        await expect(page.getByTestId('recipe-detail-sheet')).not.toBeVisible();
        await expect(page).toHaveURL(url);
        await expect.poll(() => measure(cards[0])).toEqual(expected);
        expect(searchCount).toBe(before);
        await expect(cards[0]).toContainText(names[0]);
        await expect(cards[1]).toContainText(names[1]);

        // Compare the unchanged Browse list's actual geometry with the same long-name fixtures.
        const recipes = results.map((recipe) =>
          builders.recipe({
            ...recipe,
            importIssue: {
              status: recipe.importIssueStatus as 'reported' | 'readyToReview',
              reasons: [],
              note: null,
            },
          })
        );
        await page.route('**/api/recipes?**order=explore**', (route) =>
          route.fulfill({
            json: {
              updatedAt: '2026-05-04T12:00:00Z',
              recipes,
              pagination: { page: 1, limit: 20, total: 2 },
            },
          })
        );
        await page.route('**/api/family', (route) =>
          route.fulfill({
            json: {
              data: [
                builders.familyMember({
                  id: MOCK_IDS.MEMBER_ALEX,
                  name: 'Alex',
                  browseViewMode: 'list',
                }),
              ],
            },
          })
        );
        await page.goto('/browse-all-stack');
        await expect(page.getByTestId('browse-list-grid')).toBeVisible();
        const browseCard = page.getByTestId('browse-list-recipe-card').first();
        await expect.poll(() => measure(browseCard)).toEqual(expected);
        await testInfo.attach('browse-card-geometry', {
          body: JSON.stringify(await measure(browseCard)),
          contentType: 'application/json',
        });
      });
    }
  }

  for (const width of [320, 390, 1280]) {
    test(`discovery geometry and exact PATCH states at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      let recipe = { ...MOCK_DETAIL_RECIPE, isDiscoverable: true };
      const patches: Record<string, unknown>[] = [];
      await page.unroute('**/api/recipes/*');
      await page.route('**/api/recipes/*', async (route) => {
        const method = route.request().method();
        if (method === 'PATCH') {
          const body = route.request().postDataJSON() as { isDiscoverable: boolean };
          patches.push(body);
          recipe = { ...recipe, ...body };
        } else if (method !== 'GET') {
          await route.fallback();
          return;
        }
        await route.fulfill({ json: { recipe } });
      });
      await page.goto('/recipes?focus=search');
      await expect(page.getByTestId('browse-all-loader')).not.toBeVisible({ timeout: 15_000 });
      await page.getByTestId('recipe-search-input').fill('chicken');
      await page.getByTestId('recipe-search-input').press('Enter');
      await page.getByTestId('stack-card-front').click();
      const toggle = page.getByTestId('action-toggle-discovery');
      const url = page.url();
      for (const [index, pressed] of [true, false, true, false].entries()) {
        if (index > 0) {
          await toggle.click();
          await expect
            .poll(() => patches)
            .toEqual(
              [false, true, false].slice(0, index).map((isDiscoverable) => ({ isDiscoverable }))
            );
        }
        await expect(toggle).toBeEnabled();
        await expect(toggle).toHaveAttribute('aria-pressed', String(pressed));
        await expectDiscoveryGeometry(toggle, pressed, testInfo, `detail-${index}`);
        await expect(toggle).toContainText('Shows in Discovery voting');
        // Stress a longer translation in the real layout without changing application logic.
        const subtitle = toggle.locator('span').nth(2);
        const original = await subtitle.textContent();
        await subtitle.evaluate((element) => {
          element.textContent =
            'Apparaît dans les votes de découverte pour toute la famille et les prochaines semaines';
        });
        await expectDiscoveryGeometry(toggle, pressed, testInfo, `detail-long-${index}`);
        await subtitle.evaluate((element, text) => {
          element.textContent = text;
        }, original);
        await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
        await expect(page).toHaveURL(url);
      }
      // The route's state is used by subsequent GETs, not just the PATCH response.
      await page.reload();
      await expect(page.getByTestId('browse-all-loader')).not.toBeVisible({ timeout: 15_000 });
      await page.getByTestId('recipe-search-input').fill('chicken');
      await page.getByTestId('recipe-search-input').press('Enter');
      await page.getByTestId('stack-card-front').click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });
  }
});

interface StackFrame {
  time: number;
  cards: {
    id: string;
    node: number;
    front: boolean;
    height: number;
    parentHeight: number;
    parentBottom: number;
    origin: string;
    paintedHeight: number;
    bottom: number;
    depth: number;
    position: string;
    scaleX: number;
    scaleY: number;
    offsetY: number;
    opacity: number;
  }[];
}

type SamplingWindow = Window & { stackFrameSamples?: StackFrame[]; sampleStack?: boolean };

/** Record the real presence/layout boundary before release, including first rear paint. */
async function startStackFrames(page: Page) {
  await page.evaluate(() => {
    const target = window as SamplingWindow;
    const nodes = new WeakMap<Element, number>();
    let nextNode = 0;
    const start = performance.now();
    target.stackFrameSamples = [];
    target.sampleStack = true;
    const sample = () => {
      if (!target.sampleStack) return;
      const cards = Array.from(
        document.querySelectorAll<HTMLElement>('[data-recipe-id][data-testid^="stack-card-"]')
      ).map((el) => {
        if (!nodes.has(el)) nodes.set(el, ++nextNode);
        const style = getComputedStyle(el);
        const matrix = new DOMMatrixReadOnly(
          style.transform === 'none' ? undefined : style.transform
        );
        return {
          id: el.dataset.recipeId!,
          node: nodes.get(el)!,
          front: el.dataset.front === 'true',
          height: el.offsetHeight,
          parentHeight: el.parentElement!.offsetHeight,
          parentBottom: el.parentElement!.getBoundingClientRect().bottom,
          origin: style.transformOrigin,
          paintedHeight: el.getBoundingClientRect().height,
          bottom: el.getBoundingClientRect().bottom,
          depth: 10 - Number(style.zIndex),
          position: style.position,
          scaleX: matrix.a,
          scaleY: matrix.d,
          offsetY: matrix.f,
          opacity: Number(style.opacity),
        };
      });
      target.stackFrameSamples!.push({ time: performance.now() - start, cards });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function stopStackFrames(page: Page): Promise<StackFrame[]> {
  return page.evaluate(() => {
    const target = window as SamplingWindow;
    target.sampleStack = false;
    return target.stackFrameSamples ?? [];
  });
}

// Six records force new rear mounts on the first two advances; three records cannot cover this.
for (const scenario of [
  {
    name: 'equal phone',
    varied: false,
    width: 390,
    height: 844,
    locale: 'en',
    reduced: false,
    enlarged: false,
  },
  {
    name: 'varied phone',
    varied: true,
    width: 390,
    height: 844,
    locale: 'en',
    reduced: false,
    enlarged: false,
  },
  {
    name: 'short French phone',
    varied: true,
    width: 320,
    height: 568,
    locale: 'fr',
    reduced: false,
    enlarged: false,
  },
  {
    name: 'French iPad reduced motion',
    varied: true,
    width: 768,
    height: 1024,
    locale: 'fr',
    reduced: true,
    enlarged: false,
  },
  {
    name: 'landscape reduced motion',
    varied: true,
    width: 667,
    height: 375,
    locale: 'en',
    reduced: true,
    enlarged: false,
  },
  {
    name: 'French enlarged text',
    varied: true,
    width: 390,
    height: 844,
    locale: 'fr',
    reduced: false,
    enlarged: true,
  },
] as const) {
  test.describe(`stable stack depth ${scenario.name}`, () => {
    test.use({ appLocale: scenario.locale });
    const varied = scenario.varied;
    test(`with ${varied ? 'varied' : 'equal'} full titles`, async ({ page }, testInfo) => {
      // Four real advances plus entry/mid/settled captures need a larger capture budget.
      test.setTimeout(90_000);
      await page.setViewportSize({ width: scenario.width, height: scenario.height });
      await page.emulateMedia({ reducedMotion: scenario.reduced ? 'reduce' : 'no-preference' });
      const ids: string[] = [
        MOCK_IDS.RECIPE_LASAGNA,
        MOCK_IDS.RECIPE_CHICKEN,
        MOCK_IDS.RECIPE_GNOCCHI,
        MOCK_IDS.RECIPE_CARBONARA,
        MOCK_IDS.RECIPE_STIR_FRY,
        MOCK_IDS.RECIPE_TACOS,
      ];
      const names = ids.map((_, i) =>
        varied && i % 2 === 1
          ? scenario.locale === 'fr'
            ? 'Légumes rôtis avec du riz parfumé et une généreuse portion de fines herbes fraîches du jardin'
            : 'Roasted vegetables with fragrant basmati rice and a generous helping of fresh garden herbs'
          : `Recipe ${i + 1}`
      );
      await page
        .context()
        .addCookies([
          { name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: 'http://127.0.0.1:3000' },
        ]);
      await page.addInitScript(
        (id) =>
          localStorage.setItem(
            'family-storage',
            JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
          ),
        MOCK_IDS.MEMBER_ALEX
      );
      await setupCommonRoutes(page);
      await page.route('**/api/recipes/library-summary', (route) =>
        route.fulfill({
          json: {
            data: {
              total: 6,
              neverCooked: 6,
              ratings: { love: 0, like: 0, dislike: 0, unrated: 6 },
            },
          },
        })
      );
      await page.route('**/api/recipes?**', (route) =>
        route.fulfill({
          json: {
            recipes: ids.map((id, i) =>
              builders.recipe({ id, name: names[i], totalTime: 'PT30M' })
            ),
            pagination: { page: 1, limit: 20, total: 6 },
          },
        })
      );
      await page.route('**/api/recipes/*/hero', (route) =>
        route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#e9b46a"/><circle cx="400" cy="300" r="180" fill="#608447"/></svg>',
        })
      );
      const votes: string[] = [];
      page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().endsWith('/vote'))
          votes.push(request.url());
      });
      await page.goto('/recipes');
      if (scenario.enlarged) await page.addStyleTag({ content: 'html { font-size: 32px; }' });
      await expect(page.getByTestId('stack-card-front')).toHaveCount(1, { timeout: 15_000 });
      await page.waitForTimeout(700);
      await startStackFrames(page);
      for (let advance = 0; advance < 4; advance++) {
        const front = page.getByTestId('stack-card-front');
        await expect(front).toHaveCount(1);
        await expect(front.getByRole('heading')).toHaveText(names[advance]);
        const existing = await page
          .locator('[data-recipe-id][data-testid^="stack-card-"]')
          .evaluateAll((els) => els.map((el) => el.getAttribute('data-recipe-id')));
        await front.getByTestId('stack-card-image').scrollIntoViewIfNeeded();
        const box = await front.boundingBox();
        await page.mouse.move(box!.x + box!.width / 2, box!.y + 100);
        await page.mouse.down();
        await page.mouse.move(box!.x + box!.width / 2 - 160, box!.y + 100, { steps: 8 });
        await page.mouse.up();
        if (advance < 2)
          await page.waitForFunction(
            (old) =>
              Array.from(
                document.querySelectorAll('[data-recipe-id][data-testid^="stack-card-"]')
              ).some((el) => !old.includes(el.getAttribute('data-recipe-id'))),
            existing
          );
        else
          await page.waitForFunction(
            (id) =>
              Array.from(document.querySelectorAll('[data-front="true"]')).some(
                (el) => el.getAttribute('data-recipe-id') === id
              ),
            ids[advance + 1]
          );
        await page.screenshot({ path: testInfo.outputPath(`advance-${advance + 1}-entry.png`) });
        await page.waitForTimeout(80);
        await page.screenshot({ path: testInfo.outputPath(`advance-${advance + 1}-mid.png`) });
        await page.waitForTimeout(650);
        await page.screenshot({ path: testInfo.outputPath(`advance-${advance + 1}-settled.png`) });
      }
      await expect(page.getByTestId('stack-card-front').getByRole('heading')).toHaveText(names[4]);
      expect(votes).toEqual([]);
      for (const backing of await page.getByTestId('stack-card-back').all())
        await expect(backing).toHaveAttribute('tabindex', '-1');
      const frames = await stopStackFrames(page);
      const framePath = testInfo.outputPath('animation-frames.json');
      await writeFile(framePath, JSON.stringify(frames));
      await testInfo.attach('animation-frames', {
        path: framePath,
        contentType: 'application/json',
      });

      for (const backing of frames.at(-1)!.cards.filter((c) => !c.front)) {
        const restingGap = backing.depth * 15 - (backing.height * (backing.depth * 0.05)) / 2;
        expect(
          Math.abs(backing.bottom - backing.parentBottom - restingGap),
          'resting visible depth is preserved'
        ).toBeLessThanOrEqual(2);
      }
      const firstNodes = new Map<number, (typeof frames)[number]['cards'][number]>();
      for (const frame of frames)
        for (const card of frame.cards)
          if (!firstNodes.has(card.node)) firstNodes.set(card.node, card);
      const incoming = [...firstNodes.values()].filter(
        (card) => !ids.slice(0, 4).includes(card.id)
      );
      expect(incoming).toHaveLength(2);
      for (const card of incoming) {
        expect
          .soft(card.scaleX, `rear mount ${card.id} first scale`)
          .toBeCloseTo(1 - card.depth * 0.05, 2);
        expect
          .soft(card.scaleY, `rear mount ${card.id} first y scale`)
          .toBeCloseTo(1 - card.depth * 0.05, 2);
        expect
          .soft(card.opacity, `rear mount ${card.id} first opacity`)
          .toBeCloseTo(1 - card.depth * 0.3, 2);
        // Preserve the existing settled center-origin depth appearance from first paint.
        const targetGap = card.depth * 15 - (card.height * (card.depth * 0.05)) / 2;
        expect
          .soft(
            Math.abs(card.bottom - card.parentBottom - targetGap),
            'incoming visible depth matches settled depth'
          )
          .toBeLessThanOrEqual(2);
      }
      const envelope = Math.max(
        ...frames.flatMap((f) => f.cards.filter((c) => c.front).map((c) => c.height))
      );
      const frontHeights = frames.flatMap((f) =>
        f.cards.filter((c) => c.front).map((c) => c.height)
      );
      const titleHeightChange = Math.max(...frontHeights) - Math.min(...frontHeights);
      for (const card of incoming) {
        const firstFrame = frames.find((f) => f.cards.some((c) => c.node === card.node))!;
        const currentFront = firstFrame.cards.find(
          (c) => c.front && c.position !== 'absolute' && c.opacity > 0.01
        )!;
        // Projection can compensate the whole stack and front promotion. Compare rendered
        // depth, allowing legitimate full-title reflow, rather than treating matrix.f as y alone.
        expect(
          card.bottom - currentFront.bottom,
          'incoming visual depth bounds'
        ).toBeLessThanOrEqual(card.depth * 15 + titleHeightChange + 2);
      }

      expect(
        Math.max(...frames.flatMap((f) => f.cards.map((c) => c.parentHeight))),
        'parent must not combine two front heights'
      ).toBeLessThanOrEqual(envelope + 2);
      expect(
        Math.max(
          ...frames.flatMap((f) => f.cards.filter((c) => !c.front).map((c) => c.paintedHeight))
        ),
        'backing shells and their shadows must stay within the front-height envelope'
      ).toBeLessThanOrEqual(envelope + 2);
      expect(
        Math.max(
          ...frames.map((f) => f.cards.filter((c) => c.front && c.position !== 'absolute').length)
        ),
        'only one front contributes flow'
      ).toBe(1);
      const promoted = page.getByTestId('stack-card-front');
      const settledHeight = await promoted.evaluate((el: HTMLElement) => el.offsetHeight);
      await page.route('**/missing-stack-fixture.png', (route) => route.abort());
      await promoted.getByRole('img').evaluate((el: HTMLImageElement) => {
        el.src = '/missing-stack-fixture.png';
      });
      await expect
        .poll(() =>
          promoted
            .getByRole('img')
            .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth === 0)
        )
        .toBe(true);
      expect(await promoted.evaluate((el: HTMLElement) => el.offsetHeight)).toBe(settledHeight);
      await expect(promoted.getByRole('heading')).toHaveText(names[4]);
      for (const key of ['Enter', 'Space']) {
        await promoted.focus();
        await page.keyboard.press(key);
        await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
        await page.getByTestId('action-close-sheet').click();
        await expect(promoted).toBeFocused();
      }
      expect(votes).toEqual([]);
    });
  });
}
