import { test, expect } from './fixtures';
import { setupCommonRoutes, MOCK_IDS, builders, mockSseWithConnectedSchedule } from './mock-api';

test('exact recovery mock restores saved membership and rejects an unknown snapshot', async ({
  page,
}) => {
  await setupCommonRoutes(page);
  await page.goto('/welcome');
  const result = await page.evaluate(async (unknownId) => {
    const capture = await fetch('/api/management/recovery/snapshots', { method: 'POST' });
    if (capture.status !== 200) return { capture: capture.status };
    const saved = await capture.json();
    const created = await fetch('/api/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'After snapshot' }),
    });
    const before = await (await fetch('/api/family')).json();
    const restore = await fetch(`/api/management/recovery/restore/${saved.snapshotId}`, {
      method: 'POST',
    });
    const after = await (await fetch('/api/family')).json();
    const unknown = await fetch(`/api/management/recovery/restore/${unknownId}`, {
      method: 'POST',
    });
    const status = await (await fetch('/api/management/recovery/status')).json();
    return {
      capture: capture.status,
      created: created.status,
      before: before.data.map((m: { name: string }) => m.name),
      restore: restore.status,
      after: after.data.map((m: { name: string }) => m.name),
      unknown: unknown.status,
      status,
    };
  }, MOCK_IDS.RECIPE_TACOS);
  expect(result.capture).toBe(200);
  expect(result.created).toBe(201);
  expect(result.before).toContain('After snapshot');
  expect(result.restore).toBe(200);
  expect(result.after).not.toContain('After snapshot');
  expect(result.unknown).toBe(400);
  expect(result.status.state).toBe('available');
});

test('online snapshot coordination keeps reads available and returns retryable busy responses', async ({
  page,
}) => {
  await setupCommonRoutes(page, undefined, { busy: true });
  await page.goto('/welcome');
  const result = await page.evaluate(async () => {
    const read = await fetch('/api/family');
    const write = await fetch('/api/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Do not create' }),
    });
    const snapshot = await fetch('/api/management/recovery/snapshots', { method: 'POST' });
    return {
      read: read.status,
      write: write.status,
      retry: write.headers.get('Retry-After'),
      snapshot: snapshot.status,
    };
  });
  expect(result).toEqual({ read: 200, write: 503, retry: '5', snapshot: 409 });
});

test('restore preflight is read-only and a changed destination rejects replacement until refreshed', async ({
  page,
}) => {
  let revision = 'a'.repeat(64);
  await setupCommonRoutes(page, undefined, {
    recoveryRequiresExpectedDestinationRevision: true,
    recoveryDestination: () => ({
      version: 1,
      revision,
      generation: null,
      membershipSha256: 'b'.repeat(64),
      overridesSha256: 'c'.repeat(64),
      historySha256: 'd'.repeat(64),
      documents: [{ revision: 'fixture.destination', sha256: 'f'.repeat(64) }],
    }),
  });
  await page.goto('/welcome');
  const original = await page.evaluate(async () => {
    const saved = await (
      await fetch('/api/management/recovery/snapshots', { method: 'POST' })
    ).json();
    await fetch('/api/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Later protected member' }),
    });
    const preflight = await (
      await fetch(`/api/management/recovery/restore/${saved.snapshotId}/preflight`)
    ).json();
    const members = (await (await fetch('/api/family')).json()).data;
    return {
      snapshotId: saved.snapshotId,
      preflight,
      names: members.map((member: { name: string }) => member.name),
    };
  });
  expect(original.names).toContain('Later protected member');
  expect(original.preflight.destination.revision).toBe(revision);
  expect(original.preflight.requiresExpectedDestinationRevision).toBe(true);
  revision = 'e'.repeat(64);
  const outcome = await page.evaluate(
    async ({ snapshotId, oldRevision }) => {
      const path = `/api/management/recovery/restore/${snapshotId}`;
      const post = (expectedDestinationRevision: string) =>
        fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedDestinationRevision }),
        });
      const stale = await post(oldRevision);
      const before = (await (await fetch('/api/family')).json()).data;
      const fresh = await (await fetch(`${path}/preflight`)).json();
      const accepted = await post(fresh.destination.revision);
      const after = (await (await fetch('/api/family')).json()).data;
      return {
        stale: stale.status,
        staleBody: await stale.json(),
        before: before.map((member: { name: string }) => member.name),
        accepted: accepted.status,
        after: after.map((member: { name: string }) => member.name),
      };
    },
    { snapshotId: original.snapshotId, oldRevision: original.preflight.destination.revision }
  );
  expect(outcome.stale).toBe(409);
  expect(outcome.staleBody.state).toBe('destination-conflict');
  expect(outcome.before).toEqual(original.names);
  expect(outcome.accepted).toBe(200);
  expect(outcome.after).not.toContain('Later protected member');
});

test('a refused pre-restore grocery check refreshes the generation before a deliberate new check', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { groceryRows: initialRows } = await setupCommonRoutes(page);
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
  const schedule = {
    ...builders.scheduleDays(),
    groceryItems: builders.groceryItems(['Onion']),
    presentationVersion: '9',
  };
  initialRows.decorate(schedule);
  const week = schedule.weekStartDate;
  const row = initialRows.snapshot(week).groceryItems[0];
  const oldEpoch = initialRows.snapshot(week).presentationEpoch;
  for (let index = 0; index < 8; index++) {
    expect(
      initialRows.mutate(week, 'item', {
        rowId: row.rowId,
        expectedRowVersion: '1',
        weekStartDate: week,
        checked: false,
        clientMutationId: `09000000-0000-4000-8000-${String(index + 20).padStart(12, '0')}`,
        expectedPresentationEpoch: oldEpoch,
      }).status
    ).toBe(200);
  }
  let restored = false;
  let freshReads = 0;
  const writes: Record<string, unknown>[] = [];
  await page.route(
    (url) => url.pathname === '/api/schedule',
    (route) => {
      if (restored) freshReads++;
      return route.fulfill({ json: { data: { ...schedule, ...initialRows.snapshot(week) } } });
    }
  );
  page.on('request', (request) => {
    if (request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/grocery/item'))
      writes.push(request.postDataJSON());
  });
  await mockSseWithConnectedSchedule(page, { ...schedule, ...initialRows.snapshot(week) } as any);
  await page.goto('/planner?tab=grocery');
  await page.getByTestId('grocery-tab').click();
  const checkbox = page.getByTestId('grocery-item-checkbox');
  await expect(checkbox).toHaveCount(1);
  const restoreStatus = await page.evaluate(async () => {
    const saved = await (
      await fetch('/api/management/recovery/snapshots', { method: 'POST' })
    ).json();
    return (await fetch(`/api/management/recovery/restore/${saved.snapshotId}`, { method: 'POST' }))
      .status;
  });
  expect(restoreStatus).toBe(200);
  restored = true;
  const newEpoch = initialRows.snapshot(week).presentationEpoch;
  expect(newEpoch).not.toBe(oldEpoch);
  await checkbox.click();
  await expect.poll(() => freshReads).toBeGreaterThan(0);
  await expect(checkbox).toHaveAttribute('aria-checked', 'false');
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ expectedPresentationEpoch: oldEpoch, expectedRowVersion: '1' });
  await checkbox.click();
  await expect(checkbox).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('grocery-item-error')).toHaveCount(0);
  expect(writes).toHaveLength(2);
  expect(writes[1]).toMatchObject({ expectedPresentationEpoch: newEpoch, expectedRowVersion: '1' });
  expect(initialRows.snapshot(week).groceryState[row.rowId]).toBe(true);
});
