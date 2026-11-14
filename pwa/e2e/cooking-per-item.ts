import { expect, type Page, type TestInfo } from '@playwright/test';

/** Identical dose/count journey against stateful mocks and real API/PostgreSQL. */
export async function qualifyCookingPerItem(
  page: Page,
  id: string,
  info: TestInfo,
  readGroceries?: () => Promise<any[]>
) {
  const original = await page.evaluate(
    async (id) => (await (await fetch(`/api/recipes/${id}`)).json()).recipe,
    id
  );
  for (const phase of ['original', 'corrected', 'uncertain']) {
    if (phase !== 'original') {
      await page.getByTestId('action-gear-menu').click();
      await page.getByTestId('action-edit-recipe').click();
      if (phase === 'corrected') {
        await page.getByTestId('recipe-edit-amount-0').fill('6');
        await page.getByTestId('recipe-edit-amount-1').fill('3');
      } else await page.getByTestId('recipe-edit-unit-0').fill('g');
      const saved = page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' && new URL(r.url()).pathname === `/api/recipes/${id}`
      );
      await page.getByTestId('recipe-save-edits').click();
      const response = await saved;
      expect(response.status()).toBe(200);
      const after = (await response.json()).recipe;
      expect(after.instructionSections[0].steps.map((s: any) => [s.id, s.text])).toEqual(
        original.instructionSections[0].steps.map((s: any) => [s.id, s.text])
      );
      const bindings = after.instructionSections[0].steps[0].bindings;
      expect(bindings.map((b: any) => [b.id, b.payload])).toEqual(
        original.instructionSections[0].steps[0].bindings.map((b: any) => [b.id, b.payload])
      );
      if (phase === 'corrected')
        expect(
          bindings.every((b: any) => b.validatedContentRevision === after.contentRevision)
        ).toBe(true);
    }
    const read = page.waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        new URL(r.url()).pathname === `/api/recipes/${id}/ingredient-projection`
    );
    await page.getByTestId('action-cooks-mode').click();
    await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
    const response = await read;
    expect(response.status()).toBe(200);
    const projection = await response.json();
    expect(projection.targetServings).toBe(8);
    expect(projection.lines.map((r: any) => r.quantity)).toEqual(
      phase === 'original' ? [8, 4] : [12, 6]
    );
    expect(projection.instructionProjection.validatedUses).toBe(phase === 'uncertain' ? 0 : 2);
    expect(projection.instructionProjection.uncertainUses).toBe(phase === 'uncertain' ? 2 : 0);
    const warning = page.getByTestId('cooking-step-uncertainty');
    await expect(warning).toHaveCount(0);
    await expect(
      page.getByText(
        'Some step amounts remain as written. Review the step or consult the original recipe.',
        { exact: true }
      )
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'View adjusted ingredients', exact: true })
    ).toHaveCount(0);
    await page.getByTestId('cooking-view-step-by-step').click();
    // This single-step recipe retains its bookmark on subsequent entries.
    if (phase === 'original') await page.getByTestId('cooks-mode-step-next').click();
    const text = original.instructionSections[0].steps[0].text;
    await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
      phase === 'uncertain'
        ? text
        : text.replace('4 pieces', phase === 'original' ? '8 pieces' : '12 pieces')
    );
    await expect(page.getByTestId('cooks-mode-step-next')).toBeEnabled();
    await page
      .getByTestId('cooks-mode-overlay')
      .screenshot({ path: info.outputPath(`per-item-${phase}.png`), animations: 'disabled' });
    await page.getByTestId('cooks-mode-edit-step').click();
    await expect(page.getByRole('textbox')).toHaveValue(text);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByTestId('close-cooks-mode').click();
    const rows = readGroceries
      ? await readGroceries()
      : await page.evaluate(
          async () => (await (await fetch('/api/schedule?weekOffset=0')).json()).data.groceryItems
        );
    for (const [name, amount] of [
      ['pieces', phase === 'original' ? '8' : '12'],
      ['oil', phase === 'original' ? '4' : '6'],
    ]) {
      const matches = rows.filter((r: any) => r.normalizedKey === name);
      expect(matches).toHaveLength(1);
      expect(matches[0].quantity).toEqual({ kind: 'scalar', value: { n: amount, d: '1' } });
    }
  }
}
