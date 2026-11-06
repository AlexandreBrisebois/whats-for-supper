import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { generateSecretToken } from './auth-utils';

test.skip(
  !process.env.SUPPER_SERVINGS_API_URL,
  'Requires isolated supper-servings PostgreSQL live host.'
);
test.use({ timezoneId: 'Asia/Tokyo', viewport: { width: 390, height: 844 } });

if (process.env.SUPPER_SETTINGS_LIVE === '1') {
  test('real Settings usual portions and family membership persist through generated clients', async ({
    page,
    browser,
    request,
    baseURL,
  }, info) => {
    test.setTimeout(180_000);
    const api = process.env.SUPPER_SERVINGS_API_URL!;
    const headers = { 'X-Hearth-Secret': process.env.HEARTH_SECRET! };
    const read = async (path: string) => {
      const response = await request.get(`${api}${path}`, { headers, timeout: 15_000 });
      expect(response.ok(), path).toBe(true);
      return response.json();
    };
    const servings = async () =>
      (await read('/api/schedule/servings?weekOffset=0&referenceWeekStartDate=2026-10-12')).data;
    const schedule = async () =>
      (await read('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12')).data;
    const members = (await read('/api/family')).data;
    expect(members).toHaveLength(4);
    const cookies = [
      {
        name: 'h_access',
        value: await generateSecretToken(process.env.HEARTH_SECRET!),
        url: baseURL!,
      },
      { name: 'x-family-member-id', value: members[0].id, url: baseURL! },
    ];
    await page.context().addCookies(cookies);
    await page.addInitScript(() => localStorage.setItem('locale', 'en'));
    const other = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
    await other.addCookies(cookies);
    await other.addInitScript(() => localStorage.setItem('locale', 'en'));
    const observer = await other.newPage();
    const evidence: Record<string, unknown> = {};
    const advance = async () => {
      const response = await request.post(`${api}/_test/servings/advance`, {
        headers,
        timeout: 20_000,
      });
      expect(response.ok()).toBe(true);
      const result = await response.json();
      await expect.poll(async () => (await servings()).groceryRefresh.status).toBe('current');
      return result.processed as number;
    };
    try {
      const before = await read('/_test/servings/persisted');
      evidence.before = before;
      const initialSchedule = await schedule();
      const initialQuantity = initialSchedule.groceryItems[0].quantity;
      await observer.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-12');
      await observer.evaluate(() => {
        const state = { connected: false, weeks: [] as unknown[], groceries: [] as unknown[] };
        (window as any).__usualEvents = state;
        const stream = new EventSource('/api/stream');
        (window as any).__usualStream = stream;
        stream.addEventListener('connected', () => {
          state.connected = true;
        });
        stream.addEventListener('week_updated', (event) =>
          state.weeks.push(JSON.parse((event as MessageEvent).data))
        );
        stream.addEventListener('grocery_updated', (event) =>
          state.groceries.push(JSON.parse((event as MessageEvent).data))
        );
      });
      await expect
        .poll(() => observer.evaluate(() => (window as any).__usualEvents.connected))
        .toBe(true);
      await observer.getByTestId('grocery-tab').click();
      await page.goto('/profile/settings');
      const section = page.getByTestId('usual-portions-section');
      const automatic = section.getByTestId('usual-portions-automatic');
      const input = section.getByTestId('usual-portions-input');
      const save = section.getByTestId('save-usual-portions');
      await expect(automatic).toBeChecked();
      await expect(input).toHaveValue('4');
      expect(await servings()).toMatchObject({
        defaultServingsSource: 'family',
        defaultServings: 4,
      });
      await automatic.uncheck();
      await input.fill('5');
      const put = page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          new URL(response.url()).pathname === '/api/schedule/servings'
      );
      await save.click();
      const ack = await put;
      expect(ack.ok()).toBe(true);
      expect(ack.request().postDataJSON()).toMatchObject({ defaultServings: 5, days: [] });
      await expect(section.getByText('Saved', { exact: true })).toBeVisible();
      expect(await servings()).toMatchObject({
        defaultServingsSource: 'explicit',
        defaultServings: 5,
      });
      await expect(observer.getByTestId('grocery-portions-updating')).toBeVisible();
      expect(await advance()).toBeGreaterThan(0);
      const afterFive = await schedule();
      expect(afterFive.groceryItems[0].quantity).toBe(initialQuantity + 100);
      expect(afterFive.groceryState).toMatchObject({ pasta: false, unrelated: true });
      const pantry = observer.getByRole('button', { name: /Pantry/ });
      if ((await pantry.getAttribute('aria-expanded')) === 'false') await pantry.click();
      await expect(observer.getByTestId('grocery-item-quantity-hint')).toContainText(
        String(initialQuantity + 100)
      );
      await observer.getByTestId('grocery-item-checkbox').click();
      await expect.poll(async () => (await schedule()).groceryState.pasta).toBe(true);
      const explicitVersion = (await servings()).version;
      await page.getByTestId('add-member-trigger').click();
      await page.getByTestId('family-name-input').fill('Settings fifth member');
      await page.getByTestId('add-member-submit').click();
      await expect(page.getByTestId('family-name-input')).toHaveValue('');
      expect((await read('/api/family')).data).toHaveLength(5);
      expect(await servings()).toMatchObject({
        defaultServingsSource: 'explicit',
        defaultServings: 5,
        version: explicitVersion,
      });
      await expect(input).toHaveValue('5');
      await page.reload();
      await expect(input).toHaveValue('5');
      await expect(automatic).not.toBeChecked();
      await automatic.check();
      await save.click();
      await expect(section.getByText('Saved', { exact: true })).toBeVisible();
      const equalAutomatic = await servings();
      expect(equalAutomatic).toMatchObject({ defaultServingsSource: 'family', defaultServings: 5 });
      expect(equalAutomatic.version).not.toBe(explicitVersion);
      await advance();
      expect((await schedule()).groceryState.pasta).toBe(true);
      await page.getByTestId('add-member-trigger').click();
      await page.getByTestId('family-name-input').fill('Settings sixth member');
      await page.getByTestId('add-member-submit').click();
      await expect(page.getByTestId('family-name-input')).toHaveValue('');
      await expect(input).toHaveValue('6');
      expect(await servings()).toMatchObject({
        defaultServingsSource: 'family',
        defaultServings: 6,
      });
      await expect(observer.getByTestId('grocery-portions-updating')).toBeVisible();
      expect(await advance()).toBeGreaterThan(0);
      const finalSchedule = await schedule();
      expect(finalSchedule.groceryItems[0].quantity).toBe(initialQuantity + 200);
      expect(finalSchedule.groceryState).toMatchObject({ pasta: false, unrelated: true });
      await expect(observer.getByTestId('grocery-item-quantity-hint')).toContainText(
        String(initialQuantity + 200)
      );
      const after = await read('/_test/servings/persisted');
      const protectedDates = ['2026-10-10', '2026-10-16', '2026-10-17'];
      expect(
        after.servingSnapshots.filter((row: { date: string }) => protectedDates.includes(row.date))
      ).toEqual(before.servingSnapshots);
      expect(after.occurrences).toEqual(before.occurrences);
      expect(after.recipes).toEqual(before.recipes);
      expect(after.members).toHaveLength(6);
      expect(
        after.defaults.every(
          (setting: { value: { servings: number | null } }) => setting.value.servings === null
        )
      ).toBe(true);
      const currentServings = await servings();
      expect(currentServings.days[2].servings).toBe(6);
      expect(currentServings.days[4].servings).toBe(7);
      expect(currentServings.days[5]).toMatchObject({ servings: 6, overrideServings: 6 });
      const occurrence = finalSchedule.days[2];
      const projection = await read(
        `/api/recipes/${occurrence.recipe.id}/ingredient-projection?context=assigned&supperDate=2026-10-14&occurrenceId=${occurrence.occurrenceId}`
      );
      expect(projection).toMatchObject({
        baseServings: 2,
        targetServings: 6,
        lines: [expect.objectContaining({ quantity: 600 })],
      });
      await expect
        .poll(() => observer.evaluate(() => (window as any).__usualEvents.groceries.length))
        .toBeGreaterThan(0);
      evidence.after = after;
      evidence.servings = currentServings;
      evidence.schedule = finalSchedule;
      evidence.projection = projection;
      evidence.transport = await observer.evaluate(() => (window as any).__usualEvents);
      evidence.requests = await read('/_test/servings/requests');
      expect((evidence.requests as { save: number }).save).toBe(2);
      await writeFile(
        info.outputPath('settings-independent-live-evidence.json'),
        JSON.stringify(evidence, null, 2)
      );
      await info.attach('settings-independent-live-evidence', {
        body: JSON.stringify(evidence, null, 2),
        contentType: 'application/json',
      });
      await section.screenshot({ path: info.outputPath('settings-real-automatic-six.png') });
    } finally {
      await other.close();
    }
  });
}

test('real dated detail, cooking and groceries share inputs across two independent clients', async ({
  page,
  browser,
  request,
  baseURL,
}, info) => {
  test.setTimeout(180_000);
  page.context().setDefaultTimeout(10_000);
  const api = process.env.SUPPER_SERVINGS_API_URL!;
  const headers = { 'X-Hearth-Secret': process.env.HEARTH_SECRET! };
  const read = async (path: string) => {
    console.log(`LIVE read ${path}`);
    const response = await request.get(`${api}${path}`, { headers, timeout: 15_000 });
    console.log(`LIVE read done ${path} ${response.status()}`);
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
  const initialize = (member: { id: string }) => {
    localStorage.setItem('locale', 'en');
    localStorage.setItem(
      'family-storage',
      JSON.stringify({
        state: { selectedFamilyMemberId: member.id, familyMembers: [member], hasLoaded: true },
        version: 0,
      })
    );
  };
  await page.context().addCookies(cookies);
  await page.addInitScript(initialize, member);
  const other = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  await other.addCookies(cookies);
  await other.addInitScript(initialize, member);
  const observer = await other.newPage();
  other.setDefaultTimeout(10_000);
  const schedule = async () =>
    (await read('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12')).data;
  const evidence: Record<string, unknown> = {};
  const advance = async () => {
    console.log('LIVE advance');
    const response = await request.post(`${api}/_test/servings/advance`, {
      headers,
      timeout: 20_000,
    });
    console.log(`LIVE advance done ${response.status()}`);
    expect(response.ok()).toBe(true);
    expect((await response.json()).processed).toBeGreaterThan(0);
    return schedule();
  };
  const open = async (target: typeof page, index: number, amount: number) => {
    await target.getByTestId(`day-card-${index}`).getByTestId('edit-recipe-button').click();
    await expect(target.getByTestId('recipe-ingredient-projection')).toContainText(
      `${amount} g pasta`
    );
  };
  try {
    await observer.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-12');
    await expect(observer.getByTestId('grocery-tab')).toBeVisible();
    await observer.evaluate(() => {
      const events = { connected: false, weeks: [] as unknown[], groceries: [] as unknown[] };
      (window as any).__servingEvents = events;
      const stream = new EventSource('/api/stream');
      (window as any).__servingStream = stream;
      stream.addEventListener('connected', () => {
        events.connected = true;
      });
      stream.addEventListener('week_updated', (event) =>
        events.weeks.push(JSON.parse((event as MessageEvent).data))
      );
      stream.addEventListener('grocery_updated', (event) =>
        events.groceries.push(JSON.parse((event as MessageEvent).data))
      );
    });
    await expect
      .poll(() => observer.evaluate(() => (window as any).__servingEvents.connected))
      .toBe(true);
    // Stay in groceries before the other client saves; no REST tab-entry reread can mask SSE freshness.
    await observer.getByTestId('grocery-tab').click();
    const initialAisle = observer.getByRole('button', { name: /Pantry/ });
    if ((await initialAisle.getAttribute('aria-expanded')) === 'false') await initialAisle.click();
    await expect(observer.getByTestId('grocery-item-checkbox')).toBeVisible();
    await page.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-12');
    console.log('LIVE table');
    await page.getByTestId('at-the-table-mode').click();
    await page.getByTestId('portion-input-2026-10-14').fill('4');
    await page.getByTestId('portion-input-2026-10-16').fill('6');
    const commit = page.waitForResponse(
      (r) =>
        r.request().method() === 'PUT' && new URL(r.url()).pathname === '/api/schedule/servings'
    );
    await page.getByTestId('save-portions').click();
    const reply = await commit;
    console.log('LIVE committed');
    expect(reply.ok()).toBe(true);
    expect(reply.request().postDataJSON()).toMatchObject({
      days: [
        { date: '2026-10-14', servings: 4 },
        { date: '2026-10-16', servings: 6 },
      ],
    });
    const ack = (await reply.json()).data;
    expect(ack.groceryRefresh.status).toBe('updating');
    await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
    const pending = await read('/_test/servings/persisted');
    expect(pending.rows).toEqual(
      expect.arrayContaining([
        { date: '2026-10-14', overrideServings: 4 },
        { date: '2026-10-16', overrideServings: 6 },
      ])
    );
    expect(pending.tasks).toEqual([
      expect.objectContaining({
        processorName: 'RefreshSupperGroceries',
        status: 'Pending',
        instanceId: ack.groceryRefresh.workflowId,
      }),
    ]);
    expect(JSON.parse(pending.plans[0].groceryItems)[0].quantity).toBe(400);
    evidence.pendingDatabase = pending;
    await expect
      .poll(() =>
        observer.evaluate(
          (workflowId) =>
            (window as any).__servingEvents.weeks.some(
              (event: any) =>
                event.schedule?.groceryRefresh?.status === 'updating' &&
                event.schedule.groceryRefresh.workflowId === workflowId
            ),
          ack.groceryRefresh.workflowId
        )
      )
      .toBe(true);
    await expect(observer.getByTestId('grocery-portions-updating')).toBeVisible();
    evidence.pendingTransport = await observer.evaluate(
      () => (window as any).__servingEvents.weeks
    );
    evidence.pendingBrowserFeedback = await observer
      .getByTestId('grocery-portions-updating')
      .innerText();
    await observer.screenshot({
      path: info.outputPath('real-already-open-grocery-pending.png'),
      animations: 'disabled',
    });
    const current = await advance();
    expect(current.groceryItems[0].quantity).toBe(1000);
    expect(current.groceryState).toMatchObject({ pasta: false, unrelated: true });
    const aisle = observer.getByRole('button', { name: /Pantry/ });
    if ((await aisle.getAttribute('aria-expanded')) === 'false') await aisle.click();
    await expect(observer.getByTestId('grocery-item-quantity-hint')).toContainText('1000');
    await observer.getByTestId('grocery-item-checkbox').click();
    await expect.poll(async () => (await schedule()).groceryState.pasta).toBe(true);
    const unchanged = await request.post(`${api}/_test/servings/recompute`, { headers });
    expect(unchanged.ok()).toBe(true);
    expect((await schedule()).groceryState.pasta).toBe(true);
    evidence.initialDatabase = await read('/_test/servings/persisted');
    evidence.initialScheduleHttp = await schedule();
    await observer.getByRole('button', { name: 'Close grocery list', exact: true }).click();
    await observer.getByTestId('planner-tab').click();
    const stored = await schedule();
    const recipeId = stored.days[2].recipe.id;
    const projection = async (index: number) =>
      read(
        `/api/recipes/${recipeId}/ingredient-projection?context=assigned&supperDate=${stored.days[index].date}&occurrenceId=${stored.days[index].occurrenceId}`
      );
    evidence.initialProjectionHttp = [await projection(2), await projection(4)];
    expect((evidence.initialProjectionHttp as any[]).map((x) => x.lines[0].quantity)).toEqual([
      400, 600,
    ]);
    // Opening/reading both captured dates performs no writes and never completes a meal.
    const missingHero = await request.get(`${api}/api/recipes/${recipeId}/hero`, {
      headers,
      timeout: 15_000,
    });
    expect(missingHero.status()).toBe(404);
    evidence.unavailableHeroHttpStatus = missingHero.status();
    const beforeRead = await read('/_test/servings/requests');
    evidence.initialBrowserDisplays = [];
    for (const [index, amount, count] of [
      [2, 400, 4],
      [4, 600, 6],
    ]) {
      await open(page, index, amount);
      await expect(page.getByTestId('recipe-servings')).toHaveText(`${count} servings`);
      const detailHeading = await page.getByTestId('recipe-servings').innerText();
      await page.getByTestId('action-cooks-mode').click();
      await expect(page.getByTestId('ingredient-toggle')).toContainText(`${amount} g pasta`);
      await expect(page.getByTestId('cooks-mode-photo').locator('img')).toHaveCount(0);
      await expect(page.getByTestId('cooking-portion-context')).toContainText(`${count} portions`);
      (evidence.initialBrowserDisplays as unknown[]).push({
        date: stored.days[index].date,
        heading: detailHeading,
        ingredient: await page.getByTestId('ingredient-toggle').innerText(),
        context: await page.getByTestId('cooking-portion-context').innerText(),
      });
      await page.getByTestId('ingredient-toggle').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath(`real-${count}-ingredients.png`),
        animations: 'disabled',
      });
      await page.getByTestId('cooks-mode-step-next').click();
      await expect(
        page.getByTestId('cooks-mode-overlay').getByText('Add 200 g pasta.', { exact: true })
      ).toBeVisible();
      await expect(page.getByTestId('cooking-instruction-limitation')).toHaveCount(1);
      await page.screenshot({
        path: info.outputPath(`real-${count}-cooking.png`),
        animations: 'disabled',
      });
      await page.getByTestId('close-cooks-mode').click();
      await page.getByTestId('action-close-sheet').click();
    }
    expect(await read('/_test/servings/requests')).toEqual(beforeRead);
    // An empty future proposed week is independent of the Planner's loaded week.
    // Ordinary UI navigation + Change day, without store injection or another stream.
    const foreign = await other.newPage();
    const saveDefault = async (count: number) => {
      const baseline = (
        await read('/api/schedule/servings?weekOffset=0&referenceWeekStartDate=2026-10-12')
      ).data;
      const response = await request.put(`${api}/api/schedule/servings`, {
        headers,
        timeout: 20_000,
        data: {
          referenceWeekStartDate: '2026-10-12',
          weekOffset: 0,
          expectedVersion: baseline.version,
          defaultServings: count,
          days: [],
        },
      });
      expect(response.ok()).toBe(true);
    };
    console.log('LIVE default4');
    await saveDefault(4);
    console.log('LIVE foreign Planner');
    await foreign.goto('/planner?weekOffset=1&referenceWeekStartDate=2026-10-12');
    await foreign
      .getByTestId('day-card-2')
      .getByRole('button', { name: 'Plan supper', exact: true })
      .click();
    console.log('LIVE foreign search');
    await foreign.getByTestId('pivot-search-library').click();
    await foreign.getByTestId('recipe-search-input').fill('Unassigned pasta for two');
    await foreign.getByTestId('recipe-search-input').press('Enter');
    console.log('LIVE foreign card');
    await foreign.getByTestId('stack-card-front').click();
    await foreign.getByRole('button', { name: 'Change day', exact: true }).click();
    await foreign.getByTestId('planning-week-next').click();
    await expect(foreign.getByTestId('planning-day-2')).toContainText('October 28');
    await foreign.getByTestId('planning-day-2').click();
    await expect(foreign.getByTestId('recipe-ingredient-projection')).toContainText('400 g pasta');
    await foreign.getByTestId('action-cooks-mode').click();
    await expect(foreign.getByTestId('ingredient-toggle')).toContainText('400 g pasta');
    await saveDefault(5);
    await expect(foreign.getByTestId('cooking-quantities-available')).toBeInViewport();
    await foreign.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
    await expect(foreign.getByTestId('ingredient-toggle')).toContainText('500 g pasta');
    const candidate = (await read('/_test/servings/persisted')).recipes.find(
      (r: any) => r.id !== recipeId
    );
    const candidatePatch = await request.patch(`${api}/api/recipes/${candidate.id}`, {
      headers,
      data: { servings: 1 },
    });
    expect(candidatePatch.ok()).toBe(true);
    await expect(foreign.getByTestId('cooking-quantities-available')).toBeInViewport();
    await foreign.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
    await expect(foreign.getByTestId('ingredient-toggle')).toContainText('1,000 g pasta');
    await foreign.getByTestId('close-cooks-mode').click();
    await expect(foreign.getByTestId('recipe-ingredient-projection')).toContainText(
      '1,000 g pasta'
    );
    evidence.foreignProposedHttp = await read(
      `/api/recipes/${candidate.id}/ingredient-projection?context=proposed&supperDate=2026-10-28`
    );
    evidence.foreignProposedDatabase = await read('/_test/servings/persisted');
    expect((evidence.foreignProposedDatabase as any).rows).toHaveLength(2);
    expect((evidence.foreignProposedDatabase as any).occurrences).toHaveLength(2);
    expect((evidence.foreignProposedDatabase as any).plans).toHaveLength(1);
    expect(
      (evidence.foreignProposedDatabase as any).tasks.filter(
        (x: any) => x.processorName === 'RefreshSupperGroceries'
      )
    ).toHaveLength(1);
    expect(evidence.foreignProposedHttp).toMatchObject({
      context: 'proposed',
      supperDate: '2026-10-28',
      baseServings: 1,
      targetServings: 5,
      lines: [expect.objectContaining({ quantity: 1000 })],
    });
    await foreign.screenshot({
      path: info.outputPath('real-foreign-proposed-correction.png'),
      animations: 'disabled',
    });
    await foreign.getByTestId('action-close-sheet').click();
    await foreign.goBack();
    await expect(foreign).toHaveURL(/\/planner\?weekOffset=1&referenceWeekStartDate=2026-10-12/);
    await expect(foreign.getByTestId('day-card-2')).toContainText('21');
    await foreign.close();
    await open(page, 2, 400);
    await page.getByTestId('action-cooks-mode').click();
    if (!(await page.getByTestId('ingredient-toggle').count()))
      await page.getByRole('button', { name: 'View adjusted ingredients', exact: true }).click();
    await page.getByTestId('ingredient-toggle').click();
    await page.getByTestId('cooks-mode-step-next').click();
    if ((await page.getByTestId('cooking-view-all-steps').getAttribute('aria-pressed')) === 'false')
      await page.getByTestId('cooking-view-all-steps').click();
    await page.getByTestId('single-page-edit-step-1').click();
    await page.getByRole('textbox').fill('Keep this unsaved instruction.');
    await open(observer, 4, 600);
    // Real generated PATCH from existing original-basis editor, while the other cook remains open.
    await observer.getByTestId('action-gear-menu').click();
    await observer.getByTestId('action-edit-recipe').click();
    await expect(observer.getByTestId('recipe-detail-reading').locator('img')).toHaveCount(0);
    await expect(observer.getByTestId('hero-action-regenerate')).toBeVisible();
    await observer.getByTestId('recipe-edit-servings-input').fill('1');
    await observer.getByTestId('recipe-save-edits').click();
    await expect(observer.getByTestId('recipe-ingredient-projection')).toContainText(
      '1,200 g pasta'
    );
    await expect(page.getByTestId('cooking-quantities-available')).toBeVisible();
    await expect(page.getByTestId('cooking-portion-context')).toContainText('4 portions');
    await page.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
    await expect(page.getByRole('textbox')).toHaveValue('Keep this unsaved instruction.');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'View adjusted ingredients', exact: true }).click();
    await expect(page.getByTestId('ingredient-toggle')).toContainText('800 g pasta');
    await expect(page.getByTestId('ingredient-toggle')).toHaveAttribute('aria-checked', 'true');
    const corrected = await advance();
    expect(corrected.groceryItems[0].quantity).toBe(2000);
    expect(corrected.groceryState.pasta).toBe(false);
    evidence.correctedBasisHttp = [await projection(2), await projection(4)];
    evidence.correctedBasisDatabase = await read('/_test/servings/persisted');
    // Current text intentionally diverges from retained extraction; old numbers must disappear.
    const patch = await request.patch(`${api}/api/recipes/${recipeId}`, {
      headers,
      data: { ingredients: ['current sauce'] },
    });
    expect(patch.ok()).toBe(true);
    await expect(observer.getByTestId('recipe-ingredient-projection')).toContainText(
      'current sauce'
    );
    await expect(observer.getByTestId('recipe-ingredient-projection')).not.toContainText(/1,?200/);
    await expect(page.getByTestId('cooking-quantities-available')).toBeVisible();
    await page.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
    await expect(page.getByTestId('ingredient-toggle')).toContainText('current sauce');
    await expect(page.getByTestId('ingredient-toggle')).not.toContainText('800');
    const stale = await advance();
    expect(stale.groceryItems[0]).toMatchObject({ quantity: null, quantityComplete: false });
    evidence.staleSourceHttp = [await projection(2), await projection(4)];
    evidence.staleSourceDatabase = await read('/_test/servings/persisted');
    await page.getByTestId('close-cooks-mode').click();
    await page.getByTestId('action-close-sheet').click();
    await page.getByTestId('grocery-tab').click();
    await expect(page.getByTestId('grocery-amount-review')).toBeVisible();
    await page.screenshot({
      path: info.outputPath('real-stale-grocery.png'),
      animations: 'disabled',
    });
    // Recreate the same recipe on the same date: captured identity remains stale.
    const recreation = await request.post(`${api}/_test/servings/recreate`, { headers });
    expect(recreation.ok()).toBe(true);
    const replaced = await recreation.json();
    expect(replaced.oldId).not.toBe(replaced.newId);
    await expect(
      observer.getByText('Could not confirm ingredients for this supper.')
    ).toBeVisible();
    await expect(observer.getByTestId('recipe-ingredient-projection')).not.toContainText(
      'current sauce'
    );
    const conflict = await request.get(
      `${api}/api/recipes/${recipeId}/ingredient-projection?context=assigned&supperDate=2026-10-16&occurrenceId=${replaced.oldId}`,
      { headers }
    );
    expect(conflict.status()).toBe(409);
    evidence.recreatedOccurrenceHttp = { ...replaced, oldStatus: conflict.status() };
    await expect
      .poll(() => observer.evaluate(() => (window as any).__servingEvents.groceries.length))
      .toBeGreaterThan(0);
    evidence.transport = await observer.evaluate(() => (window as any).__servingEvents);
    evidence.finalRequests = await read('/_test/servings/requests');
    expect((evidence.finalRequests as any).save).toBe(3);
    expect(
      Object.keys(evidence.finalRequests as any).some((key) => /validate|prepare|assign/.test(key))
    ).toBe(false);
    console.log(
      `SEPARATE database, HTTP, browser assertions and raw transport evidence=${JSON.stringify(evidence)}`
    );
    await writeFile(
      info.outputPath('separate-live-evidence.json'),
      JSON.stringify(evidence, null, 2)
    );
    await info.attach('separate-live-evidence', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    });
  } catch (error) {
    for (const [index, owned] of [...page.context().pages(), ...other.pages()].entries()) {
      console.log(`LIVE failed page ${index} ${owned.url()}`);
      await owned
        .screenshot({ path: info.outputPath(`failed-owned-${index}.png`) })
        .catch(() => {});
    }
    throw error;
  } finally {
    await other.close().catch(() => {});
  }
});

if (process.env.SUPPER_RESET_LIVE === '1')
  test('real Planner reset retains Cancel and removes equal-number override with grocery convergence', async ({
    page,
    browser,
    request,
    baseURL,
  }, info) => {
    test.setTimeout(180_000);
    const api = process.env.SUPPER_SERVINGS_API_URL!;
    const headers = { 'X-Hearth-Secret': process.env.HEARTH_SECRET! };
    const read = async (path: string) => {
      const response = await request.get(`${api}${path}`, { headers });
      expect(response.ok(), path).toBe(true);
      return response.json();
    };
    const portions = async () =>
      (await read('/api/schedule/servings?weekOffset=0&referenceWeekStartDate=2026-10-12')).data;
    const persisted = () => read('/_test/servings/persisted');
    const schedule = async () =>
      (await read('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12')).data;
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
    await page.addInitScript(() => localStorage.setItem('locale', 'en'));
    const other = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
    await other.addCookies(cookies);
    const observer = await other.newPage();
    const evidence: Record<string, unknown> = {};
    const advance = async () => {
      const result = await request.post(`${api}/_test/servings/advance`, { headers });
      expect(result.ok()).toBe(true);
      await expect.poll(async () => (await portions()).groceryRefresh.status).toBe('current');
    };
    const open = page.getByTestId('at-the-table-mode');
    const done = page.getByTestId('save-portions');
    const wednesday = page.getByTestId('portion-input-2026-10-14');
    try {
      evidence.before = await persisted();
      expect((await schedule()).groceryItems[0].quantity).toBe(900);
      await observer.goto('/planner?referenceWeekStartDate=2026-10-12');
      await observer.evaluate(() => {
        const events = { connected: false, weeks: [] as unknown[], groceries: [] as unknown[] };
        (window as any).__resetEvents = events;
        const stream = new EventSource('/api/stream');
        stream.addEventListener('connected', () => {
          events.connected = true;
        });
        stream.addEventListener('week_updated', (event) =>
          events.weeks.push(JSON.parse((event as MessageEvent).data))
        );
        stream.addEventListener('grocery_updated', (event) =>
          events.groceries.push(JSON.parse((event as MessageEvent).data))
        );
      });
      await expect
        .poll(() => observer.evaluate(() => (window as any).__resetEvents.connected))
        .toBe(true);
      await observer.getByTestId('grocery-tab').click();
      await page.goto('/planner?referenceWeekStartDate=2026-10-12');
      await open.click();
      await expect(page.getByTestId('usual-portions')).toHaveCount(0);
      await page.getByTestId('reset-portions-2026-10-14').click();
      await expect(wednesday).toHaveValue('4');
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      expect((await portions()).days[2]).toMatchObject({ servings: 5, overrideServings: 5 });
      expect(await persisted()).toEqual(evidence.before);
      evidence.cancel = await persisted();
      expect((await read('/_test/servings/requests')).save ?? 0).toBe(0);
      await open.click();
      await expect(wednesday).toHaveValue('5');
      await page.getByTestId('reset-portions-2026-10-14').click();
      const write = page.waitForRequest(
        (request) =>
          request.method() === 'PUT' && new URL(request.url()).pathname === '/api/schedule/servings'
      );
      await done.click();
      const payload = (await write).postDataJSON();
      expect(payload).not.toHaveProperty('defaultServings');
      expect(payload.days).toEqual([{ date: '2026-10-14', servings: null }]);
      await expect(open).toBeVisible();
      expect((await portions()).days[2]).toMatchObject({ servings: 4, overrideServings: null });
      expect(
        (await persisted()).rows.find((row: { date: string }) => row.date === '2026-10-14')
          .overrideServings
      ).toBeNull();
      expect((await portions()).groceryRefresh.status).toBe('updating');
      await advance();
      expect((await schedule()).groceryItems[0].quantity).toBe(800);
      await expect(observer.getByTestId('grocery-portions-updating')).toHaveCount(0);
      await open.click();
      await expect(page.getByTestId('portion-input-2026-10-16')).toHaveValue('4');
      const beforeEqual = await portions();
      await page.getByTestId('reset-portions-2026-10-16').click();
      await expect(page.getByTestId('portion-row-2026-10-16').getByRole('status')).toContainText(
        'Using usual 4 portions'
      );
      await done.click();
      await expect(open).toBeVisible();
      const afterEqual = await portions();
      expect(afterEqual.days[4]).toMatchObject({ servings: 4, overrideServings: null });
      expect(afterEqual.version).not.toBe(beforeEqual.version);
      evidence.equal = await persisted();
      expect(
        (evidence.equal as any).rows.find((row: { date: string }) => row.date === '2026-10-16')
          .overrideServings
      ).toBeNull();
      await advance();
      await page.goto('/profile/settings');
      await page.getByTestId('usual-portions-input').fill('7');
      await page.getByTestId('save-usual-portions').click();
      await expect(
        page.getByTestId('usual-portions-section').getByText('Saved', { exact: true })
      ).toBeVisible();
      await expect.poll(async () => (await portions()).defaultServings).toBe(7);
      await advance();
      expect((await portions()).days[2]).toMatchObject({ servings: 7, overrideServings: null });
      expect((await portions()).days[4]).toMatchObject({ servings: 7, overrideServings: null });
      expect((await schedule()).groceryItems[0].quantity).toBe(1400);
      await expect
        .poll(() => observer.evaluate(() => (window as any).__resetEvents.groceries.length))
        .toBeGreaterThan(0);
      evidence.after = await persisted();
      evidence.transport = await observer.evaluate(() => (window as any).__resetEvents);
      evidence.requests = await read('/_test/servings/requests');
      expect((evidence.requests as any).save).toBe(3);
      await writeFile(
        info.outputPath('planner-reset-independent-live-evidence.json'),
        JSON.stringify(evidence, null, 2)
      );
    } finally {
      await other.close();
    }
  });
