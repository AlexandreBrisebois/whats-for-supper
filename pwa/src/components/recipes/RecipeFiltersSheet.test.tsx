import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  RecipeSearchFilterDiscoveryDto,
  RecipeSearchFiltersDto,
  RecipeSearchPreferencesDto,
} from '@/lib/api/generated/models/index';
import { setLocale } from '@/locales';
import { RecipeFiltersSheet } from './RecipeFiltersSheet';

const metadata = (overrides: Partial<RecipeSearchFilterDiscoveryDto> = {}) =>
  ({
    main: [
      { id: 'beef', concept: 'beef' },
      { id: 'poultry', concept: 'poultry' },
      { id: 'pork', concept: 'pork' },
      { id: 'fish', concept: 'fish' },
      { id: 'pasta', concept: 'pasta' },
      { id: 'vegetarian', concept: 'vegetarian' },
      { id: 'taco-night', concept: 'tacos', label: 'Taco night' },
    ],
    mealTypes: ['Supper', 'Lunch', 'Breakfast', 'Dessert'],
    cuisines: { promoted: ['Japanese', 'Mexican'], all: ['French', 'Japanese', 'Mexican'] },
    ...overrides,
  }) as RecipeSearchFilterDiscoveryDto;

function renderSheet(
  activeFilters: RecipeSearchFiltersDto = {},
  activePreferences: RecipeSearchPreferencesDto = {},
  filterMetadata: RecipeSearchFilterDiscoveryDto | null = metadata()
) {
  const onApply = vi.fn();
  const onClose = vi.fn();
  render(
    <RecipeFiltersSheet
      activeFilters={activeFilters}
      activePreferences={activePreferences}
      filterMetadata={filterMetadata}
      onApply={onApply}
      onClose={onClose}
    />
  );
  return { onApply, onClose };
}

describe('RecipeFiltersSheet', () => {
  afterEach(() => setLocale('en'));

  it('uses the required compact section order and hides management filters by default', () => {
    renderSheet();

    const dialog = screen.getByRole('dialog', { name: 'Filter recipes' });
    const headings = within(dialog)
      .getAllByRole('heading')
      .slice(1)
      .map((heading) => heading.textContent);
    expect(headings).toEqual(['Shortcuts', 'Meal', 'Focus', 'Cuisine']);
    expect(within(dialog).getByRole('button', { name: 'Quick' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Family Favorite' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Never Tried' })).toBeVisible();
    expect(within(dialog).queryByRole('button', { name: 'New' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'More filters' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('localizes the section headings in French', () => {
    setLocale('fr');
    renderSheet();

    const headings = within(screen.getByRole('dialog', { name: 'Filtrer les recettes' }))
      .getAllByRole('heading')
      .slice(1)
      .map((heading) => heading.textContent);
    expect(headings).toEqual(['Raccourcis', 'Repas', 'Vedette', 'Cuisine']);
  });

  it('reveals management choices last with an accessible disclosure state', () => {
    renderSheet();

    const moreFilters = screen.getByRole('button', { name: 'More filters' });
    fireEvent.click(moreFilters);

    expect(moreFilters).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'New' })).toBeVisible();
    const choices = screen
      .getAllByTestId(
        /mobile-filter-(new-recipes|not-cooked-long-time|healthy|reported|ready-to-review)/
      )
      .map((choice) => choice.textContent);
    expect(choices).toEqual([
      'New',
      "It's Been a While",
      'Healthy Choice',
      'Reported',
      'Ready to review',
    ]);
  });

  it('uses custom Main labels, discloses remaining choices, and retains selected chips after collapse', () => {
    renderSheet({ reportedOnly: true }, { concepts: ['tacos'] });

    expect(screen.getByRole('button', { name: 'Taco night' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    const allMain = screen.getByRole('button', { name: 'All Main choices' });
    expect(allMain).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(allMain);
    expect(screen.getByRole('button', { name: 'Taco night' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const moreFilters = screen.getByRole('button', { name: 'More filters' });
    fireEvent.click(moreFilters);
    expect(screen.getByRole('button', { name: 'Reported' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(moreFilters);
    expect(screen.getByRole('button', { name: 'Reported' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(allMain);
    expect(screen.getByRole('button', { name: 'Taco night' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('hides absent cuisines and maps Main, Meal Type, and Cuisine selections into their request fields', () => {
    const { onApply } = renderSheet({}, {}, metadata({ cuisines: { promoted: [], all: [] } }));
    expect(screen.queryByRole('heading', { name: 'Cuisine' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Supper' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(onApply).toHaveBeenCalledWith({
      filters: { mealTypes: ['Supper'] },
      preferences: { concepts: ['fish'] },
    });
  });

  it('keeps draft Apply, Clear, and Cancel behavior with reachable actions', () => {
    const { onApply, onClose } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Quick' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(onApply).toHaveBeenCalledWith({ filters: {}, preferences: {} });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
