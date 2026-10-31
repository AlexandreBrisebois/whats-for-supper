import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

import { DemoDialog } from './DemoDialog';

vi.mock('next/navigation', () => ({ usePathname: () => '/home' }));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

it('leaves destination focus alone on departure even with a connected trigger', () => {
  const trigger = document.createElement('button');
  const destination = document.createElement('input');
  document.body.append(trigger, destination);
  const view = render(
    <DemoDialog
      title="Demo"
      description="Explanation"
      onClose={vi.fn()}
      returnFocus={{ current: trigger }}
    >
      Body
    </DemoDialog>
  );
  destination.focus();
  view.unmount();
  expect(destination).toHaveFocus();
  trigger.remove();
  destination.remove();
});

it('opens a native dialog and handles native close without a dismissal callback', async () => {
  const onClose = vi.fn();
  const view = render(
    <DemoDialog
      title="private-title-sentinel"
      description="private-copy-sentinel"
      onClose={onClose}
    >
      private-action-sentinel
    </DemoDialog>
  );

  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveAttribute('open');
  await act(async () => (dialog as HTMLDialogElement).close());
  expect(dialog).not.toHaveAttribute('open');

  expect(onClose).not.toHaveBeenCalled();
  view.unmount();
});

it('keeps the native element closed when showModal does not open it', () => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  const view = render(
    <DemoDialog title="Unopened" description="Native denial" onClose={vi.fn()}>
      Body
    </DemoDialog>
  );
  expect(document.querySelector('dialog')).not.toHaveAttribute('open');

  view.unmount();
});

it('preserves a thrown native-open failure', () => {
  HTMLDialogElement.prototype.showModal = () => {
    throw new DOMException('Synthetic native denial', 'InvalidStateError');
  };
  expect(() =>
    render(
      <DemoDialog title="Failed native open" description="No presentation" onClose={vi.fn()}>
        Body
      </DemoDialog>
    )
  ).toThrow('Synthetic native denial');
});

it('ignores a delayed native close event after the same dialog successfully reopens', async () => {
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  const dialogView = (returnFocus: { current: HTMLElement | null }) => (
    <DemoDialog
      title="Reopened dialog"
      description="No stale closure"
      onClose={vi.fn()}
      returnFocus={returnFocus}
    >
      Body
    </DemoDialog>
  );
  const view = render(dialogView({ current: null }));
  view.rerender(dialogView({ current: null })); // effect cleanup closes then reopens natively
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveAttribute('open');
  fireEvent(dialog, new Event('close')); // delayed event from the previous native close
  expect(dialog).toHaveAttribute('open');

  view.unmount();
  await act(async () => {});
});

it('retains concurrent dialog cancellation and reopening across effect replay', async () => {
  const renderDialog = (label: string, onClose = vi.fn()) => (
    <StrictMode>
      <DemoDialog title={label} description="private-description-sentinel" onClose={onClose}>
        Body
      </DemoDialog>
    </StrictMode>
  );
  const first = render(renderDialog('private-first-title'));
  const onClose = vi.fn();
  const second = render(renderDialog('private-second-title', onClose));
  try {
    await act(async () => {});
    first.unmount();
    await act(async () => {});

    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
    // Cancel is prevented until the existing consumer actually dismisses its dialog.

    second.unmount();
    await act(async () => {});
    const reopened = render(renderDialog('private-reopened-title'));
    await act(async () => {});
    reopened.unmount();
    await act(async () => {});
  } finally {
    first.unmount();
    second.unmount();
  }
});
