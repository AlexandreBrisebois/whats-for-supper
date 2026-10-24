import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  suggest: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  byOccurrenceId: vi.fn(),
}));

vi.mock('./api-client', () => ({
  apiClient: {
    api: {
      groceryExtras: {
        post: mocks.create,
        suggestions: { get: mocks.suggest },
        byOccurrenceId: mocks.byOccurrenceId,
      },
    },
  },
}));

import {
  createGroceryExtra,
  deleteGroceryExtra,
  suggestGroceryExtraNames,
  updateGroceryExtra,
} from './grocery-extras';

const extra = {
  id: '11111111-1111-4111-8111-111111111111',
  occurrenceWeekStartDate: '2026-10-19' as never,
  name: 'Coffee',
  version: 3,
};

describe('grocery extras API wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.byOccurrenceId.mockReturnValue({ patch: mocks.update, delete: mocks.remove });
  });

  it('creates with the stable client identity and absolute week', async () => {
    mocks.create.mockResolvedValue(extra);
    await expect(createGroceryExtra('Coffee', '2026-10-19', extra.id)).resolves.toBe(extra);
    expect(mocks.create).toHaveBeenCalledWith({
      name: 'Coffee',
      weekStartDate: '2026-10-19',
      clientId: extra.id,
    });
  });

  it('caps suggestion names and removes malformed values', async () => {
    mocks.suggest.mockResolvedValue({ names: ['Milk', null, 'Coffee', 'Foil', 'Soap'] });
    await expect(suggestGroceryExtraNames('mi')).resolves.toEqual(['Milk', 'Coffee', 'Foil']);
  });

  it('sends one versioned mutation for the occurrence', async () => {
    mocks.update.mockResolvedValue({ ...extra, checked: true, version: 4 });
    await updateGroceryExtra(extra, { checked: true });
    expect(mocks.byOccurrenceId).toHaveBeenCalledWith(extra.id);
    expect(mocks.update).toHaveBeenCalledWith({
      expectedVersion: 3,
      weekStartDate: '2026-10-19',
      checked: true,
    });
  });

  it('sends version and absolute week when deleting', async () => {
    mocks.remove.mockResolvedValue(undefined);
    await deleteGroceryExtra(extra);
    expect(mocks.remove).toHaveBeenCalledWith({
      queryParameters: { expectedVersion: 3, weekStartDate: '2026-10-19' },
    });
  });
});
