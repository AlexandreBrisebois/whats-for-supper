import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadSetting: vi.fn(),
  push: vi.fn(),
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
      loadGoTo: vi.fn().mockResolvedValue({ items: [] }),
      saveGoTo: vi.fn().mockResolvedValue(undefined),
      familySettings: {},
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/store/gotoStore', () => ({
  useGotoStore: () => ({
    isReady: vi.fn().mockReturnValue(false),
  }),
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
});
