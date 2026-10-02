import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getFeatureFlags, updateFeatureFlag, type FeatureFlag } from '@/lib/api/featureFlags';
import { useFeatureFlagStore } from './featureFlagStore';

vi.mock('@/lib/api/featureFlags', () => ({
  getFeatureFlags: vi.fn(),
  updateFeatureFlag: vi.fn(),
}));

const memberA = '11111111-1111-4111-8111-111111111111';
const memberB = '22222222-2222-4222-8222-222222222222';
const key = 'single-page-recipe-steps';
const flag = (enabled = false): FeatureFlag => ({
  key,
  enabled,
  memberEnabled: enabled,
  mode: 'opt-in',
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('featureFlagStore mutations', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await useFeatureFlagStore.getState().load(null);
    useFeatureFlagStore.setState({ pending: {}, mutationErrors: {} });
    vi.mocked(getFeatureFlags).mockResolvedValue([flag()]);
    await useFeatureFlagStore.getState().load(memberA);
  });

  it('changes the effective state only after server confirmation', async () => {
    const request = deferred<FeatureFlag>();
    vi.mocked(updateFeatureFlag).mockReturnValueOnce(request.promise);
    const save = useFeatureFlagStore.getState().setEnabled(key, true);
    expect(useFeatureFlagStore.getState().pending[key]).toBe(true);
    expect(useFeatureFlagStore.getState().flags[key].enabled).toBe(false);
    request.resolve(flag(true));
    expect(await save).toBe(true);
    expect(useFeatureFlagStore.getState().flags[key].enabled).toBe(true);
    expect(useFeatureFlagStore.getState().pending[key]).toBe(false);
  });

  it('discards a previous member response without clearing the new member pending save', async () => {
    const oldRequest = deferred<FeatureFlag>();
    const newRequest = deferred<FeatureFlag>();
    vi.mocked(updateFeatureFlag)
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise);
    const oldSave = useFeatureFlagStore.getState().setEnabled(key, true);
    await useFeatureFlagStore.getState().load(memberB);
    expect(useFeatureFlagStore.getState().pending[key]).toBeFalsy();
    const newSave = useFeatureFlagStore.getState().setEnabled(key, true);
    oldRequest.resolve(flag(true));
    expect(await oldSave).toBe(false);
    expect(useFeatureFlagStore.getState().flags[key].enabled).toBe(false);
    expect(useFeatureFlagStore.getState().pending[key]).toBe(true);
    newRequest.resolve(flag(true));
    expect(await newSave).toBe(true);
    expect(useFeatureFlagStore.getState().flags[key].enabled).toBe(true);
  });

  it('discards an old response after switching away and back to the same member', async () => {
    const request = deferred<FeatureFlag>();
    vi.mocked(updateFeatureFlag).mockReturnValueOnce(request.promise);
    const save = useFeatureFlagStore.getState().setEnabled(key, true);
    await useFeatureFlagStore.getState().load(memberB);
    await useFeatureFlagStore.getState().load(memberA);
    request.resolve(flag(true));
    expect(await save).toBe(false);
    expect(useFeatureFlagStore.getState().flags[key].enabled).toBe(false);
  });

  it.each([500, 409])('discards a previous member error with status %s', async (status) => {
    const request = deferred<FeatureFlag>();
    vi.mocked(updateFeatureFlag).mockReturnValueOnce(request.promise);
    const save = useFeatureFlagStore.getState().setEnabled(key, true);
    await useFeatureFlagStore.getState().load(memberB);
    const snapshotCalls = vi.mocked(getFeatureFlags).mock.calls.length;
    request.reject(Object.assign(new Error('Save failed'), { status }));
    expect(await save).toBe(false);
    expect(useFeatureFlagStore.getState().mutationErrors).toEqual({});
    expect(vi.mocked(getFeatureFlags)).toHaveBeenCalledTimes(snapshotCalls);
  });

  it('unlocks a conflicting toggle so it can be used when opt-in becomes available again', async () => {
    vi.mocked(updateFeatureFlag).mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), { status: 409 })
    );
    vi.mocked(getFeatureFlags).mockResolvedValueOnce([{ key, mode: 'off', enabled: false }]);
    expect(await useFeatureFlagStore.getState().setEnabled(key, true)).toBe(false);
    expect(useFeatureFlagStore.getState().pending[key]).toBe(false);
    expect(useFeatureFlagStore.getState().flags[key].mode).toBe('off');
    await useFeatureFlagStore.getState().refresh();
    vi.mocked(updateFeatureFlag).mockResolvedValueOnce(flag(true));
    expect(await useFeatureFlagStore.getState().setEnabled(key, true)).toBe(true);
  });

  it('unlocks a conflicting toggle even when the refreshed snapshot fails', async () => {
    vi.mocked(updateFeatureFlag).mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), { status: 409 })
    );
    vi.mocked(getFeatureFlags).mockRejectedValueOnce(new Error('Unavailable'));
    expect(await useFeatureFlagStore.getState().setEnabled(key, true)).toBe(false);
    expect(useFeatureFlagStore.getState().pending[key]).toBe(false);
    expect(useFeatureFlagStore.getState().error).toBe('Unable to load preview features.');
  });
});
