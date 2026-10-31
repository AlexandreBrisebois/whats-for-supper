import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { observeOpening, presentationChanged } from '@/lib/telemetry/opening';
import type { BrowserObservation } from '@/lib/telemetry/navigation';
import { Modal } from './Modal';

vi.mock('next/navigation', () => ({ usePathname: () => '/recipes' }));

it('observes a semantic consumer only while open, retaining close/focus behavior without title-derived identity', async () => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const submit = vi.fn<(event: BrowserObservation) => Promise<void>>().mockResolvedValue();
  const observe = () => observeOpening(document, true, '/recipes', submit);
  observe();
  submit.mockClear();
  document.addEventListener(presentationChanged, observe);
  const onClose = vi.fn();
  const content = <button>Retained choice</button>;
  const view = render(
    <Modal
      isOpen={false}
      onClose={onClose}
      title="private-title-sentinel"
      surfaceIdentity="recipe.plan"
    >
      {content}
    </Modal>
  );
  try {
    expect(submit).not.toHaveBeenCalled();
    view.rerender(
      <Modal isOpen onClose={onClose} title="private-title-sentinel" surfaceIdentity="recipe.plan">
        {content}
      </Modal>
    );
    expect(screen.getByRole('button', { name: 'Close modal' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    view.rerender(
      <Modal
        isOpen={false}
        onClose={onClose}
        title="private-title-sentinel"
        surfaceIdentity="recipe.plan"
      >
        {content}
      </Modal>
    );
    await Promise.resolve();
    expect(submit.mock.calls.map(([event]) => [event.eventName, event.screen])).toEqual([
      ['pwa.surface.opened', 'recipe.plan'],
      ['pwa.surface.closed', 'recipe.plan'],
    ]);
    expect(JSON.stringify(submit.mock.calls)).not.toContain('private-title-sentinel');
    view.rerender(
      <Modal isOpen onClose={onClose} title="No semantic declaration">
        {content}
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(submit).toHaveBeenCalledTimes(2);
  } finally {
    view.unmount();
    document.removeEventListener(presentationChanged, observe);
  }
});
