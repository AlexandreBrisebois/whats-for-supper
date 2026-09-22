import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_IDS } from '@/testing/mock-ids';
import { useDiscoveryStore } from '@/store/discoveryStore';

const mocks = vi.hoisted(() => ({
  getCategories: vi.fn(),
  getDiscoveryStack: vi.fn(),
  submitVote: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ selectedFamilyMemberId: MOCK_IDS.MEMBER_ALEX, _hasHydrated: true }),
}));

vi.mock('@/lib/api/discovery', () => ({
  getCategories: (...args: unknown[]) => mocks.getCategories(...args),
  getDiscoveryStack: (...args: unknown[]) => mocks.getDiscoveryStack(...args),
  submitVote: (...args: unknown[]) => mocks.submitVote(...args),
}));

vi.mock('@/lib/imageUtils', () => ({
  getImageUrl: (path: string) => path,
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string) => fallback,
}));

vi.mock('@/components/discovery/DiscoveryCard', () => ({
  DiscoveryCard: ({
    id,
    name,
    isFront,
    stackIndex,
    onSwipeRight,
  }: {
    id: string;
    name: string;
    isFront: boolean;
    stackIndex: number;
    onSwipeRight: () => void;
  }) => (
    <div
      data-testid="discovery-card"
      data-recipe-id={id}
      data-front={String(isFront)}
      data-stack-index={stackIndex}
    >
      {name}
      <button data-testid={`swipe-right-${id}`} onClick={onSwipeRight}>
        Swipe right
      </button>
    </div>
  ),
}));

import DiscoveryPage from './page';

const ORDERED_RECIPES = [
  { id: MOCK_IDS.RECIPE_LASAGNA, name: 'Oldest ranked recipe' },
  { id: MOCK_IDS.RECIPE_CHICKEN, name: 'Second ranked recipe' },
  { id: MOCK_IDS.RECIPE_GNOCCHI, name: 'Third ranked recipe' },
  { id: MOCK_IDS.RECIPE_CARBONARA, name: 'Fourth ranked recipe' },
  { id: MOCK_IDS.RECIPE_STIR_FRY, name: 'Fifth ranked recipe' },
  { id: MOCK_IDS.RECIPE_TACOS, name: 'Recently cooked recipe' },
].map((recipe) => ({
  ...recipe,
  description: 'Test description',
  imageUrl: '/test.jpg',
  totalTime: 'PT30M',
  category: 'Supper',
}));

describe('DiscoveryPage card order', () => {
  beforeEach(() => {
    mocks.getCategories.mockReset();
    mocks.getDiscoveryStack.mockReset();
    mocks.submitVote.mockReset();
    mocks.getCategories.mockResolvedValue(['Supper']);
    mocks.getDiscoveryStack.mockResolvedValue(ORDERED_RECIPES);
    mocks.submitVote.mockResolvedValue(undefined);
    useDiscoveryStore.setState({
      discoveryStack: [],
      activeCategory: null,
      hasPendingCards: false,
      fillTheGapVersion: 0,
    });
  });

  it('keeps the first four server recipes in direct stack order and votes for the front card', async () => {
    render(<DiscoveryPage />);

    await screen.findByText('Oldest ranked recipe');

    const cards = screen.getAllByTestId('discovery-card');
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.dataset.recipeId)).toEqual(
      ORDERED_RECIPES.slice(0, 4).map((recipe) => recipe.id)
    );
    expect(cards[0]).toHaveTextContent('Oldest ranked recipe');
    expect(cards[0]).toHaveAttribute('data-front', 'true');
    expect(cards.map((card) => card.dataset.stackIndex)).toEqual(['0', '1', '2', '3']);
    expect(screen.queryByText('Recently cooked recipe')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('like-button'));
    await waitFor(() => expect(mocks.submitVote).toHaveBeenCalledWith(MOCK_IDS.RECIPE_LASAGNA, 1));

    fireEvent.click(screen.getByTestId(`swipe-right-${MOCK_IDS.RECIPE_CHICKEN}`));
    await waitFor(() =>
      expect(mocks.submitVote).toHaveBeenLastCalledWith(MOCK_IDS.RECIPE_CHICKEN, 1)
    );
  });

  it('routes Dislike to the first server recipe, then the original second recipe', async () => {
    render(<DiscoveryPage />);

    await screen.findByText('Oldest ranked recipe');

    await act(async () => {
      fireEvent.click(screen.getByTestId('dislike-button'));
    });
    await waitFor(() => expect(mocks.submitVote).toHaveBeenCalledWith(MOCK_IDS.RECIPE_LASAGNA, 2));

    fireEvent.click(screen.getByTestId('dislike-button'));
    await waitFor(() =>
      expect(mocks.submitVote).toHaveBeenLastCalledWith(MOCK_IDS.RECIPE_CHICKEN, 2)
    );
  });
});
