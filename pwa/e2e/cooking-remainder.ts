import { expect, type Page, type TestInfo } from '@playwright/test';

/** One journey shared by mocked and actual API/PostgreSQL browser owners. */
export async function qualifyCookingRemainder(
  page: Page,
  id: string,
  info: TestInfo,
  readGroceries?: () => Promise<any[]>
) {
  const original = await page.evaluate(
    async (id) => (await (await fetch(`/api/recipes/${id}`)).json()).recipe,
    id
  );
  for (const total of ['3', '1/2']) {
    await expect(page.getByTestId('recipe-detail-name')).toBeVisible();
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-edit-recipe').click();
    await page.getByTestId('recipe-edit-amount-0').fill(total);
    const saved = page.waitForResponse(
      (r) => r.request().method() === 'PATCH' && new URL(r.url()).pathname === `/api/recipes/${id}`
    );
    await page.getByTestId('recipe-save-edits').click();
    const reply = await saved;
    expect(reply.status()).toBe(200);
    const after = (await reply.json()).recipe;
    expect(after.instructionSections[0].steps.map((s: any) => [s.id, s.text])).toEqual(
      original.instructionSections[0].steps.map((s: any) => [s.id, s.text])
    );
    const binding = after.instructionSections[0].steps[1].bindings[0];
    expect(binding.id).toBe(original.instructionSections[0].steps[1].bindings[0].id);
    expect(binding.payload).toEqual(original.instructionSections[0].steps[1].bindings[0].payload);
    expect(binding.validatedContentRevision).toBe(after.contentRevision);
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
    expect(projection.contentRevision).toBe(after.contentRevision);
    expect(projection.targetServings).toBe(8);
    expect(new URL(response.url()).searchParams.get('supperDate')).toBe(projection.supperDate);
    expect(projection.lines[0].quantity).toBe(total === '3' ? 6 : 1);
    expect(projection.instructionProjection.validatedUses).toBe(total === '3' ? 2 : 0);
    expect(projection.instructionProjection.uncertainUses).toBe(total === '3' ? 0 : 2);
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
    await page.getByTestId('cooking-view-step-by-step').click();
    if (total === '3') await page.getByTestId('cooks-mode-step-next').click();
    else {
      await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
        'Use the remaining oil; cook 20 minutes at 180 °C.'
      );
      await page.getByTestId('cooks-mode-step-prev').click();
    }
    await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
      total === '3' ? 'Heat 2 tbsp oil.' : 'Heat 1 tbsp oil.'
    );
    await page.getByTestId('cooks-mode-step-next').click();
    await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
      total === '3'
        ? 'Use the remaining (4 tbsp) oil; cook 20 minutes at 180 °C.'
        : 'Use the remaining oil; cook 20 minutes at 180 °C.'
    );
    await page.getByTestId('cooks-mode-instructions').screenshot({
      path: info.outputPath(total === '3' ? 'remaining-proved.png' : 'remaining-uncertain.png'),
      animations: 'disabled',
    });
    await page.getByTestId('cooks-mode-edit-step').click();
    await expect(page.getByRole('textbox')).toHaveValue(
      'Use the remaining oil; cook 20 minutes at 180 °C.'
    );
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByTestId('close-cooks-mode').click();
    const detail = await page.evaluate(
      async (id) => (await (await fetch(`/api/recipes/${id}`)).json()).recipe,
      id
    );
    expect(detail.contentRevision).toBe(after.contentRevision);
    expect(detail.instructionSections).toEqual(after.instructionSections);
    const rows = readGroceries
      ? await readGroceries()
      : await page.evaluate(
          async () => (await (await fetch('/api/schedule?weekOffset=0')).json()).data.groceryItems
        );
    const oils = rows.filter((row: any) => row.normalizedKey === 'oil');
    expect(oils).toHaveLength(1);
    expect(oils[0].quantity).toEqual({
      kind: 'scalar',
      value: { n: total === '3' ? '6' : '1', d: '1' },
    });
  }
}
