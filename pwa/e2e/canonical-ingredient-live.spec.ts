import { test, expect, type BrowserContext } from '@playwright/test';
import { generateSecretToken } from './auth-utils';
import { pinCivilDate } from './date-only-clock';

test.skip(
  !process.env.CANONICAL_RECIPE_ID || !process.env.CANONICAL_MEMBERS,
  'Requires the isolated canonical editor API/PostgreSQL composition and built PWA.'
);

test('original correction, refresh recovery and concurrent grocery checks use the real generated client API and database', async ({
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const id = process.env.CANONICAL_RECIPE_ID!;
  const members = process.env.CANONICAL_MEMBERS!.split(',');
  const secret = process.env.HEARTH_SECRET!;
  const headers = { 'X-Hearth-Secret': secret };
  const scheduleUrl = `${baseURL}/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-05`;
  const readSchedule = async () =>
    (await (await request.get(scheduleUrl, { headers })).json()).data;
  const readRecipe = async () =>
    (await (await request.get(`${baseURL}/api/recipes/${id}`, { headers })).json()).recipe;
  const initial = await readRecipe();
  const draftName = 'Retained family pasta';
  expect(initial).toMatchObject({ servings: 4, ingredients: ['200 g pasta', '100 ml sauce'] });
  expect(initial.ingredientLines[0].provenance).toMatchObject({
    origin: 'unknown',
    sourceRef: null,
  });
  expect(initial.ingredientLines[0].provenance.protectedFields).toContain('amountText');
  const currentFamily = (await (await request.get(`${baseURL}/api/family`, { headers })).json())
    .data;
  const contexts: BrowserContext[] = await Promise.all([
    browser.newContext({ viewport: { width: 390, height: 844 } }),
    browser.newContext({ viewport: { width: 390, height: 844 } }),
  ]);
  try {
    for (const [index, context] of contexts.entries()) {
      await context.addCookies([
        { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
        { name: 'x-family-member-id', value: members[index], url: baseURL! },
      ]);
      await context.addInitScript(
        ({ member, family }) => {
          if (!localStorage.getItem('locale')) localStorage.setItem('locale', 'en');
          localStorage.setItem(
            'family-storage',
            JSON.stringify({
              state: {
                selectedFamilyMemberId: member,
                familyMembers: family,
                _hasHydrated: true,
                hasLoaded: true,
              },
              version: 0,
            })
          );
        },
        { member: members[index], family: currentFamily }
      );
      // No application API is mocked. External network boundaries are closed.
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
          ['data:', 'blob:'].includes(url.protocol)
          ? route.continue()
          : route.abort('blockedbyclient');
      });
    }
    const [editor, shopper] = await Promise.all(contexts.map((context) => context.newPage()));
    const editorWrites: unknown[] = [];
    editor.on('request', (request) => {
      if (request.method() === 'PATCH' && new URL(request.url()).pathname === `/api/recipes/${id}`)
        editorWrites.push(request.postDataJSON());
    });
    for (const page of [editor, shopper]) {
      page.setDefaultTimeout(15_000);
      await pinCivilDate(page, '2026-10-12T01:30:00Z');
      await page.goto('/planner?weekOffset=1&referenceWeekStartDate=2026-10-05');
      await page.getByTestId('grocery-tab').click();
    }
    const first = await readSchedule();
    const pasta = first.groceryItems.find((row: any) => row.normalizedKey === 'pasta');
    const sauce = first.groceryItems.find((row: any) => row.normalizedKey === 'sauce');
    expect(pasta.quantity).toEqual({ kind: 'scalar', value: { n: '400', d: '1' } });
    const check = (page: typeof editor, row: any) =>
      page.locator(`[data-testid="grocery-item-checkbox"][data-row-id="${row.rowId}"]`);
    await Promise.all([check(editor, pasta).click(), check(shopper, sauce).click()]);
    await expect(check(editor, pasta)).toContainText('400 g');
    await expect
      .poll(async () => {
        const schedule = await readSchedule();
        return [schedule.groceryState[pasta.rowId], schedule.groceryState[sauce.rowId]];
      })
      .toEqual([true, true]);

    await editor.goto(`/recipes?open=${id}`);
    await expect(editor.getByTestId('recipe-detail-name')).toHaveText(initial.name);
    await editor.getByTestId('action-gear-menu').click();
    await editor.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(editor.getByTestId('recipe-edit-amount-0')).toHaveValue('200');
    await editor.getByTestId('recipe-edit-amount-0').fill('250');
    await editor
      .getByRole('textbox', { name: 'Step 1 instructions' })
      .fill('Stir gently and taste.');
    await editor.getByTestId('recipe-edit-name-input').fill(draftName);
    await editor.getByTestId('recipe-edit-description-input').fill('A retained family draft');
    await editor.reload();
    await expect(editor.getByTestId('recipe-edit-amount-0')).toHaveValue('250');
    await expect(editor.getByRole('textbox', { name: 'Step 1 instructions' })).toHaveValue(
      'Stir gently and taste.'
    );
    await expect(editor.getByTestId('recipe-edit-description-input')).toHaveValue(
      'A retained family draft'
    );
    await expect(editor.getByTestId('recipe-save-edits')).toBeDisabled();
    expect((await readRecipe()).ingredientLines[0].amountText).toBe('200');
    // A second person changes household feedback and saves another original
    // edit while this tab retains its older all-field draft.
    await shopper.goto(`/recipes?open=${id}`);
    await expect(shopper.getByTestId('recipe-detail-name')).toHaveText(initial.name);
    const ratingReply = shopper.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname === `/api/recipes/${id}`
    );
    await shopper
      .getByTestId('recipe-rating-selector')
      .getByRole('button', { name: 'Love', exact: true })
      .click();
    expect((await ratingReply).status()).toBe(200);
    await shopper.getByTestId('action-gear-menu').click();
    await shopper.getByTestId('action-edit-recipe').click();
    await shopper.getByTestId('recipe-edit-name-input').fill('Other editor name');
    await shopper.getByTestId('recipe-edit-amount-0').fill('220');
    const otherSave = shopper.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname === `/api/recipes/${id}`
    );
    await shopper.getByTestId('recipe-save-edits').click();
    const otherReply = await otherSave;
    expect(otherReply.status(), await otherReply.text()).toBe(200);
    const otherCurrent = (await otherReply.json()).recipe;
    expect(otherCurrent.contentRevision).not.toBe(initial.contentRevision);
    expect(otherCurrent.ingredientLines[0].amountText).toBe('220');
    expect(otherCurrent.rating).toBe(3);
    await editor.getByRole('button', { name: 'Check saved recipe', exact: true }).click();
    await expect(
      editor.getByTestId('recipe-detail-sheet').getByText('Other editor name', { exact: true })
    ).toBeVisible();
    await editor.getByRole('button', { name: 'Reconcile draft', exact: true }).click();
    await expect(editor.getByTestId('recipe-save-edits')).toBeDisabled();
    await editor.getByRole('button', { name: 'Keep my draft: Name', exact: true }).click();
    await editor.getByRole('button', { name: 'Keep my draft: Ingredients', exact: true }).click();
    await editor.getByRole('button', { name: 'Apply reviewed draft', exact: true }).click();
    await expect(editor.getByTestId('recipe-edit-name-input')).toHaveValue(draftName);
    await expect(editor.getByTestId('recipe-edit-amount-0')).toHaveValue('250');
    await expect(editor.getByTestId('recipe-save-edits')).toBeEnabled();
    const saving = editor.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/recipes/${id}`) && response.request().method() === 'PATCH'
    );
    await editor.getByTestId('recipe-save-edits').click();
    const reply = await saving;
    expect(reply.status(), await reply.text()).toBe(200);
    expect(reply.request().postDataJSON()).not.toHaveProperty('ingredients');
    expect(reply.request().postDataJSON().expectedContentRevision).toBe(
      otherCurrent.contentRevision
    );
    const saved = (await reply.json()).recipe;
    expect(saved.ingredientLines[0]).toMatchObject({
      id: initial.ingredientLines[0].id,
      amountText: '250',
    });
    expect(saved.ingredientLines[1]).toEqual(initial.ingredientLines[1]);
    expect(saved.instructionSections[0].steps[0]).toMatchObject({
      id: initial.instructionSections[0].steps[0].id,
      text: 'Stir gently and taste.',
    });
    expect(saved.contentRevision).not.toBe(initial.contentRevision);
    expect(saved.rating).toBe(3);
    await expect(
      editor
        .getByTestId('recipe-rating-selector')
        .getByRole('button', { name: 'Love', exact: true })
    ).toHaveAttribute('aria-pressed', 'true');
    const projection = await request.get(
      `${baseURL}/api/recipes/${id}/ingredient-projection?context=proposed&supperDate=2026-10-15`,
      { headers }
    );
    expect(projection.status()).toBe(200);
    expect((await projection.json()).lines[0].quantity).toBe(500);
    const stale = await request.patch(`${baseURL}/api/recipes/${id}`, {
      headers,
      data: {
        expectedContentRevision: initial.contentRevision,
        ingredientLines: [],
        name: 'Stale must not save',
        rating: 1,
      },
    });
    expect(stale.status()).toBe(409);
    expect((await readRecipe()).name).toBe(draftName);
    expect((await readRecipe()).rating).toBe(3);
    await shopper.goto('/planner?weekOffset=1&referenceWeekStartDate=2026-10-05');
    await shopper.getByTestId('grocery-tab').click();
    expect((await request.post(`${baseURL}/_test/canonical/recompute`, { headers })).status()).toBe(
      200
    );
    const increased = await readSchedule();
    expect(increased.groceryItems.find((row: any) => row.normalizedKey === 'pasta').rowId).toBe(
      pasta.rowId
    );
    expect(increased.groceryState[pasta.rowId]).toBe(false);
    expect(increased.groceryState[sauce.rowId]).toBe(true);
    await expect(check(shopper, pasta)).toHaveAttribute('aria-checked', 'false');
    const pantryToggle = shopper
      .getByTestId('aisle-section-Pantry')
      .locator('button[aria-controls="aisle-items-pantry"]');
    if ((await pantryToggle.getAttribute('aria-expanded')) === 'false') await pantryToggle.click();
    await check(shopper, pasta).click();
    await expect.poll(async () => (await readSchedule()).groceryState[pasta.rowId]).toBe(true);

    await editor.getByTestId('action-gear-menu').click();
    await editor.getByRole('button', { name: 'Edit', exact: true }).click();
    await editor.getByTestId('recipe-edit-amount-0').fill('2');
    await editor.getByTestId('recipe-edit-unit-0').fill('cup');
    // Forward the real mutation and drop only its successful transport reply.
    // The API and database commit; no API result is manufactured by this test.
    let committed: any;
    await editor.route(
      `**/api/recipes/${id}`,
      async (route) => {
        if (route.request().method() !== 'PATCH') return route.fallback();
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        committed = await response.json();
        await route.abort('connectionfailed');
      },
      { times: 1 }
    );
    await editor.getByTestId('recipe-save-edits').click();
    await expect(
      editor.getByText('Could not save changes. Try again.', { exact: true })
    ).toBeVisible();
    expect(committed.recipe.ingredientLines[0].amountText).toBe('2');
    await expect(editor.getByTestId('recipe-edit-amount-0')).toHaveValue('2');
    await expect(editor.getByTestId('recipe-edit-unit-0')).toHaveValue('cup');
    await expect(editor.getByTestId('recipe-save-edits')).toBeDisabled();
    expect(editorWrites).toHaveLength(2);
    await editor.reload();
    await expect(editor.getByTestId('recipe-edit-amount-0')).toHaveValue('2');
    await expect(editor.getByTestId('recipe-edit-unit-0')).toHaveValue('cup');
    await expect(editor.getByTestId('recipe-edit-name-input')).toHaveValue(draftName);
    await expect(editor.getByTestId('recipe-save-edits')).toBeDisabled();
    await editor.getByRole('button', { name: 'Check saved recipe', exact: true }).click();
    await expect(
      editor.getByRole('button', { name: 'Reconcile draft', exact: true })
    ).toBeVisible();
    // Cancel the recovered draft after reviewing the real committed content.
    // Adopt the reread; do not submit the possibly committed operation again.
    await editor.getByTestId('recipe-cancel-edits').click();
    await expect(editor.getByTestId('recipe-detail-name')).toHaveText(draftName);
    expect(editorWrites).toHaveLength(2);
    expect((await request.post(`${baseURL}/_test/canonical/recompute`, { headers })).status()).toBe(
      200
    );
    const incomparable = await readSchedule();
    const continued = incomparable.groceryItems.find((row: any) => row.normalizedKey === 'pasta');
    expect(continued).toMatchObject({
      rowId: pasta.rowId,
      unitText: 'cup',
      quantity: { kind: 'scalar', value: { n: '4', d: '1' } },
    });
    expect(incomparable.groceryState[pasta.rowId]).toBe(true);
    expect(incomparable.groceryState[sauce.rowId]).toBe(true);
    await shopper.reload();
    await shopper.getByTestId('grocery-tab').click();
    if ((await pantryToggle.getAttribute('aria-expanded')) === 'false') await pantryToggle.click();
    await expect(check(shopper, pasta)).toHaveAttribute('aria-checked', 'true');
    await expect(check(shopper, sauce)).toHaveAttribute('aria-checked', 'true');
    await expect(editor.getByText('4 cup pasta', { exact: true })).toBeVisible();
    await editor.getByTestId('action-gear-menu').click();
    await expect(editor.getByTestId('action-original-quantities')).toHaveAccessibleName(
      'View original ingredients'
    );
    await editor.getByTestId('action-original-quantities').click();
    await expect(editor.getByText('2 cup pasta', { exact: true })).toBeVisible();
    await editor.screenshot({
      path: test.info().outputPath('saved-original-and-source.png'),
      fullPage: true,
    });
    for (const locale of ['en', 'fr']) {
      await editor.evaluate((language) => localStorage.setItem('locale', language), locale);
      for (const width of [320, 768])
        for (const scale of [1, 2]) {
          await editor.setViewportSize({ width, height: 1024 });
          await editor.goto(`/recipes?open=${id}`);
          await expect(editor.getByTestId('recipe-detail-name')).toHaveText(draftName);
          await editor.addStyleTag({ content: `html { font-size: ${16 * scale}px !important; }` });
          await editor.getByTestId('action-gear-menu').click();
          await editor.getByTestId('action-edit-recipe').click();
          const amount = editor.getByTestId('recipe-edit-amount-0');
          const unit = editor.getByTestId('recipe-edit-unit-0');
          await expect(amount).toHaveValue('2');
          await expect(unit).toHaveValue('cup');
          await expect(amount).toHaveAccessibleName(/\S/);
          await amount.focus();
          await amount.press('Tab');
          await expect(unit).toBeFocused();
          await editor.getByTestId('recipe-edit-ingredient-0').scrollIntoViewIfNeeded();
          const packageCheckbox = editor.getByTestId('recipe-edit-package-enabled-0');
          const ingredientOptions = editor.locator('details').filter({ has: packageCheckbox });
          if (!(await ingredientOptions.evaluate((node) => (node as HTMLDetailsElement).open)))
            await ingredientOptions.locator('summary').click();
          await expect(packageCheckbox).toBeVisible();
          await expect(packageCheckbox).not.toBeChecked();
          const packageLabel = packageCheckbox.locator('..');
          await expect(packageLabel).toHaveJSProperty('tagName', 'LABEL');
          const clickPackageLabelOutsideGlyph = async () => {
            await packageLabel.scrollIntoViewIfNeeded();
            await expect(packageLabel).toBeVisible();
            const target = await packageLabel.evaluate((node) => {
              const label = node as HTMLLabelElement;
              const checkbox = label.querySelector<HTMLInputElement>(
                'input[data-testid="recipe-edit-package-enabled-0"]'
              )!;
              const bounds = label.getBoundingClientRect();
              const glyph = checkbox.getBoundingClientRect();
              const x = Math.min(bounds.right, window.innerWidth) - 8;
              const y = (Math.max(bounds.top, 0) + Math.min(bounds.bottom, window.innerHeight)) / 2;
              const hit = document.elementFromPoint(x, y);
              return {
                associated:
                  label.control === checkbox && [...(checkbox.labels ?? [])].includes(label),
                width: bounds.width,
                height: bounds.height,
                left: bounds.left,
                right: bounds.right,
                viewportWidth: window.innerWidth,
                x,
                y,
                pointInsideLabel:
                  x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom,
                outsideGlyph:
                  x < glyph.left || x > glyph.right || y < glyph.top || y > glyph.bottom,
                hitsLabel: hit !== null && label.contains(hit),
              };
            });
            expect(
              target.associated,
              `${locale}/${width}/${scale} checkbox label association`
            ).toBe(true);
            expect(target.width).toBeGreaterThanOrEqual(48);
            expect(target.height).toBeGreaterThanOrEqual(48);
            expect(target.left).toBeGreaterThanOrEqual(0);
            expect(target.right).toBeLessThanOrEqual(target.viewportWidth);
            expect(target.pointInsideLabel).toBe(true);
            expect(target.outsideGlyph).toBe(true);
            expect(target.hitsLabel).toBe(true);
            await editor.mouse.click(target.x, target.y);
          };
          const readEditorFields = () =>
            editor.evaluate((recipeId) => {
              const bytes = sessionStorage.getItem(`wfs.recipe-editor-draft.${recipeId}`);
              return bytes ? JSON.parse(bytes).fields : null;
            }, id);
          await expect.poll(readEditorFields).not.toBeNull();
          const originalEditorFields = await readEditorFields();
          const originalSaveDisabled = await editor.getByTestId('recipe-save-edits').isDisabled();
          const writesBeforePackageTarget = editorWrites.length;
          await clickPackageLabelOutsideGlyph();
          await expect(packageCheckbox).toBeChecked();
          await clickPackageLabelOutsideGlyph();
          await expect(packageCheckbox).not.toBeChecked();
          expect(editorWrites).toHaveLength(writesBeforePackageTarget);
          await ingredientOptions.screenshot({
            path: test.info().outputPath(`package-target-${locale}-${width}-${scale}x.png`),
          });
          // Enabling copies the count label from the row unit. Cancel/reopen restores every original control,
          // including hidden values, without saving the temporary package declaration or carrying a dirty draft.
          await editor.getByTestId('recipe-cancel-edits').click();
          expect(await readEditorFields()).toBeNull();
          expect(editorWrites).toHaveLength(writesBeforePackageTarget);
          await editor.getByTestId('action-gear-menu').click();
          await editor.getByTestId('action-edit-recipe').click();
          await expect.poll(readEditorFields).toEqual(originalEditorFields);
          await expect(amount).toHaveValue('2');
          await expect(unit).toHaveValue('cup');
          expect(await editor.getByTestId('recipe-save-edits').isDisabled()).toBe(
            originalSaveDisabled
          );
          await expect(packageCheckbox).not.toBeChecked();
          if (!(await ingredientOptions.evaluate((node) => (node as HTMLDetailsElement).open)))
            await ingredientOptions.locator('summary').click();
          await expect(packageCheckbox).toBeVisible();
          const geometry = await editor.getByTestId('recipe-detail-sheet').evaluate((panel) => ({
            panel: panel.scrollWidth <= panel.clientWidth,
            document: document.documentElement.scrollWidth <= window.innerWidth,
            labels: [
              ...panel.querySelectorAll(
                'input[data-testid^="recipe-edit-amount-"], input[data-testid^="recipe-edit-unit-"]'
              ),
            ]
              .map((input) => input.closest('label')!)
              .filter((label) => label.scrollWidth > label.clientWidth)
              .map((label) => label.textContent?.trim()),
            shortValues: [
              ...panel.querySelectorAll<HTMLInputElement>(
                'input[data-testid="recipe-edit-amount-0"], input[data-testid="recipe-edit-unit-0"], input[data-testid="recipe-edit-servings-input"]'
              ),
            ]
              .filter((input) => {
                const style = getComputedStyle(input);
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                context.font = style.font;
                return (
                  context.measureText(input.value).width >
                  input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
                );
              })
              .map((input) => input.getAttribute('data-testid')),
            fields: [
              ...panel.querySelectorAll(
                'input[data-testid^="recipe-edit-"], button[data-testid^="recipe-edit-meal-type-pill-"]'
              ),
            ]
              .map((input) => {
                const target =
                  input instanceof HTMLInputElement && input.type === 'checkbox'
                    ? (input.labels?.[0] ?? input)
                    : input;
                const bounds = target.getBoundingClientRect();
                return {
                  id: input.getAttribute('data-testid'),
                  width: bounds.width,
                  height: bounds.height,
                  x: bounds.x,
                  right: bounds.right,
                };
              })
              .filter(
                (bounds) =>
                  bounds.width < 48 ||
                  bounds.height < 48 ||
                  bounds.x < 0 ||
                  bounds.right > window.innerWidth
              ),
          }));
          expect(geometry, `${locale}/${width}/${scale}`).toEqual({
            panel: true,
            document: true,
            labels: [],
            shortValues: [],
            fields: [],
          });
          await editor.screenshot({
            path: test.info().outputPath(`editor-${locale}-${width}-${scale}x.png`),
            fullPage: true,
          });
          await editor.getByTestId('recipe-save-edits').focus();
          await editor.getByTestId('recipe-save-edits').press('Tab');
          await expect(editor.getByTestId('recipe-cancel-edits')).toBeFocused();
          await editor.getByTestId('recipe-cancel-edits').click();
          expect(await readEditorFields()).toBeNull();
          expect(editorWrites).toHaveLength(writesBeforePackageTarget);
        }
    }
    // Retained incomplete imports use the same flag and editor, with an explanatory comment
    // and no automatic repair. This separate recipe leaves the grocery tracer intact.
    const incompleteResponse = await request.post(`${baseURL}/_test/canonical/failed-import`, {
      headers,
    });
    expect(incompleteResponse.status()).toBe(200);
    const incompleteId = (await incompleteResponse.json()).recipeId;
    await editor.evaluate(() => localStorage.setItem('locale', 'en'));
    await editor.setViewportSize({ width: 390, height: 844 });
    await editor.goto('/recipes');
    await editor.getByTestId('recipes-search-disclosure').click();
    await editor.getByTestId('mobile-filters-button').click();
    await editor.getByTestId('mobile-more-filters').click();
    await editor.getByTestId('mobile-filter-ready-to-review').click();
    await editor.getByTestId('mobile-filter-apply').click();
    await expect(editor.getByTestId('stack-card-front')).toHaveAttribute(
      'data-recipe-id',
      incompleteId
    );
    await editor.getByTestId(`stack-card-${incompleteId}`).click();
    await expect(editor.getByTestId('recipe-detail-name')).toHaveText('Flagged incomplete recipe');
    await editor.getByTestId('action-gear-menu').click();
    await editor.getByTestId('action-edit-recipe').click();
    await editor.getByTestId('recipe-edit-ingredient-0').fill('Salt as I prefer');
    await editor.getByRole('button', { name: 'Add step', exact: true }).click();
    await editor
      .getByRole('textbox', { name: 'Step 1 instructions' })
      .fill('Taste and adjust salt.');
    await editor.getByTestId('recipe-save-edits').click();
    await expect(editor.getByTestId('recipe-save-edits')).toHaveCount(0);
    await expect(editor.getByText('Taste and adjust salt.', { exact: true })).toBeVisible();
    await expect(
      editor
        .getByTestId('recipe-detail-sheet')
        .getByTestId('recipe-import-issue-status-readyToReview')
    ).toBeVisible();
    await editor.goto(`/recipes?open=${incompleteId}`);
    await expect(editor.getByTestId('recipe-detail-name')).toHaveText('Flagged incomplete recipe');
    await expect(editor.getByText('Taste and adjust salt.', { exact: true })).toBeVisible();
    const incomplete = (
      await (await request.get(`${baseURL}/api/recipes/${incompleteId}`, { headers })).json()
    ).recipe;
    expect(incomplete).toMatchObject({
      isReady: false,
      ingredients: ['Salt as I prefer'],
      importIssue: {
        note: expect.stringContaining('cooking steps'),
        status: 'readyToReview',
        isReimporting: false,
      },
    });
    await editor.bringToFront();
    await editor.getByTestId('action-gear-menu').click();
    await editor.getByTestId('action-report-import-issue').click();
    await expect(
      editor.getByRole('dialog', { name: 'Review issue' }).getByText(/Ready for review/)
    ).toBeVisible();
    await editor.getByTestId('import-issue-save').click();
    await expect(editor.getByRole('dialog', { name: 'Review issue' })).toHaveCount(0);
    const unchangedFlag = (
      await (await request.get(`${baseURL}/api/recipes/${incompleteId}`, { headers })).json()
    ).recipe.importIssue;
    expect(unchangedFlag).toMatchObject({
      note: incomplete.importIssue.note,
      status: 'readyToReview',
      isReimporting: false,
    });
    const savedNotification = editor.getByTestId('toast').filter({ hasText: 'Changes saved' });
    await expect(savedNotification).toBeVisible();
    await savedNotification.getByRole('button', { name: 'Dismiss notification' }).click();
    await expect(savedNotification).toHaveCount(0);
    await editor.getByTestId('action-gear-menu').click();
    await editor.getByTestId('action-report-import-issue').click();
    await expect(editor.getByTestId('import-issue-note')).toHaveValue(incomplete.importIssue.note);
    await editor.getByTestId('import-issue-note').fill('Please check the original steps.');
    const correctionReply = editor.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(`/api/recipes/${incompleteId}/import-report`)
    );
    await editor.getByTestId('import-issue-save').click();
    expect((await (await correctionReply).json()).reimportStarted).toBe(true);
    const afterComment = (
      await (await request.get(`${baseURL}/api/recipes/${incompleteId}`, { headers })).json()
    ).recipe;
    expect(afterComment).toMatchObject({
      ingredients: ['Salt as I prefer'],
      importIssue: { note: 'Please check the original steps.', isReimporting: true },
    });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test('mixed incomplete baseline keeps its grocery check when unknown demand becomes known while a separate proven increase resets', async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(15_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const id = process.env.CANONICAL_RECIPE_ID!;
  const member = process.env.CANONICAL_MEMBERS!.split(',')[0];
  const headers = { 'X-Hearth-Secret': process.env.HEARTH_SECRET! };
  const family = (await (await request.get(`${baseURL}/api/family`, { headers })).json()).data;
  await page.context().addCookies([
    {
      name: 'h_access',
      value: await generateSecretToken(process.env.HEARTH_SECRET!),
      url: baseURL!,
    },
    { name: 'x-family-member-id', value: member, url: baseURL! },
  ]);
  await page.addInitScript(
    ({ member, family }) => {
      localStorage.setItem('locale', 'en');
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: member,
            familyMembers: family,
            _hasHydrated: true,
            hasLoaded: true,
          },
          version: 0,
        })
      );
    },
    { member, family }
  );
  await page.context().route('**/*', (route) => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
      ['data:', 'blob:'].includes(url.protocol)
      ? route.continue()
      : route.abort('blockedbyclient');
  });
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  const read = async () =>
    (
      await (
        await request.get(
          `${baseURL}/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-05`,
          { headers }
        )
      ).json()
    ).data;
  const original = (await (await request.get(`${baseURL}/api/recipes/${id}`, { headers })).json())
    .recipe;
  expect(original.ingredientLines).toHaveLength(3);
  expect(original.ingredientLines[2]).toMatchObject({
    amount: null,
    amountText: null,
    unit: { text: 'g' },
  });
  const before = await read();
  const pasta = before.groceryItems.find((row: any) => row.normalizedKey === 'pasta');
  const sauce = before.groceryItems.find((row: any) => row.normalizedKey === 'sauce');
  expect(pasta).toMatchObject({
    quantity: { kind: 'scalar', value: { n: '400', d: '1' } },
    quantityComplete: false,
  });
  const checkbox = (row: any) =>
    page.locator(`[data-testid="grocery-item-checkbox"][data-row-id="${row.rowId}"]`);
  const showPantry = async () => {
    const header = page
      .getByTestId('aisle-section-Pantry')
      .locator('button[aria-controls="aisle-items-pantry"]');
    if ((await header.getAttribute('aria-expanded')) === 'false') await header.click();
  };
  await page.goto('/planner?weekOffset=1&referenceWeekStartDate=2026-10-05');
  await page.getByTestId('grocery-tab').click();
  await showPantry();
  await expect(checkbox(pasta)).toContainText('400 g known');
  await checkbox(pasta).click();
  await expect(checkbox(pasta)).toHaveAttribute('aria-checked', 'true');
  await expect(checkbox(pasta)).toContainText('400 g known');
  await checkbox(sauce).click();
  await expect.poll(async () => (await read()).groceryState[sauce.rowId]).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('mixed-before-unknown-completion.png'),
    fullPage: true,
  });
  await page.goto(`/recipes?open=${id}`);
  await page.getByTestId('action-gear-menu').click();
  await page.getByTestId('action-edit-recipe').click();
  await expect(page.getByTestId('recipe-edit-amount-2')).toHaveValue('');
  await page.getByTestId('recipe-edit-amount-2').fill('100');
  await page.getByTestId('recipe-edit-amount-1').fill('150');
  const saving = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname === `/api/recipes/${id}`
  );
  await page.getByTestId('recipe-save-edits').click();
  const saved = await saving;
  expect(saved.status(), await saved.text()).toBe(200);
  expect(
    saved
      .request()
      .postDataJSON()
      .ingredientLines.map((row: any) => row.id)
  ).toEqual(original.ingredientLines.map((row: any) => row.id));
  expect((await request.post(`${baseURL}/_test/canonical/recompute`, { headers })).status()).toBe(
    200
  );
  const after = await read();
  expect(after.groceryItems.find((row: any) => row.normalizedKey === 'pasta')).toMatchObject({
    rowId: pasta.rowId,
    quantity: { kind: 'scalar', value: { n: '600', d: '1' } },
    quantityComplete: true,
  });
  expect(after.groceryState[pasta.rowId]).toBe(true);
  expect(after.groceryState[sauce.rowId]).toBe(false);
  await page.goto('/planner?weekOffset=1&referenceWeekStartDate=2026-10-05');
  await page.getByTestId('grocery-tab').click();
  await showPantry();
  await expect(checkbox(pasta)).toHaveAttribute('aria-checked', 'true');
  await expect(checkbox(sauce)).toHaveAttribute('aria-checked', 'false');
  await expect(checkbox(pasta)).toContainText('600 g');
  await expect(checkbox(pasta)).not.toContainText('known');
  await expect(page.getByTestId('grocery-check-review')).toHaveCount(0);
  await page.reload();
  await page.getByTestId('grocery-tab').click();
  await showPantry();
  await expect(checkbox(pasta)).toHaveAttribute('aria-checked', 'true');
  await expect(checkbox(sauce)).toHaveAttribute('aria-checked', 'false');
  await expect(checkbox(pasta)).toContainText('600 g');
  await page.screenshot({
    path: test.info().outputPath('mixed-complete-preserves-incomplete-baseline.png'),
    fullPage: true,
  });
});
