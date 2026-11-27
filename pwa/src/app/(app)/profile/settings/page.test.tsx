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

// @/components/profile/FailedCapturesSection — avoid deep dependency tree
vi.mock('@/components/profile/FailedCapturesSection', () => ({
  FailedCapturesSection: () => <div data-testid="failed-captures-stub" />,
}));

vi.mock('@/components/profile/UsualPortionsSection', () => ({
  UsualPortionsSection: () => <div data-testid="usual-portions-stub" />,
}));

vi.mock('@/components/profile/QuickVotesSettingsSection', () => ({
  QuickVotesSettingsSection: () => <div data-testid="quick-votes-stub" />,
}));

vi.mock('@/components/profile/PassThePhoneSettingsSection', () => ({
  PassThePhoneSettingsSection: () => <div data-testid="pass-the-phone-stub" />,
}));

vi.mock('@/components/profile/SearchIndexSection', () => ({
  SearchIndexSection: () => <div data-testid="search-index-stub" />,
}));

vi.mock('@/components/profile/PreviewFeaturesSection', () => ({
  PreviewFeaturesSection: () => <div data-testid="preview-features-stub" />,
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
    expect(screen.queryByTestId('family-goto-stub')).not.toBeInTheDocument();
    expect(screen.getByTestId('failed-captures-stub')).toBeDefined();
    expect(screen.getByTestId('usual-portions-stub')).toBeInTheDocument();
  });

  it('orders sections with family members, portions, quick votes, pass the phone, then lower sections', () => {
    render(<SettingsPageContent />);

    const expectedOrder = [
      'family-management-stub',
      'usual-portions-stub',
      'quick-votes-stub',
      'pass-the-phone-stub',
      'search-index-stub',
      'failed-captures-stub',
      'preview-features-stub',
    ];

    const elements = expectedOrder.map((testId) => screen.getByTestId(testId));
    for (let i = 0; i < elements.length - 1; i++) {
      expect(
        Boolean(
          elements[i].compareDocumentPosition(elements[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
        `${expectedOrder[i]} should precede ${expectedOrder[i + 1]}`
      ).toBe(true);
    }
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
