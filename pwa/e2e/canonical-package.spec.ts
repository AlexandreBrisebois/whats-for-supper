import { test, expect } from './fixtures';
import { setupCommonRoutes, MOCK_IDS } from './mock-api';
import { cookingStepRecipe } from './cooking-step-fixture';

for (const locale of ['en', 'fr'] as const) {
  test.describe(`declared packages ${locale}`, () => {
    test.use({ appLocale: locale, dateOnlyClock: true });
    test('ordinary editor keeps fixed capacity across exact counts and explicit clear', async ({
      page,
      baseURL,
    }, info) => {
      const recipe: any = cookingStepRecipe();
      await setupCommonRoutes(page, undefined, {
        canonicalEditor: recipe,
        supperServings: {
          knownRecipe: { id: recipe.id, basis: 4, quantity: 200, ingredient: 'pasta', unit: 'g' },
        },
      });
      await page.setViewportSize({ width: locale === 'fr' ? 320 : 390, height: 844 });
      await page
        .context()
        .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
      await page.goto(`/recipes?open=${recipe.id}`);
      await expect(page.getByTestId('recipe-detail-name')).toHaveText(recipe.name);
      const original = await page.evaluate(
        async (id) => (await (await fetch(`/api/recipes/${id}`)).json()).recipe,
        recipe.id
      );
      const setCount = async (count: number, assign = false) => {
        const statuses = await page.evaluate(
          async ({ id, count, assign }) => {
            const assignment = assign
              ? (
                  await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ weekOffset: 0, dayIndex: 0, recipeId: id }),
                  })
                ).status
              : 200;
            const state = (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data;
            const response = await fetch('/api/schedule/servings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                weekOffset: 0,
                referenceWeekStartDate: '2026-05-04',
                expectedVersion: state.version,
                defaultServings: count,
                days: [],
              }),
            });
            return [assignment, response.status];
          },
          { id: recipe.id, count, assign }
        );
        expect(statuses).toEqual([200, 200]);
      };
      await setCount(8, true);
      const edit = async () => {
        await page.getByTestId('action-gear-menu').click();
        await page.getByTestId('action-edit-recipe').click();
        await expect(page.getByTestId('recipe-edit-amount-0')).toBeVisible();
      };
      const save = async () => {
        const response = page.waitForResponse(
          (value) =>
            value.request().method() === 'PATCH' &&
            new URL(value.url()).pathname === `/api/recipes/${recipe.id}`
        );
        await page.getByTestId('recipe-save-edits').click();
        const result = await response;
        expect(result.status()).toBe(200);
        await expect(page.getByTestId('recipe-save-edits')).toHaveCount(0);
        return result.request().postDataJSON();
      };
      await edit();
      await page.getByTestId('recipe-add-ingredient').click();
      await page.getByTestId('recipe-edit-amount-1').fill('2');
      await page.getByTestId('recipe-edit-unit-1').fill('cans');
      await page.getByTestId('recipe-edit-ingredient-1').fill('tomatoes');
      const options = page
        .locator('details')
        .filter({ has: page.getByTestId('recipe-edit-package-enabled-1') });
      await options.locator('summary').click();
      await options
        .getByRole('textbox', {
          name: locale === 'fr' ? 'Nom pour les achats' : 'Shopping name',
          exact: true,
        })
        .fill('tomato');
      await page.getByTestId('recipe-edit-package-enabled-1').check();
      await expect(page.getByTestId('recipe-edit-package-count-unit-1')).toHaveValue('cans');
      await page.getByTestId('recipe-edit-package-capacity-1').fill('400');
      await page.getByTestId('recipe-edit-package-unit-1').fill('g');
      await page.getByTestId('recipe-edit-package-basis-1').selectOption('net');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      const sent = await save();
      expect(sent.ingredientLines[1].package).toEqual({
        countUnit: { text: 'cans', definitionId: null },
        capacity: {
          amount: { kind: 'scalar', value: { n: '400', d: '1' } },
          unit: { text: 'g', definitionId: null },
        },
        basis: 'net',
      });
      expect(sent.ingredientLines[1].packageEscaped).toBeUndefined();
      const reopened = await page.evaluate(
        async (id) => (await (await fetch(`/api/recipes/${id}`)).json()).recipe,
        recipe.id
      );
      expect(reopened.ingredientLines[0]).toEqual(original.ingredientLines[0]);
      const instructionFacts = (value: any) =>
        value.instructionSections.map((section: any) => ({
          id: section.id,
          name: section.name,
          steps: section.steps.map((step: any) => ({
            id: step.id,
            text: step.text,
            textRevision: step.textRevision,
            bindings: step.bindings.map((binding: any) => ({
              ...binding,
              validatedContentRevision: undefined,
            })),
          })),
        }));
      expect(instructionFacts(reopened)).toEqual(instructionFacts(original));
      expect(reopened.instructionSections[0].steps[0].bindings[0].validatedContentRevision).toBe(
        reopened.contentRevision
      );
      const packageId = reopened.ingredientLines[1].id;
      const openPlanned = async () => {
        await page.goto('/planner');
        await page.getByTestId('day-card-0').getByTestId('edit-recipe-button').click();
        await expect(page.getByTestId('recipe-detail-name')).toHaveText(recipe.name);
      };
      let groceryId: string | undefined;
      for (const [target, count, n, d] of [
        [8, '4', '4', '1'],
        [2, '1', '1', '1'],
        [1, '1/2', '1', '2'],
      ] as const) {
        if (target !== 8) await setCount(target);
        await openPlanned();
        await expect(page.getByTestId('recipe-ingredient-projection')).toContainText(
          `${count} cans tomatoes (400 g / cans; net)`
        );
        const rows = await page.evaluate(
          async () => (await (await fetch('/api/schedule?weekOffset=0')).json()).data.groceryItems
        );
        const packages = rows.filter((row: any) => row.normalizedKey === 'tomato');
        expect(packages).toHaveLength(1);
        expect(packages[0].displayName).toBe('tomato (400 g / cans; net)');
        expect(packages[0].quantity).toEqual({ kind: 'scalar', value: { n, d } });
        if (groceryId) expect(packages[0].rowId).toBe(groceryId);
        groceryId = packages[0].rowId;
      }
      await page.getByTestId('action-gear-menu').click();
      await page.getByTestId('action-original-quantities').click();
      await expect(page.getByTestId('recipe-ingredient-projection')).toContainText(
        '2 cans tomatoes (400 g / cans; net)'
      );
      await page.getByTestId('action-gear-menu').click();
      await page.getByTestId('action-reset-view').click();
      await expect(page.getByTestId('recipe-ingredient-projection')).toContainText(
        '1/2 cans tomatoes (400 g / cans; net)'
      );
      await page.getByTestId('action-cooks-mode').click();
      await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
      const packageIngredient = page
        .getByTestId('ingredient-toggle')
        .filter({ hasText: 'tomatoes' });
      await expect(packageIngredient).toBeVisible();
      await expect(packageIngredient).toContainText('1/2 cans tomatoes (400 g / cans; net)');
      await packageIngredient.scrollIntoViewIfNeeded();
      await expect(packageIngredient).toBeInViewport();
      await page.screenshot({ path: info.outputPath(`package-fraction-${locale}.png`) });
      await page.goto(`/recipes?open=${recipe.id}`);
      await expect(page.getByTestId('recipe-detail-name')).toHaveText(recipe.name);
      await edit();
      const savedOptions = page
        .locator('details')
        .filter({ has: page.getByTestId('recipe-edit-package-enabled-1') });
      await savedOptions.locator('summary').click();
      await page.getByTestId('recipe-edit-package-enabled-1').uncheck();
      expect((await save()).ingredientLines[1].package).toBeNull();
      await edit();
      await page.getByTestId('recipe-edit-amount-1').fill('3');
      expect((await save()).ingredientLines[1].package).toBeNull();
      const final = await page.evaluate(
        async (id) => (await (await fetch(`/api/recipes/${id}`)).json()).recipe,
        recipe.id
      );
      expect(final.ingredientLines[1]).toMatchObject({
        id: packageId,
        amountText: '3',
        package: null,
      });
      expect(final.ingredientLines[0]).toEqual(original.ingredientLines[0]);
      expect(final.ingredientLines[1].provenance.protectedFields).toContain('package');
    });
  });
}
