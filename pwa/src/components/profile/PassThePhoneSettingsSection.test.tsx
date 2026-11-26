import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PassThePhoneSettingsSection } from './PassThePhoneSettingsSection';

const familyState = vi.hoisted(() => ({
  familyMembers: [
    { id: 'member-1', name: 'Alex' },
    { id: 'member-2', name: 'Jordan' },
  ],
  hasLoaded: true,
  saveSetting: vi.fn(),
  updateMemberPreferences: vi.fn(),
}));

vi.mock('@/store/familyStore', () => ({
  useFamilyStore: (selector?: (s: typeof familyState) => unknown) =>
    selector ? selector(familyState) : familyState,
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
}));

describe('PassThePhoneSettingsSection', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    familyState.familyMembers = [
      { id: 'member-1', name: 'Alex' },
      { id: 'member-2', name: 'Jordan' },
    ];
    familyState.hasLoaded = true;
  });

  it('defaults switch to OFF and keeps How it works collapsed', () => {
    render(<PassThePhoneSettingsSection />);

    const toggle = screen.getByTestId('pass-the-phone-switch');
    expect(toggle).toHaveAttribute('role', 'switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(localStorage.getItem('wfs.passThePhone.enabled')).toBeNull();

    const disclosure = screen.getByTestId('pass-the-phone-how-it-works-toggle');
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('pass-the-phone-how-it-works-body')).not.toBeInTheDocument();
  });

  it('toggles localStorage per device without calling backend settings APIs', () => {
    render(<PassThePhoneSettingsSection />);

    const toggle = screen.getByTestId('pass-the-phone-switch');
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem('wfs.passThePhone.enabled')).toBe('true');
    expect(familyState.saveSetting).not.toHaveBeenCalled();
    expect(familyState.updateMemberPreferences).not.toHaveBeenCalled();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(localStorage.getItem('wfs.passThePhone.enabled')).toBe('false');
    expect(familyState.saveSetting).not.toHaveBeenCalled();
    expect(familyState.updateMemberPreferences).not.toHaveBeenCalled();
  });

  it('toggles How it works inline flyout with plain-language guidance and device-only scope', () => {
    render(<PassThePhoneSettingsSection />);

    const disclosure = screen.getByTestId('pass-the-phone-how-it-works-toggle');
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');

    const body = screen.getByTestId('pass-the-phone-how-it-works-body');
    expect(body).toHaveTextContent(/Let the kids help pick supper from your phone/i);
    expect(body).toHaveTextContent(/Only turns on for this device/i);
    expect(disclosure).toHaveAttribute('aria-controls', body.id);

    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('pass-the-phone-how-it-works-body')).not.toBeInTheDocument();
  });

  it('shows inline single-member guidance when fewer than 2 household members are loaded', () => {
    familyState.familyMembers = [{ id: 'member-1', name: 'Alex' }];
    familyState.hasLoaded = true;

    render(<PassThePhoneSettingsSection />);

    const hint = screen.getByTestId('pass-the-phone-single-member-hint');
    expect(hint).toBeVisible();
    expect(hint).toHaveTextContent(/Add another family member above/i);
  });

  it('does not show single-member guidance when 2+ members are loaded', () => {
    render(<PassThePhoneSettingsSection />);
    expect(screen.queryByTestId('pass-the-phone-single-member-hint')).not.toBeInTheDocument();
  });
});
