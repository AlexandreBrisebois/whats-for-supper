import { DateOnly } from '@microsoft/kiota-abstractions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDiscoveryStore } from './discoveryStore';
import { useWeekStore } from './weekStore';
import type { VotingSessionSnapshot } from '@/lib/api/generated/models';
vi.mock('@/lib/api/discovery', () => ({ getVotingSession: vi.fn() }));
import { getVotingSession } from '@/lib/api/discovery';
const snapshot = (
  revision = 1,
  extra: Partial<VotingSessionSnapshot> = {}
): VotingSessionSnapshot => ({
  incarnationId: '00000000-0000-4000-8000-000000000001',
  revision,
  roundId: '00000000-0000-4000-8000-000000000002',
  weekStartDate: DateOnly.parse('2025-01-06')!,
  phase: 'converged',
  requiredSlots: 3,
  coveredSlots: 3,
  candidateCount: 3,
  smartDefaults: {
    weekStartDate: DateOnly.parse('2025-01-06')!,
    weekOffset: 0,
    preSelectedRecipes: [],
    openSlots: [],
  },
  ...extra,
});
const state = () => useDiscoveryStore.getState();
beforeEach(() => {
  useDiscoveryStore.setState({ session: null, sessionStatus: 'unknown' });
  vi.clearAllMocks();
});
describe('voting session reconciliation', () => {
  it('rejects an authoritative non-Monday week using the existing calendar owner', async () => {
    vi.mocked(getVotingSession).mockResolvedValue(
      snapshot(1, { weekStartDate: DateOnly.parse('2025-01-07') })
    );
    await state().refreshSession();
    expect(state().sessionStatus).toBe('unavailable');
    expect(state().session).toBeNull();
  });
  it('settles a malformed current authoritative read as unavailable instead of loading forever', async () => {
    vi.mocked(getVotingSession).mockResolvedValue(snapshot(1, { roundId: null }));
    await state().refreshSession();
    expect(state().sessionStatus).toBe('unavailable');
    expect(state().session).toBeNull();
  });
  it('keeps last confirmed data when a malformed read fails, and ignores malformed live frames', async () => {
    state().applySession(snapshot(4), true);
    state().applySession(snapshot(5, { weekStartDate: null }));
    expect(state().sessionStatus).toBe('ready');
    expect(state().session?.revision).toBe(4);
    vi.mocked(getVotingSession).mockResolvedValue(snapshot(5, { weekStartDate: null }));
    await state().refreshSession();
    expect(state().sessionStatus).toBe('unavailable');
    expect(state().session?.revision).toBe(4);
  });
  it('a superseded malformed read cannot overwrite newer accepted status', async () => {
    state().applySession(snapshot(1), true);
    let resolve!: (value: VotingSessionSnapshot) => void;
    vi.mocked(getVotingSession).mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      })
    );
    const pending = state().refreshSession();
    state().applySession(snapshot(3));
    resolve(snapshot(2, { roundId: null }));
    await pending;
    expect(state().session?.revision).toBe(3);
    expect(state().sessionStatus).toBe('ready');
  });
  it('rejects duplicate and older revisions across rounds', () => {
    state().applySession(snapshot(8), true);
    state().applySession(snapshot(7, { phase: 'collecting' }));
    expect(state().session?.revision).toBe(8);
    state().applySession(snapshot(8));
    expect(state().session?.revision).toBe(8);
  });
  it('requires a read before accepting an unexpected incarnation', async () => {
    state().applySession(snapshot(8), true);
    vi.mocked(getVotingSession).mockResolvedValue(
      snapshot(1, { incarnationId: '00000000-0000-4000-8000-000000000003', phase: 'collecting' })
    );
    state().applySession(
      snapshot(1, { incarnationId: '00000000-0000-4000-8000-000000000003', phase: 'collecting' })
    );
    expect(state().session?.revision).toBe(8);
    await state().refreshSession();
    expect(state().session?.phase).toBe('collecting');
  });
  it('does not allow a pending read to replace a newer stream result', async () => {
    let resolve!: (value: VotingSessionSnapshot) => void;
    vi.mocked(getVotingSession).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    state().applySession(snapshot(1), true);
    const pending = state().refreshSession();
    state().applySession(snapshot(3));
    resolve(snapshot(2, { phase: 'collecting' }));
    await pending;
    expect(state().session?.revision).toBe(3);
  });
  it('retains confirmed celebration on failed read without claiming fresh counts', async () => {
    state().applySession(snapshot(), true);
    vi.mocked(getVotingSession).mockRejectedValue(new Error('offline'));
    await state().refreshSession();
    expect(state().session?.phase).toBe('converged');
    expect(state().sessionStatus).toBe('unavailable');
  });
  it('does not apply another week suggestions to the loaded planner', () => {
    const spy = vi.spyOn(useWeekStore.getState(), 'applySmartDefaultsUpdate');
    useWeekStore.setState({ weekStartDate: '2025-01-13' });
    state().applySession(snapshot(), true);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it('a refresh requested during a read reconciles again after that read', async () => {
    let resolve!: (value: VotingSessionSnapshot) => void;
    vi.mocked(getVotingSession)
      .mockReturnValueOnce(
        new Promise((r) => {
          resolve = r;
        })
      )
      .mockResolvedValueOnce(snapshot(3));
    const initial = state().refreshSession();
    const afterMutation = state().refreshSession();
    resolve(snapshot(1, { phase: 'collecting' }));
    await Promise.all([initial, afterMutation]);
    expect(getVotingSession).toHaveBeenCalledTimes(2);
    expect(state().session?.revision).toBe(3);
  });
});
