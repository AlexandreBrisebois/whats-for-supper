import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { observeOpening, presentationChanged } from '@/lib/telemetry/opening';
import type { BrowserObservation } from '@/lib/telemetry/navigation';
import { ImageReview } from './ImageReview';

vi.mock('next/navigation', () => ({ usePathname: () => '/capture' }));

beforeEach(() => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  URL.createObjectURL = vi.fn(() => 'blob:private-image-sentinel');
  URL.revokeObjectURL = vi.fn();
});

function startStream() {
  const submit = vi.fn<(event: BrowserObservation) => Promise<void>>().mockResolvedValue();
  const observe = () => observeOpening(document, true, '/capture', submit);
  observe();
  submit.mockClear();
  document.addEventListener(presentationChanged, observe);
  return {
    events: () => submit.mock.calls.map(([event]) => [event.eventName, event.screen]),
    raw: () => submit.mock.calls.map(([event]) => event),
    observe,
    stop: () => document.removeEventListener(presentationChanged, observe),
  };
}

it('observes only the real lightbox, with close/reopen and no filename or image content', async () => {
  const stream = startStream();
  const onDelete = vi.fn();
  const images = [new File(['private-bytes-sentinel'], 'private-file-sentinel.jpg')];
  const view = render(
    <StrictMode>
      <ImageReview images={images} onDelete={onDelete} />
    </StrictMode>
  );
  try {
    expect(screen.getByAltText('Photo 1')).toBeVisible();
    expect(stream.events()).toEqual([]);
    fireEvent.click(screen.getByTestId('capture-image-preview-open-btn'));
    expect(screen.getByTestId('capture-image-preview')).toBeVisible();
    expect(stream.events()).toEqual([['pwa.surface.opened', 'capture.image_review']]);
    view.rerender(
      <StrictMode>
        <ImageReview images={images} onDelete={onDelete} />
      </StrictMode>
    );
    expect(stream.events()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close Preview' }));
    await act(async () => {});
    fireEvent.click(screen.getByTestId('capture-image-preview-open-btn'));
    expect(stream.events()).toEqual([
      ['pwa.surface.opened', 'capture.image_review'],
      ['pwa.surface.closed', 'capture.image_review'],
      ['pwa.surface.opened', 'capture.image_review'],
    ]);
    expect(onDelete).not.toHaveBeenCalled();
    expect(JSON.stringify(stream.raw())).not.toContain('sentinel');
    view.rerender(
      <StrictMode>
        <ImageReview images={[]} onDelete={onDelete} />
      </StrictMode>
    );
    await act(async () => {});
    expect(screen.queryByTestId('capture-image-preview')).not.toBeInTheDocument();
    expect(stream.events().at(-1)).toEqual(['pwa.surface.closed', 'capture.image_review']);
  } finally {
    view.unmount();
    await act(async () => {});
    stream.stop();
  }
});

it('never reports a lightbox opened and removed while the document was hidden', async () => {
  const stream = startStream();
  const view = render(
    <ImageReview images={[new File(['image'], 'private-file-sentinel.jpg')]} onDelete={vi.fn()} />
  );
  try {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent.click(screen.getByTestId('capture-image-preview-open-btn'));
    expect(screen.getByTestId('capture-image-preview')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close Preview' }));
    await act(async () => {});
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    stream.observe();
    expect(stream.events()).toEqual([]);
  } finally {
    view.unmount();
    await act(async () => {});
    stream.stop();
  }
});
