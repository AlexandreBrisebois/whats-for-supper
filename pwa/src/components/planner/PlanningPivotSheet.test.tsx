import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const localeMock = vi.hoisted(() => {
  let language: 'en' | 'fr' = 'en';
  const dictionary: Record<string, { en: string; fr: string }> = {
    'planner.choosePathTitle': {
      en: 'Change this recipe',
      fr: 'Changer cette recette',
    },
    'planner.choosePathSubtitle': {
      en: 'Choose how to replace or remove this recipe',
      fr: 'Choisissez comment remplacer ou retirer cette recette',
    },
    'planner.quickFindAction': { en: 'Quick replace', fr: 'Remplacement rapide' },
    'planner.searchLibraryAction': { en: 'Search library', fr: 'Chercher dans la bibliothèque' },
    'planner.removeRecipeAction': { en: 'Remove recipe', fr: 'Retirer la recette' },
  };

  return {
    setLanguage: (next: 'en' | 'fr') => {
      language = next;
    },
    translate: (key: string, fallback: string) => dictionary[key]?.[language] ?? fallback,
  };
});

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/locales', () => ({
  t: (key: string, fallback: string) => localeMock.translate(key, fallback),
}));

import { PlanningPivotSheet } from './PlanningPivotSheet';

function renderSheet({ hasRecipe = true }: { hasRecipe?: boolean } = {}) {
  const onClose = vi.fn();
  const props = {
    isOpen: true,
    onClose,
    dayIndex: 2,
    onQuickFind: vi.fn(),
    onSearchLibrary: vi.fn(),
    onRemoveRecipe: vi.fn(),
    hasRecipe,
  };

  render(<PlanningPivotSheet {...props} />);
  return { onClose, props };
}

describe('PlanningPivotSheet', () => {
  it('renders explicit recipe-change copy in English', () => {
    localeMock.setLanguage('en');
    renderSheet();

    expect(screen.getByText('Change this recipe')).toBeInTheDocument();
    expect(screen.getByText('Choose how to replace or remove this recipe')).toBeInTheDocument();
    expect(screen.getByText('Quick replace')).toBeInTheDocument();
    expect(screen.getByText('Search library')).toBeInTheDocument();
    expect(screen.getByText('Remove recipe')).toBeInTheDocument();
  });

  it('renders explicit recipe-change copy in French', () => {
    localeMock.setLanguage('fr');
    renderSheet();

    expect(screen.getByText('Changer cette recette')).toBeInTheDocument();
    expect(
      screen.getByText('Choisissez comment remplacer ou retirer cette recette')
    ).toBeInTheDocument();
    expect(screen.getByText('Remplacement rapide')).toBeInTheDocument();
    expect(screen.getByText('Chercher dans la bibliothèque')).toBeInTheDocument();
    expect(screen.getByText('Retirer la recette')).toBeInTheDocument();
    expect(screen.queryByText(/repas/i)).not.toBeInTheDocument();
  });

  it('renders an explicit close button', () => {
    renderSheet();

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when the close button is pressed', () => {
    const { onClose } = renderSheet();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is pressed', () => {
    const { onClose } = renderSheet();

    fireEvent.click(screen.getByTestId('pivot-sheet-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders slot actions without whole-week voting controls', () => {
    renderSheet();

    expect(screen.getByTestId('pivot-quick-find')).toBeInTheDocument();
    expect(screen.getByTestId('pivot-search-library')).toBeInTheDocument();
    expect(screen.getByTestId('pivot-remove-recipe')).toBeInTheDocument();
    expect(screen.queryByTestId('pivot-ask-family')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pivot-nudge-family')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pivot-nudge-dialog')).not.toBeInTheDocument();
  });

  it('hides remove recipe when the selected slot has no recipe', () => {
    renderSheet({ hasRecipe: false });

    expect(screen.queryByTestId('pivot-remove-recipe')).not.toBeInTheDocument();
  });
});
