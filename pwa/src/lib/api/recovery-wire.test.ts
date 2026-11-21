import { afterEach, expect, it, vi } from 'vitest';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { RetryHandlerOptions } from '@microsoft/kiota-http-fetchlibrary';
vi.mock('./demo-session', () => ({
  demoFetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
}));
vi.mock('@/store/familyStore', () => ({
  useFamilyStore: { getState: () => ({ selectedFamilyMemberId: null }) },
}));
vi.mock('@/store/plannerStore', () => ({
  usePlannerStore: {
    getState: () => ({ localMoveSeq: 0, confirmedMoveSeq: 0, sseConnectionId: null }),
  },
}));
import { apiClient } from './api-client';
import { useSchedule } from './schedule';
afterEach(() => vi.unstubAllGlobals());

it('serializes the exact restore preflight destination revision through the actual generated client', async () => {
  const requests: Request[] = [];
  const snapshotId = '09000000-0000-4000-8000-000000000001';
  const revision = 'a'.repeat(64);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(
        typeof input === 'string' ? new URL(input, 'http://localhost') : input,
        init
      );
      requests.push(request.clone());
      const body =
        request.method === 'GET'
          ? {
              snapshotId,
              manifestSha256: 'b'.repeat(64),
              requiresExpectedDestinationRevision: true,
              destination: {
                version: 1,
                revision,
                generation: null,
                membershipSha256: 'e'.repeat(64),
                overridesSha256: 'c'.repeat(64),
                historySha256: 'd'.repeat(64),
                documents: [{ revision: 'fixture.destination', sha256: 'f'.repeat(64) }],
              },
            }
          : { state: 'completed', message: 'Restored.', snapshotId };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    })
  );
  const restore = apiClient.api.management.recovery.restore.bySnapshotId(snapshotId);
  const preflight = await restore.preflight.get();
  expect(preflight?.destination?.revision).toBe(revision);
  await restore.post(
    { expectedDestinationRevision: preflight?.destination?.revision },
    { options: [new RetryHandlerOptions({ maxRetries: 0 })] }
  );
  expect(requests.map((request) => [request.method, new URL(request.url).pathname])).toEqual([
    ['GET', `/api/management/recovery/restore/${snapshotId}/preflight`],
    ['POST', `/api/management/recovery/restore/${snapshotId}`],
  ]);
  expect(await requests[1].json()).toEqual({ expectedDestinationRevision: revision });
});

it.each(['item', 'bulk'] as const)(
  'serializes the observed grocery epoch in the actual %s mutation body',
  async (kind) => {
    const requests: Request[] = [];
    const epoch = '09000000-0000-4000-8000-000000000002';
    const rowId = '09000000-0000-4000-8000-000000000003';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push(
          new Request(typeof input === 'string' ? new URL(input, 'http://localhost') : input, init)
        );
        const result = {
          weekStartDate: '2026-05-04',
          updatedAt: '2026-05-04T12:00:00Z',
          listVersion: '2',
          checks: {},
          rows: [],
          presentationVersion: '1',
          presentationEpoch: epoch,
        };
        return new Response(JSON.stringify(kind === 'item' ? result : { data: result }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    const common = {
      weekStartDate: DateOnly.parse('2026-05-04')!,
      clientMutationId: '09000000-0000-4000-8000-000000000004',
      expectedPresentationEpoch: epoch,
    };
    if (kind === 'item')
      await useSchedule().toggleGroceryItem(
        0,
        { ...common, rowId, checked: true, expectedRowVersion: '1' },
        '2026-05-04'
      );
    else
      await useSchedule().updateGroceryState(
        0,
        { ...common, checks: { additionalData: { [rowId]: true } }, expectedListVersion: '1' },
        '2026-05-04'
      );
    expect(requests).toHaveLength(1);
    const body = await requests[0].json();
    expect(body.expectedPresentationEpoch).toBe(epoch);
    expect(body.weekStartDate).toBe('2026-05-04');
    expect(new URL(requests[0].url).searchParams.get('referenceWeekStartDate')).toBe('2026-05-04');
  }
);
