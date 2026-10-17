import { create } from 'zustand';
import { updateRecipe } from '@/lib/api/recipes';

export interface RecipeNotesDraft {
  text: string;
  acknowledged: string | null;
  status: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
}

interface NotesState {
  drafts: Record<string, RecipeNotesDraft>;
}

// Tab-lifetime drafts outlive a detail sheet. Each recipe has at most one write
// in flight; other recipes and navigation remain independent.
export const useRecipeNotesStore = create<NotesState>(() => ({ drafts: {} }));
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const writes = new Map<string, Promise<void>>();

function patch(id: string, changes: Partial<RecipeNotesDraft>) {
  useRecipeNotesStore.setState((state) => ({
    drafts: { ...state.drafts, [id]: { ...state.drafts[id], ...changes } },
  }));
}

function cancelTimer(id: string) {
  clearTimeout(timers.get(id));
  timers.delete(id);
}

export function initializeRecipeNotes(id: string, text: string, atReadStart?: RecipeNotesDraft) {
  const current = useRecipeNotesStore.getState().drafts[id];
  if (arguments.length >= 3 && current !== atReadStart) return;
  if (
    current &&
    (current.status === 'error' || current.text !== current.acknowledged || writes.has(id))
  )
    return;
  patch(id, { text, acknowledged: text, status: 'idle' });
}

export function editRecipeNotes(id: string, text: string) {
  cancelTimer(id);
  patch(id, { text, status: writes.has(id) ? 'saving' : 'pending' });
  timers.set(
    id,
    setTimeout(() => {
      void flushRecipeNotes(id);
    }, 800)
  );
}

export function flushRecipeNotes(id: string): Promise<void> {
  cancelTimer(id);
  const active = writes.get(id);
  if (active) return active;
  const initial = useRecipeNotesStore.getState().drafts[id];
  if (!initial || initial.status === 'error') return Promise.resolve();
  if (initial.text === initial.acknowledged) {
    patch(id, { status: initial.status === 'idle' ? 'idle' : 'saved' });
    return Promise.resolve();
  }
  // Start on the next microtask so the in-flight guard exists even if a caller
  // synchronously edits or closes in response to the saving state.
  const operation = Promise.resolve()
    .then(async () => {
      while (true) {
        const draft = useRecipeNotesStore.getState().drafts[id];
        if (!draft || draft.text === draft.acknowledged) break;
        const submitted = draft.text;
        patch(id, { status: 'saving' });
        try {
          await updateRecipe(id, { notes: submitted });
          patch(id, { acknowledged: submitted });
        } catch {
          // A rejected response may follow persistence; never infer rollback.
          patch(id, { acknowledged: null, status: 'error' });
          return;
        }
      }
      cancelTimer(id);
      patch(id, { status: 'saved' });
    })
    .finally(() => {
      writes.delete(id);
    });
  writes.set(id, operation);
  return operation;
}

export function retryRecipeNotes(id: string) {
  patch(id, { status: 'pending' });
  return flushRecipeNotes(id);
}
