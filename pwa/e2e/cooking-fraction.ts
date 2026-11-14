import { expect, type Page, type TestInfo } from '@playwright/test';

/** Shared mocked and actual generated-client/API/PostgreSQL acceptance. */
export async function qualifyCookingFraction(page: Page, id: string, info: TestInfo) {
  await expect(page.getByTestId('recipe-detail-name')).toBeVisible();
  const before = await page.evaluate(
    async (id) => (await (await fetch(`/api/recipes/${id}`)).json()).recipe,
    id
  );
  await page.getByTestId('action-gear-menu').click();
  await page.getByTestId('action-edit-recipe').click();
  await expect(page.getByTestId('recipe-edit-amount-0')).toHaveValue('200');
  await page.getByTestId('recipe-edit-amount-0').fill('250');
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname === `/api/recipes/${id}`
  );
  await page.getByTestId('recipe-save-edits').click();
  const reply = await saved;
  expect(reply.status()).toBe(200);
  const after = (await reply.json()).recipe;
  expect(after.instructionSections[0].steps.map((s: any) => [s.id, s.text])).toEqual(
    before.instructionSections[0].steps.map((s: any) => [s.id, s.text])
  );
  const half = after.instructionSections[0].steps[1].bindings[0];
  expect(half.id).toBe(before.instructionSections[0].steps[1].bindings[0].id);
  expect(half.payload.fraction).toEqual({ n: '1', d: '2' });
  expect(half.validatedContentRevision).toBe(after.contentRevision);
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('375 g pasta');
  const cookingRead = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/recipes/${id}/ingredient-projection`
  );
  await page.getByTestId('action-cooks-mode').click();
  await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
  await expect(
    page.getByTestId('ingredient-toggle').filter({ hasText: '375 g pasta' })
  ).toBeVisible();
  const guidance = page.getByTestId('cooking-step-uncertainty');
  await expect(guidance).toHaveCount(0);
  await expect(
    page.getByText(
      'Some step amounts remain as written. Review the step or consult the original recipe.',
      { exact: true }
    )
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'View adjusted ingredients', exact: true })
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Refresh quantities', exact: true })).toHaveCount(
    0
  );
  await page.getByTestId('cooking-view-step-by-step').click();
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
    'Add 75 g pasta from a 400 g package; cook 20 minutes at 180 °C.'
  );
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
    'Add half the pasta; cook 20 minutes at 180 °C.'
  );
  await page
    .getByTestId('cooks-mode-instructions')
    .screenshot({ path: info.outputPath('relative-half.png'), animations: 'disabled' });
  await page.getByTestId('cooks-mode-edit-step').click();
  await expect(page.getByRole('textbox')).toHaveValue(
    'Add half the pasta; cook 20 minutes at 180 °C.'
  );
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  for (const text of [
    'Keep half the pasta aside.',
    'Reserve half the pasta.',
    'Use half or half the pasta.',
  ]) {
    await page.getByTestId('cooks-mode-step-next').click();
    await expect(page.getByTestId('cooks-mode-instructions')).toContainText(text);
    await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
  }
  await page
    .getByTestId('cooks-mode-instructions')
    .screenshot({ path: info.outputPath('uncertain-half.png'), animations: 'disabled' });
  const response = await cookingRead;
  expect(response.status()).toBe(200);
  const projection = await response.json();
  expect(projection.contentRevision).toBe(after.contentRevision);
  expect(projection.targetServings).toBe(6);
  expect(new URL(response.url()).searchParams.get('supperDate')).toBe(projection.supperDate);
  expect(projection.instructionProjection.validatedUses).toBe(2);
  expect(projection.instructionProjection.uncertainUses).toBe(3);
  expect(projection.lines[0].quantity).toBe(375);
  const detail = await page.evaluate(
    async (id) => (await (await fetch(`/api/recipes/${id}`)).json()).recipe,
    id
  );
  expect(detail.contentRevision).toBe(after.contentRevision);
  expect(detail.instructionSections).toEqual(after.instructionSections);
}
