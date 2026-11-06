import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { JsonParseNode } from '@microsoft/kiota-serialization-json';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupperServings } from '@/lib/api/generated/models';
import { createSupperServingsFromDiscriminatorValue } from '@/lib/api/generated/models';

const { read, save } = vi.hoisted(() => ({
  read: vi.fn<typeof import('@/lib/api/supper-servings').readSupperServings>(),
  save: vi.fn<typeof import('@/lib/api/supper-servings').saveSupperServings>(),
}));
vi.mock('@/lib/api/supper-servings', () => ({
  readSupperServings: read,
  saveSupperServings: save,
}));
vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string, vars: Record<string, unknown>) =>
    fallback.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => String(vars[key])),
}));
import { UsualPortionsSection } from './UsualPortionsSection';
import { useFamilyStore } from '@/store/familyStore';
import { useWeekStore } from '@/store/weekStore';

function portions(overrides: Partial<SupperServings> = {}): SupperServings {
  return {
    referenceWeekStartDate: DateOnly.parse('2026-10-12'),
    weekStartDate: DateOnly.parse('2026-10-12'),
    weekOffset: 0,
    version: 'baseline',
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
const commit = () => screen.getByRole('button', { name: 'Save usual portions' });
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
      version: 'acknowledged',
    })
  );
  useFamilyStore.setState({
    familyMembers: [{ id: 'member-a', name: 'Alex' }],
    selectedFamilyMemberId: 'member-a',
    hasLoaded: true,
    isLoading: false,
    error: null,
  });
  useWeekStore.setState({ calendar: null, groceryRefresh: undefined });
});
describe('UsualPortionsSection', () => {
  it('loads server automatic four independently of the cached roster count', async () => {
    const pending = deferred<SupperServings>();
    read.mockReturnValueOnce(pending.promise);
    render(<UsualPortionsSection />);
    expect(screen.getByRole('heading', { name: 'Usual portions' })).toBeVisible();
    expect(screen.getByText('Loading portions…')).toBeVisible();
    await act(async () => pending.resolve(portions()));
    await ready();
    expect(automatic()).toBeChecked();
    expect(input()).toHaveValue(4);
    expect(commit()).toBeDisabled();
  });
  it('saves explicit five with the captured version, reference and no date edits', async () => {
    render(<UsualPortionsSection />);
    await ready();
    fireEvent.click(automatic());
    fireEvent.change(input(), { target: { value: '5' } });
    fireEvent.click(commit());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const body = save.mock.calls[0][0];
    expect(body).toMatchObject({
      expectedVersion: 'baseline',
      defaultServings: 5,
      weekOffset: 0,
      days: [],
    });
    expect(String(body.referenceWeekStartDate)).toBe('2026-10-12');
    await screen.findByText('Saved');
    expect(automatic()).not.toBeChecked();
    expect(input()).toHaveValue(5);
  });
  it('saves a source change when explicit and automatic counts are equal', async () => {
    read.mockResolvedValue(portions({ defaultServingsSource: 'explicit' }));
    save.mockResolvedValue(portions({ version: 'family-ack' }));
    render(<UsualPortionsSection />);
    await ready();
    fireEvent.click(automatic());
    expect(commit()).toBeEnabled();
    fireEvent.click(commit());
    await waitFor(() => expect(save.mock.calls[0][0].defaultServings).toBeNull());
    await screen.findByText('Saved');
    expect(automatic()).toBeChecked();
    expect(input()).toHaveValue(4);
  });
  it('describes an unsaved automatic choice as pending rather than an unavailable family count', async () => {
    read.mockResolvedValue(portions({ defaultServingsSource: 'explicit', defaultServings: 7 }));
    render(<UsualPortionsSection />);
    await ready();
    fireEvent.click(automatic());
    expect(screen.getByText('Family size will be confirmed when you save.')).toBeVisible();
    expect(
      screen.queryByText('Family size is unavailable. You can set usual portions.')
    ).not.toBeInTheDocument();
  });
  it('retains explicit five after a lost acknowledgement and rejects family five as confirmation', async () => {
    save.mockRejectedValue(new Error('lost acknowledgement'));
    render(<UsualPortionsSection />);
    await ready();
    fireEvent.click(automatic());
    fireEvent.change(input(), { target: { value: '5' } });
    fireEvent.click(commit());
    const review = await screen.findByRole('button', { name: 'Review current portions' });
    expect(commit()).toBeDisabled();
    read.mockResolvedValue(portions({ defaultServings: 5, version: 'other-family' }));
    fireEvent.click(review);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(commit()).toBeEnabled());
    expect(automatic()).not.toBeChecked();
    expect(input()).toHaveValue(5);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(1);
  });
  it('confirms a lost explicit acknowledgement only after an authoritative matching read', async () => {
    save.mockRejectedValue(new Error('lost acknowledgement'));
    render(<UsualPortionsSection />);
    await ready();
    fireEvent.click(automatic());
    fireEvent.change(input(), { target: { value: '5' } });
    fireEvent.click(commit());
    const review = await screen.findByRole('button', { name: 'Review current portions' });
    read.mockResolvedValue(
      portions({ defaultServingsSource: 'explicit', defaultServings: 5, version: 'confirmed' })
    );
    fireEvent.click(review);
    await screen.findByText('Saved');
    expect(commit()).toBeDisabled();
    expect(save).toHaveBeenCalledTimes(1);
  });
  it('requires a deliberate save after reviewing a lost automatic acknowledgement', async () => {
    read.mockResolvedValue(portions({ defaultServingsSource: 'explicit', defaultServings: 7 }));
    save
      .mockRejectedValueOnce(new Error('lost acknowledgement'))
      .mockResolvedValueOnce(portions({ version: 'automatic-confirmed' }));
    render(<UsualPortionsSection />);
    await ready();
    fireEvent.click(automatic());
    fireEvent.click(commit());
    const review = await screen.findByRole('button', { name: 'Review current portions' });
    read.mockResolvedValue(portions({ version: 'automatic-maybe-saved' }));
    fireEvent.click(review);
    await waitFor(() => expect(commit()).toBeEnabled());
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(1);
    fireEvent.click(commit());
    await screen.findByText('Saved');
    expect(save.mock.calls[1][0]).toMatchObject({
      expectedVersion: 'automatic-maybe-saved',
      defaultServings: null,
      days: [],
    });
  });
  it('rereads automatic portions after membership changes without deriving from cached members', async () => {
    render(<UsualPortionsSection />);
    await ready();
    read.mockResolvedValue(portions({ defaultServings: 5, version: 'five-members' }));
    act(() =>
      useFamilyStore.setState({
        familyMembers: [
          { id: 'member-a', name: 'Alex' },
          { id: 'member-b', name: 'Sam' },
        ],
      })
    );
    await waitFor(() => expect(input()).toHaveValue(5));
    expect(read).toHaveBeenCalledTimes(2);
    expect(save).not.toHaveBeenCalled();
  });
  it('preserves a dirty draft and stale baseline on membership conflict until deliberate review', async () => {
    render(<UsualPortionsSection />);
    await ready();
    fireEvent.click(automatic());
    fireEvent.change(input(), { target: { value: '7' } });
    read.mockResolvedValue(portions({ defaultServings: 5, version: 'changed-baseline' }));
    act(() => useFamilyStore.setState({ familyMembers: [{ id: 'member-b', name: 'Sam' }] }));
    const review = await screen.findByRole('button', { name: 'Review current portions' });
    expect(input()).toHaveValue(7);
    expect(commit()).toBeDisabled();
    fireEvent.click(review);
    await waitFor(() => expect(commit()).toBeEnabled());
    expect(screen.getByText('Current saved portions: 5 (Family size)')).toBeVisible();
    fireEvent.click(commit());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({
      expectedVersion: 'changed-baseline',
      defaultServings: 7,
    });
  });
  it('keeps explicit seven usable despite roster error and preserves it across membership reads', async () => {
    useFamilyStore.setState({ error: 'Roster unavailable' });
    read.mockResolvedValue(portions({ defaultServingsSource: 'explicit', defaultServings: 7 }));
    render(<UsualPortionsSection />);
    await ready();
    expect(input()).toHaveValue(7);
    act(() => useFamilyStore.setState({ familyMembers: [] }));
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(input()).toHaveValue(7);
    fireEvent.change(input(), { target: { value: '5' } });
    expect(commit()).toBeEnabled();
  });
  it('shows an unavailable automatic count honestly and allows an explicit choice', async () => {
    read.mockResolvedValue(portions({ defaultServings: null }));
    render(<UsualPortionsSection />);
    await ready();
    expect(input()).toHaveValue(null);
    expect(
      screen.getByText('Family size is unavailable. You can set usual portions.')
    ).toBeVisible();
    fireEvent.click(automatic());
    fireEvent.change(input(), { target: { value: '3' } });
    expect(commit()).toBeEnabled();
  });
  it('renders a wire-null automatic count after actual generated Kiota deserialization', async () => {
    const parsed = new JsonParseNode({
      referenceWeekStartDate: '2026-10-12',
      weekStartDate: '2026-10-12',
      weekOffset: 0,
      version: 'empty-family',
      defaultServingsSource: 'family',
      defaultServings: null,
      days: Array.from({ length: 7 }, (_, index) => ({
        date: `2026-10-${12 + index}`,
        servings: null,
        overrideServings: null,
        editable: true,
      })),
    }).getObjectValue<SupperServings>(createSupperServingsFromDiscriminatorValue);
    expect(parsed.defaultServings).toBeUndefined();
    read.mockResolvedValue(parsed);
    render(<UsualPortionsSection />);
    await ready();
    expect(automatic()).toBeChecked();
    expect(input()).toHaveValue(null);
    expect(
      screen.getByText('Family size is unavailable. You can set usual portions.')
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Retry portions' })).not.toBeInTheDocument();
  });
  it('associates the actual invalid reason with the focused count field', async () => {
    render(<UsualPortionsSection />);
    await ready();
    fireEvent.click(automatic());
    fireEvent.change(input(), { target: { value: '0' } });
    expect(input()).toHaveAccessibleDescription(/Enter a whole number from 1 to 2147483647/);
  });
  it('does not claim saved portions are available when both portions and roster reads fail', async () => {
    useFamilyStore.setState({ error: 'Roster unavailable' });
    read.mockRejectedValue(new Error('Portions unavailable'));
    render(<UsualPortionsSection />);
    await screen.findByRole('button', { name: 'Retry portions' });
    expect(screen.queryByText(/Saved portions are still available/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry family list' })).toBeEnabled();
  });
  it.each(['0', '-1', '1.5', '2147483648'])(
    'retains invalid explicit %s without writing',
    async (value) => {
      render(<UsualPortionsSection />);
      await ready();
      fireEvent.click(automatic());
      fireEvent.change(input(), { target: { value } });
      expect(input()).toHaveValue(Number(value));
      expect(commit()).toBeDisabled();
      expect(save).not.toHaveBeenCalled();
    }
  );
  it('ignores an older read that completes after a newer resume read', async () => {
    const older = deferred<SupperServings>();
    read
      .mockReturnValueOnce(older.promise)
      .mockResolvedValueOnce(portions({ defaultServings: 6, version: 'newer' }));
    render(<UsualPortionsSection />);
    fireEvent.focus(window);
    await ready();
    expect(input()).toHaveValue(6);
    await act(async () => older.resolve(portions()));
    expect(input()).toHaveValue(6);
  });
  it('rejects a complete acknowledgement with the wrong source even when the count matches', async () => {
    save.mockResolvedValue(portions({ defaultServings: 5, version: 'wrong-source' }));
    render(<UsualPortionsSection />);
    await ready();
    fireEvent.click(automatic());
    fireEvent.change(input(), { target: { value: '5' } });
    fireEvent.click(commit());
    await screen.findByRole('button', { name: 'Review current portions' });
    expect(input()).toHaveValue(5);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(1);
  });
  it('retries an unavailable portions read without interpreting the roster as a count', async () => {
    read.mockRejectedValueOnce(new Error('read failed'));
    render(<UsualPortionsSection />);
    const retry = await screen.findByRole('button', { name: 'Retry portions' });
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    fireEvent.click(retry);
    await ready();
    expect(input()).toHaveValue(4);
    expect(save).not.toHaveBeenCalled();
  });
  it('uses the current calendar reference for authoritative week and resume rereads', async () => {
    render(<UsualPortionsSection />);
    await ready();
    act(() =>
      useWeekStore.setState({
        calendar: {
          referenceWeekStartDate: '2026-10-19',
          currentWeekStartDate: '2026-10-19',
          today: '2026-10-19',
          timeZone: 'UTC',
          capturedAtUtc: '2026-10-19T12:00:00Z',
          nextDayAtUtc: '2026-10-20T00:00:00Z',
        },
      })
    );
    await waitFor(() => expect(read).toHaveBeenLastCalledWith(0, '2026-10-19'));
    const calls = read.mock.calls.length;
    fireEvent.focus(window);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(calls + 1));
  });
  it('keeps a newer draft when review confirms an earlier uncertain write', async () => {
    save.mockRejectedValue(new Error('lost acknowledgement'));
    render(<UsualPortionsSection />);
    await ready();
    fireEvent.click(automatic());
    fireEvent.change(input(), { target: { value: '5' } });
    fireEvent.click(commit());
    const review = await screen.findByRole('button', { name: 'Review current portions' });
    fireEvent.change(input(), { target: { value: '6' } });
    read.mockResolvedValue(
      portions({
        defaultServingsSource: 'explicit',
        defaultServings: 5,
        version: 'earlier-write-confirmed',
      })
    );
    fireEvent.click(review);
    await waitFor(() => expect(commit()).toBeEnabled());
    expect(input()).toHaveValue(6);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(1);
  });
  it('settles a pending save when the deployment reference changes and then rereads the new week', async () => {
    const pending = deferred<SupperServings>();
    save.mockReturnValueOnce(pending.promise);
    render(<UsualPortionsSection />);
    await ready();
    fireEvent.click(automatic());
    fireEvent.change(input(), { target: { value: '5' } });
    fireEvent.click(commit());
    read.mockResolvedValue(
      portions({
        defaultServingsSource: 'explicit',
        defaultServings: 5,
        version: 'new-week',
        referenceWeekStartDate: DateOnly.parse('2026-10-19'),
        weekStartDate: DateOnly.parse('2026-10-19'),
      })
    );
    act(() =>
      useWeekStore.setState({
        calendar: {
          referenceWeekStartDate: '2026-10-19',
          currentWeekStartDate: '2026-10-19',
          today: '2026-10-19',
          timeZone: 'UTC',
          capturedAtUtc: '2026-10-19T12:00:00Z',
          nextDayAtUtc: '2026-10-20T00:00:00Z',
        },
      })
    );
    await act(async () =>
      pending.resolve(
        portions({ defaultServingsSource: 'explicit', defaultServings: 5, version: 'write-ack' })
      )
    );
    await waitFor(() => expect(input()).toBeEnabled());
    expect(input()).toHaveValue(5);
    expect(commit()).toBeDisabled();
    expect(save).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(read).toHaveBeenLastCalledWith(0, '2026-10-19'));
  });
});
