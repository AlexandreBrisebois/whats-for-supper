import { observeOpening, presentationChanged } from '@/lib/telemetry/opening';
import type { BrowserObservation } from '@/lib/telemetry/navigation';
vi.mock('next/navigation', () => ({ usePathname: () => '/profile' }));
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

// Run the real declaration/coordinator path rather than mocking the observation hook.
function startPresentationStream() {
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const submit = vi.fn<(event: BrowserObservation) => Promise<void>>().mockResolvedValue();
  const observe = () => observeOpening(document, true, '/profile', submit);
  observe();
  submit.mockClear();
  document.addEventListener(presentationChanged, observe);
  return {
    observe,
    visibility,
    events: () => submit.mock.calls.map(([event]) => [event.eventName, event.screen]),
    raw: () => submit.mock.calls.map(([event]) => event),
    stop: () => {
      document.removeEventListener(presentationChanged, observe);
      visibility.mockRestore();
    },
  };
}

it('observes only the visible member menu across outside dismissal, loading, selection and reopen', async () => {
  let eventNumber = 0;
  const random = vi
    .spyOn(crypto, 'randomUUID')
    .mockImplementation(() => `00000def-0000-4000-8000-${String(++eventNumber).padStart(12, '0')}`);
  const members = family.familyMembers;
  family.familyMembers = [
    { id: 'PRIVATE_MEMBER_OPTION_A', name: 'Alex' },
    { id: 'PRIVATE_MEMBER_OPTION_B', name: 'Jordan' },
  ];
  const stream = startPresentationStream();
  const select = vi.fn();
  family.isLoading = false;
  family.selectedMember = { id: 'PRIVATE_MEMBER_ID', name: 'PRIVATE_MEMBER_NAME' };
  const view = render(<ProfileDropdown onSelect={select} />);
  try {
    expect(stream.events()).toEqual([]);
    fireEvent.click(screen.getByTestId('profile-dropdown-toggle'));
    expect(stream.events()).toEqual([['pwa.surface.opened', 'profile.members']]);
    fireEvent.mouseDown(document.body);
    await Promise.resolve();
    fireEvent.click(screen.getByTestId('profile-dropdown-toggle'));
    family.isLoading = true;
    view.rerender(<ProfileDropdown onSelect={select} />);
    await Promise.resolve();
    expect(screen.queryByTestId('profile-dropdown-menu')).not.toBeInTheDocument();
    expect(stream.events()).toEqual([
      ['pwa.surface.opened', 'profile.members'],
      ['pwa.surface.closed', 'profile.members'],
      ['pwa.surface.opened', 'profile.members'],
      ['pwa.surface.closed', 'profile.members'],
    ]);
    family.isLoading = false;
    view.rerender(<ProfileDropdown onSelect={select} />);
    fireEvent.click(screen.getByTestId('profile-dropdown-option-PRIVATE_MEMBER_OPTION_B'));
    await Promise.resolve();
    expect(select).toHaveBeenCalledExactlyOnceWith('PRIVATE_MEMBER_OPTION_B');
    fireEvent.click(screen.getByTestId('profile-dropdown-toggle'));
    fireEvent.keyDown(screen.getByTestId('profile-dropdown-option-PRIVATE_MEMBER_OPTION_B'), {
      key: 'Escape',
    });
    await Promise.resolve();
    expect(stream.events()).toEqual([
      ['pwa.surface.opened', 'profile.members'],
      ['pwa.surface.closed', 'profile.members'],
      ['pwa.surface.opened', 'profile.members'],
      ['pwa.surface.closed', 'profile.members'],
      ['pwa.surface.opened', 'profile.members'],
      ['pwa.surface.closed', 'profile.members'],
      ['pwa.surface.opened', 'profile.members'],
      ['pwa.surface.closed', 'profile.members'],
    ]);
    expect(JSON.stringify(stream.raw())).not.toMatch(/PRIVATE_MEMBER|Alex|Jordan/);
  } finally {
    family.familyMembers = members;
    family.isLoading = false;
    family.selectedMember = { id: 'abc', name: 'Alex' };
    view.unmount();
    stream.stop();
    random.mockRestore();
  }
});
