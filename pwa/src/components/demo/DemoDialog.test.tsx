import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { observeOpening, presentationChanged } from '@/lib/telemetry/opening';
import { presentedSurfaces } from '@/lib/telemetry/surfaces';
import type { BrowserObservation } from '@/lib/telemetry/navigation';
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

const presented = () => [...presentedSurfaces(document, '/home')];

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

it('declares the fixed dialog identity only after successful native open and closes on native close', async () => {
  HTMLDialogElement.prototype.showModal = function () {
    expect(presented()).not.toContain('demo.dialog');
    this.setAttribute('open', '');
  };
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
  expect(presented()).toContain('demo.dialog');
  expect(presented()).not.toContain('private-title-sentinel');
  const dialog = screen.getByRole('dialog');
  await act(async () => (dialog as HTMLDialogElement).close());
  expect(presented()).not.toContain('demo.dialog');
  expect(onClose).not.toHaveBeenCalled();
  view.unmount();
});

it('does not declare a pre-mounted native element when showModal never opens it', () => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  const view = render(
    <DemoDialog title="Unopened" description="Native denial" onClose={vi.fn()}>
      Body
    </DemoDialog>
  );
  expect(document.querySelector('dialog')).not.toHaveAttribute('open');
  expect(presented()).not.toContain('demo.dialog');
  view.unmount();
});

it('preserves a thrown native-open failure without declaring presentation', () => {
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
  expect(presented()).not.toContain('demo.dialog');
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
  expect(presented()).toContain('demo.dialog');
  view.unmount();
  await act(async () => {});
  expect(presented()).not.toContain('demo.dialog');
});

it('suppresses hidden native cycles and reconciles a previously observed native close on resume', async () => {
  let visible = true;
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
    visible ? 'visible' : 'hidden'
  );
  const submit = vi.fn<(event: BrowserObservation) => Promise<void>>().mockResolvedValue();
  const observe = () => observeOpening(document, true, '/home', submit);
  observe();
  submit.mockClear();
  document.addEventListener(presentationChanged, observe);
  const dialog = () => (
    <DemoDialog title="Hidden dialog" description="Not attention" onClose={vi.fn()}>
      Body
    </DemoDialog>
  );
  let view: ReturnType<typeof render> | undefined;
  try {
    visible = false;
    view = render(dialog());
    view.unmount();
    await act(async () => {});
    visible = true;
    observe();
    expect(submit).not.toHaveBeenCalled();
    view = render(dialog());
    expect(submit.mock.calls.map(([event]) => [event.eventName, event.screen])).toEqual([
      ['pwa.surface.opened', 'demo.dialog'],
    ]);
    visible = false;
    await act(async () => (screen.getByRole('dialog') as HTMLDialogElement).close());
    expect(submit).toHaveBeenCalledTimes(1);
    visible = true;
    observe();
    expect(submit.mock.calls.map(([event]) => [event.eventName, event.screen])).toEqual([
      ['pwa.surface.opened', 'demo.dialog'],
      ['pwa.surface.closed', 'demo.dialog'],
    ]);
  } finally {
    view?.unmount();
    document.removeEventListener(presentationChanged, observe);
  }
});

it('aggregates concurrent dialogs through replay, cancel, unmount and reopen without private labels', async () => {
  const submit = vi.fn<(event: BrowserObservation) => Promise<void>>().mockResolvedValue();
  const observe = () => observeOpening(document, true, '/home', submit);
  observe();
  submit.mockClear();
  document.addEventListener(presentationChanged, observe);
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
    expect(submit.mock.calls.map(([event]) => [event.eventName, event.screen])).toEqual([
      ['pwa.surface.opened', 'demo.dialog'],
    ]);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
    // Cancel is prevented until the existing consumer actually dismisses its dialog.
    expect(presented()).toContain('demo.dialog');
    second.unmount();
    await act(async () => {});
    const reopened = render(renderDialog('private-reopened-title'));
    await act(async () => {});
    reopened.unmount();
    await act(async () => {});
    expect(submit.mock.calls.map(([event]) => [event.eventName, event.screen])).toEqual([
      ['pwa.surface.opened', 'demo.dialog'],
      ['pwa.surface.closed', 'demo.dialog'],
      ['pwa.surface.opened', 'demo.dialog'],
      ['pwa.surface.closed', 'demo.dialog'],
    ]);
    expect(JSON.stringify(submit.mock.calls)).not.toContain('private-');
  } finally {
    first.unmount();
    second.unmount();
    document.removeEventListener(presentationChanged, observe);
  }
});
