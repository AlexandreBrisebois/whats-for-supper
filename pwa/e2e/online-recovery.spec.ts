import { test, expect } from './fixtures';
import { setupCommonRoutes, MOCK_IDS } from './mock-api';

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
