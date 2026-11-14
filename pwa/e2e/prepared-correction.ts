import { expect, type Page, type TestInfo } from '@playwright/test';

/** One observable prepared-reading journey, shared by mocked and real API/DB callers. */
export async function qualifyPreparedCorrection(
  page: Page,
  id: string,
  reference: string,
  friday: string,
  configured: boolean,
  info: TestInfo,
  readGroceries?: () => Promise<any[]>
) {
  const read = () =>
    page.evaluate(
      async ({ reference, id, friday }) => {
        const schedule = (
          await (await fetch(`/api/schedule?referenceWeekStartDate=${reference}`)).json()
        ).data;
        const day = schedule.days[4];
        const recipe = (await (await fetch(`/api/recipes/${id}`)).json()).recipe;
        const projection = await (
          await fetch(
            `/api/recipes/${id}/ingredient-projection?supperDate=${friday}&context=assigned&occurrenceId=${day.occurrenceId}`
          )
        ).json();
        return { day, recipe, projection };
      },
      { reference, id, friday }
    );
  await page.setViewportSize({ width: 390, height: 844 });
  const before = await read();
  expect(before.day.preparation).toMatchObject({
    servings: configured ? 6 : null,
    originalServings: 4,
    preparedOn: reference.slice(0, 8) + (reference.endsWith('12') ? '13' : '05'),
  });
  let preparationWrites = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/(prepare|cooked|complete)(\?|$)/.test(request.url()))
      preparationWrites++;
  });
  await page.getByTestId('day-card-4').getByTestId('edit-recipe-button').click();
  await page.getByTestId('action-cooks-mode').click();
  const overlay = page.getByTestId('cooks-mode-overlay');
  const reading = page.getByTestId('cooks-mode-instructions');
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveCSS('opacity', '1');
  if (configured)
    await expect(page.getByTestId('cooking-portion-context')).toContainText('6 portions');
  else await expect(page.getByTestId('cooking-portion-context')).not.toContainText('portions');
  const sauce = page.getByTestId('ingredient-toggle').filter({ hasText: 'sauce' });
  await sauce.click();
  await page.getByTestId('cooking-view-step-by-step').click();
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(reading).toContainText(`Add ${configured ? 300 : 200} g pasta`);
  await expect(page.getByRole('button', { name: 'Mark recipe as cooked' })).toHaveCount(0);
  await expect(page.getByTestId('cooking-step-uncertainty')).toHaveCount(0);
  await expect(
    page.getByText(
      'Some step amounts remain as written. Review the step or consult the original recipe.',
      { exact: true }
    )
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'View adjusted ingredients', exact: true })
  ).toHaveCount(0);
  await overlay.screenshot({
    path: info.outputPath('prepared-normal.png'),
    animations: 'disabled',
  });
  await page.getByTestId('cooks-mode-edit-step').click();
  const draft = overlay.getByRole('textbox');
  await expect(draft).toHaveValue(before.recipe.instructionSections[0].steps[0].text);
  await draft.fill('Keep my original-basis correction draft');
  const position = await reading.evaluate((element) => {
    element.scrollTop = 80;
    return element.scrollTop;
  });
  expect(position).toBeGreaterThan(0);
  const patch = async (changes: 'amount' | 'basis' | 'instruction') =>
    page.evaluate(
      async ({ id, changes }) => {
        const current = (await (await fetch(`/api/recipes/${id}`)).json()).recipe;
        const body =
          changes === 'basis'
            ? { expectedContentRevision: current.contentRevision, servings: 5 }
            : changes === 'instruction'
              ? {
                  expectedContentRevision: current.contentRevision,
                  instructionSections: current.instructionSections.map((section: any) => ({
                    id: section.id,
                    name: section.name,
                    steps: section.steps.map((step: any) => ({
                      id: step.id,
                      text: step.text + ' Stir gently.',
                    })),
                  })),
                }
              : {
                  expectedContentRevision: current.contentRevision,
                  ingredientLines: current.ingredientLines.map((row: any, i: number) => ({
                    id: row.id,
                    description: row.description,
                    amount: i === 0 ? { kind: 'scalar', value: { n: '250', d: '1' } } : row.amount,
                    amountText: i === 0 ? '250' : row.amountText,
                    unit: row.unit,
                    scaling: row.scaling,
                    package: row.package,
                    shopping: row.shopping,
                  })),
                };
        return (
          await fetch(`/api/recipes/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        ).status;
      },
      { id, changes }
    );
  expect(
    await page.evaluate(async (reference) => {
      const state = (
        await (await fetch(`/api/schedule/servings?referenceWeekStartDate=${reference}`)).json()
      ).data;
      return (
        await fetch('/api/schedule/servings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referenceWeekStartDate: reference,
            weekOffset: 0,
            expectedVersion: state.version,
            defaultServings: 9,
            days: [],
          }),
        })
      ).status;
    }, reference)
  ).toBe(200);
  expect(await patch('amount')).toBe(200);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByTestId('cooking-quantities-available')).toHaveText(
    'Updated quantities are available.'
  );
  await expect(draft).toHaveValue('Keep my original-basis correction draft');
  expect(await reading.evaluate((element) => element.scrollTop)).toBe(position);
  const corrected = await read();
  expect(corrected.projection.lines[0].quantity).toBe(configured ? 375 : 250);
  expect(corrected.projection.instructionProjection.sections[0].steps[0].text).toContain(
    `Add ${configured ? 375 : 250} g pasta`
  );
  await overlay.screenshot({
    path: info.outputPath('prepared-refresh-offered.png'),
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  // Hold actual intermediate bytes. A newer report response invalidates this read
  // before it can install ingredients/steps, including on the real API/DB seam.
  await page.evaluate((id) => {
    const original = window.fetch;
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const gate = {
      ready: false,
      release: () => {
        window.fetch = original;
        release();
      },
    };
    (window as any).__preparedHeldRead = gate;
    window.fetch = async (...args) => {
      const input = args[0];
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const reply = await original(...args);
      if (
        new URL(url, location.href).pathname === `/api/recipes/${id}/ingredient-projection` &&
        !gate.ready
      ) {
        const bytes = await reply.arrayBuffer();
        gate.ready = true;
        await held;
        return new Response(bytes, { status: reply.status, headers: reply.headers });
      }
      return reply;
    };
  }, id);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => page.evaluate(() => (window as any).__preparedHeldRead.ready)).toBe(true);
  expect(await patch('basis')).toBe(200);
  await page.getByTestId('cooks-mode-report-steps').click();
  await page.getByTestId('import-issue-reason-duplicate').click();
  await page.getByTestId('import-issue-save').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Refresh quantities', exact: true })).toBeEnabled();
  await expect(reading).toContainText(`Add ${configured ? 300 : 200} g pasta`);
  await page.getByTestId('cooks-mode-edit-step').click();
  await draft.fill('Keep my original-basis correction draft');
  await reading.evaluate((element) => {
    element.scrollTop = 80;
  });
  const beforeRefresh = await reading.evaluate((element) => element.scrollTop);
  await page.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
  await expect(page.getByTestId('cooking-quantities-available')).toHaveCount(0);
  await page.evaluate(() => (window as any).__preparedHeldRead.release());
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
  await expect(page.getByTestId('cooking-quantities-available')).toHaveCount(0);
  await expect(draft).toHaveValue('Keep my original-basis correction draft');
  expect(await reading.evaluate((element) => element.scrollTop)).toBe(beforeRefresh);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(reading).toContainText(`Add ${configured ? 300 : 250} g pasta`);
  await page.getByTestId('cooks-mode-step-prev').click();
  await expect(sauce).toHaveAttribute('aria-checked', 'true');
  await expect(
    page.getByTestId('ingredient-toggle').filter({ hasText: `${configured ? 300 : 250} g pasta` })
  ).toBeVisible();
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText('1');
  await reading.evaluate((element) => {
    element.scrollTop = 0;
  });
  await overlay.screenshot({
    path: info.outputPath('prepared-refreshed.png'),
    animations: 'disabled',
  });
  expect(await patch('instruction')).toBe(200);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByTestId('cooking-quantities-available')).toBeVisible();
  await expect(reading).not.toContainText('Stir gently.');
  await page.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
  await expect(reading).toContainText('Stir gently.');
  await page.getByTestId('cooks-mode-edit-step').click();
  await expect(draft).toHaveValue(
    before.recipe.instructionSections[0].steps[0].text + ' Stir gently.'
  );
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByTestId('cooking-step-uncertainty')).toHaveCount(0);
  await expect(
    page.getByText(
      'Some step amounts remain as written. Review the step or consult the original recipe.',
      { exact: true }
    )
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'View adjusted ingredients', exact: true })
  ).toHaveCount(0);
  await reading.evaluate((element) => {
    element.scrollTop = 0;
  });
  await overlay.screenshot({
    path: info.outputPath('prepared-step-corrected.png'),
    animations: 'disabled',
  });
  const after = await read();
  expect(after.day.preparation).toEqual(before.day.preparation);
  expect(after.day.occurrenceId).toBe(before.day.occurrenceId);
  expect(after.projection.targetServings).toBe(configured ? 6 : null);
  expect(after.recipe.ingredientLines.map((row: any) => row.id)).toEqual(
    before.recipe.ingredientLines.map((row: any) => row.id)
  );
  expect(after.recipe.instructionSections[0].steps[0].id).toBe(
    before.recipe.instructionSections[0].steps[0].id
  );
  expect(after.projection.instructionProjection.sections[0].steps[0].textRevision).toBe(
    after.recipe.instructionSections[0].steps[0].textRevision
  );
  expect(after.projection.contentRevision).toBe(after.recipe.contentRevision);
  await page.getByTestId('close-cooks-mode').click();
  const groceries = readGroceries
    ? await readGroceries()
    : await page.evaluate(
        async (reference) =>
          (await (await fetch(`/api/schedule?referenceWeekStartDate=${reference}`)).json()).data
            .groceryItems,
        reference
      );
  const pasta = groceries.filter((row: any) => row.normalizedKey === 'pasta');
  expect(pasta).toHaveLength(1);
  expect(pasta[0].quantity).toEqual({
    kind: 'scalar',
    value: { n: configured ? '300' : '250', d: '1' },
  });
  expect(preparationWrites).toBe(0);
  await info.attach('prepared-correction-evidence', {
    body: JSON.stringify(
      { before, corrected, after, preparationWrites, groceries, position, beforeRefresh },
      null,
      2
    ),
    contentType: 'application/json',
  });
}
