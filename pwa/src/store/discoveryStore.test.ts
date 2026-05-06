import { describe, it, expect, beforeEach } from 'vitest';
import { useDiscoveryStore } from './discoveryStore';
import type { DiscoveryRecipe } from '@/lib/api/discovery';

const makeRecipe = (id: string, hasFamilyInterest = false): DiscoveryRecipe => ({
  id,
  name: `Recipe ${id}`,
  description: '',
  imageUrl: '',
  totalTime: '',
  difficulty: '',
  category: '',
  hasFamilyInterest,
});

beforeEach(() => {
  useDiscoveryStore.setState({
    hasPendingCards: false,
    fillTheGapVersion: 0,
    discoveryStack: [],
    activeCategory: null,
  });
});

describe('discoveryStore — hasPendingCards', () => {
  it('starts false', () => {
    expect(useDiscoveryStore.getState().hasPendingCards).toBe(false);
  });

  it('setHasPendingCards updates the flag', () => {
    useDiscoveryStore.getState().setHasPendingCards(true);
    expect(useDiscoveryStore.getState().hasPendingCards).toBe(true);
  });
});

describe('discoveryStore — invalidateFillTheGap', () => {
  it('starts at version 0', () => {
    expect(useDiscoveryStore.getState().fillTheGapVersion).toBe(0);
  });

  it('increments fillTheGapVersion on each call', () => {
    useDiscoveryStore.getState().invalidateFillTheGap(0);
    expect(useDiscoveryStore.getState().fillTheGapVersion).toBe(1);

    useDiscoveryStore.getState().invalidateFillTheGap(0);
    expect(useDiscoveryStore.getState().fillTheGapVersion).toBe(2);
  });

  it('increments regardless of weekOffset argument', () => {
    useDiscoveryStore.getState().invalidateFillTheGap(1);
    expect(useDiscoveryStore.getState().fillTheGapVersion).toBe(1);
  });

  it('does not affect hasPendingCards', () => {
    useDiscoveryStore.setState({ hasPendingCards: true });
    useDiscoveryStore.getState().invalidateFillTheGap(0);
    expect(useDiscoveryStore.getState().hasPendingCards).toBe(true);
  });
});

describe('discoveryStore — setStack', () => {
  it('replaces the stack', () => {
    useDiscoveryStore.getState().setStack([makeRecipe('r1'), makeRecipe('r2')]);
    expect(useDiscoveryStore.getState().discoveryStack).toHaveLength(2);
  });

  it('clears the stack when called with empty array', () => {
    useDiscoveryStore.getState().setStack([makeRecipe('r1')]);
    useDiscoveryStore.getState().setStack([]);
    expect(useDiscoveryStore.getState().discoveryStack).toHaveLength(0);
  });
});

describe('discoveryStore — applyVoteUpdate', () => {
  it('sets hasFamilyInterest true on the matching recipe', () => {
    useDiscoveryStore.getState().setStack([makeRecipe('r1'), makeRecipe('r2')]);
    useDiscoveryStore.getState().applyVoteUpdate({ recipeId: 'r2', voteCount: 1 });
    const r2 = useDiscoveryStore.getState().discoveryStack.find((r) => r.id === 'r2');
    expect(r2?.hasFamilyInterest).toBe(true);
  });

  it('is a no-op when the recipe is not in the stack', () => {
    useDiscoveryStore.getState().setStack([makeRecipe('r1')]);
    useDiscoveryStore.getState().applyVoteUpdate({ recipeId: 'not-here', voteCount: 1 });
    expect(useDiscoveryStore.getState().discoveryStack).toHaveLength(1);
    expect(useDiscoveryStore.getState().discoveryStack[0].hasFamilyInterest).toBe(false);
  });

  it('moves a position-2 card up to position-1 (not position-0)', () => {
    // Stack: [r0, r1, r2, r3] — r2 is at index 2
    useDiscoveryStore
      .getState()
      .setStack([makeRecipe('r0'), makeRecipe('r1'), makeRecipe('r2'), makeRecipe('r3')]);
    useDiscoveryStore.getState().applyVoteUpdate({ recipeId: 'r2', voteCount: 1 });
    const stack = useDiscoveryStore.getState().discoveryStack;
    const newIdx = stack.findIndex((r) => r.id === 'r2');
    // Moved up by 2 from index 2 → target is max(1, 2-2) = max(1, 0) = 1
    expect(newIdx).toBe(1);
    // Position 0 must still be r0
    expect(stack[0].id).toBe('r0');
  });

  it('moves a position-3 card up by 2 to position-1', () => {
    useDiscoveryStore
      .getState()
      .setStack([makeRecipe('r0'), makeRecipe('r1'), makeRecipe('r2'), makeRecipe('r3')]);
    useDiscoveryStore.getState().applyVoteUpdate({ recipeId: 'r3', voteCount: 1 });
    const stack = useDiscoveryStore.getState().discoveryStack;
    const newIdx = stack.findIndex((r) => r.id === 'r3');
    // max(1, 3-2) = max(1, 1) = 1
    expect(newIdx).toBe(1);
    expect(stack[0].id).toBe('r0');
  });

  it('does NOT move the position-0 card (top card is locked)', () => {
    useDiscoveryStore.getState().setStack([makeRecipe('r0'), makeRecipe('r1'), makeRecipe('r2')]);
    useDiscoveryStore.getState().applyVoteUpdate({ recipeId: 'r0', voteCount: 1 });
    const stack = useDiscoveryStore.getState().discoveryStack;
    // r0 stays at position 0
    expect(stack[0].id).toBe('r0');
    expect(stack[0].hasFamilyInterest).toBe(true);
  });

  it('does NOT re-rank a position-4+ card (updates in-place only)', () => {
    useDiscoveryStore.getState().setStack([
      makeRecipe('r0'),
      makeRecipe('r1'),
      makeRecipe('r2'),
      makeRecipe('r3'),
      makeRecipe('r4'), // index 4 — outside visible stack
    ]);
    useDiscoveryStore.getState().applyVoteUpdate({ recipeId: 'r4', voteCount: 1 });
    const stack = useDiscoveryStore.getState().discoveryStack;
    // r4 stays at index 4
    expect(stack[4].id).toBe('r4');
    expect(stack[4].hasFamilyInterest).toBe(true);
    // Order of first 4 unchanged
    expect(stack[0].id).toBe('r0');
    expect(stack[1].id).toBe('r1');
    expect(stack[2].id).toBe('r2');
    expect(stack[3].id).toBe('r3');
  });
});

describe('discoveryStore — removeFromStack', () => {
  it('removes the recipe with the given id', () => {
    useDiscoveryStore.getState().setStack([makeRecipe('r1'), makeRecipe('r2'), makeRecipe('r3')]);
    useDiscoveryStore.getState().removeFromStack('r2');
    const stack = useDiscoveryStore.getState().discoveryStack;
    expect(stack).toHaveLength(2);
    expect(stack.find((r) => r.id === 'r2')).toBeUndefined();
  });

  it('is a no-op when the id is not in the stack', () => {
    useDiscoveryStore.getState().setStack([makeRecipe('r1')]);
    useDiscoveryStore.getState().removeFromStack('not-here');
    expect(useDiscoveryStore.getState().discoveryStack).toHaveLength(1);
  });
});

describe('discoveryStore — activeCategory', () => {
  it('starts null', () => {
    expect(useDiscoveryStore.getState().activeCategory).toBe(null);
  });

  it('setActiveCategory updates the value', () => {
    useDiscoveryStore.getState().setActiveCategory('ProteinFoods');
    expect(useDiscoveryStore.getState().activeCategory).toBe('ProteinFoods');
  });

  it('can be set to null', () => {
    useDiscoveryStore.getState().setActiveCategory('ProteinFoods');
    useDiscoveryStore.getState().setActiveCategory(null);
    expect(useDiscoveryStore.getState().activeCategory).toBe(null);
  });
});
