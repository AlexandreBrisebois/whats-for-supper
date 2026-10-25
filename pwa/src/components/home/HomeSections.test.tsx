import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CookedSuccessCard } from './HomeSections';

vi.mock('@/locales', () => ({ t: (_key: string, fallback: string) => fallback }));

describe('CookedSuccessCard', () => {
  it('preserves Home copy, markup, test IDs and local dismissal', () => {
    const dismiss = vi.fn();
    render(<CookedSuccessCard onDismiss={dismiss} />);
    const card = screen.getByTestId('cooked-success-card');
    expect(card).toHaveClass('bg-sage');
    expect(screen.getByTestId('cooked-success-title')).toBe(
      screen.getByRole('heading', { level: 3, name: 'Enjoy your meal!' })
    );
    expect(screen.getByText('Recipe marked as cooked')).toBeVisible();
    const button = screen.getByTestId('cooked-success-dismiss');
    expect(button).toHaveAccessibleName('Dismiss');
    fireEvent.click(button);
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('keeps the optional dismiss callback optional', () => {
    render(<CookedSuccessCard />);
    fireEvent.click(screen.getByTestId('cooked-success-dismiss'));
    expect(screen.getByTestId('cooked-success-card')).toBeVisible();
  });
});
