/**
 * Unit tests — Settings page
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// next/navigation — page calls useRouter()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// @/locales — avoids localStorage access in jsdom
vi.mock('@/locales', () => ({
  t: (_key: string, defaultValue: string) => defaultValue,
}));

// @/components/profile/FamilyManagement — avoid deep dependency tree
vi.mock('@/components/profile/FamilyManagement', () => ({
  FamilyManagement: () => <div data-testid="family-management-stub" />,
}));

// @/components/profile/FamilyGOTOSettings — avoid deep dependency tree
vi.mock('@/components/profile/FamilyGOTOSettings', () => ({
  FamilyGOTOSettings: () => <div data-testid="family-goto-stub" />,
}));

// @/components/profile/FailedCapturesSection — avoid deep dependency tree
vi.mock('@/components/profile/FailedCapturesSection', () => ({
  FailedCapturesSection: () => <div data-testid="failed-captures-stub" />,
}));

// ---------------------------------------------------------------------------
// Import component under test AFTER mocks
// ---------------------------------------------------------------------------
import SettingsPage from './page';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SettingsPage', () => {
  it('renders all settings sections', () => {
    render(<SettingsPage />);

    expect(screen.getByTestId('family-management-stub')).toBeDefined();
    expect(screen.getByTestId('family-goto-stub')).toBeDefined();
    expect(screen.getByTestId('failed-captures-stub')).toBeDefined();
  });

  it('does not render language selection', () => {
    render(<SettingsPage />);

    expect(screen.queryByText('Language')).toBeNull();
    expect(screen.queryByText('English')).toBeNull();
    expect(screen.queryByText('French')).toBeNull();
  });
});
