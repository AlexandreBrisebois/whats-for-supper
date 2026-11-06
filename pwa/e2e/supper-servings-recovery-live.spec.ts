import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { generateSecretToken } from './auth-utils';

test.skip(
  !process.env.SUPPER_SERVINGS_RECOVERY_API_URL,
  'Requires isolated real recovery API/PostgreSQL.'
);
test.use({ timezoneId: 'Asia/Tokyo', viewport: { width: 390, height: 844 } });

test('real lost portions, failed worker, checks, review acknowledgements and movement converge', async ({
  page,
  browser,
  request,
  baseURL,
}, info) => {
  test.setTimeout(240_000);
  const api = process.env.SUPPER_SERVINGS_RECOVERY_API_URL!;
  const headers = { 'X-Hearth-Secret': process.env.HEARTH_SECRET! };
  const read = async (path: string) => {
    const r = await request.get(api + path, { headers });
    expect(r.ok()).toBe(true);
    return r.json();
  };
  const control = async (name: string) => {
    const r = await request.post(`${api}/_test/recovery/${name}`, { headers });
    expect(r.ok()).toBe(true);
    return r;
  };
  const persisted = () => read('/_test/recovery/persisted');
  const schedule = async () =>
    (await read('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12')).data;
  const evidence: Record<string, any> = {};
  const member = (await read('/api/family')).data[0];
  const observerContext = await browser.newContext({
    baseURL,
    timezoneId: 'Asia/Tokyo',
    viewport: { width: 390, height: 844 },
  });
  const observer = await observerContext.newPage();
  for (const target of [page, observer]) {
    target.setDefaultTimeout(10_000);
    await target.context().addCookies([
      {
        name: 'h_access',
        value: await generateSecretToken(process.env.HEARTH_SECRET!),
        url: baseURL!,
      },
      { name: 'x-family-member-id', value: member.id, url: baseURL! },
    ]);
    await target.addInitScript((member) => {
      localStorage.setItem('locale', 'en');
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: member.id, familyMembers: [member], hasLoaded: true },
          version: 0,
        })
      );
      const events = { connected: 0, weeks: [] as any[], groceries: [] as any[] };
      (window as any).__recoveryEvents = events;
      const Original = window.EventSource;
      window.EventSource = class extends Original {
        constructor(url: string | URL, options?: EventSourceInit) {
          super(url, options);
          this.addEventListener('connected', () => events.connected++);
          this.addEventListener('week_updated', (e) =>
            events.weeks.push(JSON.parse((e as MessageEvent).data))
          );
          this.addEventListener('grocery_updated', (e) =>
            events.groceries.push(JSON.parse((e as MessageEvent).data))
          );
        }
      };
    }, member);
  }
  const events = (target: Page) => target.evaluate(() => (window as any).__recoveryEvents);
  const item = (target: Page) =>
    target.locator('[data-testid="grocery-item-checkbox"][data-item-name="pasta"]');
  const expand = async (target: Page) => {
    const aisle = target.getByRole('button', { name: /Pantry/ });
    if ((await aisle.getAttribute('aria-expanded')) === 'false') await aisle.click();
  };
  const groceries = async (target: Page) => {
    await target.getByTestId('grocery-tab').click();
    await expand(target);
  };
  const edit = async (count: number, lost = false) => {
    if (await page.getByRole('button', { name: 'Close grocery list', exact: true }).count())
      await page.getByRole('button', { name: 'Close grocery list', exact: true }).click();
    await page.getByTestId('at-the-table-mode').click();
    await page.getByTestId('portion-input-2026-10-14').fill(String(count));
    if (lost) await control('lose-count');
    const response = page.waitForResponse(
      (r) =>
        r.request().method() === 'PUT' && new URL(r.url()).pathname === '/api/schedule/servings'
    );
    await page.getByTestId('save-portions').click();
    const reply = await response;
    expect(reply.status()).toBe(lost ? 504 : 200);
    expect(reply.request().postDataJSON()).toMatchObject({
      referenceWeekStartDate: '2026-10-12',
      weekOffset: 0,
      days: [{ date: '2026-10-14', servings: count }],
    });
    if (lost) {
      await page.getByTestId('portions-review').click();
    }
    await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
    await groceries(page);
  };
  const advance = async () => {
    expect((await (await control('advance')).json()).processed).toBeGreaterThan(0);
    return schedule();
  };
  const assertQuantity = async (amount: number) => {
    for (const target of [page, observer]) {
      await expand(target);
      await expect(target.getByTestId('grocery-item-quantity-hint')).toContainText(String(amount));
      await expect(target.getByTestId('grocery-portions-updating')).toHaveCount(0);
    }
  };
  const putCountWrites = (db: any) =>
    db.writes.filter((w: any) => w.method === 'PUT' && w.path === '/api/schedule/servings');
  try {
    for (const target of [page, observer]) {
      await target.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-12');
      await groceries(target);
      await expect.poll(async () => (await events(target)).connected).toBeGreaterThan(0);
      await expect(item(target)).toHaveAttribute('aria-checked', 'true');
    }
    evidence.initialDatabase = await persisted();
    await edit(6, true);
    const pending = await persisted();
    const failedOwner = pending.plans[0].servingRefreshWorkflowId;
    expect(putCountWrites(pending)).toHaveLength(1);
    expect(pending.rows.map((r: any) => r.overrideServings)).toEqual([6, 6]);
    for (const target of [page, observer])
      await expect(target.getByTestId('grocery-portions-updating')).toBeVisible();
    await expect
      .poll(async () =>
        (await events(observer)).weeks.some(
          (e: any) =>
            e.schedule.groceryRefresh.workflowId === failedOwner &&
            e.schedule.groceryRefresh.status === 'updating'
        )
      )
      .toBe(true);
    evidence.pending = {
      database: pending,
      http: await schedule(),
      events: await events(observer),
    };
    await control('fail');
    await advance();
    const failed = await persisted();
    expect(failed.plans[0].servingRefreshStatus).toBe('failed');
    expect(failed.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instanceId: failedOwner, status: 'Failed' }),
      ])
    );
    // Already-mounted grocery views must discover the durable failure without navigation or injected publication.
    for (const target of [page, observer])
      await expect(target.getByRole('button', { name: 'Retry', exact: true })).toBeVisible({
        timeout: 15_000,
      });
    evidence.failed = {
      delivery: 'Durable failure discovered by existing Planner pending poll; no test publication',
      database: failed,
      http: await schedule(),
      events: await events(observer),
      browser: await observer.getByRole('alert').allTextContents(),
    };
    const retryResponse = observer.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        new URL(r.url()).pathname === '/api/schedule/servings/refresh'
    );
    await observer.getByRole('button', { name: 'Retry', exact: true }).click();
    const retry = await retryResponse;
    expect(retry.status()).toBe(202);
    expect(retry.request().postDataJSON()).toEqual({ weekStartDates: ['2026-10-12'] });
    const retried = await persisted();
    expect(retried.rows).toEqual(failed.rows);
    expect(retried.defaults).toEqual(failed.defaults);
    expect(putCountWrites(retried)).toHaveLength(1);
    expect(retried.plans[0].servingRefreshWorkflowId).not.toBe(failedOwner);
    expect(retried.plans[0].servingInputVersion).toBe(failed.plans[0].servingInputVersion);
    await control('restore');
    const firstCurrent = await advance();
    expect(firstCurrent.groceryItems[0].quantity).toBe(600);
    expect(firstCurrent.groceryState).toMatchObject({ pasta: false, unrelated: true });
    await assertQuantity(600);
    await expect
      .poll(async () =>
        (await events(observer)).groceries.some(
          (e: any) => e.weekStartDate === '2026-10-12' && e.groceryState.pasta === false
        )
      )
      .toBe(true);
    expect(firstCurrent.groceryRefresh).toMatchObject({
      status: 'current',
      workflowId: retried.plans[0].servingRefreshWorkflowId,
      version: retried.plans[0].servingInputVersion,
      appliedVersion: retried.plans[0].servingInputVersion,
    });
    evidence.retried = {
      database: await persisted(),
      http: firstCurrent,
      events: await events(observer),
    };
    const firstReset = firstCurrent.groceryRefresh.resetSummaryVersion;
    expect(firstReset).toBeTruthy();
    const checkReply = observer.waitForResponse(
      (r) => r.request().method() === 'PATCH' && new URL(r.url()).pathname.endsWith('/grocery/item')
    );
    await item(observer).click();
    const checked = await checkReply;
    expect(checked.status()).toBe(204);
    expect(new URL(checked.url()).searchParams.get('referenceWeekStartDate')).toBe('2026-10-12');
    expect(checked.request().postDataJSON()).toEqual({ ingredientName: 'pasta', checked: true });
    await expect(item(page)).toHaveAttribute('aria-checked', 'true');
    const completed = (await persisted()).tasks.find(
      (t: any) => t.instanceId === retried.plans[0].servingRefreshWorkflowId
    );
    await control(`replay/${completed.taskId}`);
    const replay = await advance();
    expect(replay.groceryState.pasta).toBe(true);
    expect(replay.groceryRefresh.resetSummaryVersion).toBe(firstReset);
    evidence.unchangedWorkerReplay = {
      taskId: completed.taskId,
      database: await persisted(),
      http: replay,
    };
    await edit(4);
    const lower = await advance();
    expect(lower.groceryRefresh.resetSummaryVersion).toBeNull();
    await assertQuantity(400);
    await edit(6);
    const cycle = await advance();
    expect(cycle.groceryRefresh.version).toBe(firstCurrent.groceryRefresh.version);
    expect(cycle.groceryRefresh.resetSummaryVersion).not.toBe(firstReset);
    await assertQuantity(600);
    evidence.resetCycle = { first: firstCurrent.groceryRefresh, later: cycle.groceryRefresh };
    // A real old cache with unknown prior amount becomes a current complete amount needing review.
    await control('legacy-prior');
    await edit(8);
    const reviewed = await advance();
    expect(reviewed.groceryItems[0]).toMatchObject({
      quantity: 800,
      quantityComplete: true,
      checkReviewReason: 'prior_amount_unknown',
    });
    for (const target of [page, observer])
      await expect(target.getByTestId('grocery-check-review')).toBeVisible();
    const beforeAck = await persisted();
    const beforeAckEvents = (await events(page)).groceries.length;
    // Explicit false does not acknowledge; the subsequent actual item true does.
    await item(observer).click();
    await expect.poll(async () => (await schedule()).groceryState.pasta).toBe(false);
    await item(observer).click();
    await expect.poll(async () => (await schedule()).groceryItems[0].checkReviewReason).toBeNull();
    for (const target of [page, observer])
      await expect(target.getByTestId('grocery-check-review')).toHaveCount(0);
    const acked = await persisted();
    expect(acked.rows).toEqual(beforeAck.rows);
    expect(acked.plans[0].servingInputVersion).toBe(beforeAck.plans[0].servingInputVersion);
    expect(acked.plans[0].servingRefreshWorkflowId).toBe(
      beforeAck.plans[0].servingRefreshWorkflowId
    );
    await expect
      .poll(async () => (await events(page)).groceries.length)
      .toBeGreaterThan(beforeAckEvents);
    evidence.itemReviewAck = {
      before: beforeAck,
      after: acked,
      http: await schedule(),
      events: await events(page),
    };
    // The compatible full-map operation has no current UI caller: real HTTP contract evidence only.
    await control('legacy-prior');
    await edit(10);
    await advance();
    for (const target of [page, observer])
      await expect(target.getByTestId('grocery-check-review')).toBeVisible();
    const mapBefore = await persisted();
    const map = await request.patch(
      `${api}/api/schedule/0/grocery?referenceWeekStartDate=2026-10-12`,
      { headers, data: { pasta: true, unrelated: true } }
    );
    expect(map.status()).toBe(200);
    for (const target of [page, observer])
      await expect(target.getByTestId('grocery-check-review')).toHaveCount(0);
    const mapAfter = await persisted();
    expect(mapAfter.rows).toEqual(mapBefore.rows);
    expect(mapAfter.plans[0].servingRefreshWorkflowId).toBe(
      mapBefore.plans[0].servingRefreshWorkflowId
    );
    evidence.fullMapHttpAck = {
      before: mapBefore,
      after: mapAfter,
      response: await map.json(),
      http: await schedule(),
    };
    // Hold the actual shopper PATCH while a count save and registered worker refresh complete.
    await control('hold-check');
    const checkPending = item(observer).click();
    await expect.poll(async () => read('/_test/recovery/check-entered')).toBe(true);
    await edit(4);
    const overlapped = await advance();
    expect(overlapped.groceryItems[0].quantity).toBe(400);
    await control('release-check');
    await checkPending;
    await expect.poll(async () => (await schedule()).groceryState.pasta).toBe(false);
    // A later explicit shopper check survives a completed-task replay.
    await item(observer).click();
    await expect.poll(async () => (await schedule()).groceryState.pasta).toBe(true);
    const overlapDb = await persisted();
    const overlapTask = overlapDb.tasks.find(
      (t: any) => t.instanceId === overlapDb.plans[0].servingRefreshWorkflowId
    );
    await control(`replay/${overlapTask.taskId}`);
    await advance();
    expect((await schedule()).groceryState.pasta).toBe(true);
    evidence.overlap = { database: await persisted(), http: await schedule() };
    // Real generated move through Planner keyboard interaction; dated rows never travel.
    await page.getByRole('button', { name: 'Close grocery list', exact: true }).click();
    const beforeMove = await persisted();
    const handle = page.getByTestId('day-card-2').getByTestId('planner-drag-handle');
    await handle.focus();
    const movedResponse = page.waitForResponse(
      (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/schedule/move'
    );
    await page.keyboard.press('ArrowDown');
    const moved = await movedResponse;
    expect(moved.ok()).toBe(true);
    await expect(page.getByTestId('day-card-3')).toContainText('Recovery pasta');
    await expect(observer.getByTestId('grocery-item-quantity-hint')).toContainText('600');
    const afterMove = await persisted();
    expect(afterMove.rows).toEqual(beforeMove.rows);
    expect(afterMove.occurrences).toHaveLength(1);
    expect(afterMove.occurrences[0]).toMatchObject({
      id: beforeMove.occurrences[0].id,
      date: '2026-10-15',
      voteCount: 7,
    });
    expect((await schedule()).groceryState).toMatchObject({ pasta: false, unrelated: true });
    expect(afterMove.extras).toEqual(evidence.initialDatabase.extras);
    expect(afterMove.recipes).toEqual(evidence.initialDatabase.recipes);
    expect(afterMove.writes.filter((w: any) => w.path === '/api/schedule/move')).toHaveLength(1);
    expect(putCountWrites(afterMove)).toHaveLength(6);
    expect(afterMove.writes.filter((w: any) => /assign|defer|remove/.test(w.path))).toHaveLength(0);
    evidence.movement = {
      request: moved.request().postDataJSON(),
      database: afterMove,
      http: await schedule(),
      events: await events(observer),
    };
    const transport = await events(observer);
    expect(transport.weeks.length).toBeGreaterThan(0);
    expect(transport.groceries.length).toBeGreaterThan(0);
    for (const event of transport.weeks) {
      expect(event).toHaveProperty('schedule');
      expect(event).not.toHaveProperty('Schedule');
      expect(event.schedule).toHaveProperty('groceryRefresh');
    }
    await observer.screenshot({
      path: info.outputPath('real-recovery-final-groceries.png'),
      animations: 'disabled',
    });
    await writeFile(
      info.outputPath('recovery-separate-evidence.json'),
      JSON.stringify(evidence, null, 2)
    );
    await info.attach('recovery-separate-evidence', {
      body: JSON.stringify(evidence),
      contentType: 'application/json',
    });
  } catch (error) {
    await writeFile(
      info.outputPath('recovery-diagnostic-evidence.json'),
      JSON.stringify(
        {
          ...evidence,
          databaseAtFailure: await persisted().catch(() => null),
          transportAtFailure: await events(observer).catch(() => null),
        },
        null,
        2
      )
    );
    for (const [i, target] of [page, observer].entries())
      await target
        .screenshot({ path: info.outputPath(`recovery-failure-${i}.png`) })
        .catch(() => {});
    throw error;
  } finally {
    await control('release-check').catch(() => {});
    await observerContext.close();
  }
});
