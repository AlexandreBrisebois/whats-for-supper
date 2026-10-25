import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setLocale } from '@/locales';

const fixture = vi.hoisted(() => ({
  recipe: {
    id: 'duration-recipe',
    name: 'Slow supper',
    totalTime: undefined as string | null | undefined,
  },
  loadActiveGoTo: vi.fn().mockResolvedValue(null),
  sync: vi.fn(),
}));

// Stub only surrounding state/navigation and unrelated dialogs. The Home → card →
// formatter → translation seam stays real, including framer-motion rendering.
vi.mock('@/lib/api/api-client', () => ({
  apiClient: { api: { schedule: { get: vi.fn().mockResolvedValue({}) } } },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/home/HomeSections', () => ({
  QuickCaptureTrigger: () => null,
  CookedSuccessCard: () => null,
  VotingNudgeCard: () => null,
  BrowseLibraryTrigger: () => null,
}));
vi.mock('@/components/home/TonightPivotCard', () => ({ TonightPivotCard: () => null }));
vi.mock('@/components/home/SkipRecoveryDialog', () => ({ SkipRecoveryDialog: () => null }));
vi.mock('@/components/planner/QuickFindModal', () => ({ QuickFindModal: () => null }));
vi.mock('@/components/planner/CooksMode', () => ({ CooksMode: () => null }));
vi.mock('@/store/todayStore', () => ({
  useTodayStore: () => ({
    currentRecipe: fixture.recipe,
    status: 0,
    isLoading: false,
    sync: fixture.sync,
  }),
}));
vi.mock('@/store/familyStore', () => ({
  useFamilyStore: () => ({ loadActiveGoTo: fixture.loadActiveGoTo }),
}));
vi.mock('@/store/gotoStore', () => ({
  useGotoStore: (selector: (state: unknown) => unknown) => selector({ isReady: () => false }),
}));

import { HomeCommandCenter } from './HomeCommandCenter';

beforeEach(() => {
  localStorage.clear();
  fixture.recipe.totalTime = undefined;
});

describe.each(['en', 'fr'] as const)('Home total duration (%s)', (locale) => {
  it.each([
    ['PT6H', '6H'],
    ['PT1H30M', '1H 30 MINS'],
    ['PT45M', '45 MINS'],
    ['PT360M', '6H'],
    [undefined, '30 MINS'],
    [null, '30 MINS'],
    ['', '30 MINS'],
  ])('preserves %s through the real card and formatter', async (totalTime, expected) => {
    setLocale(locale);
    fixture.recipe.totalTime = totalTime;
    render(<HomeCommandCenter todaysRecipe={null} />);
    const card = await screen.findByTestId('tonight-menu-card');
    expect(card).toHaveTextContent(`${locale === 'fr' ? 'PRÊT EN' : 'READY IN'} ${expected}`);
  });
});
