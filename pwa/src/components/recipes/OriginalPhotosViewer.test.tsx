import { StrictMode, type ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeOpening, presentationChanged } from '@/lib/telemetry/opening';
import type { BrowserObservation } from '@/lib/telemetry/navigation';
import { OriginalPhotosViewer } from './OriginalPhotosViewer';

vi.mock('next/navigation', () => ({ usePathname: () => '/recipes' }));
vi.mock('@/locales', () => ({ t: (_key: string, fallback: string) => fallback }));

const animation = vi.hoisted(() => ({
  images: [] as Array<{
    element: HTMLImageElement;
    load?: (event: unknown) => void;
    error?: (event: unknown) => void;
  }>,
}));
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const controls = { start: vi.fn().mockResolvedValue(undefined) };
  return {
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
    useAnimation: () => controls,
    motion: {
      div: ({ children, ...props }: Record<string, unknown>) => {
        // Preserve callbacks from old animated frames to model late onLoad while
        // Framer keeps an exiting image alive. No observer or Action is mocked.
        let content = children as ReactNode;
        if (React.isValidElement<Record<string, unknown>>(content) && content.type === 'img') {
          const image = content;
          content = React.cloneElement(image, {
            ref: (element: HTMLImageElement | null) => {
              if (element) {
                Object.defineProperty(element, 'naturalWidth', { configurable: true, value: 1200 });
                animation.images.push({
                  element,
                  load: image.props.onLoad as ((event: unknown) => void) | undefined,
                  error: image.props.onError as ((event: unknown) => void) | undefined,
                });
              }
            },
          });
        }
        const dom = Object.fromEntries(
          Object.entries(props).filter(
            ([key]) =>
              ![
                'initial',
                'animate',
                'exit',
                'custom',
                'variants',
                'transition',
                'drag',
                'dragConstraints',
                'dragElastic',
                'dragMomentum',
              ].includes(key)
          )
        );
        return React.createElement('div', dom, content);
      },
    },
  };
});

afterEach(() => {
  animation.images.length = 0;
  vi.restoreAllMocks();
});

function stream() {
  let visible = true;
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
    visible ? 'visible' : 'hidden'
  );
  const submit = vi.fn<(event: BrowserObservation) => Promise<void>>().mockResolvedValue();
  const observe = () => observeOpening(document, true, '/recipes', submit);
  observe();
  submit.mockClear();
  document.addEventListener(presentationChanged, observe);
  document.addEventListener('visibilitychange', observe);
  return {
    events: () => submit.mock.calls.map(([event]) => event),
    originals: () =>
      submit.mock.calls
        .map(([event]) => event)
        .filter((event) => String(event.eventName).startsWith('pwa.original.')),
    visibility(value: boolean) {
      visible = value;
      document.dispatchEvent(new Event('visibilitychange'));
    },
    stop() {
      document.removeEventListener(presentationChanged, observe);
      document.removeEventListener('visibilitychange', observe);
    },
  };
}
const props = {
  recipeId: 'private-recipe-original-sentinel',
  imageCount: 3,
  finishedDishIndex: 1,
  onClose: vi.fn(),
  modal: true,
};
const currentImage = () => screen.getByRole('img') as HTMLImageElement;
function lateLoad(frame: (typeof animation.images)[number]) {
  act(() => frame.load?.({ currentTarget: frame.element, target: frame.element }));
}

// These component tests exercise committed UI state. Real SDK/receiver retention
// remains the separately required telemetry-surfaces-live qualification.
describe('original image presentation', () => {
  it('separates the shell, pending and failed image from loaded content and ignores replay or zoom', async () => {
    const observed = stream();
    const view = render(<OriginalPhotosViewer {...props} />);
    try {
      expect(currentImage()).toHaveAttribute('src', `/api/recipes/${props.recipeId}/original/1`);
      expect(screen.getByTestId('action-close-viewer')).toHaveFocus();
      expect(observed.events().map((event) => [event.eventName, event.screen])).toEqual([
        ['pwa.surface.opened', 'original.photos'],
      ]);
      expect(observed.originals()).toEqual([]);
      fireEvent.error(currentImage());
      expect(observed.originals()).toEqual([]);
      fireEvent.load(currentImage());
      expect(observed.originals()).toHaveLength(1);
      expect(observed.originals()[0]).toMatchObject({
        eventName: 'pwa.original.presented',
        screen: 'search',
        reason: 'image',
      });
      fireEvent.load(currentImage());
      view.rerender(<OriginalPhotosViewer {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'View Original ×2.5' }));
      fireEvent.click(screen.getByRole('button', { name: 'Fit to Screen' }));
      expect(observed.originals()).toHaveLength(1);
      expect(JSON.stringify(observed.events())).not.toContain(props.recipeId);
      expect(JSON.stringify(observed.events())).not.toContain('/api/');
    } finally {
      view.unmount();
      await Promise.resolve();
      observed.stop();
    }
  });

  it('requires each current next/previous selection to load and rejects old callbacks including A to B to A', async () => {
    const observed = stream();
    const view = render(<OriginalPhotosViewer {...props} />);
    try {
      const firstA = animation.images.at(-1)!;
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' });
      expect(currentImage()).toHaveAttribute('src', `/api/recipes/${props.recipeId}/original/0`);
      lateLoad(firstA);
      expect(observed.originals()).toEqual([]);
      fireEvent.load(currentImage());
      expect(observed.originals()).toHaveLength(1);
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' });
      expect(currentImage()).toHaveAttribute('src', `/api/recipes/${props.recipeId}/original/1`);
      lateLoad(firstA);
      expect(observed.originals()).toHaveLength(1);
      fireEvent.load(currentImage());
      expect(observed.originals()).toHaveLength(2);
      fireEvent.click(screen.getByRole('button', { name: 'View Original 1 / 3' }));
      fireEvent.load(currentImage());
      expect(observed.originals()).toHaveLength(2); // same selection is not a new entry
      const originals = observed.originals();
      expect(originals[0].eventId).not.toBe(originals[1].eventId);
      expect(originals[1].sequence).toBeGreaterThan(originals[0].sequence);
    } finally {
      view.unmount();
      await Promise.resolve();
      observed.stop();
    }
  });

  it('does not count a departed recipe image or reuse its loaded state after replacement', async () => {
    const observed = stream();
    const view = render(<OriginalPhotosViewer {...props} />);
    try {
      fireEvent.load(currentImage());
      const departed = animation.images.at(-1)!;
      const before = observed.originals().length;
      expect(before).toBe(1);
      view.rerender(<OriginalPhotosViewer {...props} recipeId="private-replacement-sentinel" />);
      expect(currentImage()).toHaveAttribute(
        'src',
        '/api/recipes/private-replacement-sentinel/original/1'
      );
      lateLoad(departed);
      expect(observed.originals()).toHaveLength(before);
      fireEvent.error(currentImage());
      expect(observed.originals()).toHaveLength(before);
      fireEvent.load(currentImage());
      expect(observed.originals()).toHaveLength(before + 1);
      expect(JSON.stringify(observed.events())).not.toContain('private-replacement-sentinel');
    } finally {
      view.unmount();
      await Promise.resolve();
      observed.stop();
    }
  });

  it('reconciles only the current visible image, survives effect replay and closes without a request or completion claim', async () => {
    const observed = stream();
    observed.visibility(false);
    const view = render(
      <StrictMode>
        <OriginalPhotosViewer {...props} />
      </StrictMode>
    );
    try {
      const departed = animation.images.at(-1)!;
      fireEvent.load(currentImage());
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' });
      lateLoad(departed);
      expect(observed.events()).toEqual([]);
      observed.visibility(true);
      expect(observed.events().map((event) => [event.eventName, event.screen])).toEqual([
        ['pwa.surface.opened', 'original.photos'],
      ]);
      fireEvent.load(currentImage());
      observed.visibility(false);
      observed.visibility(true);
      fireEvent.load(currentImage());
      expect(observed.originals()).toHaveLength(1);
      const frame = animation.images.at(-1)!;
      view.unmount();
      await Promise.resolve();
      lateLoad(frame);
      expect(observed.originals()).toHaveLength(1);
      expect(observed.events().map((event) => [event.eventName, event.screen])).toEqual([
        ['pwa.surface.opened', 'original.photos'],
        ['pwa.original.presented', 'search'],
        ['pwa.surface.closed', 'original.photos'],
      ]);
    } finally {
      view.unmount();
      await Promise.resolve();
      observed.stop();
    }
  });
});

it.each(['load', 'error'] as const)(
  'preserves current hidden loaded content after a stale %s callback',
  async (kind) => {
    const observed = stream();
    const view = render(<OriginalPhotosViewer {...props} />);
    try {
      const departed = animation.images.at(-1)!;
      observed.visibility(false);
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' });
      fireEvent.load(currentImage());
      if (kind === 'load') lateLoad(departed);
      else
        act(() => departed.error?.({ currentTarget: departed.element, target: departed.element }));
      observed.visibility(true);
      expect(observed.originals()).toHaveLength(1);
    } finally {
      view.unmount();
      await Promise.resolve();
      observed.stop();
    }
  }
);

it('requires a fresh load when metadata changes the current original source', async () => {
  const observed = stream();
  observed.visibility(false);
  const view = render(<OriginalPhotosViewer {...props} />);
  try {
    fireEvent.load(currentImage());
    view.rerender(<OriginalPhotosViewer {...props} finishedDishIndex={0} />);
    expect(currentImage()).toHaveAttribute('src', `/api/recipes/${props.recipeId}/original/0`);
    observed.visibility(true);
    expect(observed.originals()).toHaveLength(0);
    fireEvent.load(currentImage());
    expect(observed.originals()).toHaveLength(1);
  } finally {
    view.unmount();
    await Promise.resolve();
    observed.stop();
  }
});
