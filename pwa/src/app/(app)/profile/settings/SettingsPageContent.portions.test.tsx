import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupperServings } from '@/lib/api/generated/models';

const { read, save } = vi.hoisted(() => ({
  read: vi.fn<typeof import('@/lib/api/supper-servings').readSupperServings>(),
  save: vi.fn<typeof import('@/lib/api/supper-servings').saveSupperServings>(),
}));
vi.mock('@/lib/api/supper-servings', () => ({
  readSupperServings: read,
  saveSupperServings: save,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/locales', () => ({
  getLocale: () => 'en',
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string, vars: Record<string, unknown>) =>
    fallback.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => String(vars[key])),
}));
vi.mock('@/components/profile/FamilyManagement', () => ({
  FamilyManagement: () => <div data-testid="family-management-stub" />,
}));
vi.mock('@/components/profile/FailedCapturesSection', () => ({
  FailedCapturesSection: () => <div data-testid="failed-captures-stub" />,
}));
vi.mock('@/components/profile/PreviewFeaturesSection', () => ({
  PreviewFeaturesSection: () => <div data-testid="preview-features-stub" />,
}));

import { SettingsPageContent } from './SettingsPageContent';
import { useFamilyStore } from '@/store/familyStore';

function portions(overrides: Partial<SupperServings> = {}): SupperServings {
  return {
    referenceWeekStartDate: DateOnly.parse('2026-10-12'),
    weekStartDate: DateOnly.parse('2026-10-12'),
    weekOffset: 0,
    version: 'captured-version',
    defaultServingsSource: 'family',
    defaultServings: 4,
    days: Array.from({ length: 7 }, (_, index) => ({
      date: DateOnly.parse(`2026-10-${12 + index}`),
      servings: 4,
      overrideServings: null,
      editable: true,
    })),
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const automatic = () => screen.getByRole('checkbox', { name: 'Use family size' });
const input = () => screen.getByRole('spinbutton', { name: 'Usual portions' });
const saveButton = () => screen.getByRole('button', { name: 'Save usual portions' });
const ready = async () => {
  await screen.findByRole('checkbox', { name: 'Use family size' });
  await waitFor(() => expect(automatic()).toBeEnabled());
};

beforeEach(() => {
  sessionStorage.clear();
  read.mockReset().mockResolvedValue(portions());
  save.mockReset().mockResolvedValue(
    portions({
      defaultServingsSource: 'explicit',
      defaultServings: 5,
      version: 'saved-version',
    })
  );
  // Deliberately different from the authoritative family count: the UI must not derive four.
  useFamilyStore.setState({
    familyMembers: [{ id: 'cached-member', name: 'Alex' }],
    selectedFamilyMemberId: 'cached-member',
    hasLoaded: true,
    isLoading: false,
    error: null,
  });
});

describe('Settings usual portions', () => {
  it('shows honest loading before an authoritative portions read resolves', async () => {
    const pending = deferred<SupperServings>();
    read.mockReturnValueOnce(pending.promise);
    render(<SettingsPageContent />);
    expect(screen.getByRole('heading', { name: 'Usual portions' })).toBeVisible();
    expect(screen.getByText('Loading portions…')).toBeVisible();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    await act(async () => pending.resolve(portions()));
    await ready();
    expect(screen.queryByText('Loading portions…')).not.toBeInTheDocument();
  });

  it('shows server-owned automatic four rather than the cached roster size', async () => {
    render(<SettingsPageContent />);
    await ready();
    expect(automatic()).toBeChecked();
    expect(input()).toHaveValue(4);
    expect(saveButton()).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });

  it('saves explicit five as a guarded default-only batch and reopens persisted explicit state', async () => {
    const view = render(<SettingsPageContent />);
    await ready();
    fireEvent.click(automatic());
    fireEvent.change(input(), { target: { value: '5' } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const body = save.mock.calls[0][0];
    expect(body).toMatchObject({
      expectedVersion: 'captured-version',
      weekOffset: 0,
      defaultServings: 5,
      days: [],
    });
    expect(String(body.referenceWeekStartDate)).toBe('2026-10-12');
    await waitFor(() => expect(saveButton()).toBeDisabled());
    view.unmount();
    read.mockResolvedValue(portions({ defaultServingsSource: 'explicit', defaultServings: 5 }));
    render(<SettingsPageContent />);
    await ready();
    expect(automatic()).not.toBeChecked();
    expect(input()).toHaveValue(5);
  });

  it('saves explicit four to automatic four as a meaningful source change', async () => {
    read.mockResolvedValue(portions({ defaultServingsSource: 'explicit' }));
    save.mockResolvedValue(portions({ version: 'automatic-version' }));
    render(<SettingsPageContent />);
    await ready();
    fireEvent.click(automatic());
    expect(saveButton()).toBeEnabled();
    fireEvent.click(saveButton());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({ defaultServings: null, days: [] });
  });

  it('keeps explicit portions usable when the roster display failed', async () => {
    useFamilyStore.setState({ error: 'Roster unavailable' });
    read.mockResolvedValue(portions({ defaultServingsSource: 'explicit', defaultServings: 7 }));
    render(<SettingsPageContent />);
    await ready();
    expect(input()).toHaveValue(7);
    fireEvent.change(input(), { target: { value: '5' } });
    expect(saveButton()).toBeEnabled();
    fireEvent.click(saveButton());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].defaultServings).toBe(5);
  });

  it.each(['0', '-1', '1.5', '2147483648'])(
    'retains invalid explicit %s without writing',
    async (value) => {
      render(<SettingsPageContent />);
      await ready();
      fireEvent.click(automatic());
      fireEvent.change(input(), { target: { value } });
      expect(input()).toHaveValue(Number(value));
      expect(saveButton()).toBeDisabled();
      expect(save).not.toHaveBeenCalled();
    }
  );

  it('requires a read after an uncertain save and does not mistake family five for explicit five', async () => {
    save.mockRejectedValue(new Error('Acknowledgement lost'));
    render(<SettingsPageContent />);
    await ready();
    fireEvent.click(automatic());
    fireEvent.change(input(), { target: { value: '5' } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const review = await screen.findByRole('button', { name: 'Review current portions' });
    expect(input()).toHaveValue(5);
    expect(saveButton()).toBeDisabled();
    read.mockResolvedValue(portions({ defaultServings: 5, version: 'other-family-version' }));
    fireEvent.click(review);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(automatic()).not.toBeChecked();
    expect(input()).toHaveValue(5);
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});
