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
  tWithVars: (_key: string, defaultValue: string, vars: Record<string, any>) => {
    let result = defaultValue;
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(`{{${k}}}`, String(v));
    }
    return result;
  },
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
import { getBuildVersion, SettingsPageContent } from './page';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SettingsPage', () => {
  it('uses the Compose WFS_VERSION over the legacy deployment tag', () => {
    expect(getBuildVersion({ WFS_VERSION: '0.1.0-beta.1', TAG: 'latest' })).toBe('0.1.0-beta.1');
  });

  it('falls back to the legacy deployment tag when WFS_VERSION is not provided', () => {
    expect(getBuildVersion({ TAG: '0.1.0-beta.1' })).toBe('0.1.0-beta.1');
  });

  it('renders all settings sections', () => {
    render(<SettingsPageContent />);

    expect(screen.getByTestId('family-management-stub')).toBeDefined();
    expect(screen.getByTestId('family-goto-stub')).toBeDefined();
    expect(screen.getByTestId('failed-captures-stub')).toBeDefined();
  });

  it('does not render language selection', () => {
    render(<SettingsPageContent />);

    expect(screen.queryByText('Language')).toBeNull();
    expect(screen.queryByText('English')).toBeNull();
    expect(screen.queryByText('French')).toBeNull();
  });

  it('renders the deployed build version discreetly when supplied', () => {
    render(<SettingsPageContent buildVersion="0.1.0-beta.1" />);

    expect(screen.getByTestId('build-version')).toHaveTextContent('Build 0.1.0-beta.1');
  });

  it('does not render a version indicator when no deployed version is available', () => {
    render(<SettingsPageContent />);

    expect(screen.queryByTestId('build-version')).toBeNull();
  });
});
