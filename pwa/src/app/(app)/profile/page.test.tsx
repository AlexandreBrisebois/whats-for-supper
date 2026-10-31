import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ProfilePage from './page';
const state = vi.hoisted(() => ({
  push: vi.fn(),
  selectFamilyMember: vi.fn(),
  completeOnboarding: vi.fn(),
  selectedMember: { id: 'member-123', name: 'Test User' } as { id: string; name: string } | null,
  loadFamily: vi.fn(),
  hasLoaded: true,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string, vars: Record<string, string>) =>
    fallback.replace('{{name}}', vars.name),
}));
vi.mock('@/hooks/useFamily', () => ({ useFamily: () => state }));
vi.mock('@/store/onboardingStore', () => ({
  useOnboardingStore: (fn: (s: typeof state) => unknown) => fn(state),
}));
vi.mock('@/components/profile/ProfileDropdown', () => ({
  ProfileDropdown: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button data-testid="profile-dropdown-stub" onClick={() => onSelect('other-member')}>
      Choose member
    </button>
  ),
}));
vi.mock('@/components/profile/LanguageSelection', () => ({
  LanguageSelection: () => <div data-testid="language-selection-stub" />,
}));
describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.selectedMember = { id: 'member-123', name: 'Test User' };
    state.hasLoaded = true;
  });
  for (const variant of ['loaded', 'loading', 'unmatched'] as const) {
    it(`retains title and controls without redundant instructions when ${variant}`, () => {
      state.hasLoaded = variant !== 'loading';
      if (variant !== 'loaded') state.selectedMember = null;
      render(<ProfilePage />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Table's Set!$/);
      expect(screen.queryByText('Pick a family member to get started.')).not.toBeInTheDocument();
      expect(screen.queryByTestId('continue-as-btn')).not.toBeInTheDocument();
      expect(screen.getByTestId('profile-dropdown-stub')).toBeInTheDocument();
      expect(screen.getByTestId('language-selection-stub')).toBeInTheDocument();
      expect(screen.getByTestId('settings-btn')).toBeInTheDocument();
      expect(state.push).not.toHaveBeenCalled();
      if (variant === 'loading') expect(state.loadFamily).toHaveBeenCalledOnce();
    });
  }
  it('Settings requests its route', () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByTestId('settings-btn'));
    expect(state.push).toHaveBeenCalledExactlyOnceWith('/profile/settings');
  });
  it('member choice retains selection, onboarding and Home consequences', () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByTestId('profile-dropdown-stub'));
    expect(state.selectFamilyMember).toHaveBeenCalledExactlyOnceWith('other-member');
    expect(state.completeOnboarding).toHaveBeenCalledOnce();
    expect(state.push).toHaveBeenCalledExactlyOnceWith('/home');
  });
  it('no matching member hides Continue-as but retains both controls and Settings', () => {
    state.selectedMember = null;
    render(<ProfilePage />);
    expect(screen.queryByTestId('continue-as-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('settings-btn')).toBeInTheDocument();
    expect(screen.getByTestId('language-selection-stub')).toBeInTheDocument();
    expect(screen.getByTestId('profile-dropdown-stub')).toBeInTheDocument();
  });
});
