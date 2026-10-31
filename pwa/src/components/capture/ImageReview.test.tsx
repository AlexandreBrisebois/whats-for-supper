import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import { ImageReview } from './ImageReview';

vi.mock('next/navigation', () => ({ usePathname: () => '/capture' }));

beforeEach(() => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  URL.createObjectURL = vi.fn(() => 'blob:private-image-sentinel');
  URL.revokeObjectURL = vi.fn();
});

it('retains lightbox opening, closing and reopening without deleting images', async () => {
  const onDelete = vi.fn();
  const images = [new File(['private-bytes-sentinel'], 'private-file-sentinel.jpg')];
  const view = render(
    <StrictMode>
      <ImageReview images={images} onDelete={onDelete} />
    </StrictMode>
  );
  try {
    expect(screen.getByAltText('Photo 1')).toBeVisible();

    fireEvent.click(screen.getByTestId('capture-image-preview-open-btn'));
    expect(screen.getByTestId('capture-image-preview')).toBeVisible();

    view.rerender(
      <StrictMode>
        <ImageReview images={images} onDelete={onDelete} />
      </StrictMode>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close Preview' }));
    await act(async () => {});
    fireEvent.click(screen.getByTestId('capture-image-preview-open-btn'));

    expect(onDelete).not.toHaveBeenCalled();

    view.rerender(
      <StrictMode>
        <ImageReview images={[]} onDelete={onDelete} />
      </StrictMode>
    );
    await act(async () => {});
    expect(screen.queryByTestId('capture-image-preview')).not.toBeInTheDocument();
  } finally {
    view.unmount();
    await act(async () => {});
  }
});

it('can open and close its lightbox while the document is hidden', async () => {
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
  } finally {
    view.unmount();
    await act(async () => {});
  }
});
