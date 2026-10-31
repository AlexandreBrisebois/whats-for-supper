import { type ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OriginalPhotosViewer } from './OriginalPhotosViewer';

vi.mock('next/navigation', () => ({ usePathname: () => '/recipes' }));
vi.mock('@/locales', () => ({ t: (_key: string, fallback: string) => fallback }));

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const controls = { start: vi.fn().mockResolvedValue(undefined) };
  return {
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
    useAnimation: () => controls,
    motion: {
      div: ({ children, ...props }: Record<string, unknown>) => {
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
        return React.createElement('div', dom, children as ReactNode);
      },
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const props = {
  recipeId: 'private-recipe-original-sentinel',
  imageCount: 3,
  finishedDishIndex: 1,
  onClose: vi.fn(),
  modal: true,
};
const currentImage = () => screen.getByRole('img') as HTMLImageElement;
// These component tests exercise committed viewer UI state and image selection.
describe('original image presentation', () => {
  it('preserves source, focus and zoom through rerender', async () => {
    const view = render(<OriginalPhotosViewer {...props} />);
    try {
      expect(currentImage()).toHaveAttribute('src', `/api/recipes/${props.recipeId}/original/1`);
      expect(screen.getByTestId('action-close-viewer')).toHaveFocus();

      fireEvent.error(currentImage());

      fireEvent.load(currentImage());

      fireEvent.load(currentImage());
      view.rerender(<OriginalPhotosViewer {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'View Original ×2.5' }));
      fireEvent.click(screen.getByRole('button', { name: 'Fit to Screen' }));
      expect(screen.getByRole('button', { name: 'View Original ×2.5' })).toBeVisible();
    } finally {
      view.unmount();
      await Promise.resolve();
    }
  });

  it('navigates next and previous selections including a return to the original', async () => {
    const view = render(<OriginalPhotosViewer {...props} />);
    try {
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' });
      expect(currentImage()).toHaveAttribute('src', `/api/recipes/${props.recipeId}/original/0`);

      fireEvent.load(currentImage());

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' });
      expect(currentImage()).toHaveAttribute('src', `/api/recipes/${props.recipeId}/original/1`);

      fireEvent.load(currentImage());

      fireEvent.click(screen.getByRole('button', { name: 'View Original 1 / 3' }));
      fireEvent.load(currentImage());
    } finally {
      view.unmount();
      await Promise.resolve();
    }
  });

  it('renders the replacement recipe original after departure', async () => {
    const view = render(<OriginalPhotosViewer {...props} />);
    try {
      fireEvent.load(currentImage());

      view.rerender(<OriginalPhotosViewer {...props} recipeId="private-replacement-sentinel" />);
      expect(currentImage()).toHaveAttribute(
        'src',
        '/api/recipes/private-replacement-sentinel/original/1'
      );

      fireEvent.error(currentImage());

      fireEvent.load(currentImage());
    } finally {
      view.unmount();
      await Promise.resolve();
    }
  });
});

it('updates the original source when image metadata changes', async () => {
  const view = render(<OriginalPhotosViewer {...props} />);
  try {
    fireEvent.load(currentImage());
    view.rerender(<OriginalPhotosViewer {...props} finishedDishIndex={0} />);
    expect(currentImage()).toHaveAttribute('src', `/api/recipes/${props.recipeId}/original/0`);

    fireEvent.load(currentImage());
  } finally {
    view.unmount();
    await Promise.resolve();
  }
});
