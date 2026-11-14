import { test, expect } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

test.skip(!process.env.SUPPER_SERVINGS_API_URL, 'Requires isolated PostgreSQL/API grocery host.');
test('real source reads preserve checks and follow an independent grocery-only refresh', async ({
  page,
  browser,
  request,
  baseURL,
}, testInfo) => {
  test.setTimeout(120_000);
  const api = process.env.SUPPER_SERVINGS_API_URL!;
  const headers = { 'X-Hearth-Secret': process.env.HEARTH_SECRET! };
  const read = async (path: string) => {
    const response = await request.get(api + path, { headers });
    expect(response.ok()).toBe(true);
    return response.json();
  };
  const member = (await read('/api/family')).data[0];
  const cookies = [
    {
      name: 'h_access',
      value: await generateSecretToken(process.env.HEARTH_SECRET!),
      url: baseURL!,
    },
    { name: 'x-family-member-id', value: member.id, url: baseURL! },
  ];
  await page.context().addCookies(cookies);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((member) => {
    localStorage.setItem('locale', 'en');
    localStorage.setItem(
      'family-storage',
      JSON.stringify({
        state: { selectedFamilyMemberId: member.id, familyMembers: [member], hasLoaded: true },
        version: 0,
      })
    );
  }, member);
  const other = await browser.newContext({ baseURL });
  await other.addCookies(cookies);
  const schedulePath = '/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12';
  const expandPantry = async () => {
    const aisle = page.getByTestId('aisle-section-Pantry').locator('button').first();
    if ((await aisle.getAttribute('aria-expanded')) === 'false') await aisle.click();
  };
  try {
    await page.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-12');
    await page.getByTestId('grocery-tab').click();
    const section = page.getByTestId('aisle-section-Pantry').locator('button').first();
    if ((await section.getAttribute('aria-expanded')) === 'false') await section.click();
    const before = await read('/_test/servings/persisted');
    await expect(page.getByTestId('grocery-check-review')).toBeVisible();
    await expect(page.getByText(/600.*known/)).toHaveCount(0);
    await page.getByTestId('grocery-recipe-sources-toggle').click();
    await expect(
      page.getByRole('link', { name: 'Original pasta for two', exact: true })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Lunch-only source', exact: true })).toBeVisible();
    expect(await read('/_test/servings/persisted')).toEqual(before);
    // Original consultation and local Plan transition preserve every independently
    // inspected persisted value. Assignment remains a separate dated activation.
    const originalSource = page.getByRole('link', { name: 'Original pasta for two', exact: true });
    const sourceHref = (await originalSource.getAttribute('href'))!;
    const sourceId = new URL(sourceHref, baseURL!).searchParams.get('open')!;
    const recipeBeforeNotes = (await read(`/api/recipes/${sourceId}`)).recipe;
    const readCounts = () => read('/_test/servings/requests');
    const beforeCounts = await readCounts();
    for (const transition of [false, true]) {
      await originalSource.click();
      await expect(page.getByTestId('action-begin-planning')).toBeVisible();
      await expect(page.getByTestId('action-add-to-day')).toHaveCount(0);
      await expect(page.getByTestId('recipe-ingredient-projection')).toHaveCount(0);
      await expect(page.getByText('200 g pasta', { exact: true })).toBeVisible();
      if (transition) {
        await page.getByTestId('action-begin-planning').click();
        await expect(page.getByTestId('action-add-to-day')).toBeEnabled();
        await expect(page.getByTestId('action-change-day')).toBeVisible();
        await page.getByRole('button', { name: 'Original quantities', exact: true }).click();
        await expect(page.getByText('200 g pasta', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Planned quantities', exact: true }).click();
      }
      expect(await readCounts()).toEqual(beforeCounts);
      expect(await read('/_test/servings/persisted')).toEqual(before);
      await page.getByTestId('action-close-sheet').click();
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === '/planner' &&
          url.searchParams.get('weekOffset') === '0' &&
          url.searchParams.get('referenceWeekStartDate') === '2026-10-12'
      );
      await expect(page.getByTestId('grocery-check-review')).toBeVisible();
      expect(await readCounts()).toEqual(beforeCounts);
      expect(await read('/_test/servings/persisted')).toEqual(before);
      await expandPantry();
      const book = page.getByTestId('grocery-recipe-sources-toggle');
      if ((await book.getAttribute('aria-expanded')) === 'false') await book.click();
    }
    // Real notes store -> generated PATCH -> API -> independent GET, including
    // newer text flushed on close rather than waiting for the debounce timer.
    await originalSource.click();
    const notes = page.getByTestId('recipe-notes-input');
    await notes.scrollIntoViewIfNeeded();
    await notes.fill('Live note acknowledged through generated client');
    await expect(page.getByTestId('recipe-notes-saved')).toBeVisible();
    expect((await read(`/api/recipes/${sourceId}`)).recipe.notes).toBe(
      'Live note acknowledged through generated client'
    );
    await notes.fill('Newer live note flushed on close');
    await page.getByTestId('action-close-sheet').click();
    await expect
      .poll(async () => (await read(`/api/recipes/${sourceId}`)).recipe.notes)
      .toBe('Newer live note flushed on close');
    await expandPantry();
    const sourceBook = page.getByTestId('grocery-recipe-sources-toggle');
    if ((await sourceBook.getAttribute('aria-expanded')) === 'false') await sourceBook.click();
    await originalSource.click();
    await expect(page.getByTestId('recipe-notes-input')).toHaveValue(
      'Newer live note flushed on close'
    );
    await page.getByTestId('action-close-sheet').click();
    await expandPantry();
    const afterNotesBook = page.getByTestId('grocery-recipe-sources-toggle');
    if ((await afterNotesBook.getAttribute('aria-expanded')) === 'false')
      await afterNotesBook.click();
    const persistedAfterNotes = await read('/_test/servings/persisted');
    const {
      recipes: beforeRecipes,
      tasks: beforeTasks,
      workflows: beforeWorkflows,
      ...beforeOther
    } = before;
    const {
      recipes: afterRecipes,
      tasks: afterTasks,
      workflows: afterWorkflows,
      ...afterOther
    } = persistedAfterNotes;
    // Notes updates change physical row order and enqueue the existing search
    // index obligation. Neither effect belongs to source consultation/Plan.
    expect(afterOther).toEqual(beforeOther);
    const sortRecipes = (recipes: Array<{ id: string }>) =>
      [...recipes].sort((a, b) => a.id.localeCompare(b.id));
    expect(sortRecipes(afterRecipes)).toEqual(sortRecipes(beforeRecipes));
    const newWorkflows = afterWorkflows.filter(
      (workflow: { id: string }) =>
        !beforeWorkflows.some((old: { id: string }) => old.id === workflow.id)
    );
    expect(newWorkflows).toHaveLength(2);
    expect(afterWorkflows).toHaveLength(beforeWorkflows.length + 2);
    const fingerprints = new Set<string>();
    for (const workflow of newWorkflows) {
      expect(workflow.workflowId).toBe('index-recipe-search');
      const parameters = JSON.parse(workflow.parameters);
      expect(parameters.recipeId).toBe(sourceId);
      expect(parameters.fingerprint).toEqual(expect.any(String));
      expect(parameters.fingerprint.length).toBeGreaterThan(0);
      fingerprints.add(parameters.fingerprint);
      const tasks = afterTasks.filter(
        (task: { instanceId: string }) => task.instanceId === workflow.id
      );
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({ processorName: 'Mock', status: 'Pending' });
    }
    expect(fingerprints.size).toBe(2);
    expect(afterTasks).toHaveLength(beforeTasks.length + 2);
    for (const old of beforeTasks) expect(afterTasks).toContainEqual(old);
    const recipeAfterNotes = (await read(`/api/recipes/${sourceId}`)).recipe;
    const { notes: previousNote, ...recipeFieldsBefore } = recipeBeforeNotes;
    const { notes: savedNote, ...recipeFieldsAfter } = recipeAfterNotes;
    expect(previousNote).toBe('Keep the original pasta instructions.');
    expect(savedNote).toBe('Newer live note flushed on close');
    expect(recipeFieldsAfter).toEqual(recipeFieldsBefore);
    await testInfo.attach('independent source review and notes persistence', {
      body: JSON.stringify({
        before,
        afterIntentionalNotes: persistedAfterNotes,
        expectedNotesSearchWorkflows: newWorkflows,
        noWriteCounts: beforeCounts,
        savedNotes: (await read(`/api/recipes/${sourceId}`)).recipe.notes,
      }),
      contentType: 'application/json',
    });
    // A separate client adds another lunch in the disposable fixture. The real
    // recomputation publishes grocery_updated; no direct browser-store injection.
    const added = await other.request.post('/_test/servings/add-grocery-source', { headers });
    expect(added.ok()).toBe(true);
    await expect(
      page.getByRole('link', { name: 'New live lunch source', exact: true })
    ).toBeVisible();
    const afterAddition = await read('/_test/servings/persisted');
    await page.getByTestId('grocery-recipe-sources-toggle').click();
    await page.getByTestId('grocery-recipe-sources-toggle').click();
    await expect(
      page.getByRole('link', { name: 'New live lunch source', exact: true })
    ).toBeVisible();
    expect(await read('/_test/servings/persisted')).toEqual(afterAddition);
    const current = (await read(schedulePath)).data;
    expect(current.groceryItems[0].checkReviewReason).toBe('prior_amount_unknown');
    expect(current.groceryState.pasta).toBe(false);
    await page.getByTestId('grocery-item-checkbox').click();
    await expect
      .poll(async () => (await read(schedulePath)).data.groceryItems[0].checkReviewReason ?? null)
      .toBeNull();
    expect((await read(schedulePath)).data.groceryState.pasta).toBe(true);
    // Hold an actual recipe GET response across week departure, without changing
    // its contents. The retired disclosure must not publish into the next week.
    const lunchHref = await page
      .getByRole('link', { name: 'Lunch-only source', exact: true })
      .getAttribute('href');
    const lunchId = new URL(lunchHref!, baseURL!).searchParams.get('open')!;
    await page.getByRole('button', { name: 'Close grocery list', exact: true }).click();
    await page.getByTestId('next-week').click();
    await expect(page).toHaveURL(/weekOffset=1/);
    await page.getByTestId('prev-week').click();
    await expect(page).toHaveURL(
      (url) =>
        !url.searchParams.has('weekOffset') &&
        url.searchParams.get('referenceWeekStartDate') === '2026-10-12'
    );
    let release!: () => void;
    let started!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requested = new Promise<void>((resolve) => {
      started = resolve;
    });
    await page.route(`**/api/recipes/${lunchId}`, async (route) => {
      const response = await route.fetch();
      started();
      await held;
      await route.fulfill({ response });
    });
    await page.getByTestId('grocery-tab').click();
    const reopenedSection = page.getByTestId('aisle-section-Pantry').locator('button').first();
    if ((await reopenedSection.getAttribute('aria-expanded')) === 'false')
      await reopenedSection.click();
    await page.getByTestId('grocery-recipe-sources-toggle').click();
    await Promise.race([
      requested,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Held recipe GET did not start')), 10_000)
      ),
    ]);
    await page.getByRole('button', { name: 'Close grocery list', exact: true }).click();
    await page.getByTestId('next-week').click();
    await expect(page).toHaveURL(/weekOffset=1/);
    release();
    await page.getByTestId('grocery-tab').click();
    await expect(page.getByRole('link', { name: 'Lunch-only source', exact: true })).toHaveCount(0);
    expect((await read(schedulePath)).data.groceryState.pasta).toBe(true);
  } finally {
    await other.close();
  }
});
