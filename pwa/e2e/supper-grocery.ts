import { expect, type Page } from '@playwright/test';

export function groceryChecked(schedule: any, name = 'pasta') {
  const row = schedule.groceryItems.find((item: any) => item.normalizedKey === name);
  if (!row) throw new Error(`Missing fixture grocery row: ${name}`);
  return schedule.groceryState[row.rowId];
}

/** Capture the current row guard before a test-owned shopping write. */
export async function checkGrocery(
  page: Page,
  checked = true,
  name = 'pasta',
  weekOffset = 0,
  reference = '2026-05-04'
) {
  const status = await page.evaluate(
    async ({ checked, name, weekOffset, reference }) => {
      const schedule = (
        await (
          await fetch(`/api/schedule?weekOffset=${weekOffset}&referenceWeekStartDate=${reference}`)
        ).json()
      ).data;
      const row = schedule.groceryItems.find((item: any) => item.normalizedKey === name);
      if (!row) throw new Error(`Missing fixture grocery row: ${name}`);
      return (
        await fetch(
          `/api/schedule/${weekOffset}/grocery/item?referenceWeekStartDate=${reference}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rowId: row.rowId,
              weekStartDate: schedule.weekStartDate,
              expectedRowVersion: row.rowVersion,
              checked,
              clientMutationId: crypto.randomUUID(),
            }),
          }
        )
      ).status;
    },
    { checked, name, weekOffset, reference }
  );
  expect(status).toBe(200);
}

export async function checkedExtra(page: Page, weekStartDate = '2026-05-04') {
  const status = await page.evaluate(async (weekStartDate) => {
    const response = await fetch('/api/grocery-extras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'unrelated', clientId: crypto.randomUUID(), weekStartDate }),
    });
    if (response.status !== 201) throw new Error('Could not seed unrelated extra');
    const extra = await response.json();
    return (
      await fetch(`/api/grocery-extras/${extra.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: true, expectedVersion: extra.version, weekStartDate }),
      })
    ).status;
  }, weekStartDate);
  expect(status).toBe(200);
}
