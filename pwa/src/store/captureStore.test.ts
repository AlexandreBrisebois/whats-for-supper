import { describe, it, expect, beforeEach } from 'vitest';
import { useCaptureStore } from './captureStore';

beforeEach(() => {
  useCaptureStore.setState({ pendingRecipes: [] });
});

describe('captureStore — addPending', () => {
  it('adds a recipe to the pending queue', () => {
    useCaptureStore.getState().addPending({ recipeId: 'abc-123', name: 'Lasagna' });
    const pending = useCaptureStore.getState().pendingRecipes;
    expect(pending).toHaveLength(1);
    expect(pending[0].recipeId).toBe('abc-123');
    expect(pending[0].name).toBe('Lasagna');
    expect(pending[0].submittedAt).toBeGreaterThan(0);
  });

  it('adds multiple recipes independently', () => {
    useCaptureStore.getState().addPending({ recipeId: 'r1' });
    useCaptureStore.getState().addPending({ recipeId: 'r2', name: 'Tacos' });
    expect(useCaptureStore.getState().pendingRecipes).toHaveLength(2);
  });

  it('works without a name (name is optional)', () => {
    useCaptureStore.getState().addPending({ recipeId: 'no-name' });
    const entry = useCaptureStore.getState().pendingRecipes[0];
    expect(entry.name).toBeUndefined();
  });
});

describe('captureStore — removePending', () => {
  it('removes the matching recipe from the queue', () => {
    useCaptureStore.getState().addPending({ recipeId: 'r1' });
    useCaptureStore.getState().addPending({ recipeId: 'r2' });
    useCaptureStore.getState().removePending('r1');
    const pending = useCaptureStore.getState().pendingRecipes;
    expect(pending).toHaveLength(1);
    expect(pending[0].recipeId).toBe('r2');
  });

  it('is a no-op when the recipeId is not in the queue', () => {
    useCaptureStore.getState().addPending({ recipeId: 'r1' });
    useCaptureStore.getState().removePending('does-not-exist');
    expect(useCaptureStore.getState().pendingRecipes).toHaveLength(1);
  });

  it('leaves the queue empty when the last entry is removed', () => {
    useCaptureStore.getState().addPending({ recipeId: 'only' });
    useCaptureStore.getState().removePending('only');
    expect(useCaptureStore.getState().pendingRecipes).toHaveLength(0);
  });
});

describe('captureStore — getPending', () => {
  it('returns the entry when the recipe is pending', () => {
    useCaptureStore.getState().addPending({ recipeId: 'r1', name: 'Pasta' });
    const entry = useCaptureStore.getState().getPending('r1');
    expect(entry).toBeDefined();
    expect(entry?.name).toBe('Pasta');
  });

  it('returns undefined when the recipe is not pending', () => {
    const entry = useCaptureStore.getState().getPending('not-here');
    expect(entry).toBeUndefined();
  });

  it('returns undefined after the recipe has been removed', () => {
    useCaptureStore.getState().addPending({ recipeId: 'r1' });
    useCaptureStore.getState().removePending('r1');
    expect(useCaptureStore.getState().getPending('r1')).toBeUndefined();
  });
});
