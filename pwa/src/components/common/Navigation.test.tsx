import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pathname: '/recipes',
  push: vi.fn(),
  getCategories: vi.fn(),
  getVotingSession: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: (...args: unknown[]) => mocks.push(...args) }),
}));
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onNavigate,
    ...props
  }: React.PropsWithChildren<{
    href: string;
    onNavigate?: (e: { preventDefault: () => void }) => void;
  }>) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onNavigate?.({ preventDefault: () => {} });
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));
vi.mock('@/lib/api/discovery', () => ({
  getCategories: mocks.getCategories,
  getVotingSession: mocks.getVotingSession,
}));

import { LocaleProvider, useLocale } from '@/components/common/LocaleProvider';
import { setLocale } from '@/locales';
import { usePlannerStore } from '@/store/plannerStore';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { Navigation } from './Navigation';

const sessionFor = (phase: 'unowned' | 'collecting' | 'converged', revision = 1) =>
  ({
    incarnationId: 'inc-1',
    revision,
    phase,
    ...(phase === 'unowned'
      ? {}
      : {
          roundId: 'round-1',
          weekStartDate: '2026-10-12',
          requiredSlots: 5,
          coveredSlots: 2,
          candidateCount: 10,
          smartDefaults: { slots: [] },
        }),
  }) as any;

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setLocale('en');
    mocks.push = vi.fn();
    mocks.pathname = '/recipes';
    mocks.getCategories.mockResolvedValue([]);
    mocks.getVotingSession.mockResolvedValue(sessionFor('unowned'));
    useDiscoveryStore.setState({
      session: null,
      sessionStatus: 'unknown',
      hasPendingCards: false,
      discoveryStack: [],
      activeCategory: null,
      ...(Object.hasOwn(useDiscoveryStore.getState(), 'pendingCardsAvailable')
        ? { pendingCardsAvailable: false }
        : {}),
    } as any);
  });

  it('shows Recipes as the current library destination with a book icon', async () => {
    await act(async () => {
      render(<Navigation />);
    });

    const recipes = screen.getByRole('link', { name: 'Recipes' });
    expect(recipes).toHaveAttribute('href', '/recipes');
    expect(recipes).toHaveAttribute('aria-current', 'page');
    expect(recipes.querySelector('.lucide-book-open')).toBeInTheDocument();
    expect(recipes.querySelector('.lucide-search')).not.toBeInTheDocument();
  });

  it.each(['unowned', 'converged', null] as const)(
    'does not pulse Discover button when session phase is %s even if categories exist',
    async (phase) => {
      mocks.pathname = '/';
      mocks.getCategories.mockResolvedValue(['Poultry']);
      if (phase === null) {
        mocks.getVotingSession.mockRejectedValue(new Error('offline'));
      } else {
        mocks.getVotingSession.mockResolvedValue(sessionFor(phase));
      }

      render(<Navigation />);

      await waitFor(() => {
        expect(mocks.getCategories).toHaveBeenCalledTimes(1);
        expect(mocks.getVotingSession).toHaveBeenCalledTimes(1);
      });

      const discoverCircle = screen.getByTestId('nav-item-discovery').querySelector('div');
      expect(discoverCircle).not.toHaveClass('animate-pulse-ochre');
    }
  );

  it('pulses Discover button only when session phase is collecting, categories exist, and route is not /discovery', async () => {
    mocks.pathname = '/';
    mocks.getCategories.mockResolvedValue(['Poultry']);
    mocks.getVotingSession.mockResolvedValue(sessionFor('collecting', 1));

    const view = render(<Navigation />);

    await waitFor(() => {
      const circle = screen.getByTestId('nav-item-discovery').querySelector('div');
      expect(circle).toHaveClass('animate-pulse-ochre');
    });

    await act(async () => {
      useDiscoveryStore.getState().applySession(sessionFor('converged', 2), true);
    });
    expect(screen.getByTestId('nav-item-discovery').querySelector('div')).not.toHaveClass(
      'animate-pulse-ochre'
    );

    view.unmount();
    mocks.pathname = '/discovery';
    mocks.getVotingSession.mockResolvedValue(sessionFor('collecting', 3));
    render(<Navigation />);

    await waitFor(() => expect(mocks.getCategories).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('nav-item-discovery').querySelector('div')).not.toHaveClass(
      'animate-pulse-ochre'
    );
  });

  describe('three-state Discovery medallion', () => {
    const orbOf = () =>
      screen.getByTestId('nav-item-discovery').querySelector('div') as HTMLElement;

    it.each(['unowned', 'absent', 'unavailable'] as const)(
      'renders static ochre Compass Discovery for %s',
      async (state) => {
        mocks.pathname = '/home';
        mocks.getCategories.mockResolvedValue(['Poultry']);
        if (state === 'unavailable') mocks.getVotingSession.mockRejectedValue(new Error('offline'));
        else if (state === 'unowned')
          mocks.getVotingSession.mockResolvedValue(sessionFor('unowned'));
        render(
          <LocaleProvider>
            <Navigation />
          </LocaleProvider>
        );
        await waitFor(() => expect(mocks.getCategories).toHaveBeenCalled());
        const link = screen.getByTestId('nav-item-discovery');
        expect(orbOf()).toHaveClass('bg-ochre-100', 'text-sunlight-ink', 'border-sunlight-line');
        expect(orbOf()).not.toHaveClass('animate-pulse-ochre');
        expect(link.querySelector('.lucide-compass')).toBeInTheDocument();
        expect(link.querySelector('.lucide-check')).not.toBeInTheDocument();
        expect(link.querySelector('[data-testid="nav-discovery-pip"]')).not.toBeInTheDocument();
        expect(link).toHaveTextContent('Discovery');
      }
    );

    it('shows pulse, static pip and descriptive label while collecting off /discovery, and clears on /discovery or no cards', async () => {
      mocks.pathname = '/home';
      mocks.getCategories.mockResolvedValue(['Poultry']);
      mocks.getVotingSession.mockResolvedValue(sessionFor('collecting'));
      const view = render(
        <LocaleProvider>
          <Navigation />
        </LocaleProvider>
      );
      await waitFor(() => expect(orbOf()).toHaveClass('animate-pulse-ochre'));
      const link = screen.getByTestId('nav-item-discovery');
      const pip = link.querySelector('[data-testid="nav-discovery-pip"]');
      expect(pip).toHaveClass('bg-sunlight-ink');
      expect(pip).toHaveAttribute('aria-hidden', 'true');
      expect(link).toHaveAttribute('aria-label', 'Discovery — family is voting');

      await act(async () => {
        useDiscoveryStore.getState().setHasPendingCards(false);
      });
      expect(orbOf()).not.toHaveClass('animate-pulse-ochre');
      expect(link.querySelector('[data-testid="nav-discovery-pip"]')).not.toBeInTheDocument();

      view.unmount();
      mocks.pathname = '/discovery';
      render(<Navigation />);
      await waitFor(() => expect(mocks.getCategories).toHaveBeenCalledTimes(2));
      expect(orbOf()).not.toHaveClass('animate-pulse-ochre');
      expect(
        screen.getByTestId('nav-item-discovery').querySelector('[data-testid="nav-discovery-pip"]')
      ).not.toBeInTheDocument();
    });

    it.each([
      ['en', "Menu's in", "Menu's in — open meal plan matches"],
      ['fr', 'Menu prêt', 'Menu prêt — voir les choix du menu'],
    ] as const)(
      'renders persistent Garden green Check for converged (%s) on any route',
      async (loc, label, aria) => {
        setLocale(loc);
        mocks.pathname = '/planner';
        mocks.getVotingSession.mockResolvedValue(sessionFor('converged'));
        render(
          <LocaleProvider>
            <Navigation />
          </LocaleProvider>
        );
        const link = await screen.findByTestId('nav-item-discovery');
        await waitFor(() => expect(link.querySelector('.lucide-check')).toBeInTheDocument());
        expect(orbOf()).toHaveClass('bg-garden-fill', 'text-white', 'border-garden-fill-deep');
        expect(orbOf()).not.toHaveClass('bg-ochre-100', 'animate-pulse-ochre');
        expect(link.querySelector('.lucide-compass')).not.toBeInTheDocument();
        expect(link.querySelector('span')).toHaveClass('text-garden-ink');
        expect(link).toHaveTextContent(label);
        expect(link).toHaveAttribute('aria-label', aria);
      }
    );

    it('routes converged activation to the Planner Meals tab and falls back to /discovery without a valid week', async () => {
      const push = vi.fn();
      mocks.push = push;
      mocks.pathname = '/planner';
      mocks.getVotingSession.mockResolvedValue(sessionFor('converged'));
      usePlannerStore.getState().setActiveTab('grocery' as any);
      render(<Navigation />);
      const link = await screen.findByTestId('nav-item-discovery');
      await waitFor(() => expect(link.querySelector('.lucide-check')).toBeInTheDocument());
      expect(link).toHaveAttribute(
        'href',
        '/planner?weekOffset=0&referenceWeekStartDate=2026-10-12'
      );
      fireEvent.click(link);
      expect(usePlannerStore.getState().activeTab).toBe('planner');
      expect(push).toHaveBeenCalledWith('/planner?weekOffset=0&referenceWeekStartDate=2026-10-12');

      await act(async () => {
        // The store rejects such snapshots, so seed the state directly to exercise the guard.
        useDiscoveryStore.setState({
          session: { ...sessionFor('converged', 3), weekStartDate: undefined },
        } as any);
      });
      expect(screen.getByTestId('nav-item-discovery')).toHaveAttribute('href', '/discovery');

      await act(async () => {
        useDiscoveryStore.getState().applySession(sessionFor('unowned', 4), true);
      });
      const back = screen.getByTestId('nav-item-discovery');
      expect(back).toHaveTextContent('Discovery');
      expect(back).toHaveAttribute('href', '/discovery');
      expect(back.querySelector('.lucide-compass')).toBeInTheDocument();
    });
  });

  it('uses Family Cookbook tonal sunlit Discover medallion, >= 12px sentence-case labels, and min-h-12 targets', async () => {
    await act(async () => {
      render(
        <LocaleProvider>
          <Navigation />
        </LocaleProvider>
      );
    });

    const discoveryLink = screen.getByTestId('nav-item-discovery');
    expect(discoveryLink).toHaveClass('-top-3', 'min-h-12');
    expect(discoveryLink).not.toHaveClass('-top-4');

    const orb = discoveryLink.querySelector('div');
    expect(orb).toHaveClass(
      'h-16',
      'w-16',
      'bg-ochre-100',
      'text-sunlight-ink',
      'border-sunlight-line'
    );
    expect(orb).not.toHaveClass('h-20', 'w-20', 'bg-ochre');

    const discoveryLabel = discoveryLink.querySelector('span');
    expect(discoveryLabel).toHaveClass('text-xs', 'text-sunlight-ink');
    expect(discoveryLabel).not.toHaveClass('text-[9px]', 'uppercase', 'text-ochre');

    const homeLink = screen.getByTestId('nav-item-home');
    expect(homeLink).toHaveClass('min-h-12', 'text-xs', 'text-ink-muted');
    expect(homeLink).not.toHaveClass('text-[11px]', 'uppercase', 'text-charcoal-400');

    const recipesLink = screen.getByTestId('nav-item-recipes');
    expect(recipesLink).toHaveClass('min-h-12', 'text-xs', 'text-hearth-ink');
  });

  it('updates navigation labels at render time when locale changes without reload', async () => {
    function LocaleToggleHelper() {
      const { setCurrentLocale } = useLocale();
      return (
        <button type="button" onClick={() => setCurrentLocale('fr')}>
          Switch to FR
        </button>
      );
    }

    await act(async () => {
      render(
        <LocaleProvider>
          <LocaleToggleHelper />
          <Navigation />
        </LocaleProvider>
      );
    });

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Recipes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Discovery' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Planner' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to FR' }));

    expect(screen.getByRole('link', { name: 'Accueil' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Recettes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Découverte' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profil' })).toBeInTheDocument();
  });
});
