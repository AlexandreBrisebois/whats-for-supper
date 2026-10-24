import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useVisualViewportOffset } from './useVisualViewportOffset';

describe('useVisualViewportOffset', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('tracks keyboard panning and resets when the visual viewport returns', () => {
    const viewport = Object.assign(new EventTarget(), { offsetTop: 180 });
    vi.stubGlobal('visualViewport', viewport);
    const remove = vi.spyOn(viewport, 'removeEventListener');
    const { result, unmount } = renderHook(() => useVisualViewportOffset());
    expect(result.current).toBe(180);
    act(() => {
      viewport.offsetTop = 240;
      viewport.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toBe(240);
    act(() => {
      viewport.offsetTop = 0;
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(0);
    unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('keeps the normal layout when the viewport API is unavailable', () => {
    vi.stubGlobal('visualViewport', undefined);
    expect(renderHook(() => useVisualViewportOffset()).result.current).toBe(0);
  });
});
