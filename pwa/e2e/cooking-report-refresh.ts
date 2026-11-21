import { expect, type Page, type TestInfo } from '@playwright/test';

// Both callers use the same observable journey; only their API composition differs.
export async function qualifyCookingReportRefresh(page: Page, id: string, info: TestInfo) {
  const setTotal = async (amount: string) => {
    const status = await page.evaluate(
      async ({ recipeId, amount }) => {
        const current = (await (await fetch(`/api/recipes/${recipeId}`)).json()).recipe;
        const rows = current.ingredientLines.map((row: any, index: number) => ({
          id: row.id,
          description: row.description,
          amount: index === 0 ? { kind: 'scalar', value: { n: amount, d: '1' } } : row.amount,
          amountText: index === 0 ? amount : row.amountText,
          unit: row.unit,
          scaling: row.scaling,
          package: row.package,
          shopping: row.shopping,
        }));
        return (
          await fetch(`/api/recipes/${recipeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              expectedContentRevision: current.contentRevision,
              ingredientLines: rows,
            }),
          })
        ).status;
      },
      { recipeId: id, amount }
    );
    expect(status).toBe(200);
  };
  await page.goto('/home');
  // Delay delivery after the actual API/mock response has been read. This keeps
  // an older body in flight while later explicit reads use the same real seam.
  await page.evaluate((recipeId) => {
    const originalFetch = window.fetch;
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const gate = {
      ready: false,
      release: () => {
        window.fetch = originalFetch;
        release();
      },
    };
    (window as any).__cookingInitialRead = gate;
    window.fetch = async (...args) => {
      const input = args[0];
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const response = await originalFetch(...args);
      if (
        new URL(url, location.href).pathname === `/api/recipes/${recipeId}/ingredient-projection` &&
        !gate.ready
      ) {
        // Capture bytes before later guarded edits, including real PostgreSQL reads.
        const body = await response.arrayBuffer();
        gate.ready = true;
        await held;
        return new Response(body, { status: response.status, headers: response.headers });
      }
      return response;
    };
  }, id);
  await page.getByTestId('cook-mode-btn').click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__cookingInitialRead.ready))
    .toBe(true);
  await expect(page.getByTestId('cooks-mode-report-ingredients')).toBeVisible();
  await setTotal('250');
  await page.getByTestId('cooks-mode-report-ingredients').click();
  await page.getByTestId('import-issue-reason-duplicate').click();
  await page.getByTestId('import-issue-save').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
  const initialIngredient = page
    .getByTestId('ingredient-toggle')
    .filter({ hasText: '500 g pasta' });
  await expect(initialIngredient).toBeVisible();
  await initialIngredient.click();
  await page.getByTestId('cooking-view-step-by-step').click();
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText('Add 500 g pasta');
  await page.evaluate(() => (window as any).__cookingInitialRead.release());
  // Flush the released promise through React before checking retained content.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText('Add 500 g pasta');
  await expect(page.getByTestId('cooking-quantities-available')).toHaveCount(0);
  await expect(page.getByTestId('cooking-portion-context')).toContainText('8 portions');
  await page.getByTestId('cooks-mode-step-prev').click();
  await expect(initialIngredient).toHaveAttribute('aria-checked', 'true');
  await page
    .getByTestId('cooks-mode-instructions')
    .screenshot({ path: info.outputPath('initial-late-retained.png'), animations: 'disabled' });
  await page.getByTestId('cooks-mode-report-ingredients').click();
  await page.getByRole('button', { name: 'Mark as resolved', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByTestId('close-cooks-mode').click();
  await setTotal('200');
  await page.getByTestId('nav-item-home').click();
  await page.getByTestId('cook-mode-btn').click();
  const ingredient = page.getByTestId('ingredient-toggle').filter({ hasText: '400 g pasta' });
  await expect(ingredient).toBeVisible();
  await ingredient.click();
  await page.getByTestId('cooking-view-step-by-step').click();
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText('Add 400 g pasta');
  await expect(page.getByTestId('cooking-quantities-available')).toHaveCount(0);
  await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
  await page
    .getByTestId('cooks-mode-instructions')
    .screenshot({ path: info.outputPath('report-normal.png'), animations: 'disabled' });
  // Begin a refresh for an intermediate revision, then hold its transport while
  // another writer publishes the revision returned by quality reporting.
  await setTotal('250');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByTestId('cooking-quantities-available')).toBeVisible();
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  const pattern = `**/api/recipes/${id}/ingredient-projection?*`;
  await page.route(pattern, async (route) => {
    // Invalidation probes share this endpoint with the explicit refresh.
    // Hold the whole collision window so a probe cannot consume its gate.
    started();
    await held;
    await route.fallback();
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
  await requested;
  await expect(
    page.getByRole('button', { name: 'Refreshing quantities…', exact: true })
  ).toBeDisabled();
  await page.getByTestId('cooks-mode-report-steps').click();
  await setTotal('300');
  // Duplicate feedback never launches a provider/re-import workflow.
  await page.getByTestId('import-issue-reason-duplicate').click();
  await page.getByTestId('import-issue-save').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('cooking-quantities-available')).toHaveText(
    'Updated quantities are available.'
  );
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText('Add 400 g pasta');
  await page
    .getByTestId('cooks-mode-instructions')
    .screenshot({ path: info.outputPath('report-refresh-offered.png'), animations: 'disabled' });
  const retiredReply = page.waitForResponse(
    (reply) => new URL(reply.url()).pathname === `/api/recipes/${id}/ingredient-projection`
  );
  release();
  expect((await retiredReply).status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Refresh quantities', exact: true })).toBeEnabled();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText('Add 400 g pasta');
  await page.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText('Add 600 g pasta');
  await expect(page.getByTestId('cooking-quantities-available')).toHaveCount(0);
  await expect(page.getByTestId('cooking-step-uncertainty')).toHaveCount(0);
  await expect(page.getByTestId('cooking-portion-context')).toContainText('8 portions');
  await page.getByTestId('cooks-mode-step-prev').click();
  // An ingredient correction retains the existing checklist's ownership semantics.
  await expect(
    page.getByTestId('ingredient-toggle').filter({ hasText: '600 g pasta' })
  ).toBeVisible();
  await page
    .getByTestId('cooks-mode-instructions')
    .screenshot({ path: info.outputPath('report-refreshed.png'), animations: 'disabled' });
  const metadata = await page.evaluate(
    async (recipeId) => (await (await fetch(`/api/recipes/${recipeId}`)).json()).recipe,
    id
  );
  expect(metadata.importIssue.reasons).toEqual(['duplicate']);
  expect(metadata.importIssue.isReimporting).toBe(false);
  // An undated detail entry reads the canonical original context, never the
  // household's eight-portion dated projection. A report still cannot install
  // different semantic content without the same explicit refresh decision.
  await page.getByTestId('close-cooks-mode').click();
  // Mount Recipes through the app before updating its supported query state.
  // Keep the fixed clock and native animation timeline in the same document.
  await page.getByTestId('nav-item-recipes').click();
  await expect(page.getByTestId('recipes-search-disclosure')).toBeVisible();
  await page.evaluate(
    (recipeId) =>
      window.history.pushState(null, '', `/recipes?open=${recipeId}&reviewAmounts=true`),
    id
  );
  await page.getByTestId('action-cooks-mode').click();
  await expect(
    page.getByTestId('ingredient-toggle').filter({ hasText: '300 g pasta' })
  ).toBeVisible();
  await expect(page.getByTestId('cooking-portion-context')).toHaveCount(0);
  await expect(page.getByTestId('cooking-quantities-available')).toHaveCount(0);
  await page.getByTestId('ingredient-toggle').filter({ hasText: '300 g pasta' }).click();
  await page.getByTestId('cooking-view-step-by-step').click();
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText('Add 200 g pasta');
  await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
  await page
    .getByTestId('cooks-mode-instructions')
    .screenshot({ path: info.outputPath('undated-normal.png'), animations: 'disabled' });
  await setTotal('350');
  await page.getByTestId('cooks-mode-report-steps').click();
  await page.getByRole('button', { name: 'Mark as resolved', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('cooking-quantities-available')).toHaveText(
    'Updated quantities are available.'
  );
  await page.getByTestId('cooks-mode-step-prev').click();
  await expect(
    page.getByTestId('ingredient-toggle').filter({ hasText: '300 g pasta' })
  ).toHaveAttribute('aria-checked', 'true');
  await expect(
    page.getByTestId('ingredient-toggle').filter({ hasText: '350 g pasta' })
  ).toHaveCount(0);
  await page.getByTestId('cooks-mode-step-next').click();
  await page.getByTestId('cooks-mode-edit-step').click();
  const originalDraft = await page.getByRole('textbox').inputValue();
  await page.getByRole('textbox').fill('Keep this undated draft');
  await page
    .getByTestId('cooks-mode-instructions')
    .screenshot({ path: info.outputPath('undated-refresh-offered.png'), animations: 'disabled' });
  const originalRead = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/recipes/${id}`
  );
  await page.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
  expect((await originalRead).status()).toBe(200);
  await expect(page.getByTestId('cooking-quantities-available')).toHaveCount(0);
  await expect(page.getByRole('textbox')).toHaveValue('Keep this undated draft');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText(originalDraft);
  await page.getByTestId('cooks-mode-step-prev').click();
  await expect(
    page.getByTestId('ingredient-toggle').filter({ hasText: '350 g pasta' })
  ).toBeVisible();
  await expect(page.getByTestId('cooking-portion-context')).toHaveCount(0);
  await page
    .getByTestId('cooks-mode-instructions')
    .screenshot({ path: info.outputPath('undated-refreshed.png'), animations: 'disabled' });
  await page.getByTestId('close-cooks-mode').click();
  await setTotal('300');
}
