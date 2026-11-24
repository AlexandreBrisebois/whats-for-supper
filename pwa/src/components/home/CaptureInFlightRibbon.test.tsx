import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

let mockPendingRecipes: Array<{ recipeId: string; name?: string; submittedAt: number }> = [];
let mockLocale: 'en' | 'fr' = 'en';

vi.mock('@/store/captureStore', () => ({
  useCaptureStore: (selector: (state: { pendingRecipes: typeof mockPendingRecipes }) => unknown) =>
    selector({ pendingRecipes: mockPendingRecipes }),
}));

vi.mock('@/components/common/LocaleProvider', () => ({
  useLocale: () => ({ locale: mockLocale, setCurrentLocale: vi.fn() }),
}));

import { CaptureInFlightRibbon } from './CaptureInFlightRibbon';

describe('CaptureInFlightRibbon', () => {
  beforeEach(() => {
    mockLocale = 'en';
    mockPendingRecipes = [];
  });

  it('renders nothing when no captures are pending', () => {
    const { container } = render(<CaptureInFlightRibbon />);
    expect(container.firstChild).toBeNull();
  });

  it('renders opaque neutral card with Hearth pulsing dot, pending count, and 48px Add another link', () => {
    mockPendingRecipes = [{ recipeId: 'r-1', name: 'Lasagna', submittedAt: Date.now() }];
    render(<CaptureInFlightRibbon />);

    const ribbon = screen.getByTestId('capture-in-flight-ribbon');
    expect(ribbon).toHaveClass('bg-white', 'border-chrome-line');
    expect(screen.getByText(/Preparing 1 recipe in the background/i)).toBeInTheDocument();
    const pulse = screen.getByTestId('capture-in-flight-pulse');
    expect(pulse.className).toContain('bg-hearth-fill');
    expect(pulse.className).toContain('motion-reduce:animate-none');

    const link = screen.getByRole('link', { name: /Add another/i });
    expect(link).toHaveAttribute('href', '/capture');
    expect(link.className).toContain('min-h-12');
  });

  it('pluralizes count when multiple captures are pending', () => {
    mockPendingRecipes = [
      { recipeId: 'r-1', submittedAt: Date.now() },
      { recipeId: 'r-2', submittedAt: Date.now() },
    ];
    render(<CaptureInFlightRibbon />);

    expect(screen.getByText(/Preparing 2 recipes in the background/i)).toBeInTheDocument();
  });
});
