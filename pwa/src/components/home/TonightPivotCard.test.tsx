/**
 * Unit tests for TonightPivotCard — rendering logic.
 * Migrated from home-goto.spec.ts (empty-state header, GOTO-ready button
 * label, add-goto-btn visibility, and ghost/outline button styles).
 * Pure prop-driven render assertions — no browser or API mocking needed.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/imageUtils', () => ({
  getImageUrl: (src: string) => src ?? '',
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/home/TonightMenuCard', () => ({
  TonightCardBase: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

import { TonightPivotCard } from './TonightPivotCard';

const baseProps = {
  onConfirmGoto: vi.fn(),
  onDiscover: vi.fn(),
  onOrderIn: vi.fn(),
};

describe('TonightPivotCard — empty state (no GOTO configured)', () => {
  it('shows "What\'s for Supper?" as the header text', () => {
    render(
      <TonightPivotCard
        {...baseProps}
        gotoDescription={null}
        gotoRecipeId={null}
        gotoStatus={null}
      />
    );
    expect(screen.getByTestId('pivot-card-header')).toHaveTextContent("What's for Supper?");
  });

  it('renders add-goto-btn linking to /profile', () => {
    render(
      <TonightPivotCard
        {...baseProps}
        gotoDescription={null}
        gotoRecipeId={null}
        gotoStatus={null}
      />
    );
    const btn = screen.getByTestId('add-goto-btn');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('href', '/profile');
  });

  it('does not render confirm-goto-btn', () => {
    render(
      <TonightPivotCard
        {...baseProps}
        gotoDescription={null}
        gotoRecipeId={null}
        gotoStatus={null}
      />
    );
    expect(screen.queryByTestId('confirm-goto-btn')).not.toBeInTheDocument();
  });
});

describe('TonightPivotCard — GOTO ready state', () => {
  it('shows "Make This Tonight" as the primary button label', () => {
    render(
      <TonightPivotCard
        {...baseProps}
        gotoDescription="Family Lasagna"
        gotoRecipeId="recipe-1"
        gotoStatus="ready"
      />
    );
    expect(screen.getByTestId('confirm-goto-btn')).toHaveTextContent('Make This Tonight');
  });

  it('secondary buttons use ghost (transparent border) style, not filled background', () => {
    render(
      <TonightPivotCard
        {...baseProps}
        gotoDescription="Family Lasagna"
        gotoRecipeId="recipe-1"
        gotoStatus="ready"
      />
    );
    const discoverBtn = screen.getByTestId('discover-btn');
    const orderInBtn = screen.getByTestId('order-in-btn');

    // Ready state: ghost style — transparent background, not filled
    expect(discoverBtn.className).toContain('bg-transparent');
    // Non-ready (filled) class must not appear as a standalone class token
    expect(discoverBtn.className.split(' ')).not.toContain('bg-indigo/10');
    expect(orderInBtn.className).toContain('bg-transparent');
    expect(orderInBtn.className.split(' ')).not.toContain('bg-charcoal/10');
  });

  it('does not render add-goto-btn when a GOTO is configured', () => {
    render(
      <TonightPivotCard
        {...baseProps}
        gotoDescription="Family Lasagna"
        gotoRecipeId="recipe-1"
        gotoStatus="ready"
      />
    );
    expect(screen.queryByTestId('add-goto-btn')).not.toBeInTheDocument();
  });
});
