import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const { read, save } = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn() }));
vi.mock('@/lib/api/supper-servings', () => ({
  readSupperServings: read,
  saveSupperServings: save,
}));
import { useSupperServingsEditor } from './useSupperServingsEditor';
import { useWeekStore } from '@/store/weekStore';
const reference = '2026-10-05';
const monday = '2026-10-12';
const days = Array.from({ length: 7 }, (_, i) => ({
  date: `2026-10-${12 + i}`,
  servings: 4,
  overrideServings: null,
  editable: true,
}));
const baseline = {
  referenceWeekStartDate: reference,
  weekStartDate: monday,
  weekOffset: 1,
  version: 'captured',
  defaultServings: 4,
  days,
};
function Editor({
  offset = 1,
  anchor = reference,
  start = monday,
  meals,
  today,
}: {
  offset?: number;
  anchor?: string | null;
  start?: string;
  meals?: any[];
  today?: string | null;
}) {
  const editor = useSupperServingsEditor(
    offset,
    anchor ?? undefined,
    meals ?? ([{ date: start }] as any),
    undefined,
    today
  );
  return (
    <>
      <button onClick={editor.open}>Open</button>
      <button onClick={() => editor.requestDeparture(() => undefined)}>Leave</button>
      {editor.strip}
      {editor.rows}
    </>
  );
}
beforeEach(() => {
  sessionStorage.clear();
  read.mockReset().mockResolvedValue(baseline);
  save.mockReset().mockResolvedValue({ ...baseline, version: 'saved' });
  useWeekStore.setState({ groceryRefresh: undefined, calendar: null, schedule: [] });
});
it('opens the displayed calendar reference when the URL has no explicit anchor', async () => {
  useWeekStore.setState({ calendar: { referenceWeekStartDate: reference } as any });
  render(<Editor anchor={null} />);
  fireEvent.click(screen.getByText('Open'));
  await screen.findByTestId('portion-input-2026-10-14');
  expect(read).toHaveBeenCalledWith(1, reference);
});
it('restores the same absolute week after rollover and saves its original reference and offset', async () => {
  const first = render(<Editor />);
  fireEvent.click(screen.getByText('Open'));
  fireEvent.change(await screen.findByTestId('portion-input-2026-10-14'), {
    target: { value: '6' },
  });
  first.unmount();
  render(<Editor offset={0} anchor={monday} />);
  await screen.findByTestId('portions-restored');
  expect(screen.getByTestId('portions-restored')).toHaveClass('bg-sage-50', 'border-garden-line');
  expect(screen.getByTestId('portion-input-2026-10-14')).toHaveValue(6);
  fireEvent.click(screen.getByTestId('save-portions'));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0]).toMatchObject({ weekOffset: 1, expectedVersion: 'captured' });
  expect(String(save.mock.calls[0][0].referenceWeekStartDate)).toBe(reference);
});
it('does not restore that draft into a different absolute week with the same offset', async () => {
  const first = render(<Editor />);
  fireEvent.click(screen.getByText('Open'));
  fireEvent.change(await screen.findByTestId('portion-input-2026-10-14'), {
    target: { value: '6' },
  });
  first.unmount();
  render(<Editor anchor={monday} start="2026-10-19" />);
  expect(screen.queryByTestId('portions-restored')).toBeNull();
  expect(save).not.toHaveBeenCalled();
});
it('retains a draft when hydration briefly selects another week before restoration settles', async () => {
  sessionStorage.setItem(
    `wfs-portions-draft:${monday}`,
    JSON.stringify({ key: monday, state: baseline, draft: { '2026-10-14': '6' } })
  );
  const view = render(<Editor offset={0} anchor={monday} />);
  view.rerender(<Editor offset={1} anchor={monday} start="2026-10-19" />);
  await act(async () => {
    await Promise.resolve();
  });
  view.rerender(<Editor offset={0} anchor={monday} />);
  await screen.findByTestId('portions-restored');
  expect(screen.getByTestId('portions-restored')).toHaveClass('bg-sage-50', 'border-garden-line');
  expect(screen.getByTestId('portion-input-2026-10-14')).toHaveValue(6);
});
it.each(['week', 'offset', 'days', 'draft'] as const)(
  'rejects a retained session with invalid %s identity',
  async (invalid) => {
    const state = {
      ...baseline,
      ...(invalid === 'week' ? { weekStartDate: '2026-10-19' } : {}),
      ...(invalid === 'offset' ? { weekOffset: 0 } : {}),
      ...(invalid === 'days' ? { days: days.map((day, i) => (i === 6 ? days[0] : day)) } : {}),
    };
    sessionStorage.setItem(
      `wfs-portions-draft:${monday}`,
      JSON.stringify({
        key: monday,
        state,
        draft: { [invalid === 'draft' ? '2026-10-21' : '2026-10-14']: '6' },
      })
    );
    render(<Editor />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId('portions-restored')).toBeNull();
  }
);

it('offers Portions without a neighboring Recipes heading and keeps joined date controls directly editable', async () => {
  render(<Editor />);
  expect(screen.queryByText('Recipes')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Portions' }));
  const group = await screen.findByRole('group', { name: '2026-10-14 portions' });
  expect(group).toContainElement(screen.getByTestId('portion-input-2026-10-14'));
  fireEvent.change(screen.getByTestId('portion-input-2026-10-14'), { target: { value: '5' } });
  fireEvent.change(screen.getByTestId('portion-input-2026-10-16'), { target: { value: '7' } });
  expect(screen.getByTestId('portion-input-2026-10-14')).toHaveValue(5);
  expect(screen.getByTestId('portion-input-2026-10-16')).toHaveValue(7);
});
it('auto-saves a valid draft on departure without an intermediate confirmation gate and guards rapid duplicates', async () => {
  let resolveSave!: (value: unknown) => void;
  save.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveSave = resolve;
      })
  );
  const departed = vi.fn();
  function DepartEditor() {
    const editor = useSupperServingsEditor(offsetRef.offset, reference, [{ date: monday }] as any);
    return (
      <>
        <button onClick={editor.open}>Open</button>
        <button onClick={() => editor.requestDeparture(departed)}>Leave</button>
        {editor.strip}
        {editor.editing && editor.rows}
      </>
    );
  }
  const offsetRef = { offset: 1 };
  render(<DepartEditor />);
  fireEvent.click(screen.getByText('Open'));
  fireEvent.change(await screen.findByTestId('portion-input-2026-10-14'), {
    target: { value: '5' },
  });
  fireEvent.click(screen.getByText('Leave'));
  fireEvent.click(screen.getByText('Leave'));
  expect(screen.queryByTestId('portions-departure')).not.toBeInTheDocument();
  expect(save).toHaveBeenCalledTimes(1);
  expect(save.mock.calls[0][0].days[0].servings).toBe(5);
  expect(departed).not.toHaveBeenCalled();

  await act(async () => {
    resolveSave({ ...baseline, version: 'saved' });
  });
  await waitFor(() => expect(departed).toHaveBeenCalledTimes(1));
  expect(screen.queryByTestId('portions-editor')).not.toBeInTheDocument();
});

it('pauses invalid departure in a Hearth recovery card, focuses the invalid input, and allows fixing or discarding', async () => {
  const departed = vi.fn();
  function DepartEditor() {
    const editor = useSupperServingsEditor(1, reference, [{ date: monday }] as any);
    return (
      <>
        <button onClick={editor.open}>Open</button>
        <button onClick={() => editor.requestDeparture(departed)}>Leave</button>
        {editor.strip}
        {editor.editing && editor.rows}
      </>
    );
  }
  render(<DepartEditor />);
  fireEvent.click(screen.getByText('Open'));
  const input = await screen.findByTestId('portion-input-2026-10-14');
  fireEvent.change(input, { target: { value: '0' } });
  fireEvent.click(screen.getByText('Leave'));

  expect(save).not.toHaveBeenCalled();
  expect(departed).not.toHaveBeenCalled();
  expect(input).toHaveFocus();

  const card = screen.getByTestId('portions-departure');
  expect(card).toHaveClass('bg-terracotta-50', 'border-hearth-line');
  expect(within(card).queryByTestId('portions-keep-editing')).not.toBeInTheDocument();
  expect(within(card).getByTestId('portions-save-continue')).toBeDisabled();
  expect(within(card).getByTestId('portions-discard')).toHaveAccessibleName('Discard changes');

  fireEvent.change(input, { target: { value: '5' } });
  expect(within(card).getByTestId('portions-save-continue')).toBeEnabled();
  fireEvent.click(within(card).getByTestId('portions-save-continue'));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0].days[0].servings).toBe(5);
  await waitFor(() => expect(departed).toHaveBeenCalledTimes(1));
});

it('associates an invalid count with its date field without exposing usual configuration', async () => {
  render(<Editor />);
  fireEvent.click(screen.getByText('Open'));
  const input = await screen.findByTestId('portion-input-2026-10-14');
  fireEvent.change(input, { target: { value: '-1' } });
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription('Choose a whole number from 1 to 2147483647.');
  fireEvent.change(input, { target: { value: '5' } });
  expect(screen.queryByTestId('usual-portions')).not.toBeInTheDocument();
  expect(input).not.toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByTestId('save-portions')).toBeEnabled();
});

it('keeps unavailable usual honest and direct date entry valid', async () => {
  read.mockResolvedValue({
    ...baseline,
    defaultServings: null,
    days: days.map((day) => ({
      ...day,
      servings: day.date === '2026-10-14' ? 6 : null,
      overrideServings: day.date === '2026-10-14' ? 6 : null,
    })),
  });
  render(<Editor />);
  fireEvent.click(screen.getByText('Open'));
  const input = await screen.findByTestId('portion-input-2026-10-14');
  expect(screen.queryByTestId('reset-portions-2026-10-14')).not.toBeInTheDocument();
  expect(screen.getByTestId('portion-row-2026-10-14')).toHaveTextContent(
    'Usual portions unavailable'
  );
  expect(input).toHaveValue(6);
  fireEvent.change(input, { target: { value: '7' } });
  expect(screen.getByTestId('portion-input-2026-10-14')).not.toHaveAttribute(
    'aria-invalid',
    'true'
  );
  expect(screen.getByTestId('save-portions')).toBeEnabled();
});

it('never renders a default serving button while stepping inherited or overridden counts', async () => {
  read.mockResolvedValue({
    ...baseline,
    days: days.map((day) =>
      day.date === '2026-10-16' ? { ...day, servings: 6, overrideServings: 6 } : day
    ),
  });
  render(<Editor />);
  fireEvent.click(screen.getByText('Open'));
  await screen.findByTestId('portion-input-2026-10-14');
  expect(screen.queryByTestId('reset-portions-2026-10-14')).not.toBeInTheDocument();
  expect(screen.queryByTestId('reset-portions-2026-10-16')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'More portions 2026-10-14' }));
  expect(screen.getByTestId('portion-input-2026-10-14')).toHaveValue(5);
  expect(screen.queryByTestId('reset-portions-2026-10-14')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Fewer portions 2026-10-14' }));
  expect(screen.getByTestId('portion-input-2026-10-14')).toHaveValue(4);
  expect(screen.queryByTestId('reset-portions-2026-10-14')).not.toBeInTheDocument();

  fireEvent.click(screen.getByTestId('save-portions'));
  expect(save).not.toHaveBeenCalled();

  fireEvent.click(screen.getByText('Open'));
  await screen.findByTestId('portion-input-2026-10-16');
  fireEvent.click(screen.getByRole('button', { name: 'Fewer portions 2026-10-16' }));
  fireEvent.click(screen.getByRole('button', { name: 'Fewer portions 2026-10-16' }));
  expect(screen.getByTestId('portion-input-2026-10-16')).toHaveValue(4);
  expect(screen.queryByTestId('reset-portions-2026-10-16')).not.toBeInTheDocument();

  fireEvent.click(screen.getByTestId('save-portions'));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0].days).toHaveLength(1);
  expect(String(save.mock.calls[0][0].days[0].date)).toBe('2026-10-16');
  expect(save.mock.calls[0][0].days[0].servings).toBe(4);
});

it('renders photo-only past rows, quiet plain-text upcoming prepared rows, and active steppers only on editable rows', async () => {
  read.mockResolvedValue({
    ...baseline,
    days: days.map((day) =>
      day.date === '2026-10-12'
        ? { ...day, servings: 6, editable: false }
        : day.date === '2026-10-13'
          ? { ...day, servings: null, editable: false }
          : day.date === '2026-10-16'
            ? { ...day, servings: 6, editable: false }
            : day.date === '2026-10-17'
              ? { ...day, servings: 1, editable: false }
              : day
    ),
  });
  const meals = days.map((d) =>
    d.date === '2026-10-12' || d.date === '2026-10-14'
      ? { date: d.date, status: 2 }
      : d.date === '2026-10-16'
        ? {
            date: d.date,
            status: 2,
            preparation: { preparedOn: '2026-10-14', servings: 6 },
          }
        : d.date === '2026-10-17'
          ? {
              date: d.date,
              status: 2,
              preparation: { preparedOn: '2026-10-14', servings: 1 },
            }
          : { date: d.date, status: 0 }
  );
  render(<Editor meals={meals} today="2026-10-14" />);
  fireEvent.click(screen.getByText('Open'));

  const pastCookedRow = await screen.findByTestId('portion-row-2026-10-12');
  expect(within(pastCookedRow).queryByTestId('portion-input-2026-10-12')).not.toBeInTheDocument();
  expect(
    within(pastCookedRow).queryByTestId('portion-controls-2026-10-12')
  ).not.toBeInTheDocument();
  expect(
    within(pastCookedRow).queryByTestId('portion-cooked-badge-2026-10-12')
  ).not.toBeInTheDocument();
  expect(
    within(pastCookedRow).queryByTestId('portion-prepared-status-2026-10-12')
  ).not.toBeInTheDocument();
  expect(pastCookedRow).not.toHaveTextContent(/Cooked|Already prepared|\b6\b/);
  expect(within(pastCookedRow).queryAllByRole('button')).toHaveLength(0);

  const pastEmptyRow = screen.getByTestId('portion-row-2026-10-13');
  expect(within(pastEmptyRow).queryByTestId('portion-input-2026-10-13')).not.toBeInTheDocument();
  expect(
    within(pastEmptyRow).queryByTestId('portion-prepared-status-2026-10-13')
  ).not.toBeInTheDocument();
  expect(within(pastEmptyRow).queryAllByRole('button')).toHaveLength(0);

  const editableCookedRow = screen.getByTestId('portion-row-2026-10-14');
  expect(
    within(editableCookedRow).queryByTestId('portion-prepared-status-2026-10-14')
  ).not.toBeInTheDocument();
  expect(within(editableCookedRow).getByTestId('portion-input-2026-10-14')).toBeEnabled();
  expect(
    within(editableCookedRow).getByRole('button', { name: 'Fewer portions 2026-10-14' })
  ).toBeEnabled();
  expect(
    within(editableCookedRow).getByRole('button', { name: 'More portions 2026-10-14' })
  ).toBeEnabled();

  const futurePreparedRow = screen.getByTestId('portion-row-2026-10-16');
  expect(
    within(futurePreparedRow).getByTestId('portion-prepared-status-2026-10-16')
  ).toHaveTextContent('Already prepared');
  expect(
    within(futurePreparedRow).getByTestId('portion-prepared-count-2026-10-16')
  ).toHaveTextContent('6 portions');
  expect(
    within(futurePreparedRow).queryByTestId('portion-input-2026-10-16')
  ).not.toBeInTheDocument();
  expect(within(futurePreparedRow).queryAllByRole('button')).toHaveLength(0);

  const futureSinglePreparedRow = screen.getByTestId('portion-row-2026-10-17');
  expect(
    within(futureSinglePreparedRow).getByTestId('portion-prepared-count-2026-10-17')
  ).toHaveTextContent('1 portion');
});
