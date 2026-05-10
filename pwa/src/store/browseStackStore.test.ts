import { describe, it, expect, beforeEach } from 'vitest';
import { useBrowseStackStore } from './browseStackStore';
import type { RecipeDto } from '@/lib/api/generated/models/index';

const makeRecipe = (id: string): RecipeDto =>
  ({
    id,
    name: `Recipe ${id}`,
    description: '',
    imageUrl: '',
    totalTime: '',
    difficulty: '',
    category: '',
  }) as RecipeDto;

beforeEach(() => {
  useBrowseStackStore.getState().reset();
});

describe('browseStackStore — nextCard', () => {
  it('increments currentIndex by 1', () => {
    useBrowseStackStore.getState().nextCard();
    expect(useBrowseStackStore.getState().currentIndex).toBe(1);
  });

  it('increments currentIndex on each successive call', () => {
    useBrowseStackStore.getState().nextCard();
    useBrowseStackStore.getState().nextCard();
    useBrowseStackStore.getState().nextCard();
    expect(useBrowseStackStore.getState().currentIndex).toBe(3);
  });
});

describe('browseStackStore — previousCard', () => {
  it('decrements currentIndex by 1', () => {
    useBrowseStackStore.setState({ currentIndex: 3 });
    useBrowseStackStore.getState().previousCard();
    expect(useBrowseStackStore.getState().currentIndex).toBe(2);
  });

  it('does not decrement below 0 when already at 0', () => {
    useBrowseStackStore.getState().previousCard();
    expect(useBrowseStackStore.getState().currentIndex).toBe(0);
  });

  it('does not decrement below 0 when currentIndex is 0', () => {
    useBrowseStackStore.setState({ currentIndex: 0 });
    useBrowseStackStore.getState().previousCard();
    useBrowseStackStore.getState().previousCard();
    expect(useBrowseStackStore.getState().currentIndex).toBe(0);
  });
});

describe('browseStackStore — setRecipes', () => {
  it('replaces the recipes array', () => {
    useBrowseStackStore.getState().setRecipes([makeRecipe('r1'), makeRecipe('r2')]);
    useBrowseStackStore.getState().setRecipes([makeRecipe('r3')]);
    const { recipes } = useBrowseStackStore.getState();
    expect(recipes).toHaveLength(1);
    expect(recipes[0].id).toBe('r3');
  });

  it('can replace with an empty array', () => {
    useBrowseStackStore.getState().setRecipes([makeRecipe('r1')]);
    useBrowseStackStore.getState().setRecipes([]);
    expect(useBrowseStackStore.getState().recipes).toHaveLength(0);
  });
});

describe('browseStackStore — appendRecipes', () => {
  it('appends recipes to the existing array', () => {
    useBrowseStackStore.getState().setRecipes([makeRecipe('r1'), makeRecipe('r2')]);
    useBrowseStackStore.getState().appendRecipes([makeRecipe('r3'), makeRecipe('r4')]);
    const { recipes } = useBrowseStackStore.getState();
    expect(recipes).toHaveLength(4);
    expect(recipes[2].id).toBe('r3');
    expect(recipes[3].id).toBe('r4');
  });

  it('appends to an empty array', () => {
    useBrowseStackStore.getState().appendRecipes([makeRecipe('r1')]);
    expect(useBrowseStackStore.getState().recipes).toHaveLength(1);
    expect(useBrowseStackStore.getState().recipes[0].id).toBe('r1');
  });

  it('preserves existing recipes when appending', () => {
    useBrowseStackStore.getState().setRecipes([makeRecipe('r1')]);
    useBrowseStackStore.getState().appendRecipes([makeRecipe('r2')]);
    expect(useBrowseStackStore.getState().recipes[0].id).toBe('r1');
  });

  it('deduplicates appended recipe ids', () => {
    useBrowseStackStore.getState().setRecipes([makeRecipe('r1'), makeRecipe('r2')]);
    useBrowseStackStore.getState().appendRecipes([makeRecipe('r2'), makeRecipe('r3')]);
    expect(useBrowseStackStore.getState().recipes.map((recipe) => recipe.id)).toEqual([
      'r1',
      'r2',
      'r3',
    ]);
  });

  it('retains a bounded recipe window when requested', () => {
    useBrowseStackStore.getState().setRecipes([makeRecipe('r1'), makeRecipe('r2')]);
    useBrowseStackStore
      .getState()
      .appendRecipes([makeRecipe('r3'), makeRecipe('r4'), makeRecipe('r5')], 3);
    expect(useBrowseStackStore.getState().recipes.map((recipe) => recipe.id)).toEqual([
      'r3',
      'r4',
      'r5',
    ]);
  });
});

describe('browseStackStore — reset', () => {
  it('clears all state back to initial values', () => {
    useBrowseStackStore.setState({
      recipes: [makeRecipe('r1'), makeRecipe('r2')],
      currentIndex: 5,
      totalCount: 42,
      currentPage: 3,
      isLoading: true,
      hasMorePages: true,
    });

    useBrowseStackStore.getState().reset();

    const state = useBrowseStackStore.getState();
    expect(state.recipes).toHaveLength(0);
    expect(state.currentIndex).toBe(0);
    expect(state.totalCount).toBe(0);
    expect(state.currentPage).toBe(1);
    expect(state.isLoading).toBe(false);
    expect(state.hasMorePages).toBe(false);
  });
});
