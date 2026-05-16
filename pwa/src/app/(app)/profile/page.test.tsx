import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfilePage from './page';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/locales', () => ({
  t: (_key: string, defaultValue: string) => defaultValue,
  tWithVars: (_key: string, defaultValue: string, vars: Record<string, any>) => {
    let result = defaultValue;
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(`{{${k}}}`, String(v));
    }
    return result;
  },
}));

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({
    selectFamilyMember: vi.fn(),
    selectedFamilyMemberId: 'member-123',
    selectedMember: { id: 'member-123', name: 'Test User' },
    loadFamily: vi.fn(),
    hasLoaded: true,
  }),
}));

vi.mock('@/store/onboardingStore', () => ({
  useOnboardingStore: (fn: any) => fn({ completeOnboarding: vi.fn() }),
}));

vi.mock('@/components/profile/ProfileDropdown', () => ({
  ProfileDropdown: () => <div data-testid="profile-dropdown-stub" />,
}));

vi.mock('@/components/profile/LanguageSelection', () => ({
  LanguageSelection: () => <div data-testid="language-selection-stub" />,
}));

describe('ProfilePage', () => {
  it('renders profile selection and language selection', () => {
    render(<ProfilePage />);

    expect(screen.getByTestId('profile-dropdown-stub')).toBeDefined();
    expect(screen.getByTestId('language-selection-stub')).toBeDefined();
  });
});
