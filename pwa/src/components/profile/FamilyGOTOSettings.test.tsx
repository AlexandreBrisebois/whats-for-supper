import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadSetting: vi.fn(),
  push: vi.fn(),
  gotoItems: [] as { description: string; recipeId: string; status: string }[],
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

vi.mock('@/store/familyStore', () => ({
  useFamilyStore: (selector?: (state: any) => any) => {
    const state = {
      loadSetting: (...args: unknown[]) => mocks.loadSetting(...args),
      loadGoTo: vi.fn().mockResolvedValue({ items: mocks.gotoItems }),
      saveGoTo: vi.fn().mockResolvedValue(undefined),
      familySettings: mocks.gotoItems.length > 0 ? { family_goto: { items: mocks.gotoItems } } : {},
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/store/gotoStore', () => ({
  useGotoStore: (selector?: (state: any) => any) => {
    const state = { readyRecipeIds: new Set<string>() };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      recipes: {
        byId: () => ({
          status: {
            get: vi.fn(),
          },
        }),
      },
    },
  },
}));

import { FamilyGOTOSettings } from './FamilyGOTOSettings';

describe('FamilyGOTOSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadSetting.mockResolvedValue(null);
    mocks.gotoItems = [];
  });

  it('points library selection to search instead of Quick Find', () => {
    render(<FamilyGOTOSettings />);

    fireEvent.click(screen.getByText(/Add a GOTO/i));

    expect(screen.getByTestId('goto-search-library')).toBeInTheDocument();
    expect(screen.getByText('Search the Library')).toBeInTheDocument();
    expect(
      screen.getByText('Find the recipe, then tap the star to make it your GOTO.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('goto-search-library'));

    expect(mocks.push).toHaveBeenCalledWith('/recipes');
    expect(screen.queryByTestId('quick-find-modal')).not.toBeInTheDocument();
  });

  // Migrated from settings.spec.ts: GOTO ready/pending rendering
  it('shows goto-recipe-name and hides goto-pending-spinner when GOTO status is ready', () => {
    mocks.gotoItems = [
      { description: 'Slow-cooked Lasagna', recipeId: 'recipe-lasagna', status: 'ready' },
    ];
    render(<FamilyGOTOSettings />);

    expect(screen.getByTestId('goto-recipe-name')).toBeInTheDocument();
    expect(screen.getByTestId('goto-recipe-name')).toHaveTextContent('Slow-cooked Lasagna');
    expect(screen.queryByTestId('goto-pending-spinner')).not.toBeInTheDocument();
  });

  it('shows goto-pending-spinner and goto-pending-description when GOTO status is pending', () => {
    mocks.gotoItems = [
      { description: "Grandma's Chicken Soup", recipeId: 'recipe-soup', status: 'pending' },
    ];
    render(<FamilyGOTOSettings />);

    expect(screen.getByTestId('goto-pending-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('goto-pending-description')).toHaveTextContent(
      "Grandma's Chicken Soup"
    );
    expect(screen.queryByTestId('goto-recipe-name')).not.toBeInTheDocument();
  });
});
