import { expect, type Page, type TestInfo } from '@playwright/test';

// The same guarded editor journey runs against the stateful mock and real PostgreSQL API.
export async function qualifyCookingInstructionGuard(page: Page, id: string, info: TestInfo) {
  await page.goto(`/recipes?open=${id}&reviewAmounts=true`);
  await page.getByTestId('action-cooks-mode').click();
  const original = await page.evaluate(
    async (recipeId) => (await (await fetch(`/api/recipes/${recipeId}`)).json()).recipe,
    id
  );
  await expect(
    page.getByTestId('ingredient-toggle').filter({ hasText: '200 g pasta' })
  ).toBeVisible();
  await page.getByTestId('ingredient-toggle').first().click();
  await page.getByTestId('cooking-view-step-by-step').click();
  await page.getByTestId('cooks-mode-step-next').click();
  const source = original.instructionSections[0].steps[0].text;
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText(source);
  const newer = await page.evaluate(
    async ({ id, original }) => {
      const rows = original.ingredientLines.map((row: any, index: number) => ({
        id: row.id,
        description: row.description,
        amount: index ? row.amount : { kind: 'scalar', value: { n: '250', d: '1' } },
        amountText: index ? row.amountText : '250',
        unit: row.unit,
        scaling: row.scaling,
        package: row.package,
        shopping: row.shopping,
      }));
      const reply = await fetch(`/api/recipes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedContentRevision: original.contentRevision,
          ingredientLines: rows,
        }),
      });
      return { status: reply.status, body: await reply.json() };
    },
    { id, original }
  );
  expect(newer.status).toBe(200);
  await page.getByTestId('cooks-mode-report-steps').click();
  await page.getByTestId('import-issue-reason-duplicate').click();
  await page.getByTestId('import-issue-save').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('cooking-quantities-available')).toBeVisible();
  await page.getByTestId('cooks-mode-edit-step').click();
  const draft = `${source} Stir gently.`;
  await expect(page.getByRole('textbox')).toHaveValue(source);
  await page.getByRole('textbox').fill(draft);
  // Refresh explicitly installs newer content, but cannot rebase an existing draft.
  await page.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
  await expect(page.getByTestId('cooking-quantities-available')).toHaveCount(0);
  await expect(page.getByRole('textbox')).toHaveValue(draft);
  const saveReply = () =>
    page.waitForResponse(
      (reply) =>
        reply.request().method() === 'PATCH' &&
        new URL(reply.url()).pathname === `/api/recipes/${id}`
    );
  const staleReply = saveReply();
  await page.getByTestId('cooks-mode-save-edit').click();
  const stale = await staleReply;
  expect(stale.status()).toBe(409);
  expect(stale.request().postDataJSON()).toMatchObject({
    expectedContentRevision: original.contentRevision,
    instructionSections: [
      {
        id: original.instructionSections[0].id,
        steps: [{ id: original.instructionSections[0].steps[0].id, text: draft }],
      },
    ],
  });
  await expect(page.getByRole('textbox')).toHaveValue(draft);
  await expect(page.getByTestId('cooks-mode-instructions').getByRole('alert')).toContainText(
    "Couldn't save this step."
  );
  const current = await page.evaluate(
    async (recipeId) => (await (await fetch(`/api/recipes/${recipeId}`)).json()).recipe,
    id
  );
  expect(current.contentRevision).toBe(newer.body.recipe.contentRevision);
  expect(current.instructionSections).toEqual(newer.body.recipe.instructionSections);
  expect(current.ingredientLines).toEqual(newer.body.recipe.ingredientLines);
  await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
  await page.getByTestId('cooks-mode-instructions').getByRole('alert').scrollIntoViewIfNeeded();
  await page
    .getByTestId('cooks-mode-instructions')
    .screenshot({ path: info.outputPath('instruction-conflict.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByTestId('cooks-mode-edit-step').click();
  await page.getByRole('textbox').fill(draft);
  const successReply = saveReply();
  await page.getByTestId('cooks-mode-save-edit').click();
  const success = await successReply;
  expect(success.status()).toBe(200);
  expect(success.request().postDataJSON().expectedContentRevision).toBe(current.contentRevision);
  const saved = (await success.json()).recipe;
  expect(saved.contentRevision).not.toBe(current.contentRevision);
  expect(saved.instructionSections[0].steps[0].id).toBe(
    original.instructionSections[0].steps[0].id
  );
  expect(saved.instructionSections[0].steps[0].text).toBe(draft);
  expect(saved.ingredientLines).toEqual(current.ingredientLines);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText(draft);
  await expect(page.getByText('Step saved', { exact: true })).toHaveAttribute(
    'aria-live',
    'polite'
  );
  await expect(page.getByTestId('cooking-quantities-available')).toHaveCount(0);
  await page
    .getByTestId('cooks-mode-instructions')
    .screenshot({ path: info.outputPath('instruction-saved.png'), animations: 'disabled' });
  await page.getByTestId('cooks-mode-step-prev').click();
  await expect(
    page.getByTestId('ingredient-toggle').filter({ hasText: '250 g pasta' })
  ).toBeVisible();
  await expect(page.getByTestId('cooking-portion-context')).toHaveCount(0);
  await qualifyPendingDatedInstructionEdit(page, id, info);
  await qualifyLostInstructionReply(page, id, info, false);
  await qualifyLostInstructionReply(page, id, info, true);
}

async function qualifyPendingDatedInstructionEdit(page: Page, id: string, info: TestInfo) {
  await page.getByTestId('close-cooks-mode').click();
  await page.evaluate(() => window.history.pushState(null, '', '/recipes'));
  await expect(page.getByTestId('action-cooks-mode')).toHaveCount(0);
  await page.evaluate((url) => window.history.pushState(null, '', url), `/recipes?open=${id}`);
  await expect(page.getByTestId('action-cooks-mode')).toBeVisible();
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
    (window as any).__pendingCookingEdit = gate;
    window.fetch = async (...args) => {
      const input = args[0];
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const response = await originalFetch(...args);
      if (
        new URL(url, location.href).pathname === `/api/recipes/${recipeId}/ingredient-projection`
      ) {
        const body = await response.arrayBuffer();
        gate.ready = true;
        await held;
        return new Response(body, { status: response.status, headers: response.headers });
      }
      return response;
    };
  }, id);
  await page.getByTestId('action-cooks-mode').click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__pendingCookingEdit.ready))
    .toBe(true);
  await page.getByTestId('cooking-view-step-by-step').click();
  await page.getByTestId('cooks-mode-step-next').click();
  await page.getByTestId('cooks-mode-edit-step').click();
  const original = await page.getByRole('textbox').inputValue();
  const draft = `${original} Keep this pending draft.`;
  await page.getByRole('textbox').fill(draft);
  const requests: string[] = [];
  const track = (request: import('@playwright/test').Request) => {
    if (request.method() === 'PATCH' && new URL(request.url()).pathname === `/api/recipes/${id}`)
      requests.push(request.url());
  };
  page.on('request', track);
  await page.getByTestId('cooks-mode-save-edit').click();
  await expect(page.getByTestId('cooks-mode-instructions').getByRole('alert')).toContainText(
    "Couldn't save this step."
  );
  await expect(page.getByRole('textbox')).toHaveValue(draft);
  expect(requests).toEqual([]);
  await page.evaluate(() => (window as any).__pendingCookingEdit.release());
  await expect(page.getByText('Loading ingredients for this date…', { exact: true })).toHaveCount(
    0
  );
  await expect(page.getByTestId('cooking-portion-context')).toContainText('portions');
  await expect(page.getByRole('textbox')).toHaveValue(draft);
  await page.getByTestId('cooks-mode-instructions').getByRole('alert').scrollIntoViewIfNeeded();
  await page
    .getByTestId('cooks-mode-instructions')
    .screenshot({ path: info.outputPath('instruction-pending-dated.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText(original);
  page.off('request', track);
}

async function qualifyLostInstructionReply(page: Page, id: string, info: TestInfo, dated: boolean) {
  await page.getByTestId('close-cooks-mode').click();
  await page.evaluate(() => window.history.pushState(null, '', '/recipes'));
  await expect(page.getByTestId('action-cooks-mode')).toHaveCount(0);
  // Use Next's supported SPA URL entry: repeated full-document navigation under
  // the fixed test clock drifts performance.now from the native animation timeline.
  await page.evaluate(
    (url) => window.history.pushState(null, '', url),
    `/recipes?open=${id}${dated ? '' : '&reviewAmounts=true'}`
  );

  await page.getByTestId('action-cooks-mode').click();
  await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
  if (dated) await expect(page.getByTestId('cooking-portion-context')).toContainText('portions');
  await page.getByTestId('cooking-view-step-by-step').click();
  // SPA entry deliberately retains the dated bookmark from its earlier visit.
  const previous = page.getByTestId('cooks-mode-step-prev');
  if (await previous.isEnabled()) await previous.click();
  await page.getByTestId('ingredient-toggle').last().click();
  await page.getByTestId('cooks-mode-step-next').click();
  await page.getByTestId('cooks-mode-edit-step').click();
  const source = await page.getByRole('textbox').inputValue();
  const draft = `${source} ${dated ? 'Dated' : 'Original'} reply recovery.`;
  await page.getByRole('textbox').fill(draft);
  // Let the real generated PATCH commit, then lose only its delivery. The same
  // boundary is used for the stateful mock and disposable real API/database.
  await page.evaluate((recipeId) => {
    const originalFetch = window.fetch;
    const state = {
      writes: 0,
      reads: 0,
      saved: null as any,
      failRead: true,
      lost: false,
      readReady: false,
    };
    let releaseRead!: () => void;
    const heldRead = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    (window as any).__releaseInstructionRead = () => releaseRead();
    (window as any).__lostInstructionReply = state;
    window.fetch = async (...args) => {
      const input = args[0];
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = args[1]?.method ?? (input instanceof Request ? input.method : 'GET');
      const matches = new URL(url, location.href).pathname === `/api/recipes/${recipeId}`;
      if (matches && method.toUpperCase() === 'PATCH') {
        state.writes++;
        const reply = await originalFetch(...args);
        if (!state.lost) {
          if (!reply.ok) throw new Error(`Expected committed save, got ${reply.status}`);
          state.saved = (await reply.json()).recipe;
          state.lost = true;
          throw new TypeError('Synthetic lost instruction response after actual commit');
        }
        return reply;
      }
      if (matches && state.lost && method.toUpperCase() === 'GET') {
        state.reads++;
        if (state.failRead) {
          state.failRead = false;
          throw new TypeError('Synthetic first recovery read unavailable');
        }
        if (state.reads === 2) {
          const response = await originalFetch(...args);
          const body = await response.arrayBuffer();
          state.readReady = true;
          await heldRead;
          return new Response(body, { status: response.status, headers: response.headers });
        }
      }
      return originalFetch(...args);
    };
    (window as any).__restoreInstructionFetch = () => {
      window.fetch = originalFetch;
    };
  }, id);
  await page.getByTestId('cooks-mode-save-edit').click();
  const alert = page.getByTestId('cooks-mode-instructions').getByRole('alert');
  await expect(alert).toContainText("Couldn't save this step.");
  await expect(page.getByRole('textbox')).toHaveValue(draft);
  const committed = await page.evaluate(() => (window as any).__lostInstructionReply.saved);
  expect(committed.instructionSections[0].steps[0].text).toBe(draft);
  await alert.getByRole('button', { name: 'Try again' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__lostInstructionReply.reads))
    .toBe(1);
  await expect(page.getByTestId('cooks-mode-save-edit')).toBeEnabled();
  await expect(page.getByRole('textbox')).toHaveValue(draft);
  expect(await page.evaluate(() => (window as any).__lostInstructionReply.writes)).toBe(1);
  await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
  await alert.scrollIntoViewIfNeeded();
  await page.getByTestId('cooks-mode-instructions').screenshot({
    path: info.outputPath(`instruction-${dated ? 'dated' : 'original'}-lost-reply.png`),
    animations: 'disabled',
  });
  await alert.getByRole('button', { name: 'Try again' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__lostInstructionReply.readReady))
    .toBe(true);
  const latest = `${draft} Keep this newer draft.`;
  await page.getByRole('textbox').fill(latest);
  await page.evaluate(() => (window as any).__releaseInstructionRead());
  await expect(page.getByTestId('cooks-mode-save-edit')).toBeEnabled();
  await expect(page.getByRole('textbox')).toHaveValue(latest);
  await expect(alert).toContainText("Couldn't save this step.");
  await expect(page.getByText('Step saved', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__lostInstructionReply.writes)).toBe(1);
  await page.getByTestId('cooks-mode-instructions').screenshot({
    path: info.outputPath(`instruction-${dated ? 'dated' : 'original'}-newer-draft.png`),
    animations: 'disabled',
  });
  // Returning explicitly to the committed wording can recognize that result;
  // recovery never rebases or publishes the newer unsaved draft.
  await page.getByRole('textbox').fill(draft);
  await alert.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText(draft);
  await expect(page.getByText('Step saved', { exact: true })).toHaveAttribute(
    'aria-live',
    'polite'
  );
  expect(await page.evaluate(() => (window as any).__lostInstructionReply.writes)).toBe(1);
  expect(await page.evaluate(() => (window as any).__lostInstructionReply.reads)).toBe(3);
  await expect(page.getByTestId('cooking-quantities-available')).toHaveCount(0);
  await expect(alert).toHaveCount(0);
  await page.evaluate(() => (window as any).__restoreInstructionFetch());
  const current = await page.evaluate(
    async (recipeId) => (await (await fetch(`/api/recipes/${recipeId}`)).json()).recipe,
    id
  );
  expect(current.contentRevision).toBe(committed.contentRevision);
  expect(current.instructionSections).toEqual(committed.instructionSections);
  expect(current.ingredientLines).toEqual(committed.ingredientLines);
  await page.getByTestId('cooks-mode-step-prev').click();
  await expect(page.getByTestId('ingredient-toggle').last()).toHaveAttribute(
    'aria-checked',
    'true'
  );
  await expect(page.getByTestId('cooks-mode-step-next')).toBeEnabled();
  await page.getByTestId('cooks-mode-overlay').screenshot({
    path: info.outputPath(`instruction-${dated ? 'dated' : 'original'}-recovered.png`),
    animations: 'disabled',
  });
}
