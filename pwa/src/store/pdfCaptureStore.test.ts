import { describe, it, expect, beforeEach } from 'vitest';
import { MOCK_IDS } from '@/testing/mock-ids';
import { usePdfCaptureStore } from './pdfCaptureStore';
describe('one unsaved PDF capture', () => {
  beforeEach(() => usePdfCaptureStore.getState().reset());
  it('replaces the unsaved selection and ignores older cleanup ownership', () => {
    const store = usePdfCaptureStore.getState();
    const first = store.select(new File(['x'], 'first.pdf'), MOCK_IDS.MEMBER_ALEX, 'first');
    const second = store.select(new File(['x'], 'second.pdf'), MOCK_IDS.MEMBER_ALEX, 'second');
    store.reset(first);
    expect(usePdfCaptureStore.getState().selection?.generation).toBe(second);
    expect(usePdfCaptureStore.getState().selection?.file.name).toBe('second.pdf');
    store.reset(second);
    expect(usePdfCaptureStore.getState().selection).toBeNull();
  });
});
