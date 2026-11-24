import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Recipe } from '@/lib/api/recipes';

const mockGetRecipe = vi.fn();
const mockResolveRecipeImportIssue = vi.fn();
const mockDeleteRecipe = vi.fn();

vi.mock('@/lib/api/recipes', () => ({
  getRecipe: (...args: unknown[]) => mockGetRecipe(...args),
  resolveRecipeImportIssue: (...args: unknown[]) => mockResolveRecipeImportIssue(...args),
  deleteRecipe: (...args: unknown[]) => mockDeleteRecipe(...args),
}));

vi.mock('@/components/common/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en', setCurrentLocale: vi.fn() }),
}));

import { PairedDuplicateReviewSheet } from './PairedDuplicateReviewSheet';

const newRecipe: Recipe = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Spaghetti Carbonara',
  description: 'Freshly imported copy',
  imageUrl: '/api/recipes/11111111-1111-4111-8111-111111111111/hero',
  totalTime: 'PT25M',
  category: 'Dinner',
  rating: 0,
  ingredients: ['Spaghetti', 'Eggs', 'Pancetta'],
  sourceType: 'url',
  canReimport: true,
  imageCount: 1,
  finishedDishIndex: 0,
  isReady: true,
  importIssue: {
    reasons: ['duplicate'],
    note: null,
    status: 'reported',
    suspectedDuplicateRecipeId: '22222222-2222-4222-8222-222222222222',
  },
};

const existingRecipe: Recipe = {
  ...newRecipe,
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Classic Carbonara',
  description: 'Existing family recipe',
  imageUrl: '/api/recipes/22222222-2222-4222-8222-222222222222/hero',
  importIssue: null,
};

describe('PairedDuplicateReviewSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRecipe.mockResolvedValue(existingRecipe);
    mockResolveRecipeImportIssue.mockResolvedValue({ ...newRecipe, importIssue: null });
    mockDeleteRecipe.mockResolvedValue(undefined);
  });

  it('loads the existing recipe and displays NEW IMPORT and EXISTING IN LIBRARY cards', async () => {
    render(
      <PairedDuplicateReviewSheet
        open
        newRecipe={newRecipe}
        existingRecipeId={existingRecipe.id}
        onClose={vi.fn()}
        onKeepBothComplete={vi.fn()}
        onNewMovedToBin={vi.fn()}
        onExistingMovedToBin={vi.fn()}
      />
    );

    expect(await screen.findByText('Classic Carbonara')).toBeInTheDocument();
    expect(screen.getByText('Spaghetti Carbonara')).toBeInTheDocument();
    expect(screen.getByText(/New import/i)).toBeInTheDocument();
    expect(screen.getByText(/Existing in library/i)).toBeInTheDocument();
  });

  it('resolves duplicate issue when Keep both recipes is activated', async () => {
    const onKeepBothComplete = vi.fn();
    render(
      <PairedDuplicateReviewSheet
        open
        newRecipe={newRecipe}
        existingRecipeId={existingRecipe.id}
        onClose={vi.fn()}
        onKeepBothComplete={onKeepBothComplete}
        onNewMovedToBin={vi.fn()}
        onExistingMovedToBin={vi.fn()}
      />
    );

    await screen.findByText('Classic Carbonara');
    fireEvent.click(screen.getByRole('button', { name: /Keep both recipes/i }));

    await waitFor(() => {
      expect(mockResolveRecipeImportIssue).toHaveBeenCalledWith(newRecipe.id);
      expect(onKeepBothComplete).toHaveBeenCalled();
    });
  });

  it('soft-deletes new recipe when Keep existing · move new to Bin is activated', async () => {
    const onNewMovedToBin = vi.fn();
    render(
      <PairedDuplicateReviewSheet
        open
        newRecipe={newRecipe}
        existingRecipeId={existingRecipe.id}
        onClose={vi.fn()}
        onKeepBothComplete={vi.fn()}
        onNewMovedToBin={onNewMovedToBin}
        onExistingMovedToBin={vi.fn()}
      />
    );

    await screen.findByText('Classic Carbonara');
    fireEvent.click(screen.getByRole('button', { name: /Keep existing · move new to Bin/i }));

    await waitFor(() => {
      expect(mockDeleteRecipe).toHaveBeenCalledWith(newRecipe.id);
      expect(onNewMovedToBin).toHaveBeenCalled();
    });
  });

  it('soft-deletes existing recipe and clears report when Keep new · move existing to Bin is activated', async () => {
    const onExistingMovedToBin = vi.fn();
    render(
      <PairedDuplicateReviewSheet
        open
        newRecipe={newRecipe}
        existingRecipeId={existingRecipe.id}
        onClose={vi.fn()}
        onKeepBothComplete={vi.fn()}
        onNewMovedToBin={vi.fn()}
        onExistingMovedToBin={onExistingMovedToBin}
      />
    );

    await screen.findByText('Classic Carbonara');
    fireEvent.click(screen.getByRole('button', { name: /Keep new · move existing to Bin/i }));

    await waitFor(() => {
      expect(mockDeleteRecipe).toHaveBeenCalledWith(existingRecipe.id);
      expect(mockResolveRecipeImportIssue).toHaveBeenCalledWith(newRecipe.id);
      expect(onExistingMovedToBin).toHaveBeenCalled();
    });
  });
});
