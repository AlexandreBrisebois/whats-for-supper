import { describe, it, expect, beforeEach } from 'vitest';
import { useLibraryStore } from './libraryStore';
import type { LibraryNotification } from './libraryStore';

const makeReady = (recipeId: string, name = 'Test Recipe'): LibraryNotification => ({
  recipeId,
  name,
  type: 'ready',
});

const makeFailed = (recipeId: string): LibraryNotification => ({
  recipeId,
  name: 'Failed Recipe',
  type: 'failed',
  errorMessage: 'AI pipeline error',
  failedStep: 'ExtractRecipe',
});

beforeEach(() => {
  useLibraryStore.setState({ notifications: [] });
});

describe('libraryStore — pushNotification', () => {
  it('adds a ready notification to the queue', () => {
    useLibraryStore.getState().pushNotification(makeReady('r1', 'Lasagna'));
    const { notifications } = useLibraryStore.getState();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].recipeId).toBe('r1');
    expect(notifications[0].name).toBe('Lasagna');
    expect(notifications[0].type).toBe('ready');
  });

  it('adds a failed notification to the queue', () => {
    useLibraryStore.getState().pushNotification(makeFailed('r2'));
    const { notifications } = useLibraryStore.getState();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('failed');
    expect(notifications[0].errorMessage).toBe('AI pipeline error');
    expect(notifications[0].failedStep).toBe('ExtractRecipe');
  });

  it('accumulates multiple notifications', () => {
    useLibraryStore.getState().pushNotification(makeReady('r1'));
    useLibraryStore.getState().pushNotification(makeFailed('r2'));
    expect(useLibraryStore.getState().notifications).toHaveLength(2);
  });

  it('preserves optional fields (imageUrl, partialData)', () => {
    useLibraryStore.getState().pushNotification({
      recipeId: 'r3',
      name: 'With Image',
      type: 'ready',
      imageUrl: '/api/recipes/r3/image/0',
    });
    const n = useLibraryStore.getState().notifications[0];
    expect(n.imageUrl).toBe('/api/recipes/r3/image/0');
  });
});

describe('libraryStore — dismissNotification', () => {
  it('removes the matching notification', () => {
    useLibraryStore.getState().pushNotification(makeReady('r1'));
    useLibraryStore.getState().pushNotification(makeReady('r2'));
    useLibraryStore.getState().dismissNotification('r1');
    const { notifications } = useLibraryStore.getState();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].recipeId).toBe('r2');
  });

  it('is a no-op when the recipeId is not in the queue', () => {
    useLibraryStore.getState().pushNotification(makeReady('r1'));
    useLibraryStore.getState().dismissNotification('does-not-exist');
    expect(useLibraryStore.getState().notifications).toHaveLength(1);
  });

  it('leaves the queue empty when the last notification is dismissed', () => {
    useLibraryStore.getState().pushNotification(makeReady('only'));
    useLibraryStore.getState().dismissNotification('only');
    expect(useLibraryStore.getState().notifications).toHaveLength(0);
  });
});
