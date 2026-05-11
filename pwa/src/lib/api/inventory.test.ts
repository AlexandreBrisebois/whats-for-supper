import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitPhotoSearch } from './inventory';

const { fetchMock, mockGetState } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  mockGetState: vi.fn(),
}));

vi.mock('@/store/familyStore', () => ({
  useFamilyStore: {
    getState: mockGetState,
  },
}));

vi.mock('@/lib/identity/cookie', () => ({
  getFamilyMemberIdCookie: () => null,
}));

describe('submitPhotoSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetState.mockReturnValue({ selectedFamilyMemberId: 'family-123' });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('submits photos to the single-shot photo search endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          intent: 'recipe',
          query: 'Lemon Chicken rice',
          inferredIngredients: ['chicken', 'lemon', 'rice'],
          confidence: 0.91,
          pantrySnapshotId: null,
        },
      }),
    });

    const file = new File(['image'], 'recipe.jpg', { type: 'image/jpeg' });
    const result = await submitPhotoSearch([file]);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/photo-search',
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-Family-Member-Id': 'family-123' },
        body: expect.any(FormData),
      })
    );
    expect(result).toMatchObject({
      intent: 'recipe',
      query: 'Lemon Chicken rice',
      pantrySnapshotId: null,
    });
  });

  it('normalizes busy responses', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 202,
      json: async () => ({
        data: {
          status: 'busy',
          retryAfterSeconds: 30,
          message: 'Try again soon.',
        },
      }),
    });

    const result = await submitPhotoSearch([new File(['image'], 'fridge.jpg')]);

    expect(result).toEqual({
      busy: true,
      retryAfterSeconds: 30,
      message: 'Try again soon.',
    });
  });
});
