import { create } from 'zustand';

import type { Toast } from '@/types/ui';

interface UiState {
  isLoading: boolean;
  toasts: Toast[];
  setLoading: (loading: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'> | string) => string;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isLoading: false,
  toasts: [],
  setLoading: (loading) => set({ isLoading: loading }),
  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => {
      const toastObj = typeof toast === 'string' ? { type: 'success', message: toast } : toast;
      return {
        toasts: [...state.toasts, { ...toastObj, id } as Toast],
      };
    });
    return id;
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
