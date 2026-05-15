/**
 * Unit tests for StackActionBar
 * Requirements: 4.2, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { StackActionBar } from './StackActionBar';
import type { RecipeDto } from '@/lib/api/generated/models/index';

vi.mock('@/lib/api/recipes', () => ({
  // getRecipeShareBundle and downloadRecipeBundleFile removed as they are no longer used in StackActionBar
}));

vi.mock('@/locales', () => ({
  t: (key: string, defaultValue: string) => defaultValue,
  tWithVars: (key: string, defaultValue: string, vars: any) => {
    let result = defaultValue;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        result = result.replace(`{{${k}}}`, String(v));
      });
    }
    return result;
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecipe(overrides: Partial<RecipeDto> = {}): RecipeDto {
  return {
    id: 'recipe-abc',
    name: 'Pasta Primavera',
    description: 'A light pasta dish',
    imageUrl: 'https://example.com/pasta.jpg',
    totalTime: 'PT30M',
    category: 'Dinner',
    isDiscoverable: false,
    rating: 2,
    notes: null,
    ...overrides,
  } as RecipeDto;
}

const defaultRecipe = makeRecipe();

// ---------------------------------------------------------------------------
// Depth indicator
// ---------------------------------------------------------------------------

describe('StackActionBar — depth indicator', () => {
  it('renders depth indicator with correct format "{position} / {total}"', () => {
    render(
      <StackActionBar
        currentRecipe={defaultRecipe}
        currentIndex={2}
        totalCount={24}
        onToggleIndividualCuration={vi.fn()}
      />
    );
    expect(screen.getByTestId('stack-depth-indicator').textContent).toBe('3 / 24');
  });

  it('renders data-testid="stack-depth-indicator"', () => {
    render(
      <StackActionBar
        currentRecipe={defaultRecipe}
        currentIndex={0}
        totalCount={10}
        onToggleIndividualCuration={vi.fn()}
      />
    );
    expect(screen.getByTestId('stack-depth-indicator')).toBeTruthy();
  });

  it('updates depth indicator when position changes', () => {
    const { rerender } = render(
      <StackActionBar
        currentRecipe={defaultRecipe}
        currentIndex={0}
        totalCount={10}
        onToggleIndividualCuration={vi.fn()}
      />
    );
    expect(screen.getByTestId('stack-depth-indicator').textContent).toBe('1 / 10');

    rerender(
      <StackActionBar
        currentRecipe={defaultRecipe}
        currentIndex={4}
        totalCount={10}
        onToggleIndividualCuration={vi.fn()}
      />
    );
    expect(screen.getByTestId('stack-depth-indicator').textContent).toBe('5 / 10');
  });
});

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

describe('StackActionBar — container', () => {
  beforeEach(() => {
    // No mocks to reset
  });

  it('renders with data-testid="stack-action-bar"', () => {
    render(
      <StackActionBar
        currentRecipe={defaultRecipe}
        currentIndex={0}
        totalCount={5}
        onToggleIndividualCuration={vi.fn()}
      />
    );
    expect(screen.getByTestId('stack-action-bar')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Discoverable toggle — visual state
// ---------------------------------------------------------------------------

describe('StackActionBar — discoverable toggle visual state', () => {
  it('renders toggle with data-testid="card-toggle-discovery-{recipeId}"', () => {
    render(
      <StackActionBar
        currentRecipe={defaultRecipe}
        currentIndex={0}
        totalCount={5}
        onToggleIndividualCuration={vi.fn()}
      />
    );
    expect(screen.getByTestId('card-toggle-discovery-recipe-abc')).toBeTruthy();
  });

  it('renders aria-label "Turn on Ask the Family for this recipe" when isDiscoverable is false', () => {
    render(
      <StackActionBar
        currentRecipe={makeRecipe({ isDiscoverable: false })}
        currentIndex={0}
        totalCount={5}
        onToggleIndividualCuration={vi.fn()}
      />
    );
    const btn = screen.getByTestId('card-toggle-discovery-recipe-abc');
    expect(btn.getAttribute('aria-label')).toBe('Turn on Discovery for this recipe');
  });

  it('renders aria-label "Turn off Discovery for this recipe" when isDiscoverable is true', () => {
    render(
      <StackActionBar
        currentRecipe={makeRecipe({ isDiscoverable: true })}
        currentIndex={0}
        totalCount={5}
        onToggleIndividualCuration={vi.fn()}
      />
    );
    const btn = screen.getByTestId('card-toggle-discovery-recipe-abc');
    expect(btn.getAttribute('aria-label')).toBe('Turn off Discovery for this recipe');
  });
});

// ---------------------------------------------------------------------------
// Discoverable toggle — interaction
// ---------------------------------------------------------------------------

describe('StackActionBar — toggle interaction', () => {
  it('calls onToggleDiscoverable with (recipeId, true) when toggled from false', async () => {
    const onToggle = vi.fn().mockResolvedValue(undefined);
    render(
      <StackActionBar
        currentRecipe={makeRecipe({ isDiscoverable: false })}
        currentIndex={0}
        totalCount={5}
        onToggleIndividualCuration={onToggle}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('card-toggle-discovery-recipe-abc'));
    });

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith('recipe-abc', true);
    });
  });

  it('calls onToggleDiscoverable with (recipeId, false) when toggled from true', async () => {
    const onToggle = vi.fn().mockResolvedValue(undefined);
    render(
      <StackActionBar
        currentRecipe={makeRecipe({ isDiscoverable: true })}
        currentIndex={0}
        totalCount={5}
        onToggleIndividualCuration={onToggle}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('card-toggle-discovery-recipe-abc'));
    });

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith('recipe-abc', false);
    });
  });

  it('optimistically updates aria-label before the promise resolves', async () => {
    let resolveToggle!: () => void;
    const onToggle = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveToggle = resolve;
        })
    );

    render(
      <StackActionBar
        currentRecipe={makeRecipe({ isDiscoverable: false })}
        currentIndex={0}
        totalCount={5}
        onToggleIndividualCuration={onToggle}
      />
    );

    const btn = screen.getByTestId('card-toggle-discovery-recipe-abc');
    expect(btn.getAttribute('aria-label')).toBe('Turn on Discovery for this recipe');

    await act(async () => {
      fireEvent.click(btn);
    });

    // Optimistic update should flip the label immediately
    await waitFor(() => {
      expect(btn.getAttribute('aria-label')).toBe('Turn off Discovery for this recipe');
    });

    // Resolve the promise
    act(() => resolveToggle());
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('StackActionBar — loading state', () => {
  it('shows loading indicator while toggle is in flight', async () => {
    let resolveToggle!: () => void;
    const onToggle = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveToggle = resolve;
        })
    );

    render(
      <StackActionBar
        currentRecipe={defaultRecipe}
        currentIndex={0}
        totalCount={5}
        onToggleIndividualCuration={onToggle}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('card-toggle-discovery-recipe-abc'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('card-toggle-discovery-recipe-abc-loading')).toBeTruthy();
    });

    // Resolve and loading indicator should disappear
    act(() => resolveToggle());

    await waitFor(() => {
      expect(screen.queryByTestId('card-toggle-discovery-recipe-abc-loading')).toBeNull();
    });
  });

  it('disables the toggle button while loading', async () => {
    let resolveToggle!: () => void;
    const onToggle = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveToggle = resolve;
        })
    );

    render(
      <StackActionBar
        currentRecipe={defaultRecipe}
        currentIndex={0}
        totalCount={5}
        onToggleIndividualCuration={onToggle}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('card-toggle-discovery-recipe-abc'));
    });

    await waitFor(() => {
      const btn = screen.getByTestId(
        'card-toggle-discovery-recipe-abc-loading'
      ) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    act(() => resolveToggle());
  });
});

// ---------------------------------------------------------------------------
// Error handling — revert on failure
// ---------------------------------------------------------------------------

describe('StackActionBar — error handling', () => {
  it('reverts toggle state when onToggleDiscoverable rejects', async () => {
    const onToggle = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <StackActionBar
        currentRecipe={makeRecipe({ isDiscoverable: false })}
        currentIndex={0}
        totalCount={5}
        onToggleIndividualCuration={onToggle}
      />
    );

    const btn = screen.getByTestId('card-toggle-discovery-recipe-abc');
    expect(btn.getAttribute('aria-label')).toBe('Turn on Discovery for this recipe');

    await act(async () => {
      fireEvent.click(btn);
    });

    // After rejection, should revert back to original state
    await waitFor(() => {
      expect(btn.getAttribute('aria-label')).toBe('Turn on Discovery for this recipe');
    });
  });

  it('clears loading state after error', async () => {
    const onToggle = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <StackActionBar
        currentRecipe={defaultRecipe}
        currentIndex={0}
        totalCount={5}
        onToggleIndividualCuration={onToggle}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('card-toggle-discovery-recipe-abc'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('card-toggle-discovery-recipe-abc-loading')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Card change — sync state when front card changes
// ---------------------------------------------------------------------------

describe('StackActionBar — card change sync', () => {
  it('updates toggle state when currentRecipe changes to a different card', () => {
    const recipeA = makeRecipe({ id: 'recipe-a', isDiscoverable: false });
    const recipeB = makeRecipe({ id: 'recipe-b', isDiscoverable: true });

    const { rerender } = render(
      <StackActionBar
        currentRecipe={recipeA}
        currentIndex={0}
        totalCount={5}
        onToggleIndividualCuration={vi.fn()}
      />
    );

    expect(screen.getByTestId('card-toggle-discovery-recipe-a').getAttribute('aria-label')).toBe(
      'Turn on Discovery for this recipe'
    );

    rerender(
      <StackActionBar
        currentRecipe={recipeB}
        currentIndex={1}
        totalCount={5}
        onToggleIndividualCuration={vi.fn()}
      />
    );

    expect(screen.getByTestId('card-toggle-discovery-recipe-b').getAttribute('aria-label')).toBe(
      'Turn off Discovery for this recipe'
    );
  });

  it('updates data-testid when front card changes', () => {
    const recipeA = makeRecipe({ id: 'recipe-a' });
    const recipeB = makeRecipe({ id: 'recipe-b' });

    const { rerender } = render(
      <StackActionBar
        currentRecipe={recipeA}
        currentIndex={0}
        totalCount={5}
        onToggleIndividualCuration={vi.fn()}
      />
    );

    expect(screen.getByTestId('card-toggle-discovery-recipe-a')).toBeTruthy();
    expect(screen.queryByTestId('card-toggle-discovery-recipe-b')).toBeNull();

    rerender(
      <StackActionBar
        currentRecipe={recipeB}
        currentIndex={1}
        totalCount={5}
        onToggleIndividualCuration={vi.fn()}
      />
    );

    expect(screen.queryByTestId('card-toggle-discovery-recipe-a')).toBeNull();
    expect(screen.getByTestId('card-toggle-discovery-recipe-b')).toBeTruthy();
  });
});
