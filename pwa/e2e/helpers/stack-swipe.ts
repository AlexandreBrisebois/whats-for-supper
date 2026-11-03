import { expect, type Page } from '@playwright/test';

/** Exercise the card's existing gesture instead of the removed visible button row. */
export async function swipeCurrentStackCard(page: Page, direction: 'left' | 'right') {
  const front = page.getByTestId('stack-card-front');
  await expect(front).toHaveCount(1);
  const previousId = await front.getAttribute('data-recipe-id');
  await front.click({ trial: true });
  const box = await front.boundingBox();
  if (!box) throw new Error('Front stack card has no measurable box');
  const startX = box.x + box.width / 2;
  const startY = box.y + Math.min(box.height / 2, 170);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + (direction === 'left' ? -180 : 180), startY, { steps: 8 });
  await page.mouse.up();
  // AnimatePresence briefly keeps the departing card mounted as another
  // "front". Wait for both the collection advance and its exit to finish.
  await expect
    .poll(
      async () => {
        const ids = await front.evaluateAll((cards) =>
          cards.map((card) => card.getAttribute('data-recipe-id'))
        );
        return ids.length === 1 && ids[0] !== previousId;
      },
      { timeout: 15_000 }
    )
    .toBe(true);
}
