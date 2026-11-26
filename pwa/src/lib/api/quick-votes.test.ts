import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSetting: vi.fn(),
  postSetting: vi.fn(),
  byKey: vi.fn(),
}));

vi.mock('./api-client', () => ({
  apiClient: {
    api: {
      settings: {
        byKey: (...args: unknown[]) => mocks.byKey(...args),
      },
    },
  },
}));

import {
  DEFAULT_QUICK_VOTES_SETTINGS,
  QUICK_VOTES_SETTING_KEY,
  readQuickVotesSettings,
  saveQuickVotesSettings,
} from './quick-votes';

describe('quick-votes settings API wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.byKey.mockReturnValue({
      get: mocks.getSetting,
      post: mocks.postSetting,
    });
  });

  it('normalizes 404 responses to default disabled settings with targetLikes 16', async () => {
    mocks.getSetting.mockRejectedValueOnce({ responseStatusCode: 404 });

    await expect(readQuickVotesSettings()).resolves.toEqual(DEFAULT_QUICK_VOTES_SETTINGS);
    expect(mocks.byKey).toHaveBeenCalledWith(QUICK_VOTES_SETTING_KEY);
  });

  it('normalizes { data: { value: null } } and malformed payloads to defaults', async () => {
    mocks.getSetting.mockResolvedValueOnce({ data: { key: 'quick_votes', value: null } });
    await expect(readQuickVotesSettings()).resolves.toEqual({ enabled: false, targetLikes: 16 });

    mocks.getSetting.mockResolvedValueOnce({
      data: {
        key: 'quick_votes',
        value: { additionalData: { enabled: 'yes', targetLikes: 0 } },
      },
    });
    await expect(readQuickVotesSettings()).resolves.toEqual({ enabled: false, targetLikes: 16 });

    mocks.getSetting.mockResolvedValueOnce({
      data: {
        key: 'quick_votes',
        value: { additionalData: { enabled: true, targetLikes: -4 } },
      },
    });
    await expect(readQuickVotesSettings()).resolves.toEqual({ enabled: true, targetLikes: 16 });
  });

  it('reads valid Kiota additionalData and plain object settings cleanly', async () => {
    mocks.getSetting.mockResolvedValueOnce({
      data: {
        key: 'quick_votes',
        value: { additionalData: { enabled: true, targetLikes: 24 } },
      },
    });
    await expect(readQuickVotesSettings()).resolves.toEqual({ enabled: true, targetLikes: 24 });

    mocks.getSetting.mockResolvedValueOnce({
      data: {
        key: 'quick_votes',
        value: { enabled: true, targetLikes: 12 },
      },
    });
    await expect(readQuickVotesSettings()).resolves.toEqual({ enabled: true, targetLikes: 12 });
  });

  it('rethrows non-404 errors on read', async () => {
    mocks.getSetting.mockRejectedValueOnce({ responseStatusCode: 500, message: 'Server error' });
    await expect(readQuickVotesSettings()).rejects.toMatchObject({ responseStatusCode: 500 });

    mocks.getSetting.mockRejectedValueOnce(new Error('Network down'));
    await expect(readQuickVotesSettings()).rejects.toThrow('Network down');
  });

  it('posts { key, value: { additionalData: { enabled, targetLikes } } } and returns normalized snapshot', async () => {
    mocks.postSetting.mockResolvedValueOnce({
      data: {
        key: 'quick_votes',
        value: { additionalData: { enabled: true, targetLikes: 24 } },
      },
    });

    await expect(saveQuickVotesSettings({ enabled: true, targetLikes: 24 })).resolves.toEqual({
      enabled: true,
      targetLikes: 24,
    });

    expect(mocks.byKey).toHaveBeenCalledWith('quick_votes');
    expect(mocks.postSetting).toHaveBeenCalledWith(
      {
        key: 'quick_votes',
        value: {
          additionalData: {
            enabled: true,
            targetLikes: 24,
          },
        },
      },
      expect.objectContaining({ options: expect.any(Array) })
    );
  });

  it.each([0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid targetLikes (%s) without calling POST',
    async (badTarget) => {
      await expect(
        saveQuickVotesSettings({ enabled: true, targetLikes: badTarget })
      ).rejects.toThrow();
      expect(mocks.postSetting).not.toHaveBeenCalled();
    }
  );
});
