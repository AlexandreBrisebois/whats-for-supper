import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const searchRecipes = vi.fn();
  const push = vi.fn();
  let searchParams = new URLSearchParams('');

  return {
    searchRecipes,
    push,
    setSearchParams: (value: string) => {
      searchParams = new URLSearchParams(value);
    },
    getSearchParams: () => searchParams,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => mocks.getSearchParams(),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string) => fallback,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' '),
}));

vi.mock('@/lib/api/recipes', () => ({
  searchRecipes: (...args: unknown[]) => mocks.searchRecipes(...args),
}));

vi.mock('@/lib/api/planner', () => ({
  assignRecipeToDay: vi.fn(),
}));

import RecipesPage from './page';

function makeSearchResponse(overrides: Record<string, unknown> = {}) {
  return {
    topPick: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Chicken Soup',
      imageUrl: 'https://example.com/chicken-soup.jpg',
      totalTime: '30 min',
      difficulty: 'Easy',
      rating: 2,
      isDiscoverable: true,
      notes: null,
      reasons: [{ source: 'name-match', label: 'Name matches your search' }],
      plannerFitNote: null,
    },
    results: [
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Chicken Pasta',
        imageUrl: 'https://example.com/chicken-pasta.jpg',
        totalTime: '25 min',
        difficulty: 'Medium',
        rating: 1,
        isDiscoverable: true,
        notes: null,
        reasons: [{ source: 'name-match', label: 'Name matches your search' }],
        plannerFitNote: null,
      },
    ],
    appliedFilters: {},
    searchMode: 'standard',
    resultPath: 'lexical-only',
    ...overrides,
  };
}

describe('RecipesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setSearchParams('');
    mocks.searchRecipes.mockResolvedValue(makeSearchResponse());
  });

  it('renders the search input immediately and the placeholder controls after load', async () => {
    render(<RecipesPage />);

    expect(screen.getByTestId('recipe-search-input')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('agent-search-trigger')).toBeInTheDocument();
    });

    expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('recycle-bin-entry')).toBeInTheDocument();
  });

  it('fires recipe search on mount and again when Enter is pressed with the current query', async () => {
    render(<RecipesPage />);

    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenCalledWith({
        query: '',
        mode: 'standard',
        limit: 5,
        weekOffset: undefined,
        dayIndex: undefined,
      });
    });

    fireEvent.change(screen.getByTestId('recipe-search-input'), {
      target: { value: 'chicken' },
    });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });

    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenLastCalledWith({
        query: 'chicken',
        mode: 'standard',
        limit: 5,
        weekOffset: undefined,
        dayIndex: undefined,
      });
    });
  });

  it('renders the top pick card and alternate cards from the search response', async () => {
    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    expect(screen.getByTestId('recipe-card-top-pick')).toHaveTextContent('Chicken Soup');
    expect(
      screen.getByTestId('recipe-card-22222222-2222-2222-2222-222222222222')
    ).toBeInTheDocument();
  });

  it('renders the empty state when search returns no top pick and no results', async () => {
    mocks.searchRecipes.mockResolvedValue(
      makeSearchResponse({
        topPick: null,
        results: [],
      })
    );

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('search-empty-state')).toBeInTheDocument();
    });
  });

  it('shows planner mode banner when planner context is present', async () => {
    mocks.setSearchParams('addToDay=2&weekOffset=0');

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('planning-mode-banner')).toBeInTheDocument();
    });
  });
});
