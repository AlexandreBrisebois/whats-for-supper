import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  editRecipeNotes,
  flushRecipeNotes,
  initializeRecipeNotes,
  retryRecipeNotes,
  useRecipeNotesStore,
} from './recipeNotesStore';
import { updateRecipe } from '@/lib/api/recipes';
vi.mock('@/lib/api/recipes', () => ({ updateRecipe: vi.fn() }));
const update = vi.mocked(updateRecipe);

describe('ordered recipe notes saves', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    update.mockReset();
    useRecipeNotesStore.setState({ drafts: {} });
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('serializes a newer draft behind a delayed save and preserves exact text', async () => {
    let finish!: () => void;
    update
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          })
      )
      .mockResolvedValue(undefined);
    initializeRecipeNotes('a', 'A');
    editRecipeNotes('a', 'B');
    const saving = flushRecipeNotes('a');
    await Promise.resolve();
    editRecipeNotes('a', '  C  ');
    await vi.advanceTimersByTimeAsync(800);
    expect(update).toHaveBeenCalledTimes(1);
    expect(useRecipeNotesStore.getState().drafts.a.status).toBe('saving');
    finish();
    await saving;
    expect(update.mock.calls).toEqual([
      ['a', { notes: 'B' }],
      ['a', { notes: '  C  ' }],
    ]);
    expect(useRecipeNotesStore.getState().drafts.a).toMatchObject({
      text: '  C  ',
      acknowledged: '  C  ',
      status: 'saved',
    });
  });

  it('retains a failed draft over reopening and retries even when it equals the old baseline', async () => {
    update.mockRejectedValueOnce(new Error('reply lost')).mockResolvedValue(undefined);
    initializeRecipeNotes('a', 'A');
    editRecipeNotes('a', 'B');
    await flushRecipeNotes('a');
    initializeRecipeNotes('a', 'server value');
    expect(useRecipeNotesStore.getState().drafts.a).toMatchObject({ text: 'B', status: 'error' });
    editRecipeNotes('a', 'A');
    await retryRecipeNotes('a');
    expect(update).toHaveBeenLastCalledWith('a', { notes: 'A' });
    expect(useRecipeNotesStore.getState().drafts.a.status).toBe('saved');
  });

  it('keeps a departed recipe save isolated from another recipe', async () => {
    let finish!: () => void;
    update.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    initializeRecipeNotes('a', 'A');
    editRecipeNotes('a', 'changed');
    const saving = flushRecipeNotes('a');
    await Promise.resolve();
    initializeRecipeNotes('b', 'B');
    initializeRecipeNotes('a', 'stale A');
    expect(useRecipeNotesStore.getState().drafts.a.text).toBe('changed');
    finish();
    await saving;
    expect(useRecipeNotesStore.getState().drafts.b).toEqual({
      text: 'B',
      acknowledged: 'B',
      status: 'idle',
    });
  });
  it('does not replace acknowledged edits with a read that started before the save', async () => {
    update.mockResolvedValue(undefined);
    initializeRecipeNotes('a', 'A');
    const atReadStart = useRecipeNotesStore.getState().drafts.a;
    editRecipeNotes('a', 'B');
    await flushRecipeNotes('a');
    initializeRecipeNotes('a', 'A', atReadStart);
    expect(useRecipeNotesStore.getState().drafts.a.text).toBe('B');
  });
});
