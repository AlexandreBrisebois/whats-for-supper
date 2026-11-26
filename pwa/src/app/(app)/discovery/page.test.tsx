import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_IDS } from '@/testing/mock-ids';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { usePlannerStore } from '@/store/plannerStore';
import { useUiStore } from '@/store/uiStore';
import {
  clearHandoffLock,
  getHandoffLock,
  setHandoffLock,
  setPassThePhoneEnabled,
} from '@/lib/discovery/passThePhone';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getCategories: vi.fn(),
  getDiscoveryStack: vi.fn(),
  submitVote: vi.fn(),
  getVotingSession: vi.fn(),
  readQuickVotesSettings: vi.fn(),
  getVotingLink: vi.fn(),
  selectFamilyMember: vi.fn(),
  familyState: {
    selectedFamilyMemberId: '550e8400-e29b-41d4-a716-446655440001' as string | null,
    _hasHydrated: true,
    familyMembers: [
      { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Alex' },
      { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Jordan' },
      { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Sam' },
    ],
  },
}));

vi.mock('@/lib/auth', () => ({
  getVotingLink: (...args: unknown[]) => mocks.getVotingLink(...args),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/discovery',
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
  useFamily: () => ({
    selectedFamilyMemberId: mocks.familyState.selectedFamilyMemberId,
    _hasHydrated: mocks.familyState._hasHydrated,
    familyMembers: mocks.familyState.familyMembers,
    selectedMember:
      mocks.familyState.familyMembers.find(
        (m) => m.id === mocks.familyState.selectedFamilyMemberId
      ) ?? null,
    selectFamilyMember: (...args: unknown[]) => mocks.selectFamilyMember(...args),
  }),
}));

vi.mock('@/lib/api/discovery', () => ({
  getCategories: (...args: unknown[]) => mocks.getCategories(...args),
  getDiscoveryStack: (...args: unknown[]) => mocks.getDiscoveryStack(...args),
  submitVote: (...args: unknown[]) => mocks.submitVote(...args),
  getVotingSession: (...args: unknown[]) => mocks.getVotingSession(...args),
}));

vi.mock('@/lib/api/quick-votes', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/quick-votes')>('@/lib/api/quick-votes');
  return {
    ...actual,
    readQuickVotesSettings: (...args: unknown[]) => mocks.readQuickVotesSettings(...args),
  };
});

vi.mock('@/lib/imageUtils', () => ({
  getImageUrl: (path: string) => path,
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string, vars: Record<string, string | number>) =>
    Object.entries(vars ?? {}).reduce(
      (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
      fallback
    ),
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
    localStorage.clear();
    sessionStorage.clear();
    clearHandoffLock();
    setPassThePhoneEnabled(false);
    useUiStore.setState({ toasts: [] });
    mocks.push.mockReset();
    mocks.selectFamilyMember.mockReset().mockResolvedValue(undefined);
    mocks.familyState.selectedFamilyMemberId = MOCK_IDS.MEMBER_ALEX;
    mocks.familyState._hasHydrated = true;
    mocks.familyState.familyMembers = [
      { id: MOCK_IDS.MEMBER_ALEX, name: 'Alex' },
      { id: MOCK_IDS.MEMBER_JORDAN, name: 'Jordan' },
      { id: MOCK_IDS.MEMBER_TEST, name: 'Sam' },
    ];
    usePlannerStore.setState({ activeTab: 'grocery' });
    mocks.getCategories.mockReset();
    mocks.getDiscoveryStack.mockReset();
    mocks.submitVote.mockReset();
    mocks.readQuickVotesSettings.mockReset().mockResolvedValue({ enabled: false, targetLikes: 16 });
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
    expect(screen.getByRole('button', { name: 'Refresh recipe suggestions' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Refresh Feed' })).not.toBeInTheDocument();
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
    const celebration = screen.getByTestId('discovery-converged');
    expect(celebration.querySelector('p')).toBeEmptyDOMElement();
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

  it('uses Family Cookbook contrast classes on voting buttons, Just planned badge, and empty-state CTA', async () => {
    render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');

    const likeBtn = screen.getByTestId('like-button');
    const dislikeBtn = screen.getByTestId('dislike-button');
    expect(likeBtn).toHaveClass('text-garden-ink');
    expect(likeBtn).not.toHaveClass('text-sage');
    expect(dislikeBtn).toHaveClass('text-hearth-ink');

    mocks.getDiscoveryStack.mockResolvedValue(
      ORDERED_RECIPES.filter((r) => r.id !== MOCK_IDS.RECIPE_GNOCCHI)
    );
    await act(async () => useDiscoveryStore.getState().invalidateFillTheGap(0));
    const badge = await screen.findByTestId('just-planned-badge');
    expect(badge).toHaveClass('bg-sage-50', 'border-garden-line', 'text-garden-ink');
    expect(badge).not.toHaveClass('text-sage');

    mocks.getDiscoveryStack.mockResolvedValue([]);
    await act(async () => useDiscoveryStore.getState().setStack([]));
    const emptyState = await screen.findByTestId('discovery-empty-state');
    const primaryCta = emptyState.querySelector('button');
    expect(primaryCta).toHaveClass('bg-hearth-fill', 'text-cream-100', 'min-h-12');
    expect(primaryCta).not.toHaveClass('bg-ochre', 'hover:bg-ochre-dark');
  });

  it('hides Pass the phone when opt-in is OFF or cards remain, and shows it with Garden-outlined Nudge family when opt-in is ON and queue is empty', async () => {
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

    const view = render(<DiscoveryPage />);
    await screen.findByTestId('discovery-empty-state');
    expect(screen.queryByTestId('discovery-pass-the-phone')).not.toBeInTheDocument();

    await act(async () => {
      setPassThePhoneEnabled(true);
    });
    await waitFor(() => {
      expect(screen.getByTestId('discovery-pass-the-phone')).toBeVisible();
    });

    const nudgeBtn = screen.getByTestId('discovery-nudge-family');
    expect(nudgeBtn).toHaveClass('bg-white', 'border-garden-line', 'text-garden-ink');
    expect(nudgeBtn).not.toHaveClass('border-hearth-line');

    view.unmount();

    mocks.getDiscoveryStack.mockResolvedValue(ORDERED_RECIPES);
    render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');
    expect(screen.queryByTestId('discovery-pass-the-phone')).not.toBeInTheDocument();
  });

  it('renders pure celebration card with zero buttons during a locked turn when queue is empty', async () => {
    setPassThePhoneEnabled(true);
    mocks.familyState.selectedFamilyMemberId = MOCK_IDS.MEMBER_JORDAN;
    setHandoffLock({ originMemberId: MOCK_IDS.MEMBER_ALEX, participantName: 'Jordan' });
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
    const wrapUp = await screen.findByTestId('discovery-kid-wrap-up');
    expect(wrapUp).toHaveTextContent('Nice picks, Jordan!');
    expect(wrapUp.querySelectorAll('button')).toHaveLength(0);
    expect(screen.queryByTestId('discovery-pass-the-phone')).not.toBeInTheDocument();
    expect(screen.queryByTestId('discovery-nudge-family')).not.toBeInTheDocument();
    expect(screen.queryByTestId('like-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dislike-button')).not.toBeInTheDocument();
  });

  it('supports passing to a second sibling (Sam) after returning from Jordan to Alex', async () => {
    setPassThePhoneEnabled(true);
    mocks.selectFamilyMember.mockImplementation(async (id: string) => {
      mocks.familyState.selectedFamilyMemberId = id;
    });
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

    const view = render(<DiscoveryPage />);
    await screen.findByTestId('discovery-pass-the-phone');

    // Hand off to Jordan
    fireEvent.click(screen.getByTestId('discovery-pass-the-phone'));
    fireEvent.click(screen.getByTestId(`pass-the-phone-option-${MOCK_IDS.MEMBER_JORDAN}`));
    await act(async () => {
      fireEvent.click(screen.getByTestId('discovery-handoff-confirm'));
    });

    await waitFor(() => expect(getHandoffLock()?.participantName).toBe('Jordan'));
    view.rerender(<DiscoveryPage />);
    expect(await screen.findByTestId('discovery-kid-wrap-up')).toHaveTextContent(
      'Nice picks, Jordan!'
    );

    // Simulate returning to Alex and passing to Sam
    await act(async () => {
      clearHandoffLock();
      mocks.familyState.selectedFamilyMemberId = MOCK_IDS.MEMBER_ALEX;
    });
    view.rerender(<DiscoveryPage />);

    fireEvent.click(await screen.findByTestId('discovery-pass-the-phone'));
    fireEvent.click(screen.getByTestId(`pass-the-phone-option-${MOCK_IDS.MEMBER_TEST}`));
    await act(async () => {
      fireEvent.click(screen.getByTestId('discovery-handoff-confirm'));
    });

    expect(mocks.selectFamilyMember).toHaveBeenLastCalledWith(MOCK_IDS.MEMBER_TEST);
    expect(getHandoffLock()).toEqual({
      originMemberId: MOCK_IDS.MEMBER_ALEX,
      participantName: 'Sam',
    });

    view.rerender(<DiscoveryPage />);

    expect(await screen.findByTestId('discovery-kid-wrap-up')).toHaveTextContent(
      'Nice picks, Sam!'
    );
  });

  it('unlocks back to origin and adds closure toast before opening Planner when converged during a locked turn', async () => {
    setPassThePhoneEnabled(true);
    mocks.familyState.selectedFamilyMemberId = MOCK_IDS.MEMBER_JORDAN;
    setHandoffLock({ originMemberId: MOCK_IDS.MEMBER_ALEX, participantName: 'Jordan' });
    mocks.getVotingSession.mockResolvedValue({
      incarnationId: MOCK_IDS.MEMBER_TEST,
      revision: 1,
      roundId: MOCK_IDS.VOTING_ROUND,
      weekStartDate: '2026-05-04',
      phase: 'converged',
      requiredSlots: 3,
      coveredSlots: 3,
      candidateCount: 3,
      smartDefaults: { weekStartDate: '2026-05-04', preSelectedRecipes: [] },
    });

    render(<DiscoveryPage />);
    await screen.findByRole('heading', { name: "Menu's in!", level: 1 });

    const action = screen.getByTestId('discovery-see-matches');
    expect(action).toHaveTextContent('Back to Alex & see matches');

    fireEvent.click(action);

    await waitFor(() => {
      expect(mocks.selectFamilyMember).toHaveBeenCalledExactlyOnceWith(MOCK_IDS.MEMBER_ALEX);
    });
    expect(getHandoffLock()).toBeNull();
    expect(useUiStore.getState().toasts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'success',
          message: "Welcome back, Alex — Jordan's votes are saved.",
        }),
      ])
    );
    expect(usePlannerStore.getState().activeTab).toBe('planner');
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith(
      '/planner?weekOffset=0&referenceWeekStartDate=2026-05-04'
    );
  });

  it('waits for pending last-card vote to settle before switching member and never replays failed vote', async () => {
    setPassThePhoneEnabled(true);
    let rejectVote!: (err: Error) => void;
    mocks.submitVote.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectVote = reject;
        })
    );
    mocks.getDiscoveryStack.mockResolvedValueOnce([ORDERED_RECIPES[0]]).mockResolvedValue([]);

    const view = render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');

    fireEvent.click(screen.getByTestId('like-button'));
    await screen.findByTestId('discovery-empty-state');
    fireEvent.click(screen.getByTestId('discovery-pass-the-phone'));
    fireEvent.click(screen.getByTestId(`pass-the-phone-option-${MOCK_IDS.MEMBER_JORDAN}`));
    expect(getHandoffLock()).toEqual({
      originMemberId: MOCK_IDS.MEMBER_ALEX,
      participantName: 'Jordan',
      pendingTargetMemberId: MOCK_IDS.MEMBER_JORDAN,
    });
    fireEvent.click(screen.getByTestId('discovery-handoff-confirm'));

    await Promise.resolve();
    expect(mocks.selectFamilyMember).not.toHaveBeenCalled();
    expect(getHandoffLock()?.pendingTargetMemberId).toBe(MOCK_IDS.MEMBER_JORDAN);

    const stackCallsBeforeSwitch = mocks.getDiscoveryStack.mock.calls.length;
    await act(async () => {
      rejectVote(new Error('vote failed'));
    });

    await waitFor(() => {
      expect(mocks.selectFamilyMember).toHaveBeenCalledExactlyOnceWith(MOCK_IDS.MEMBER_JORDAN);
    });
    expect(mocks.submitVote).toHaveBeenCalledTimes(1);
    expect(getHandoffLock()).toEqual({
      originMemberId: MOCK_IDS.MEMBER_ALEX,
      participantName: 'Jordan',
    });

    await act(async () => {
      mocks.familyState.selectedFamilyMemberId = MOCK_IDS.MEMBER_JORDAN;
    });
    view.rerender(<DiscoveryPage />);
    await screen.findByTestId('discovery-kid-wrap-up');
    expect(mocks.getDiscoveryStack.mock.calls.length).toBe(stackCallsBeforeSwitch + 1);
  });

  it('resets local matchCount across Alex -> Jordan -> Alex turns', async () => {
    setPassThePhoneEnabled(true);
    mocks.selectFamilyMember.mockImplementation(async (id: string) => {
      mocks.familyState.selectedFamilyMemberId = id;
    });
    mocks.getDiscoveryStack
      .mockResolvedValueOnce([{ ...ORDERED_RECIPES[0], hasFamilyInterest: true }])
      .mockResolvedValue([]);
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

    const view = render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');
    fireEvent.click(screen.getByTestId('like-button'));
    await screen.findByTestId('discovery-empty-state');
    expect(screen.getByRole('button', { name: 'Go to Planner' })).toBeVisible();

    fireEvent.click(screen.getByTestId('discovery-pass-the-phone'));
    fireEvent.click(screen.getByTestId(`pass-the-phone-option-${MOCK_IDS.MEMBER_JORDAN}`));
    await act(async () => {
      fireEvent.click(screen.getByTestId('discovery-handoff-confirm'));
    });

    view.rerender(<DiscoveryPage />);
    await screen.findByTestId('discovery-kid-wrap-up');

    await act(async () => {
      clearHandoffLock();
      mocks.familyState.selectedFamilyMemberId = MOCK_IDS.MEMBER_ALEX;
    });
    view.rerender(<DiscoveryPage />);

    await screen.findByTestId('discovery-empty-state');
    expect(screen.getByRole('button', { name: 'Capture a New Recipe' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Go to Planner' })).not.toBeInTheDocument();
  });
});

describe('DiscoveryPage Quick Votes', () => {
  const collectingSession = {
    incarnationId: MOCK_IDS.MEMBER_TEST,
    revision: 1,
    roundId: MOCK_IDS.VOTING_ROUND,
    weekStartDate: '2026-05-04',
    phase: 'collecting',
    requiredSlots: 3,
    coveredSlots: 1,
    candidateCount: 2,
    smartDefaults: { weekStartDate: '2026-05-04', preSelectedRecipes: [] },
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearHandoffLock();
    setPassThePhoneEnabled(false);
    useUiStore.setState({ toasts: [] });
    useDiscoveryStore.setState({
      session: null,
      sessionStatus: 'unknown',
      hasPendingCards: false,
      pendingCardsAvailable: false,
      discoveryStack: [],
      activeCategory: null,
      fillTheGapVersion: 0,
      allSuggestionsVersion: 0,
      fillTheGapVersions: {},
    });
    mocks.push.mockReset();
    mocks.selectFamilyMember.mockReset().mockResolvedValue(undefined);
    mocks.familyState.selectedFamilyMemberId = MOCK_IDS.MEMBER_ALEX;
    mocks.familyState._hasHydrated = true;
    mocks.familyState.familyMembers = [
      { id: MOCK_IDS.MEMBER_ALEX, name: 'Alex' },
      { id: MOCK_IDS.MEMBER_JORDAN, name: 'Jordan' },
      { id: MOCK_IDS.MEMBER_TEST, name: 'Sam' },
    ];
    mocks.getCategories.mockReset().mockResolvedValue(['Supper']);
    mocks.getDiscoveryStack.mockReset().mockResolvedValue(ORDERED_RECIPES);
    mocks.submitVote.mockReset().mockResolvedValue(undefined);
    mocks.getVotingSession.mockReset().mockResolvedValue(collectingSession);
    mocks.readQuickVotesSettings.mockReset().mockResolvedValue({ enabled: true, targetLikes: 2 });
  });

  it('keeps swiping counter-free and ignores dislikes toward the Quick Votes target', async () => {
    render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/\b\d+\s*\/\s*\d+\b/)).not.toBeInTheDocument();
    expect(screen.queryByText(/remaining|left/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('dislike-button'));
    fireEvent.click(screen.getByTestId('dislike-button'));
    expect(screen.queryByTestId('discovery-quick-votes-checkin')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('like-button'));
    expect(screen.queryByTestId('discovery-quick-votes-checkin')).not.toBeInTheDocument();
    expect(screen.getByText('Fourth ranked recipe')).toBeVisible();
  });

  it('presents calm check-in after targetLikes with Keep voting, Pass the phone, and Nudge family, hiding thumb buttons', async () => {
    setPassThePhoneEnabled(true);
    render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');

    fireEvent.click(screen.getByTestId('like-button'));
    fireEvent.click(screen.getByTestId('like-button'));

    const checkIn = await screen.findByTestId('discovery-quick-votes-checkin');
    expect(checkIn).toBeVisible();
    expect(checkIn).toHaveTextContent('Your picks are in!');
    expect(checkIn).not.toHaveTextContent(/\d+/);
    expect(screen.getByTestId('discovery-quick-votes-keep-voting')).toBeVisible();
    expect(screen.getByTestId('discovery-pass-the-phone')).toBeVisible();
    expect(screen.getByTestId('discovery-nudge-family')).toBeVisible();
    expect(screen.queryByTestId('like-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dislike-button')).not.toBeInTheDocument();
  });

  it('omits Pass the phone and Nudge family when unavailable while keeping Keep voting usable', async () => {
    setPassThePhoneEnabled(false);
    mocks.getVotingSession.mockResolvedValue({
      incarnationId: MOCK_IDS.MEMBER_TEST,
      revision: 1,
      phase: 'unowned',
      roundId: null,
      weekStartDate: null,
      requiredSlots: null,
      coveredSlots: null,
      candidateCount: null,
      smartDefaults: null,
    });

    render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');

    fireEvent.click(screen.getByTestId('like-button'));
    fireEvent.click(screen.getByTestId('like-button'));

    await screen.findByTestId('discovery-quick-votes-checkin');
    expect(screen.getByTestId('discovery-quick-votes-keep-voting')).toBeVisible();
    expect(screen.queryByTestId('discovery-pass-the-phone')).not.toBeInTheDocument();
    expect(screen.queryByTestId('discovery-nudge-family')).not.toBeInTheDocument();
  });

  it('repeats every targetLikes after Keep voting without refetching and starts fresh on remount', async () => {
    const view = render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');
    const initialStackCalls = mocks.getDiscoveryStack.mock.calls.length;

    fireEvent.click(screen.getByTestId('like-button'));
    fireEvent.click(screen.getByTestId('like-button'));
    await screen.findByTestId('discovery-quick-votes-checkin');

    fireEvent.click(screen.getByTestId('discovery-quick-votes-keep-voting'));
    expect(screen.queryByTestId('discovery-quick-votes-checkin')).not.toBeInTheDocument();
    expect(screen.getByText('Third ranked recipe')).toBeVisible();
    expect(mocks.getDiscoveryStack).toHaveBeenCalledTimes(initialStackCalls);

    fireEvent.click(screen.getByTestId('like-button'));
    fireEvent.click(screen.getByTestId('like-button'));
    await screen.findByTestId('discovery-quick-votes-checkin');

    view.unmount();
    render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');
    expect(screen.queryByTestId('discovery-quick-votes-checkin')).not.toBeInTheDocument();
  });

  it('prioritizes convergence ("Menu\'s in!") on target-reaching like and while viewing check-in', async () => {
    render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');

    fireEvent.click(screen.getByTestId('like-button'));
    fireEvent.click(screen.getByTestId('like-button'));
    await screen.findByTestId('discovery-quick-votes-checkin');

    await act(async () => {
      useDiscoveryStore.getState().applySession(
        {
          ...collectingSession,
          revision: 2,
          phase: 'converged',
          coveredSlots: 3,
          candidateCount: 3,
        } as never,
        true
      );
    });

    expect(await screen.findByTestId('discovery-converged')).toBeVisible();
    expect(screen.queryByTestId('discovery-quick-votes-checkin')).not.toBeInTheDocument();
  });

  it("shows That's a wrap! when queue runs out before targetLikes and falls back silently on settings failure", async () => {
    mocks.getDiscoveryStack.mockResolvedValueOnce([ORDERED_RECIPES[0]]).mockResolvedValue([]);
    const firstView = render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');

    fireEvent.click(screen.getByTestId('like-button'));
    await screen.findByTestId('discovery-empty-state');
    expect(screen.queryByTestId('discovery-quick-votes-checkin')).not.toBeInTheDocument();

    firstView.unmount();
    mocks.readQuickVotesSettings.mockRejectedValueOnce(new Error('Settings down'));
    mocks.getDiscoveryStack.mockReset().mockResolvedValue(ORDERED_RECIPES);
    render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');
    fireEvent.click(screen.getByTestId('like-button'));
    fireEvent.click(screen.getByTestId('like-button'));
    expect(screen.queryByTestId('discovery-quick-votes-checkin')).not.toBeInTheDocument();
  });

  it('transitions locked Pass the phone turn straight to Nice picks celebration on targetLikes and sets handoffTurnCompleted', async () => {
    setPassThePhoneEnabled(true);
    setHandoffLock({ originMemberId: MOCK_IDS.MEMBER_ALEX, participantName: 'Jordan' });
    mocks.familyState.selectedFamilyMemberId = MOCK_IDS.MEMBER_JORDAN;

    const view = render(<DiscoveryPage />);
    await screen.findByText('Oldest ranked recipe');

    fireEvent.click(screen.getByTestId('like-button'));
    expect(screen.queryByTestId('discovery-kid-wrap-up')).not.toBeInTheDocument();
    expect(
      (useDiscoveryStore.getState() as { handoffTurnCompleted?: boolean }).handoffTurnCompleted
    ).toBe(false);

    fireEvent.click(screen.getByTestId('like-button'));

    const wrapUp = await screen.findByTestId('discovery-kid-wrap-up');
    expect(wrapUp).toBeVisible();
    expect(wrapUp).toHaveTextContent('Nice picks, Jordan!');
    expect(wrapUp.querySelectorAll('button')).toHaveLength(0);
    expect(screen.queryByTestId('discovery-quick-votes-checkin')).not.toBeInTheDocument();
    expect(screen.queryByTestId('like-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dislike-button')).not.toBeInTheDocument();
    expect(
      (useDiscoveryStore.getState() as { handoffTurnCompleted?: boolean }).handoffTurnCompleted
    ).toBe(true);

    view.unmount();
    expect(
      (useDiscoveryStore.getState() as { handoffTurnCompleted?: boolean }).handoffTurnCompleted
    ).toBe(false);
  });
});
