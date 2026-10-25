import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_IDS } from '@/testing/mock-ids';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { usePlannerStore } from '@/store/plannerStore';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getCategories: vi.fn(),
  getDiscoveryStack: vi.fn(),
  submitVote: vi.fn(),
  getVotingSession: vi.fn(),
  getVotingLink: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getVotingLink: (...args: unknown[]) => mocks.getVotingLink(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
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
  getVotingSession: (...args: unknown[]) => mocks.getVotingSession(...args),
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
    mocks.push.mockReset();
    usePlannerStore.setState({ activeTab: 'grocery' });
    mocks.getCategories.mockReset();
    mocks.getDiscoveryStack.mockReset();
    mocks.submitVote.mockReset();
    mocks.getVotingSession.mockResolvedValue({
      incarnationId: MOCK_IDS.MEMBER_TEST,
      revision: 0,
      phase: 'unowned',
      roundId: MOCK_IDS.VOTING_ROUND,
      weekStartDate: null,
      requiredSlots: null,
      coveredSlots: null,
      candidateCount: null,
      smartDefaults: null,
    });
    mocks.getCategories.mockResolvedValue(['Supper']);
    mocks.getDiscoveryStack.mockResolvedValue(ORDERED_RECIPES);
    mocks.submitVote.mockResolvedValue(undefined);
    mocks.getVotingLink.mockResolvedValue('http://example.com/discovery');
    useDiscoveryStore.setState({
      session: null,
      sessionStatus: 'unknown',
      discoveryStack: [],
      activeCategory: null,
      hasPendingCards: false,
      fillTheGapVersion: 0,
      allSuggestionsVersion: 0,
    });
  });

  it('rereads session after a vote response fails because persistence may have succeeded', async () => {
    mocks.submitVote.mockRejectedValueOnce(new Error('response lost'));
    render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');
    await waitFor(() => expect(useDiscoveryStore.getState().sessionStatus).toBe('ready'));
    const reads = mocks.getVotingSession.mock.calls.length;
    fireEvent.click(screen.getByTestId('like-button'));
    await waitFor(() => expect(mocks.getDiscoveryStack.mock.calls.length).toBeGreaterThan(1));
    expect(mocks.getVotingSession.mock.calls.length).toBeGreaterThan(reads);
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

  it('removes cooled-down cards without claiming they were just planned', async () => {
    render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');
    mocks.getDiscoveryStack.mockResolvedValue(
      ORDERED_RECIPES.filter((r) => r.id !== MOCK_IDS.RECIPE_GNOCCHI)
    );
    await act(async () => useDiscoveryStore.getState().invalidateAllSuggestions());
    await waitFor(() => expect(screen.queryByText('Third ranked recipe')).not.toBeInTheDocument());
    expect(screen.queryByText(/Just planned/)).not.toBeInTheDocument();
  });

  it('restores cards into an empty stack after global rotation invalidation', async () => {
    mocks.getCategories.mockResolvedValue([]);
    mocks.getDiscoveryStack.mockResolvedValue([]);
    render(<DiscoveryPage />);
    await waitFor(() => expect(mocks.getDiscoveryStack).toHaveBeenCalled());
    mocks.getDiscoveryStack.mockResolvedValue(ORDERED_RECIPES);
    await act(async () => useDiscoveryStore.getState().invalidateAllSuggestions());
    await screen.findByText('Oldest ranked recipe');
    expect(screen.queryByText(/Just planned/)).not.toBeInTheDocument();
  });

  it('does not resurrect a swiped card from an older invalidation response', async () => {
    render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');
    let resolveRefresh!: (value: typeof ORDERED_RECIPES) => void;
    mocks.getDiscoveryStack.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        })
    );
    await act(async () => useDiscoveryStore.getState().invalidateAllSuggestions());
    await waitFor(() => expect(mocks.getDiscoveryStack).toHaveBeenCalledTimes(2));
    await act(async () => fireEvent.click(screen.getByTestId('like-button')));
    mocks.getDiscoveryStack.mockResolvedValue(ORDERED_RECIPES.slice(1));
    await act(async () => resolveRefresh(ORDERED_RECIPES));
    expect(screen.queryByText('Oldest ranked recipe')).not.toBeInTheDocument();
    expect(screen.getByText('Second ranked recipe')).toBeVisible();
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
  it('offers the shared family nudge and Capture when an owned feed is exhausted', async () => {
    mocks.getDiscoveryStack.mockResolvedValue([]);
    mocks.getVotingSession.mockResolvedValue({
      incarnationId: MOCK_IDS.MEMBER_TEST,
      revision: 1,
      roundId: MOCK_IDS.VOTING_ROUND,
      weekStartDate: '2026-05-04',
      phase: 'collecting',
      requiredSlots: 3,
      coveredSlots: 0,
      candidateCount: 0,
      smartDefaults: { weekStartDate: '2026-05-04', preSelectedRecipes: [] },
    });
    render(<DiscoveryPage />);
    await screen.findByTestId('discovery-empty-state');
    expect(screen.getByRole('button', { name: 'Capture a New Recipe' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Refresh Feed' })).toBeVisible();
    expect(mocks.getVotingLink).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('discovery-nudge-family'));
    await screen.findByText('http://example.com/discovery');
    expect(screen.getByTestId('planner-nudge-copy')).toBeEnabled();
    fireEvent.click(screen.getByTestId('planner-nudge-close'));
    expect(screen.queryByTestId('planner-nudge-dialog')).not.toBeInTheDocument();
  });

  it('shows a stable polite success card and opens the completed week meal plan only on click', async () => {
    const snapshot = {
      incarnationId: MOCK_IDS.MEMBER_TEST,
      revision: 1,
      roundId: MOCK_IDS.VOTING_ROUND,
      weekStartDate: '2026-05-04',
      phase: 'converged',
      requiredSlots: 3,
      coveredSlots: 3,
      candidateCount: 3,
      smartDefaults: { weekStartDate: '2026-05-04', preSelectedRecipes: [] },
    };
    mocks.getVotingSession.mockResolvedValue(snapshot);
    render(<DiscoveryPage />);
    await screen.findByRole('heading', { name: "Menu's in!", level: 1 });
    expect(screen.getByText('Your family found its matches.')).toBeVisible();
    const celebration = screen.getByTestId('discovery-converged');
    expect(celebration).toHaveAttribute('role', 'status');
    expect(celebration).toHaveAttribute('aria-live', 'polite');
    expect(celebration.querySelector('img')).toBeNull();
    expect(screen.queryByTestId('like-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('discovery-nudge-family')).not.toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(usePlannerStore.getState().activeTab).toBe('grocery');
    const action = screen.getByRole('button', { name: 'See your matches' });
    await act(async () =>
      useDiscoveryStore.getState().applySession(
        {
          ...useDiscoveryStore.getState().session!,
          revision: 2,
          candidateCount: 4,
        },
        true
      )
    );
    expect(screen.getByTestId('discovery-converged')).toBe(celebration);
    expect(screen.getByRole('button', { name: 'See your matches' })).toBe(action);
    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.click(action);
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith(
      '/planner?weekOffset=0&referenceWeekStartDate=2026-05-04'
    );
    expect(usePlannerStore.getState().activeTab).toBe('planner');
    expect(useDiscoveryStore.getState().session?.phase).toBe('converged');
    expect(mocks.submitVote).not.toHaveBeenCalled();
  });

  it('keeps Capture directly available when local matches make Planner the empty-feed destination', async () => {
    mocks.getDiscoveryStack.mockResolvedValue([{ ...ORDERED_RECIPES[0], hasFamilyInterest: true }]);
    mocks.getVotingSession.mockResolvedValue({
      incarnationId: MOCK_IDS.MEMBER_TEST,
      revision: 1,
      roundId: MOCK_IDS.VOTING_ROUND,
      weekStartDate: '2026-05-04',
      phase: 'collecting',
      requiredSlots: 3,
      coveredSlots: 1,
      candidateCount: 1,
      smartDefaults: { weekStartDate: '2026-05-04', preSelectedRecipes: [] },
    });
    render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');
    fireEvent.click(screen.getByTestId('like-button'));
    await screen.findByTestId('discovery-empty-state');
    expect(screen.getByRole('button', { name: 'Go to Planner' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Capture a New Recipe' })).toBeVisible();
    expect(screen.getByTestId('discovery-nudge-family')).toBeVisible();
  });
});
