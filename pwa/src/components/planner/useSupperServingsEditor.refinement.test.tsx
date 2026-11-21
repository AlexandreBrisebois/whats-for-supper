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

function Editor({
  meals = schedule,
  today,
}: {
  meals?: UILocalScheduleDay[];
  today?: string | null;
}) {
  const editor = useSupperServingsEditor(1, reference, meals, undefined, today);
  return (
    <>
      {editor.strip}
      {editor.rows}
    </>
  );
}

async function openEditor(meals = schedule, today?: string | null) {
  render(<Editor meals={meals} today={today} />);
  fireEvent.click(screen.getByTestId('at-the-table-mode'));
  await screen.findByTestId(`portion-row-${sunday}`);
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

it('omits any per-row default serving reset button on overridden or edited dates', async () => {
  await openEditor();
  expect(screen.queryByTestId(`reset-portions-${sunday}`)).not.toBeInTheDocument();
  fireEvent.change(screen.getByTestId(`portion-input-${sunday}`), { target: { value: '6' } });
  expect(screen.queryByTestId(`reset-portions-${sunday}`)).not.toBeInTheDocument();
});

it('edits five to four directly and Recipes saves only that date count', async () => {
  await openEditor();
  fireEvent.change(screen.getByTestId(`portion-input-${sunday}`), { target: { value: '4' } });
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(4);
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId('save-portions'));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  const payload = save.mock.calls[0][0];
  expect(payload).not.toHaveProperty('defaultServings');
  expect(payload.days).toHaveLength(1);
  expect(String(payload.days[0].date)).toBe(sunday);
  expect(payload.days[0].servings).toBe(4);
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
  fireEvent.change(screen.getByTestId(`portion-input-${sunday}`), { target: { value: '4' } });
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(4);
  fireEvent.click(screen.getByRole('button', { name: 'Recipes' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0].days[0].servings).toBe(4);
  await screen.findByTestId('at-the-table-mode');
});

it('automatically reads current saved portions into an Era 3 Hearth card when saving from Recipes fails', async () => {
  save.mockRejectedValueOnce(new Error('failed'));
  read
    .mockResolvedValueOnce(snapshot())
    .mockResolvedValueOnce({ ...snapshot(5, 4), version: 'fresh' });
  await openEditor();
  fireEvent.change(screen.getByTestId(`portion-input-${sunday}`), { target: { value: '7' } });
  fireEvent.click(screen.getByRole('button', { name: 'Recipes' }));

  expect(screen.queryByTestId('portions-review')).not.toBeInTheDocument();
  const review = await screen.findByTestId('portions-saved-review');
  expect(review).toHaveClass('bg-terracotta-50', 'border-hearth-line');
  expect(within(review).getByTestId('portions-save-recovered')).toBeEnabled();
  expect(within(review).getByTestId('portions-discard')).toHaveAccessibleName('Discard changes');
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(7);
  expect(screen.getByRole('button', { name: 'Recipes' })).toBeDisabled();
  expect(read).toHaveBeenCalledTimes(2);
});

it('shows a single Hearth Retry control without looping when automatic recovery read fails', async () => {
  save.mockRejectedValueOnce(new Error('failed'));
  read
    .mockResolvedValueOnce(snapshot())
    .mockRejectedValueOnce(new Error('read down'))
    .mockResolvedValueOnce({ ...snapshot(5, 4), version: 'fresh' });
  await openEditor();
  fireEvent.change(screen.getByTestId(`portion-input-${sunday}`), { target: { value: '7' } });
  fireEvent.click(screen.getByRole('button', { name: 'Recipes' }));

  const retryBtn = await screen.findByTestId('portions-retry-review');
  expect(retryBtn).toHaveAccessibleName('Retry');
  expect(screen.getByTestId('portions-discard')).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Recipes' })).toBeDisabled();
  expect(read).toHaveBeenCalledTimes(2);

  fireEvent.click(retryBtn);
  await screen.findByTestId('portions-saved-review');
  expect(read).toHaveBeenCalledTimes(3);
  expect(screen.getByTestId('portions-save-recovered')).toBeEnabled();
});

it('keeps an unknown usual honest without offering a reset button', async () => {
  read.mockResolvedValue(snapshot(5, null));
  await openEditor();
  const row = screen.getByTestId(`portion-row-${sunday}`);
  expect(within(row).queryByTestId(`reset-portions-${sunday}`)).toBeNull();
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
    ),
    '2026-10-14'
  );
  const sundayRow = screen.getByTestId(`portion-row-${sunday}`);
  expect(sundayRow).not.toHaveClass('bg-charcoal/10');
  expect(sundayRow).not.toHaveClass('grayscale');
  expect(within(sundayRow).getByTestId('planner-meal')).toHaveClass('glass');
  expect(within(sundayRow).queryByTestId(`portion-input-${sunday}`)).not.toBeInTheDocument();
  expect(within(sundayRow).queryByTestId(`reset-portions-${sunday}`)).not.toBeInTheDocument();
  expect(within(sundayRow).queryAllByRole('button')).toHaveLength(0);
  expect(within(sundayRow).getByTestId(`portion-prepared-status-${sunday}`)).toHaveTextContent(
    'Already prepared'
  );
  expect(within(sundayRow).getByTestId(`portion-prepared-count-${sunday}`)).toHaveTextContent(
    '5 portions'
  );

  const pastRow = screen.getByTestId('portion-row-2026-10-13');
  expect(within(pastRow).getByTestId('planner-meal')).toHaveClass('bg-cream');
  expect(within(pastRow).queryByTestId('portion-input-2026-10-13')).not.toBeInTheDocument();
  expect(
    within(pastRow).queryByTestId('portion-prepared-status-2026-10-13')
  ).not.toBeInTheDocument();
  expect(within(pastRow).queryAllByRole('button')).toHaveLength(0);

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
  'shows quiet Already prepared text for upcoming prepared meals in %s and keeps past cooked meals photo-only',
  async (locale) => {
    localStorage.setItem('locale', locale);
    try {
      const state = snapshot();
      state.days = state.days?.map((day) => ({ ...day, editable: false }));
      read.mockResolvedValue(state);
      await openEditor(
        schedule.map((day) =>
          day.date === monday || day.date === sunday ? { ...day, status: 2 } : day
        ),
        '2026-10-14'
      );
      const futureRow = screen.getByTestId(`portion-row-${sunday}`);
      expect(within(futureRow).queryByTestId(`portion-input-${sunday}`)).not.toBeInTheDocument();
      expect(within(futureRow).getByTestId(`portion-prepared-status-${sunday}`)).toHaveTextContent(
        locale === 'fr' ? 'Déjà préparé' : 'Already prepared'
      );
      expect(within(futureRow).getByTestId(`portion-prepared-count-${sunday}`)).toHaveTextContent(
        '5 portions'
      );

      const pastRow = screen.getByTestId(`portion-row-${monday}`);
      expect(within(pastRow).queryByTestId(`portion-input-${monday}`)).not.toBeInTheDocument();
      expect(
        within(pastRow).queryByTestId(`portion-prepared-status-${monday}`)
      ).not.toBeInTheDocument();
      expect(pastRow).not.toHaveTextContent(
        /Already prepared|Déjà préparé|Cooked|Cuisiné|\b5\b|\b4\b/
      );
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

it('automatically loads fresh review for a retained legacy combined draft and keeps Recipes disabled', async () => {
  retainLegacyDraft();
  render(<Editor />);
  const review = await screen.findByTestId('portions-saved-review');
  expect(review).toHaveClass('bg-terracotta-50', 'border-hearth-line');
  expect(screen.queryByTestId('portions-review')).not.toBeInTheDocument();
  expect(screen.getByTestId('save-portions')).toBeDisabled();
  expect(read).toHaveBeenCalledTimes(1);
  expect(save).not.toHaveBeenCalled();
});

it('never sends a legacy usual choice from Planner when Recipes is activated', async () => {
  retainLegacyDraft();
  render(<Editor />);
  await screen.findByTestId('portions-saved-review');
  await act(async () => {
    fireEvent.click(screen.getByTestId('save-portions'));
  });
  expect(save).not.toHaveBeenCalled();
});

it('retains legacy usual intent as review context and saves date edits only with the primary recovery button', async () => {
  retainLegacyDraft(true);
  render(<Editor />);
  const review = await screen.findByTestId('portions-saved-review');
  expect(review).toHaveTextContent(/usual portions/i);
  expect(review).toHaveTextContent('5');
  expect(screen.getByTestId('save-portions')).toBeDisabled();
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(6);
  const keepDates = within(review).getByTestId('portions-save-recovered');
  fireEvent.click(keepDates);
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
    const rereview = await screen.findByTestId('portions-saved-review');
    expect(screen.getByTestId('save-portions')).toBeDisabled();
    expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(6);
    fireEvent.click(within(rereview).getByTestId('portions-save-recovered'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).not.toHaveProperty('defaultServings');
  }
);

it('auto-reviews a changed baseline and saves date edit directly with the fresh version', async () => {
  save.mockRejectedValueOnce(new Error('conflict')).mockResolvedValueOnce(snapshot(6, 5));
  read
    .mockResolvedValueOnce(snapshot())
    .mockResolvedValueOnce({ ...snapshot(5, 5), version: 'fresh' });
  await openEditor();
  fireEvent.change(screen.getByTestId(`portion-input-${sunday}`), { target: { value: '6' } });
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(6);
  fireEvent.click(screen.getByTestId('save-portions'));
  const review = await screen.findByTestId('portions-saved-review');
  expect(review).toHaveTextContent('Your edits: 6');
  expect(screen.getByTestId(`portion-input-${sunday}`)).toHaveValue(6);
  expect(screen.getByTestId('save-portions')).toBeDisabled();
  fireEvent.click(within(review).getByTestId('portions-save-recovered'));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[1][0]).toMatchObject({
    expectedVersion: 'fresh',
    days: [{ servings: 6 }],
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
    if (persistedOverride === null) {
      await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(sessionStorage.getItem(storageKey)).toBeNull());
      await waitFor(() => expect(screen.getByTestId('at-the-table-mode')).toBeVisible());
      expect(screen.queryByTestId('portions-restored')).not.toBeInTheDocument();
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
  const review = await screen.findByTestId('portions-saved-review');
  expect(screen.getByTestId('save-portions')).toBeDisabled();
  fireEvent.click(within(review).getByRole('button', { name: 'Keep date edits only' }));
  await waitFor(() => expect(screen.getByTestId('at-the-table-mode')).toBeVisible());
  expect(sessionStorage.getItem(storageKey)).toBeNull();
  expect(save).not.toHaveBeenCalled();
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
});

describe('Planner Portions Meals-parity layout, photo-only past rows, and quiet prepared text', () => {
  it('matches Meals view split date column, Today divider, and temporal card surfaces', async () => {
    const today = '2026-10-14';
    await openEditor(schedule, today);

    const todayRow = screen.getByTestId(`portion-row-${today}`);
    expect(todayRow).toHaveAttribute('data-temporal', 'today');
    expect(within(todayRow).getByTestId('planner-today-label')).toHaveTextContent('Today');
    expect(within(todayRow).getByTestId('planner-today-separator')).toBeInTheDocument();
    const todayDateCol = within(todayRow).getByTestId('planner-date');
    expect(todayDateCol).toHaveClass('w-10');
    expect(todayDateCol).toHaveAttribute('aria-current', 'date');
    expect(within(todayDateCol).getByTestId('planner-date-marker')).toBeInTheDocument();
    expect(within(todayRow).getByTestId('planner-meal')).toHaveClass('glass');

    const pastRow = screen.getByTestId(`portion-row-${monday}`);
    expect(pastRow).toHaveAttribute('data-temporal', 'past');
    expect(pastRow).not.toHaveClass('grayscale');
    expect(within(pastRow).queryByTestId('planner-today-label')).not.toBeInTheDocument();
    expect(within(pastRow).getByTestId('planner-meal')).toHaveClass('bg-cream');

    const futureRow = screen.getByTestId(`portion-row-${sunday}`);
    expect(futureRow).toHaveAttribute('data-temporal', 'neutral');
    expect(within(futureRow).getByTestId('planner-meal')).toHaveClass('glass');
  });

  it('right-aligns editable stepper without a reset button, shows photo-only past rows, and renders quiet plain text on upcoming prepared days', async () => {
    const state = snapshot();
    state.days = state.days?.map((day) =>
      String(day.date) === monday || String(day.date) === '2026-10-17'
        ? { ...day, servings: 6, editable: false }
        : day
    );
    read.mockResolvedValue(state);
    await openEditor(
      schedule.map((day) =>
        day.date === monday
          ? { ...day, status: 2 }
          : day.date === '2026-10-17'
            ? {
                ...day,
                status: 2,
                preparation: { preparedOn: '2026-10-14', servings: 6 } as any,
              }
            : day
      ),
      '2026-10-14'
    );

    const editableControls = screen.getByTestId(`portion-controls-${sunday}`);
    expect(editableControls).toHaveClass('ml-auto');
    expect(screen.queryByTestId(`reset-portions-${sunday}`)).not.toBeInTheDocument();
    expect(editableControls).toContainElement(
      within(screen.getByTestId(`portion-row-${sunday}`)).getByRole('group')
    );

    const pastCookedRow = screen.getByTestId(`portion-row-${monday}`);
    expect(pastCookedRow).not.toHaveClass('grayscale');
    expect(within(pastCookedRow).getByTestId('planner-meal')).toHaveClass('bg-cream');
    expect(
      within(pastCookedRow).queryByTestId(`portion-cooked-badge-${monday}`)
    ).not.toBeInTheDocument();
    expect(within(pastCookedRow).queryByTestId(`portion-input-${monday}`)).not.toBeInTheDocument();
    expect(pastCookedRow).not.toHaveTextContent(/Cooked|Already prepared|\b6\b/);
    expect(within(pastCookedRow).queryAllByRole('button')).toHaveLength(0);

    const futurePreparedRow = screen.getByTestId('portion-row-2026-10-17');
    expect(within(futurePreparedRow).getByTestId('planner-meal')).toHaveClass('glass');
    expect(
      within(futurePreparedRow).queryByTestId('portion-input-2026-10-17')
    ).not.toBeInTheDocument();
    expect(within(futurePreparedRow).queryByRole('group')).toBeNull();
    expect(within(futurePreparedRow).queryAllByRole('button')).toHaveLength(0);
    const status = within(futurePreparedRow).getByTestId('portion-prepared-status-2026-10-17');
    const label = within(status).getByText('Already prepared');
    const count = within(futurePreparedRow).getByTestId('portion-prepared-count-2026-10-17');
    expect(label).toHaveClass('text-garden-ink');
    expect(count).toHaveTextContent('6 portions');
    expect(count).toHaveClass('text-ink-muted');
  });
});
