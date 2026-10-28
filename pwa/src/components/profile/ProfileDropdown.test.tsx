import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProfileDropdown } from './ProfileDropdown';

const family = vi.hoisted(() => ({
  familyMembers: [
    { id: 'ABC', name: 'Alex' },
    { id: 'def', name: 'Jordan' },
  ],
  selectedMember: { id: 'abc', name: 'Alex' },
  isLoading: false,
}));
vi.mock('@/hooks/useFamily', () => ({ useFamily: () => family }));
vi.mock('@/locales', () => ({ t: (_key: string, fallback: string) => fallback }));

describe('ProfileDropdown', () => {
  beforeEach(() => {
    family.isLoading = false;
  });
  it('associates expanded named choices and marks the current member case-insensitively', () => {
    render(<ProfileDropdown onSelect={vi.fn()} />);
    const trigger = screen.getByTestId('profile-dropdown-toggle');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    const list = screen.getByRole('list', { name: 'Active member' });
    expect(trigger).toHaveAttribute('aria-controls', list.id);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Alex/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: /Jordan/ })).not.toHaveAttribute(
      'aria-current',
      'true'
    );
  });
  it('Escape from a choice returns focus without selecting', () => {
    const select = vi.fn();
    render(<ProfileDropdown onSelect={select} />);
    const trigger = screen.getByTestId('profile-dropdown-toggle');
    fireEvent.click(trigger);
    const choice = screen.getByRole('button', { name: /Jordan/ });
    choice.focus();
    fireEvent.keyDown(choice, { key: 'Escape' });
    expect(screen.queryByTestId('profile-dropdown-menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(select).not.toHaveBeenCalled();
  });
  it('native choice activation retains callback and closes', () => {
    const select = vi.fn();
    render(<ProfileDropdown onSelect={select} />);
    fireEvent.click(screen.getByTestId('profile-dropdown-toggle'));
    // Native buttons provide Enter/Space activation in the browser; integration covers actual keys.
    fireEvent.click(screen.getByRole('button', { name: /Jordan/ }));
    expect(select).toHaveBeenCalledExactlyOnceWith('def');
    expect(screen.queryByTestId('profile-dropdown-menu')).not.toBeInTheDocument();
  });
  it('describes loading without exposing a selectable member', () => {
    family.isLoading = true;
    render(<ProfileDropdown onSelect={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading family members…');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
