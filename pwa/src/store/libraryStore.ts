import { create } from 'zustand';

export interface LibraryNotification {
  recipeId: string;
  name: string;
  imageUrl?: string;
  type: 'ready' | 'failed';
  errorMessage?: string;
  failedStep?: string;
  partialData?: object;
}

interface LibraryState {
  notifications: LibraryNotification[];

  /**
   * Adds a notification to the queue.
   * Called by `useScheduleStream` when a `recipe_ready` or `recipe_failed`
   * event arrives for a recipe that was in `captureStore.pendingRecipes`.
   */
  pushNotification: (n: LibraryNotification) => void;

  /**
   * Removes the notification for the given recipeId from the queue.
   * Called when the user dismisses a toast or banner.
   */
  dismissNotification: (recipeId: string) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  notifications: [],

  pushNotification(n) {
    set((s) => ({ notifications: [...s.notifications, n] }));
  },

  dismissNotification(recipeId) {
    set((s) => ({
      notifications: s.notifications.filter((n) => n.recipeId !== recipeId),
    }));
  },
}));
