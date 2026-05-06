import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalanceIndicator } from './BalanceIndicator';
import { WeeklyBalanceSummaryDto } from '@/lib/api/generated/models';

// ── Locales mock ──────────────────────────────────────────────────────────────

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
}));

// ── Framer Motion mock ────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('BalanceIndicator', () => {
  it('renders nothing when summary is null', () => {
    const { container } = render(<BalanceIndicator summary={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders positive state when isBalanced is true', () => {
    const summary: WeeklyBalanceSummaryDto = {
      isBalanced: true,
      recommendations: [],
      proteinDays: 3,
      veggieDays: 4,
      grainDays: 2,
      plantProteinDays: 1,
      redMeatDays: 0,
      maxConsecutiveSame: 2,
      fopWeekSummary: {
        highInSaturatedFatDays: 0,
        highInSugarsDays: 0,
        highInSodiumDays: 0,
      },
    };

    render(<BalanceIndicator summary={summary} />);
    expect(screen.getByTestId('balance-indicator')).toBeInTheDocument();
    expect(screen.getByText(/Balanced Week/i)).toBeInTheDocument();
  });

  it('renders first recommendation when isBalanced is false', () => {
    const summary: WeeklyBalanceSummaryDto = {
      isBalanced: false,
      recommendations: ['Add more protein-rich meals this week.'],
      proteinDays: 2,
      veggieDays: 4,
      grainDays: 2,
      plantProteinDays: 1,
      redMeatDays: 0,
      maxConsecutiveSame: 2,
      fopWeekSummary: {
        highInSaturatedFatDays: 0,
        highInSugarsDays: 0,
        highInSodiumDays: 0,
      },
    };

    render(<BalanceIndicator summary={summary} />);
    expect(screen.getByTestId('balance-indicator')).toBeInTheDocument();
    expect(screen.getByText(/Add more protein-rich meals this week./i)).toBeInTheDocument();
    expect(screen.getByText(/Diversify/i)).toBeInTheDocument();
  });

  it('never renders a button or blocking element', () => {
    const summary: WeeklyBalanceSummaryDto = {
      isBalanced: true,
      recommendations: [],
      proteinDays: 3,
      veggieDays: 4,
      grainDays: 2,
      plantProteinDays: 1,
      redMeatDays: 0,
      maxConsecutiveSame: 2,
      fopWeekSummary: {
        highInSaturatedFatDays: 0,
        highInSugarsDays: 0,
        highInSodiumDays: 0,
      },
    };

    render(<BalanceIndicator summary={summary} />);
    const indicator = screen.getByTestId('balance-indicator');
    expect(indicator.tagName).not.toBe('BUTTON');
    expect(indicator.querySelectorAll('button')).toHaveLength(0);
    expect(indicator.querySelectorAll('a')).toHaveLength(0);
  });
});
