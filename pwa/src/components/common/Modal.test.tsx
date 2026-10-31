import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { Modal } from './Modal';

vi.mock('next/navigation', () => ({ usePathname: () => '/recipes' }));

it('retains modal close and focus behavior through open and closed cycles', async () => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');

  const onClose = vi.fn();
  const content = <button>Retained choice</button>;
  const view = render(
    <Modal isOpen={false} onClose={onClose} title="private-title-sentinel">
      {content}
    </Modal>
  );
  try {
    view.rerender(
      <Modal isOpen onClose={onClose} title="private-title-sentinel">
        {content}
      </Modal>
    );
    expect(screen.getByRole('button', { name: 'Close modal' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    view.rerender(
      <Modal isOpen={false} onClose={onClose} title="private-title-sentinel">
        {content}
      </Modal>
    );
    await Promise.resolve();

    view.rerender(
      <Modal isOpen onClose={onClose} title="No semantic declaration">
        {content}
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeVisible();
  } finally {
    view.unmount();
  }
});
