import { describe, it, expect, beforeEach } from 'vitest';
import { usePdfCaptureStore } from './pdfCaptureStore';
describe('one unsaved PDF capture', () => {
  beforeEach(() => usePdfCaptureStore.getState().reset());
  it('replaces the unsaved selection and ignores older cleanup ownership', () => {
    const store = usePdfCaptureStore.getState();
    const first = store.select(new File(['x'], 'first.pdf'), 'member', 'first');
    const second = store.select(new File(['x'], 'second.pdf'), 'member', 'second');
    store.reset(first);
    expect(usePdfCaptureStore.getState().selection?.generation).toBe(second);
    expect(usePdfCaptureStore.getState().selection?.file.name).toBe('second.pdf');
    store.reset(second);
    expect(usePdfCaptureStore.getState().selection).toBeNull();
  });
});
