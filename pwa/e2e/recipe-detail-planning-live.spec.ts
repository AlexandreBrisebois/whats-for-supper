import { test, expect } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

test.skip(
  !process.env.RECIPE_PLANNING_API_URL,
  'Requires the isolated recipe planning PostgreSQL live host.'
);
test.use({ timezoneId: 'Asia/Tokyo' });

test('real dated detail saves through generated client and a second client preserves the winner', async ({
  page,
  browser,
  request,
  baseURL,
}) => {
  // This combined real-API journey spans multiple dates, clients and recovery stages.
  // Keep per-assertion deadlines unchanged; allow the expanded scenario to finish.
  test.setTimeout(120_000);
  const api = process.env.RECIPE_PLANNING_API_URL!;
  const headers = { 'X-Hearth-Secret': process.env.HEARTH_SECRET! };
  const member = (await (await request.get(`${api}/api/family`, { headers })).json()).data[0];
  const cookies = [
    {
      name: 'h_access',
      value: await generateSecretToken(process.env.HEARTH_SECRET!),
      url: baseURL!,
    },
    { name: 'x-family-member-id', value: member.id, url: baseURL! },
  ];
  await page.context().addCookies(cookies);
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
  await page.addInitScript(initialize, member);
  const observerContext = await browser.newContext({ baseURL });
  await observerContext.addCookies(cookies);
  await observerContext.addInitScript(initialize, member);
  const observer = await observerContext.newPage();
  try {
    const recipeId = '660e8400-e29b-41d4-a716-446655440012';
    const other = '660e8400-e29b-41d4-a716-446655440011';
    const target = `/recipes?addToDay=2&weekOffset=0&referenceWeekStartDate=2026-10-05&open=${recipeId}`;
    // Group 5: source review and explicit local Plan transition cannot assign.
    // Existing real API counter sees mutation attempts; independent schedule reads
    // retain recipe/status/grocery values. Fixture uses no household/DV content.
    const sourceRead = async (path: string) => {
      const response = await request.get(api + path, { headers });
      expect(response.ok()).toBe(true);
      return response.json();
    };
    // Toronto is still Sunday while this browser is already on Monday.
    // Earlier empty weekdays must never become an automatic recommendation.
    const automaticBefore = await sourceRead('/_test/planning/requests');
    await page.goto('/recipes?open=' + recipeId);
    const openWeeks = await Promise.all(
      Array.from({ length: 4 }, (_, offset) =>
        sourceRead('/api/schedule?weekOffset=' + offset + '&referenceWeekStartDate=2026-10-05')
      )
    );
    const eligible = openWeeks
      .flatMap((week) => week.data.days)
      .find(
        (day) =>
          day.date >= openWeeks[0].data.calendar.today &&
          day.status === 0 &&
          !day.recipe &&
          !day.nonCooking?.kind &&
          !day.removalToken
      );
    expect(eligible).toBeTruthy();
    const expectedLabel = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(eligible.date + 'T12:00:00Z'));
    await expect(page.getByTestId('action-add-to-day')).toContainText(expectedLabel);
    expect(await sourceRead('/_test/planning/requests')).toEqual(automaticBefore);
    await page.getByTestId('action-close-sheet').click();
    const sourceCountsBefore = await sourceRead('/_test/planning/requests');
    const sourceWeekBefore = (
      await sourceRead('/api/schedule?weekOffset=-1&referenceWeekStartDate=2026-10-05')
    ).data;
    const currentWeekBefore = (
      await sourceRead('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05')
    ).data;
    const sourceMutations: string[] = [];
    const recordSourceMutation = (req: import('@playwright/test').Request) => {
      if (
        new URL(req.url()).pathname.startsWith('/api/') &&
        !['GET', 'HEAD'].includes(req.method())
      )
        sourceMutations.push(req.method() + ' ' + new URL(req.url()).pathname);
    };
    page.on('request', recordSourceMutation);
    const sourceEntry = `/recipes?open=${recipeId}&reviewAmounts=true&sourceGroceryWeekOffset=-1&sourceGroceryReferenceWeekStartDate=2026-10-05`;
    for (const transition of [false, true]) {
      await page.goto(sourceEntry);
      await expect(page.getByTestId('action-begin-planning')).toBeVisible();
      await expect(page.getByTestId('action-add-to-day')).toHaveCount(0);
      await expect(page.getByTestId('recipe-ingredient-projection')).toHaveCount(0);
      if (transition) {
        await page.getByTestId('action-begin-planning').click();
        await expect(page.getByTestId('action-add-to-day')).toBeEnabled();
        await expect(page.getByTestId('action-change-day')).toBeVisible();
      }
      await page.getByTestId('action-close-sheet').click();
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === '/planner' &&
          url.searchParams.get('weekOffset') === '-1' &&
          url.searchParams.get('referenceWeekStartDate') === '2026-10-05'
      );
      expect(sourceMutations).toEqual([]);
      expect(await sourceRead('/_test/planning/requests')).toEqual(sourceCountsBefore);
      const sourceAfter = (
        await sourceRead('/api/schedule?weekOffset=-1&referenceWeekStartDate=2026-10-05')
      ).data;
      const currentAfter = (
        await sourceRead('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05')
      ).data;
      for (const key of ['days', 'groceryItems', 'groceryState']) {
        expect(sourceAfter[key]).toEqual(sourceWeekBefore[key]);
        expect(currentAfter[key]).toEqual(currentWeekBefore[key]);
      }
    }
    page.off('request', recordSourceMutation);
    await observer.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-05');
    await page.goto(target);
    const sent = page.waitForRequest(
      (r) => r.method() === 'POST' && new URL(r.url()).pathname === '/api/schedule/assign'
    );
    await page.getByTestId('action-add-to-day').click();
    const save = await sent;
    expect(save.postDataJSON()).toMatchObject({
      requireEmpty: true,
      weekOffset: 0,
      dayIndex: 2,
      recipeId,
    });
    expect(new URL(save.url()).searchParams.get('referenceWeekStartDate')).toBe('2026-10-05');
    await expect(page.getByTestId('planner-planning-confirmation')).toContainText('October 7');
    const read = async () =>
      (
        await (
          await request.get(`${api}/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05`, {
            headers,
          })
        ).json()
      ).data;
    const saved = await read();
    expect(saved.days[2]).toMatchObject({ date: '2026-10-07', recipe: { id: recipeId } });
    expect(JSON.stringify(saved.groceryItems).toLowerCase()).toContain('potato');
    console.log(
      `Persisted date=${saved.days[2].date} recipe=${recipeId} groceries=${JSON.stringify(saved.groceryItems)}`
    );
    await observer.reload();
    await expect(observer.locator('#day-card-2')).toContainText('Chain Lasagna');

    // Another member fills Thursday after detail's authoritative pre-read.
    await page.goto(target.replace('addToDay=2', 'addToDay=3'));
    let injected = false;
    await page.route('**/api/schedule/assign**', async (route) => {
      if (!injected) {
        injected = true;
        const competing = await request.post(
          `${api}/api/schedule/assign?referenceWeekStartDate=2026-10-05`,
          { headers, data: { weekOffset: 0, dayIndex: 3, recipeId: other, requireEmpty: true } }
        );
        expect(competing.ok()).toBe(true);
      }
      await route.continue();
    });
    await page.getByTestId('action-add-to-day').click();
    await expect(page.getByTestId('recipe-detail-sheet').getByRole('alert')).toContainText(
      'Your plan changed'
    );
    const conflict = await read();
    expect(conflict.days[3].recipe.id).toBe(other);
    await observer.reload();
    await expect(observer.locator('#day-card-3')).toContainText('Sunday Chicken');
    console.log(
      `Competing target=2026-10-08 winner=${other}; rejected replacement retained; groceries=${JSON.stringify(conflict.groceryItems)}`
    );

    await page.unroute('**/api/schedule/assign**');
    const counts = async () =>
      (await (await request.get(`${api}/_test/planning/requests`, { headers })).json()) as Record<
        string,
        number
      >;
    const readWeek = async (offset: number) =>
      (
        await (
          await request.get(
            `${api}/api/schedule?weekOffset=${offset}&referenceWeekStartDate=2026-10-05`,
            { headers }
          )
        ).json()
      ).data;
    const startObserver = async () => {
      await observer.goto('/welcome');
      await observer.evaluate(() => {
        const events: any[] = [];
        (window as any).__planningEvents = events;
        const stream = new EventSource('/api/stream');
        (window as any).__planningStream = stream;
        stream.addEventListener('connected', () => {
          (window as any).__planningConnected = true;
        });
        stream.addEventListener('week_updated', (event) =>
          events.push(JSON.parse((event as MessageEvent).data).schedule)
        );
      });
      await expect
        .poll(() => observer.evaluate(() => (window as any).__planningConnected))
        .toBe(true);
    };
    const openRecovery = async (index: number, offset = 1, chosen = other) => {
      await page.goto(
        `/recipes?addToDay=${index}&weekOffset=${offset}&referenceWeekStartDate=2026-10-05&open=${chosen}`
      );
      await page.getByTestId('action-add-to-day').click();
      await expect(page.getByTestId('recovery-action-next-week')).toBeVisible();
    };
    const proveObserver = async (date: string, recipe: string, offset: number, index: number) => {
      await expect
        .poll(() =>
          observer.evaluate(
            ({ date, recipe }) =>
              (window as any).__planningEvents.some((event: any) =>
                event.days.some((day: any) => day.date === date && day.recipe?.id === recipe)
              ),
            { date, recipe }
          )
        )
        .toBe(true);
      console.log(
        `Independent SSE date=${date} recipe=${recipe}; events=${JSON.stringify(await observer.evaluate(() => (window as any).__planningEvents))}`
      );
      await observer.goto(`/planner?weekOffset=${offset}&referenceWeekStartDate=2026-10-05`);
      await expect(observer.locator(`#day-card-${index}`)).toContainText(
        (await readWeek(offset)).days[index].recipe.name
      );
    };

    // Full following week spills into October 26. A rejected save retries only assignment.
    await startObserver();
    const before = await counts();
    await request.post(`${api}/_test/planning/reject-next`, { headers });
    await openRecovery(0);
    await page.getByTestId('recovery-action-next-week').click();
    await expect(page.getByTestId('recovery-retry-save')).toBeVisible();
    await expect(page.getByTestId('replacement-recovery')).toContainText('October 26');
    await page.getByTestId('recovery-retry-save').click();
    await expect(page.getByTestId('planner-planning-confirmation')).toContainText(
      'following week was full'
    );
    const after = await counts();
    expect(after.defer - (before.defer ?? 0)).toBe(1);
    expect(after.assign - (before.assign ?? 0)).toBe(2);
    expect((await readWeek(1)).days[0].recipe.id).toBe(other);
    expect((await readWeek(3)).days[0].recipe.id).toBe(recipeId);
    expect(JSON.stringify((await readWeek(3)).groceryItems).toLowerCase()).toContain('potato');
    await proveObserver('2026-10-12', other, 1, 0);

    // Real persistence, then an aborted browser response at each non-idempotent seam.
    for (const [stage, index] of [
      ['assign', 1],
      ['remove', 2],
      ['defer', 3],
      ['move', 4],
    ] as const) {
      await startObserver();
      const baseline = await counts();
      let intercepted = 0;
      const pattern =
        stage === 'remove' ? '**/api/schedule/day/*/remove**' : `**/api/schedule/${stage}**`;
      await page.route(pattern, async (route) => {
        if (intercepted++) return route.continue();
        const committed = await route.fetch();
        expect(committed.ok()).toBe(true);
        await route.abort('failed');
      });
      await openRecovery(index, 1, stage === 'defer' ? recipeId : other);
      await page
        .getByTestId(
          stage === 'defer'
            ? 'recovery-action-next-week'
            : stage === 'move'
              ? 'recovery-action-tomorrow'
              : 'recovery-action-drop'
        )
        .click();
      if (stage === 'remove') {
        await expect(page.getByTestId('recovery-retry-save')).toBeVisible();
        await page.getByTestId('recovery-retry-save').click();
      }
      if (stage === 'defer' || stage === 'move') {
        await expect(page.getByTestId('recovery-retry-check')).toBeVisible();
        await page.getByTestId('recovery-retry-check').click();
        await expect(page.getByTestId('replacement-feedback')).toContainText(
          'could not be confirmed'
        );
        await page.getByTestId('recovery-review-plan').click();
        await expect(page.getByTestId('replacement-feedback')).toContainText('unconfirmed');
        await page.getByTestId('recovery-abandon').click();
        const updated = await counts();
        expect(updated.assign ?? 0).toBe(baseline.assign ?? 0);
        const destinationOffset = stage === 'defer' ? 3 : 1;
        const destinationIndex = stage === 'defer' ? 1 : 5;
        expect((await readWeek(destinationOffset)).days[destinationIndex].recipe.id).toBe(
          stage === 'move' ? recipeId : other
        );
        await proveObserver(
          stage === 'defer' ? '2026-10-27' : '2026-10-17',
          stage === 'move' ? recipeId : other,
          destinationOffset,
          destinationIndex
        );
      } else {
        await expect(page.getByTestId('planner-planning-confirmation')).toBeVisible();
        expect((await readWeek(1)).days[index].recipe.id).toBe(other);
        const date = `2026-10-${12 + index}`;
        await proveObserver(date, other, 1, index);
      }
      const updated = await counts();
      expect(updated[stage] - (baseline[stage] ?? 0)).toBe(1);
      expect(intercepted).toBe(1);
      console.log(
        `Real lost ${stage} reply counts=${JSON.stringify(updated)}; source groceries=${JSON.stringify((await readWeek(1)).groceryItems)}; retained grocery checks=${JSON.stringify((await readWeek(1)).groceryState)}`
      );
      expect(JSON.stringify((await readWeek(1)).groceryState)).toContain('carrot');
      await page.unroute(pattern);
    }

    // A second client wins after acknowledged disposition and before replacement.
    await startObserver();
    const beforeConflict = await counts();
    let filled = false;
    await page.route('**/api/schedule/assign**', async (route) => {
      if (!filled) {
        filled = true;
        const competing = await request.post(
          `${api}/api/schedule/assign?referenceWeekStartDate=2026-10-05`,
          { headers, data: { weekOffset: 1, dayIndex: 5, recipeId, requireEmpty: true } }
        );
        expect(competing.ok()).toBe(true);
      }
      await route.continue();
    });
    await openRecovery(5);
    const acknowledged = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/schedule/defer'
    );
    await page.getByTestId('recovery-action-next-week').click();
    const disposition = (await (await acknowledged).json()).data;
    await expect(page.getByTestId('replacement-feedback')).toContainText('Your plan changed');
    expect((await readWeek(1)).days[5].recipe.id).toBe(recipeId);
    const destinationIndex =
      (new Date(disposition.scheduledDate + 'T00:00:00Z').getUTCDay() + 6) % 7;
    expect((await readWeek(disposition.scheduledWeekOffset)).days[destinationIndex].recipe.id).toBe(
      recipeId
    );
    expect((await counts()).defer - (beforeConflict.defer ?? 0)).toBe(1);
    await proveObserver('2026-10-17', recipeId, 1, 5);
    await page.getByTestId('recovery-review-plan').click();
    await page.getByTestId('recovery-abandon').click();
    await expect(page.locator('#day-card-5')).toContainText(
      (await readWeek(1)).days[5].recipe.name
    );
    console.log(
      `Second-client conflict after disposition: source winner=${recipeId}, original actual destination=${disposition.scheduledDate}, counts=${JSON.stringify(await counts())}`
    );

    await page.unroute('**/api/schedule/assign**');
    const displayDate = (date: string) =>
      new Intl.DateTimeFormat('en-CA', { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${date}T12:00:00Z`)
      );
    // Independent authoritative traversal establishes the recommendation expectation.
    const current = await readWeek(0);
    const todayIndex = (new Date(`${current.calendar.today}T00:00:00Z`).getUTCDay() + 6) % 7;
    let proposed: { offset: number; index: number; date: string } | undefined;
    for (let offset = 0; offset < 8 && !proposed; offset++) {
      const week = await readWeek(offset);
      const index = week.days.findIndex(
        (day: any, index: number) =>
          index >= (offset === 0 ? todayIndex : 0) &&
          day.status === 0 &&
          !day.recipe &&
          !day.nonCooking &&
          !day.removalToken
      );
      if (index >= 0) proposed = { offset, index, date: week.days[index].date };
    }
    expect(proposed).toBeDefined();
    const beforeProposal = await counts();
    await page.goto(`/recipes?open=${other}`);
    await expect(page.getByTestId('action-add-to-day')).toContainText(displayDate(proposed!.date));
    expect((await counts()).assign).toBe(beforeProposal.assign);
    await page.getByTestId('action-change-day').click();
    await page.getByTestId('planning-day-cancel').click();
    await expect(page.getByTestId('action-add-to-day')).toContainText(displayDate(proposed!.date));
    expect((await counts()).assign).toBe(beforeProposal.assign);
    await page.getByTestId('action-add-to-day').click();
    await expect(page.getByTestId('planner-planning-confirmation')).toContainText(
      displayDate(proposed!.date)
    );
    expect((await readWeek(proposed!.offset)).days[proposed!.index].recipe.id).toBe(other);
    expect((await counts()).assign - beforeProposal.assign).toBe(1);
    console.log(`Real recommendation persisted date=${proposed!.date} recipe=${other}`);

    // Choose a different occurrence from dated detail and retain its source context.
    const beforeAlternate = await counts();
    await page.goto(
      `/recipes?addToDay=0&weekOffset=5&referenceWeekStartDate=2026-10-05&open=${recipeId}`
    );
    await page.getByTestId('action-change-day').click();
    await expect(page.getByTestId('planning-day-2')).toContainText('November 11');
    await page.getByTestId('planning-day-2').click();
    await expect(page.getByTestId('action-add-to-day')).toContainText('November 11');
    expect((await counts()).assign).toBe(beforeAlternate.assign);
    await page.getByTestId('action-add-to-day').click();
    await expect(page.getByTestId('planner-planning-confirmation')).toContainText('November 11');
    expect((await readWeek(5)).days[2].recipe.id).toBe(recipeId);
    expect(JSON.stringify((await readWeek(5)).groceryItems).toLowerCase()).toContain('potato');
    // A captured future occurrence remains navigable after the entry reference
    // changes. Observe every API write, not just the schedule operations counted
    // by the host, during these read/navigation-only phases.
    const plannedNavigationWrites: string[] = [];
    const recordPlannedNavigationWrite = (req: import('@playwright/test').Request) => {
      if (
        new URL(req.url()).pathname.startsWith('/api/') &&
        !['GET', 'HEAD'].includes(req.method())
      )
        plannedNavigationWrites.push(`${req.method()} ${new URL(req.url()).pathname}`);
    };
    page.on('request', recordPlannedNavigationWrite);
    const plannedNavigationCounts = await counts();
    await page.locator('#day-card-2').getByTestId('edit-recipe-button').click();
    const plannerDetail = page.getByTestId('recipe-detail-sheet');
    await expect(
      plannerDetail.getByTestId('recipe-detail-toolbar').getByTestId('action-cooks-mode')
    ).toBeVisible();
    await expect(plannerDetail.getByTestId('action-cooks-mode')).toHaveCount(1);
    await expect(plannerDetail.getByTestId('action-change-day')).toHaveCount(0);
    await expect(plannerDetail.getByTestId('action-plan-another-day')).toHaveCount(0);
    await plannerDetail.getByTestId('action-cooks-mode').click();
    await expect(page.getByTestId('cooks-mode-recipe-name')).toContainText('Chain Lasagna');
    await page.getByTestId('close-cooks-mode').click();
    const plannerPlanned = plannerDetail.getByTestId('action-planned');
    await expect(plannerPlanned).toContainText('November 11');
    await expect(plannerPlanned).toHaveAttribute('aria-label', /Open Planner/);
    await plannerPlanned.click();
    await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(0);
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/planner' &&
        url.searchParams.get('weekOffset') === '5' &&
        url.searchParams.get('referenceWeekStartDate') === '2026-10-05'
    );
    await expect(page.locator('#day-card-2')).toContainText('Chain Lasagna');
    await page.goto(
      `/recipes?addToDay=2&weekOffset=4&referenceWeekStartDate=2026-10-12&open=${recipeId}`
    );
    const recipesDetail = page.getByTestId('recipe-detail-sheet');
    await expect(
      recipesDetail.getByTestId('recipe-detail-toolbar').getByTestId('action-cooks-mode')
    ).toBeVisible();
    await expect(recipesDetail.getByTestId('action-cooks-mode')).toHaveCount(1);
    await expect(recipesDetail.getByTestId('action-change-day')).toHaveCount(0);
    const recipesPlanned = recipesDetail.getByTestId('action-planned');
    await expect(recipesPlanned).toContainText('November 11');
    await recipesPlanned.click();
    await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(0);
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/planner' &&
        url.searchParams.get('weekOffset') === '4' &&
        url.searchParams.get('referenceWeekStartDate') === '2026-10-12'
    );
    await expect(page.locator('#day-card-2')).toContainText('Chain Lasagna');
    page.off('request', recordPlannedNavigationWrite);
    expect(plannedNavigationWrites).toEqual([]);
    expect(await counts()).toEqual(plannedNavigationCounts);
    expect((await counts()).assign - beforeAlternate.assign).toBe(1);
    console.log(
      `Real alternate persisted date=2026-11-11 recipe=${recipeId}; Planned from Planner and Recipes after reference rollover navigation writes=0`
    );

    // A changed source occurrence cannot keep a stale Planned claim. These are
    // explicit fixture writes after the navigation-only count has been checked.
    const priorOccurrence = (await readWeek(5)).days[2];
    const changedRemoval = await request.delete(
      `${api}/api/schedule/day/2026-11-11/remove?expectedPlanToken=${encodeURIComponent(priorOccurrence.removalToken)}`,
      { headers }
    );
    expect(changedRemoval.ok()).toBe(true);
    const changedAssignment = await request.post(
      `${api}/api/schedule/assign?referenceWeekStartDate=2026-10-05`,
      { headers, data: { weekOffset: 5, dayIndex: 2, recipeId: other, requireEmpty: true } }
    );
    expect(changedAssignment.ok()).toBe(true);
    await page.goto(
      `/recipes?addToDay=2&weekOffset=5&referenceWeekStartDate=2026-10-05&open=${recipeId}`
    );
    await expect(page.getByTestId('recipe-detail-name')).toBeVisible();
    await expect(page.getByTestId('action-planned')).toHaveCount(0);
    expect((await readWeek(5)).days[2].recipe.id).toBe(other);
    console.log(`Changed occurrence date=2026-11-11 now recipe=${other}; stale Planned hidden`);

    const nonCookingSeed = await request.post(`${api}/api/schedule/day/2026-11-12/validate`, {
      headers,
      data: { status: 3, nonCooking: { kind: 'custom', customLabel: 'Birthday dinner' } },
    });
    expect(nonCookingSeed.ok()).toBe(true);
    const originalNonCooking = (await readWeek(5)).days[3];
    const beforeConsent = await counts();
    await page.goto(
      `/recipes?addToDay=3&weekOffset=5&referenceWeekStartDate=2026-10-05&open=${recipeId}`
    );
    await page.getByTestId('action-add-to-day').click();
    await expect(page.getByTestId('non-cooking-confirmation')).toContainText('Birthday dinner');
    await page.getByTestId('non-cooking-cancel').click();
    expect((await counts()).remove).toBe(beforeConsent.remove);
    expect((await counts()).assign).toBe(beforeConsent.assign);
    expect((await readWeek(5)).days[3].removalToken).toBe(originalNonCooking.removalToken);
    await page.getByTestId('action-add-to-day').click();
    const guardedDelete = page.waitForRequest(
      (r) => r.method() === 'DELETE' && r.url().includes('/remove')
    );
    await page.getByTestId('non-cooking-confirm').click();
    expect(new URL((await guardedDelete).url()).searchParams.get('expectedPlanToken')).toBe(
      originalNonCooking.removalToken
    );
    await expect(page.getByTestId('planner-planning-confirmation')).toContainText('November 12');
    const replacedNonCooking = (await readWeek(5)).days[3];
    expect(replacedNonCooking.recipe.id).toBe(recipeId);
    expect(replacedNonCooking.nonCooking ?? null).toBeNull();
    expect((await counts()).remove - beforeConsent.remove).toBe(1);
    expect((await counts()).assign - beforeConsent.assign).toBe(1);
    await observer.goto('/planner?weekOffset=5&referenceWeekStartDate=2026-10-05');
    await expect(observer.locator('#day-card-3')).toContainText('Chain Lasagna');
    console.log(
      `Real non-cooking replacement date=2026-11-12 token captured; cancel writes=0; remove=1 assign=1; groceries=${JSON.stringify((await readWeek(5)).groceryItems)}`
    );

    // Completion is a deliberate API fixture write. Subsequent detail reading
    // and Review navigation must neither pretend the meal is an ordinary
    // uncompleted Planned occurrence nor reset its persisted status.
    const completedSeed = await request.post(`${api}/api/schedule/day/2026-11-12/validate`, {
      headers,
      data: { status: 2, recipeId },
    });
    expect(completedSeed.ok()).toBe(true);
    expect((await readWeek(5)).days[3].status).toBe(2);
    const beforeCompletedNavigation = await counts();
    const completedNavigationWrites: string[] = [];
    const recordCompletedNavigationWrite = (req: import('@playwright/test').Request) => {
      if (
        new URL(req.url()).pathname.startsWith('/api/') &&
        !['GET', 'HEAD'].includes(req.method())
      )
        completedNavigationWrites.push(`${req.method()} ${new URL(req.url()).pathname}`);
    };
    page.on('request', recordCompletedNavigationWrite);
    await page.goto(
      `/recipes?addToDay=3&weekOffset=5&referenceWeekStartDate=2026-10-05&open=${recipeId}`
    );
    const completedDetail = page.getByTestId('recipe-detail-sheet');
    await expect(
      completedDetail.getByTestId('recipe-detail-toolbar').getByTestId('action-cooks-mode')
    ).toBeVisible();
    await expect(completedDetail.getByTestId('action-planned')).toHaveCount(0);
    await expect(completedDetail.getByTestId('action-change-day')).toHaveCount(0);
    await expect(completedDetail.getByTestId('action-add-to-day')).toHaveText('Review plan');
    await completedDetail.getByTestId('action-add-to-day').click();
    await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(0);
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/planner' &&
        url.searchParams.get('weekOffset') === '5' &&
        url.searchParams.get('referenceWeekStartDate') === '2026-10-05'
    );
    await expect(page.locator('#day-card-3')).toContainText('Chain Lasagna');
    page.off('request', recordCompletedNavigationWrite);
    expect(completedNavigationWrites).toEqual([]);
    expect(await counts()).toEqual(beforeCompletedNavigation);
    expect((await readWeek(5)).days[3].status).toBe(2);
    console.log(
      'Completed occurrence date=2026-11-12 retained status 2; Review navigation writes=0'
    );
  } finally {
    await observerContext.close();
  }
});
