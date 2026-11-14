import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupperServings } from '@/lib/api/generated/models';
import { useWeekStore, type UILocalScheduleDay } from '@/store/weekStore';

const { read, save } = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn() }));
vi.mock('@/lib/api/supper-servings', () => ({
  readSupperServings: read,
  saveSupperServings: save,
}));
import { useSupperServingsEditor } from './useSupperServingsEditor';

const reference = '2026-10-05';
const monday = '2026-10-12';
const sunday = '2026-10-18';
const storageKey = `wfs-portions-draft:${monday}`;
const dates = Array.from({ length: 7 }, (_, index) => `2026-10-${12 + index}`);
const schedule = dates.map((date) => ({ date, _uiId: date })) as UILocalScheduleDay[];

function snapshot(override: number | null = 5, usual: number | null = 4): SupperServings {
  return {
    referenceWeekStartDate: DateOnly.parse(reference),
    weekStartDate: DateOnly.parse(monday),
    weekOffset: 1,
    version: 'captured',
    defaultServings: usual,
    defaultServingsSource: 'family',
    days: dates.map((date) => ({
      date: DateOnly.parse(date),
      servings: date === sunday && override !== null ? override : usual,
      overrideServings: date === sunday ? override : null,
      editable: true,
    })),
  };
}

function Editor({ meals = schedule }: { meals?: UILocalScheduleDay[] }) {
  const editor = useSupperServingsEditor(1, reference, meals);
  return (
    <>
      {editor.strip}
      {editor.rows}
    </>
  );
}

async function openEditor(meals = schedule) {
  render(<Editor meals={meals} />);
  fireEvent.click(screen.getByTestId('at-the-table-mode'));
  await screen.findByTestId(`portion-input-${sunday}`);
}

function retainLegacyDraft(uncertainSave = false) {
  const state = snapshot();
  sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      key: monday,
      state: {
        ...state,
        referenceWeekStartDate: reference,
        weekStartDate: monday,
        days: state.days?.map((day) => ({ ...day, date: String(day.date) })),
      },
      draft: { [sunday]: '6' },
      usualDraft: '5',
      uncertainSave,
    })
  );
}

beforeEach(() => {
  sessionStorage.clear();
  read.mockReset().mockResolvedValue(snapshot());
  save.mockReset().mockResolvedValue({ ...snapshot(null), version: 'saved' });
  useWeekStore.setState({ groceryRefresh: undefined, calendar: null, schedule: [] });
});

it('edits only date exceptions without a usual configuration field', async () => {
  await openEditor();
  expect(screen.queryByTestId('usual-portions')).not.toBeInTheDocument();
  expect(screen.queryByRole('spinbutton', { name: 'Usual portions' })).not.toBeInTheDocument();
});

it('shows only the usual number on reset with a date-specific accessible action', async () => {
  await openEditor();
  const reset = screen.getByTestId(`reset-portions-${sunday}`);
  expect(reset).toHaveTextContent(/^4$/);
  expect(reset).toHaveAccessibleName(/use usual 4 portions for .*sunday/i);
  expect(reset).toBeEnabled();
});

it('resets five to inherited four and Recipes removes only that date override', async () => {
  await openEditor();
  fireEvent.click(screen.getByTestId(`reset-portions-${sunday}`));
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(4);
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId('save-portions'));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  const payload = save.mock.calls[0][0];
  expect(payload).not.toHaveProperty('defaultServings');
  expect(payload.days).toHaveLength(1);
  expect(String(payload.days[0].date)).toBe(sunday);
  expect(payload.days[0].servings).toBeNull();
});

it('returns to recipes without saving when nothing changed', async () => {
  await openEditor();
  expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Recipes' }));
  expect(screen.getByTestId('at-the-table-mode')).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});

it('saves a draft before returning to recipes', async () => {
  await openEditor();
  fireEvent.click(screen.getByTestId(`reset-portions-${sunday}`));
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(4);
  fireEvent.click(screen.getByRole('button', { name: 'Recipes' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0].days[0].servings).toBeNull();
  await screen.findByTestId('at-the-table-mode');
});

it('keeps edits available for review when saving from Recipes fails', async () => {
  save.mockRejectedValueOnce(new Error('failed'));
  await openEditor();
  fireEvent.change(screen.getByTestId(`portion-input-${sunday}`), { target: { value: '7' } });
  fireEvent.click(screen.getByRole('button', { name: 'Recipes' }));
  await screen.findByTestId('portions-review');
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(7);
  expect(screen.getByRole('button', { name: 'Recipes' })).toBeDisabled();
});

it('explains inheritance when resetting an explicit four to usual four', async () => {
  read.mockResolvedValue(snapshot(4));
  await openEditor();
  fireEvent.click(screen.getByTestId(`reset-portions-${sunday}`));
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(4);
  const row = screen.getByTestId(`portion-row-${sunday}`);
  expect(within(row).getByRole('status')).toHaveTextContent(/using usual 4 portions/i);
  fireEvent.click(screen.getByTestId('save-portions'));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0].days[0].servings).toBeNull();
});

it('keeps an unknown usual honest without offering an enabled reset', async () => {
  read.mockResolvedValue(snapshot(5, null));
  await openEditor();
  const row = screen.getByTestId(`portion-row-${sunday}`);
  const reset = within(row).queryByTestId(`reset-portions-${sunday}`);
  expect(reset === null || reset.hasAttribute('disabled')).toBe(true);
  expect(row).toHaveTextContent(/usual portions (?:are )?unavailable/i);
  expect(screen.getByTestId(`portion-input-${sunday}`)).toBeEnabled();
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(5);
});

it('keeps frozen dates and non-cooking dates protected', async () => {
  const state = snapshot();
  state.days = state.days?.map((day) => ({ ...day, editable: false }));
  read.mockResolvedValue(state);
  await openEditor(
    schedule.map((day) =>
      day.date === monday
        ? { ...day, status: 3 }
        : day.date === sunday
          ? { ...day, status: 2 }
          : day
    )
  );
  expect(screen.getByTestId(`portion-input-${sunday}`)).toBeDisabled();
  expect(screen.getByTestId(`portion-row-${sunday}`)).toHaveClass('bg-charcoal/10');
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(5);
  expect(screen.getByTestId(`reset-portions-${sunday}`)).toBeDisabled();
  expect(screen.queryByTestId(`portion-input-${monday}`)).not.toBeInTheDocument();
  expect(screen.queryByTestId(`reset-portions-${monday}`)).not.toBeInTheDocument();
  expect(within(screen.getByTestId(`portion-row-${monday}`)).queryByRole('group')).toBeNull();
  expect(save).not.toHaveBeenCalled();
});

it('allows a server-editable cooked date to be corrected and saved', async () => {
  await openEditor(schedule.map((day) => (day.date === sunday ? { ...day, status: 2 } : day)));
  const input = screen.getByTestId(`portion-input-${sunday}`);
  expect(input).toBeEnabled();
  expect(within(screen.getByTestId(`portion-row-${sunday}`)).queryByText('Cooked')).toBeNull();
  expect(input).toHaveValue(5);
  fireEvent.change(input, { target: { value: '6' } });
  fireEvent.click(screen.getByTestId('save-portions'));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0].days[0].servings).toBe(6);
});

it.each(['en', 'fr'])(
  'labels a disabled cooked meal in %s without labeling other disabled dates',
  async (locale) => {
    localStorage.setItem('locale', locale);
    try {
      const state = snapshot();
      state.days = state.days?.map((day) => ({ ...day, editable: false }));
      read.mockResolvedValue(state);
      await openEditor(schedule.map((day) => (day.date === sunday ? { ...day, status: 2 } : day)));
      const row = screen.getByTestId(`portion-row-${sunday}`);
      expect(within(row).getByTestId(`portion-input-${sunday}`)).toBeDisabled();
      expect(within(row).getByText(locale === 'fr' ? 'Cuisiné' : 'Cooked')).toBeInTheDocument();
      expect(
        within(screen.getByTestId(`portion-row-${monday}`)).queryByText(
          locale === 'fr' ? 'Cuisiné' : 'Cooked'
        )
      ).toBeNull();
    } finally {
      localStorage.removeItem('locale');
    }
  }
);

it('retains direct odd counts and sends one date-only batch', async () => {
  await openEditor();
  fireEvent.change(screen.getByTestId('portion-input-2026-10-14'), { target: { value: '5' } });
  fireEvent.change(screen.getByTestId('portion-input-2026-10-17'), { target: { value: '7' } });
  fireEvent.click(screen.getByTestId('save-portions'));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  const payload = save.mock.calls[0][0];
  expect(payload).not.toHaveProperty('defaultServings');
  expect(
    payload.days.map((day: { date: DateOnly; servings: number }) => [
      String(day.date),
      day.servings,
    ])
  ).toEqual([
    ['2026-10-14', 5],
    ['2026-10-17', 7],
  ]);
});

it('requires fresh review before a retained legacy combined draft can save', async () => {
  retainLegacyDraft();
  render(<Editor />);
  await screen.findByTestId('portions-restored');
  expect(screen.getByTestId('save-portions')).toBeDisabled();
  expect(screen.getByTestId('portions-review')).toBeEnabled();
  expect(save).not.toHaveBeenCalled();
});

it('never sends a legacy usual choice from Planner when Recipes is activated', async () => {
  retainLegacyDraft();
  render(<Editor />);
  await screen.findByTestId('portions-restored');
  await act(async () => {
    fireEvent.click(screen.getByTestId('save-portions'));
  });
  expect(save).not.toHaveBeenCalled();
});

it('retains legacy usual intent as review context and explicitly keeps date edits only', async () => {
  retainLegacyDraft(true);
  render(<Editor />);
  await screen.findByTestId('portions-restored');
  fireEvent.click(screen.getByTestId('portions-review'));
  const review = await screen.findByTestId('portions-saved-review');
  expect(review).toHaveTextContent(/usual portions/i);
  expect(review).toHaveTextContent('5');
  const keepDates = within(review).getByRole('button', { name: /keep (?:my )?date edits/i });
  expect(screen.getByTestId('save-portions')).toBeDisabled();
  fireEvent.click(keepDates);
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(6);
  fireEvent.click(screen.getByTestId('save-portions'));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0]).not.toHaveProperty('defaultServings');
  expect(save.mock.calls[0][0].days).toHaveLength(1);
  expect(save.mock.calls[0][0].days[0].servings).toBe(6);
});

it('does not silently dismiss a legacy combined uncertain intent when fresh values match', async () => {
  retainLegacyDraft(true);
  const fresh = snapshot(6, 5);
  read.mockResolvedValue({ ...fresh, defaultServingsSource: 'explicit', version: 'fresh' });
  render(<Editor />);
  await screen.findByTestId('portions-restored');
  fireEvent.click(screen.getByTestId('portions-review'));
  await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  expect(await screen.findByTestId('portions-saved-review')).toHaveTextContent(/usual portions/i);
  expect(save).not.toHaveBeenCalled();
});

it('retains a versioned date-only draft with captured identity and no usual mutation', async () => {
  await openEditor();
  fireEvent.change(screen.getByTestId(`portion-input-${sunday}`), { target: { value: '7' } });
  await waitFor(() =>
    expect(JSON.parse(sessionStorage.getItem(storageKey)!).formatVersion).toBe(2)
  );
  const retained = JSON.parse(sessionStorage.getItem(storageKey)!);
  expect(retained).not.toHaveProperty('usualDraft');
  expect(retained).toMatchObject({
    key: monday,
    draft: { [sunday]: '7' },
    uncertainSave: false,
    state: {
      version: 'captured',
      referenceWeekStartDate: reference,
      weekStartDate: monday,
      weekOffset: 1,
    },
  });
});

it.each(['', '4', 'not a count'])(
  'quarantines legacy usual choice %j through reload and deliberate date-only review',
  async (choice) => {
    retainLegacyDraft();
    const retained = JSON.parse(sessionStorage.getItem(storageKey)!);
    retained.usualDraft = choice;
    sessionStorage.setItem(storageKey, JSON.stringify(retained));
    const first = render(<Editor />);
    await screen.findByTestId('portions-restored');
    fireEvent.click(screen.getByTestId('portions-review'));
    const review = await screen.findByTestId('portions-saved-review');
    expect(within(review).getByTestId('portions-legacy-usual-review')).toHaveTextContent(
      choice || 'No usual portions set'
    );
    await waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem(storageKey)!).legacyUsualReview).toEqual({
        value: choice,
      })
    );
    first.unmount();
    render(<Editor />);
    await screen.findByTestId('portions-restored');
    expect(screen.getByTestId('save-portions')).toBeDisabled();
    expect(screen.queryByTestId('portions-saved-review')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('portions-review'));
    const rereview = await screen.findByTestId('portions-saved-review');
    fireEvent.click(within(rereview).getByRole('button', { name: 'Keep date edits only' }));
    await waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem(storageKey)!)).not.toHaveProperty(
        'legacyUsualReview'
      )
    );
    expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(6);
    fireEvent.click(screen.getByTestId('save-portions'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).not.toHaveProperty('defaultServings');
  }
);

it('reviews a changed usual target and preserves null reset with the fresh version', async () => {
  save.mockRejectedValueOnce(new Error('conflict')).mockResolvedValueOnce(snapshot(null, 5));
  await openEditor();
  fireEvent.click(screen.getByTestId(`reset-portions-${sunday}`));
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(4);
  fireEvent.click(screen.getByTestId('save-portions'));
  await screen.findByRole('alert');
  read.mockResolvedValue({ ...snapshot(5, 5), version: 'fresh' });
  fireEvent.click(screen.getByTestId('portions-review'));
  const review = await screen.findByTestId('portions-saved-review');
  expect(review).toHaveTextContent('Your edits: 5');
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(5);
  expect(screen.getByTestId(`reset-portions-${sunday}`)).toHaveTextContent(/^5$/);
  fireEvent.click(screen.getByTestId('portions-keep-draft'));
  fireEvent.click(screen.getByTestId('save-portions'));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[1][0]).toMatchObject({
    expectedVersion: 'fresh',
    days: [{ servings: null }],
  });
  expect(save.mock.calls[1][0]).not.toHaveProperty('defaultServings');
});

it.each([null, 4])(
  'acknowledges a date-only uncertain reset only with exact override provenance %j',
  async (persistedOverride) => {
    retainLegacyDraft(true);
    const retained = JSON.parse(sessionStorage.getItem(storageKey)!);
    delete retained.usualDraft;
    retained.draft = { [sunday]: null };
    sessionStorage.setItem(storageKey, JSON.stringify(retained));
    read.mockResolvedValue(snapshot(persistedOverride));
    render(<Editor />);
    await screen.findByTestId('portions-restored');
    fireEvent.click(screen.getByTestId('portions-review'));
    if (persistedOverride === null) {
      await waitFor(() => expect(screen.getByTestId('at-the-table-mode')).toBeVisible());
      expect(screen.queryByTestId('portions-restored')).not.toBeInTheDocument();
      expect(sessionStorage.getItem(storageKey)).toBeNull();
    } else {
      await screen.findByTestId('portions-saved-review');
      expect(screen.getByTestId('save-portions')).toBeDisabled();
    }
    expect(save).not.toHaveBeenCalled();
  }
);

it('keeps legacy default-only context for explicit review, then closes without an empty mutation', async () => {
  retainLegacyDraft();
  const retained = JSON.parse(sessionStorage.getItem(storageKey)!);
  retained.draft = {};
  sessionStorage.setItem(storageKey, JSON.stringify(retained));
  render(<Editor />);
  await screen.findByTestId('portions-restored');
  expect(screen.getByTestId('save-portions')).toBeDisabled();
  fireEvent.click(screen.getByTestId('portions-review'));
  const review = await screen.findByTestId('portions-saved-review');
  fireEvent.click(within(review).getByRole('button', { name: 'Keep date edits only' }));
  fireEvent.click(screen.getByTestId('save-portions'));
  await waitFor(() => expect(screen.getByTestId('at-the-table-mode')).toBeVisible());
  expect(sessionStorage.getItem(storageKey)).toBeNull();
  expect(save).not.toHaveBeenCalled();
});

it.each(['en', 'fr'])('uses singular numeric reset and inherited status in %s', async (locale) => {
  localStorage.setItem('locale', locale);
  try {
    read.mockResolvedValue(snapshot(5, 1));
    await openEditor();
    const reset = screen.getByTestId(`reset-portions-${sunday}`);
    expect(reset).toHaveTextContent(/^1$/);
    expect(reset).toHaveAccessibleName(
      locale === 'fr'
        ? /utiliser la 1 portion habituelle.*dimanche/i
        : /use usual 1 portion.*sunday/i
    );
    fireEvent.click(reset);
    expect(
      within(screen.getByTestId(`portion-row-${sunday}`)).getByRole('status')
    ).toHaveTextContent(
      locale === 'fr' ? 'Utilisation de la 1 portion habituelle' : 'Using usual 1 portion'
    );
  } finally {
    localStorage.removeItem('locale');
  }
});

describe('frozen inherited portions correction', () => {
  const frozen = () => {
    const state = snapshot(null);
    state.days!.find((day) => String(day.date) === sunday)!.servings = 5;
    return state;
  };

  it('opens a frozen inherited five at its saved value and leaves without writing', async () => {
    read.mockResolvedValue(frozen());
    await openEditor(schedule.map((day) => (day.date === sunday ? { ...day, status: 2 } : day)));
    expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(5);
    expect(screen.queryByTestId(`reset-portions-${sunday}`)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recipes' }));
    expect(save).not.toHaveBeenCalled();
  });

  it.each([4, 6])('saves a frozen inherited five explicitly corrected to %s', async (count) => {
    read.mockResolvedValue(frozen());
    await openEditor();
    fireEvent.change(screen.getByTestId(`portion-input-${sunday}`), {
      target: { value: String(count) },
    });
    fireEvent.click(screen.getByTestId('save-portions'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].days[0].servings).toBe(count);
  });

  it('retains reset intent after editing a frozen inherited five with no override', async () => {
    read.mockResolvedValue(frozen());
    await openEditor();
    fireEvent.change(screen.getByTestId(`portion-input-${sunday}`), { target: { value: '6' } });
    fireEvent.click(screen.getByTestId(`reset-portions-${sunday}`));
    expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(4);
    fireEvent.click(screen.getByTestId('save-portions'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].days[0].servings).toBeNull();
  });
});
