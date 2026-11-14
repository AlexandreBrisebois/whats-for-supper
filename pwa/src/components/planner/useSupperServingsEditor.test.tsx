import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
}: {
  offset?: number;
  anchor?: string | null;
  start?: string;
}) {
  const editor = useSupperServingsEditor(offset, anchor ?? undefined, [{ date: start }] as any);
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
it('orders all three draft-exit choices and retains the draft when editing continues', async () => {
  render(<Editor />);
  fireEvent.click(screen.getByText('Open'));
  fireEvent.change(await screen.findByTestId('portion-input-2026-10-14'), {
    target: { value: '5' },
  });
  fireEvent.click(screen.getByText('Leave'));
  const keep = screen.getByRole('button', { name: 'Keep editing' });
  const discard = screen.getByRole('button', { name: 'Discard changes' });
  expect(
    screen.getByRole('button', { name: 'Save and continue' }).compareDocumentPosition(keep) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  expect(keep.compareDocumentPosition(discard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(keep);
  expect(screen.getByTestId('portion-input-2026-10-14')).toHaveValue(5);
  expect(save).not.toHaveBeenCalled();
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

it('does not mark a known-usual null reset invalid', async () => {
  read.mockResolvedValue({
    ...baseline,
    days: days.map((day) => ({ ...day, servings: 6, overrideServings: 6 })),
  });
  render(<Editor />);
  fireEvent.click(screen.getByText('Open'));
  fireEvent.click(await screen.findByTestId('reset-portions-2026-10-14'));
  expect(screen.getByTestId('portion-input-2026-10-14')).toHaveValue(4);
  expect(screen.getByTestId('portion-input-2026-10-14')).not.toHaveAttribute(
    'aria-invalid',
    'true'
  );
  expect(screen.getByTestId('save-portions')).toBeEnabled();
});
