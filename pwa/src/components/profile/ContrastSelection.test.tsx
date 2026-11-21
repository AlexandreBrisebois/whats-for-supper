import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/components/common/LocaleProvider';
import { setLocale } from '@/locales';
import { ContrastSelection } from './ContrastSelection';

const contrastState = vi.hoisted(() => ({
  contrastMode: 'standard' as 'standard' | 'high',
  setLocalContrastMode: vi.fn(),
}));

const familyState = vi.hoisted(() => ({
  selectedFamilyMemberId: 'member-123' as string | null,
  familyMembers: [{ id: 'member-123', name: 'Alex', contrastMode: 'standard' as const }] as Array<{
    id: string;
    name: string;
    contrastMode: 'standard' | 'high' | null;
  }>,
  updateMemberPreferences: vi.fn(),
}));

vi.mock('@/components/common/ContrastProvider', () => ({
  useContrast: () => ({
    contrastMode: contrastState.contrastMode,
    setLocalContrastMode: (next: 'standard' | 'high') => {
      contrastState.contrastMode = next;
      contrastState.setLocalContrastMode(next);
    },
  }),
}));

vi.mock('@/store/familyStore', () => ({
  useFamilyStore: (selector?: (s: typeof familyState) => unknown) =>
    selector ? selector(familyState) : familyState,
}));

describe('ContrastSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLocale('en');
    contrastState.contrastMode = 'standard';
    familyState.selectedFamilyMemberId = 'member-123';
    familyState.familyMembers = [{ id: 'member-123', name: 'Alex', contrastMode: 'standard' }];
  });

  it('renders readable sentence-case EN labels, pressed state, and check cue for standard', () => {
    render(<ContrastSelection />);

    expect(screen.getByRole('group', { name: 'Contrast' })).toBeInTheDocument();
    const standardBtn = screen.getByTestId('contrast-btn-standard');
    const highBtn = screen.getByTestId('contrast-btn-high');

    expect(standardBtn).toHaveTextContent('Standard');
    expect(highBtn).toHaveTextContent('High contrast');
    expect(standardBtn).toHaveAttribute('aria-pressed', 'true');
    expect(highBtn).toHaveAttribute('aria-pressed', 'false');
    expect(highBtn).toBeEnabled();
    expect(standardBtn.querySelector('[data-contrast-check]')).not.toBeNull();
    expect(highBtn.querySelector('[data-contrast-check]')).toBeNull();
    expect(standardBtn.className).toContain('min-h-12');
    expect(highBtn.className).toContain('min-h-12');
  });

  it('renders accurate FR translations when French locale is active', () => {
    setLocale('fr');
    contrastState.contrastMode = 'high';
    render(
      <LocaleProvider>
        <ContrastSelection />
      </LocaleProvider>
    );

    expect(screen.getByRole('group', { name: 'Contraste' })).toBeInTheDocument();
    const standardBtn = screen.getByTestId('contrast-btn-standard');
    const highBtn = screen.getByTestId('contrast-btn-high');

    expect(standardBtn).toHaveTextContent('Standard');
    expect(highBtn).toHaveTextContent('Contraste élevé');
    expect(highBtn).toHaveAttribute('aria-pressed', 'true');
    expect(standardBtn).toHaveAttribute('aria-pressed', 'false');
    expect(highBtn.querySelector('[data-contrast-check]')).not.toBeNull();
  });

  it('updates member preference via API without mutating local-only state when member is loaded', () => {
    contrastState.contrastMode = 'standard';
    render(<ContrastSelection />);

    fireEvent.click(screen.getByTestId('contrast-btn-high'));

    expect(familyState.updateMemberPreferences).toHaveBeenCalledWith('member-123', {
      contrastMode: 'high',
    });
    expect(contrastState.setLocalContrastMode).not.toHaveBeenCalled();
  });

  it('updates only local contrast without calling API when no member is selected', () => {
    familyState.selectedFamilyMemberId = null;
    familyState.familyMembers = [];
    contrastState.contrastMode = 'standard';
    render(<ContrastSelection />);

    fireEvent.click(screen.getByTestId('contrast-btn-high'));

    expect(contrastState.setLocalContrastMode).toHaveBeenCalledExactlyOnceWith('high');
    expect(familyState.updateMemberPreferences).not.toHaveBeenCalled();
  });
});
