import { test, expect } from './fixtures';
import { setupCommonRoutes, builders, MOCK_IDS, mockNonCookingSchedule } from './mock-api';

for (const locale of ['en', 'fr'] as const)
  for (const initialWidth of [390, 768])
    test.describe(`grocery recipe sources ${locale} ${initialWidth}`, () => {
      test.use({ appLocale: locale });
      test('uses loaded names, resolves lunch-only titles and keeps warnings and shopping actions separate', async ({
        page,
      }) => {
        test.setTimeout(60_000);
        await page.context().addCookies([
          {
            name: 'x-family-member-id',
            value: MOCK_IDS.MEMBER_ALEX,
            url: process.env.BASE_URL || 'http://127.0.0.1:3000',
          },
        ]);
        await setupCommonRoutes(page);
        const loadedName =
          locale === 'fr'
            ? 'Lasagnes familiales aux légumes pour les soupers tranquilles du dimanche'
            : 'Family lasagna with vegetables for an unhurried Sunday supper';
        const loaded = MOCK_IDS.RECIPE_LASAGNA;
        const lunch = MOCK_IDS.RECIPE_SPAGHETTI;
        const schedule = builders.scheduleDays() as any;
        schedule.days[2].recipe = builders.scheduleRecipe({ id: loaded, name: loadedName });
        schedule.groceryItems = [
          {
            displayName: 'pasta',
            normalizedKey: 'pasta',
            section: 'Pantry',
            quantity: 400,
            unitText: 'g',
            quantityComplete: false,
            checkReviewReason: 'prior_amount_unknown',
            recipeIds: [loaded, lunch, lunch],
          },
        ];
        schedule.groceryState = { pasta: true };
        await mockNonCookingSchedule(page, schedule);
        let loadedGets = 0;
        let lunchGets = 0;
        await page.route(`**/api/recipes/${loaded}`, (route) => {
          loadedGets++;
          return route.fallback();
        });
        await page.route(`**/api/recipes/${lunch}`, (route) => {
          lunchGets++;
          return route.fulfill({
            json: {
              recipe: builders.recipe({
                id: lunch,
                name: 'Lunch-only pasta',
                servings: 2,
                ingredients: ['200 g pasta'],
              }),
              updatedAt: '2026-05-04T12:00:00Z',
            },
          });
        });
        await page.setViewportSize({ width: initialWidth, height: 844 });
        await page.goto('/planner');
        await page.getByTestId('grocery-tab').click();
        const aisle = page.getByTestId('aisle-section-Pantry').locator('button').first();
        if ((await aisle.getAttribute('aria-expanded')) === 'false') await aisle.click();
        const writes: string[] = [];
        page.on('request', (request) => {
          if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url());
        });
        const book = page.getByTestId('grocery-recipe-sources-toggle');
        await expect(book).toHaveAttribute('aria-expanded', 'false');
        await expect(page.getByTestId('grocery-item-quantity-hint')).toContainText('400 g');
        await expect(
          page.getByText(/Review amounts|Vérifier les quantités/, { exact: true })
        ).toHaveCount(0);
        await book.focus();
        await book.press('Enter');
        await expect(book).toBeFocused();
        await expect(page.getByRole('link', { name: loadedName, exact: true })).toBeVisible();
        await expect(
          page.getByRole('link', { name: 'Lunch-only pasta', exact: true })
        ).toBeVisible();
        await expect(
          page.getByTestId('grocery-recipe-sources-region').getByRole('listitem')
        ).toHaveCount(2);
        expect(loadedGets).toBe(0);
        expect(lunchGets).toBe(1);
        const sourceHref = await page
          .getByRole('link', { name: 'Lunch-only pasta', exact: true })
          .getAttribute('href');
        const sourceUrl = new URL(sourceHref!, page.url());
        expect(sourceUrl.pathname).toBe('/recipes');
        expect(sourceUrl.searchParams.get('open')).toBe(lunch);
        expect(sourceUrl.searchParams.get('reviewAmounts')).toBe('true');
        expect(sourceUrl.searchParams.get('sourceGroceryWeekOffset')).toBe('0');
        expect(sourceUrl.searchParams.get('sourceGroceryReferenceWeekStartDate')).toBe(
          String(schedule.calendar.referenceWeekStartDate).slice(0, 10)
        );
        await expect(page.getByTestId('reclassify-btn')).toBeVisible();
        expect(writes).toEqual([]);
        const sources = page.getByTestId('grocery-recipe-sources-region');
        await page.screenshot({
          path: `../.task/refinement-apply/renders/grocery-layout-${locale}-${initialWidth}.png`,
        });
        await sources.screenshot({
          path: `../.task/refinement-apply/renders/grocery-source-titles-${locale}-${initialWidth}.png`,
        });
        await page.setViewportSize({ width: 320, height: 740 });
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '32px';
        });
        await book.scrollIntoViewIfNeeded();
        await book.focus();
        await expect(book).toBeFocused();
        await page.screenshot({
          path: `../.task/refinement-apply/renders/grocery-sources-${locale}-${initialWidth}-320-200.png`,
        });
        await expect(sources).toBeVisible();
        expect((await sources.boundingBox())!.width).toBeGreaterThanOrEqual(200);
        expect(
          await sources.evaluate((element) => element.scrollWidth <= element.clientWidth)
        ).toBe(true);
        await sources.screenshot({
          path: `../.task/refinement-apply/renders/grocery-source-titles-${locale}-${initialWidth}-320-200.png`,
        });
        await page.getByRole('link', { name: 'Lunch-only pasta', exact: true }).click();
        await expect(page.getByTestId('recipe-detail-name')).toContainText('Lunch-only pasta');
        await expect(page.getByTestId('action-add-to-day')).toHaveCount(0);
        await expect(page.getByTestId('recipe-ingredient-projection')).toHaveCount(0);
        await expect(page.getByTestId('action-begin-planning')).toHaveAccessibleName(
          locale === 'fr' ? 'Planifier' : 'Plan'
        );
        expect(writes).toEqual([]);
        await page.getByTestId('action-begin-planning').click();
        await expect(page.getByTestId('action-add-to-day')).toBeEnabled();
        await expect(page.getByTestId('action-change-day')).toBeVisible();
        await expect(page.getByTestId('action-cooks-mode')).toBeVisible();
        expect(writes).toEqual([]);
        await page.getByTestId('action-close-sheet').click();
        await expect(page).toHaveURL(
          (url) =>
            url.pathname === '/planner' &&
            url.searchParams.get('weekOffset') === '0' &&
            url.searchParams.get('referenceWeekStartDate') ===
              String(schedule.calendar.referenceWeekStartDate).slice(0, 10)
        );
        await expect(page.getByTestId('grocery-check-review')).toBeVisible();
        await expect(page.getByTestId('grocery-item-quantity-hint')).toContainText('400 g');
        await expect(
          page.getByText(/Review amounts|Vérifier les quantités/, { exact: true })
        ).toHaveCount(0);
        expect(writes).toEqual([]);
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '16px';
        });
        await page.getByTestId('nav-item-planner').click();
        await expect(page.getByTestId('grocery-check-review')).toBeVisible();
      });
    });
