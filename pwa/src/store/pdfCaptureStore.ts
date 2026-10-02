'use client';

import { create } from 'zustand';

interface PdfSelection {
  file: File;
  memberId: string;
  shareToken?: string;
  generation: number;
}
interface PdfCaptureState {
  selection: PdfSelection | null;
  generation: number;
  select: (file: File, memberId: string, shareToken?: string) => number;
  reset: (expectedGeneration?: number) => void;
}

// Foreground state only. No persistence, resume token or submitted-job ownership.
export const usePdfCaptureStore = create<PdfCaptureState>((set, get) => ({
  selection: null,
  generation: 0,
  select(file, memberId, shareToken) {
    const generation = get().generation + 1;
    set({ generation, selection: { file, memberId, shareToken, generation } });
    return generation;
  },
  reset(expectedGeneration) {
    if (expectedGeneration !== undefined && get().selection?.generation !== expectedGeneration) return;
    set({ selection: null, generation: get().generation + 1 });
  },
}));
