import { observeOpening, presentationChanged } from '@/lib/telemetry/opening';
import type { BrowserObservation } from '@/lib/telemetry/navigation';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { InviteLinkDialog } from './InviteLinkDialog';
import { Modal } from './Modal';

const mocks = vi.hoisted(() => ({ getInviteLink: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getInviteLink: mocks.getInviteLink }));
vi.mock('next/navigation', () => ({ usePathname: () => '/profile' }));
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

beforeEach(() => {
  mocks.getInviteLink.mockReset();
  mocks.getInviteLink.mockResolvedValue('https://private.example/PRIVATE_INVITE_URL');
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
});

function startPresentationStream() {
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const submit = vi.fn<(event: BrowserObservation) => Promise<void>>().mockResolvedValue();
  const observe = () => observeOpening(document, true, '/profile', submit);
  observe();
  submit.mockClear();
  document.addEventListener(presentationChanged, observe);
  return {
    visibility,
    observe,
    events: () => submit.mock.calls.map(([event]) => [event.eventName, event.screen]),
    raw: () => submit.mock.calls.map(([event]) => event),
    stop: () => {
      document.removeEventListener(presentationChanged, observe);
      visibility.mockRestore();
    },
  };
}

it('observes nested invite presentation independently of the shared semantic Modal and link readiness', async () => {
  const stream = startPresentationStream();
  const onClose = vi.fn();
  let resolveLink!: (value: string) => void;
  mocks.getInviteLink.mockReturnValue(
    new Promise<string>((resolve) => {
      resolveLink = resolve;
    })
  );
  function Nested({ invite }: { invite: boolean }) {
    return (
      <Modal isOpen onClose={vi.fn()} surfaceIdentity="recipe.detail" title="PRIVATE_MODAL_TITLE">
        {invite && (
          <InviteLinkDialog
            memberId="PRIVATE_INVITE_MEMBER_ID"
            memberName="PRIVATE_INVITE_MEMBER_NAME"
            onClose={onClose}
          />
        )}
      </Modal>
    );
  }
  const view = render(<Nested invite={false} />);
  try {
    view.rerender(<Nested invite />);
    expect(screen.getByTestId('invite-dialog-copy')).toBeDisabled();
    expect(stream.events()).toContainEqual(['pwa.surface.opened', 'invite.share']);
    resolveLink('https://private.example/PRIVATE_INVITE_URL');
    await screen.findByText('https://private.example/PRIVATE_INVITE_URL');
    fireEvent.click(screen.getByTestId('invite-dialog-close'));
    expect(onClose).toHaveBeenCalledOnce();
    view.rerender(<Nested invite={false} />);
    await Promise.resolve();
    expect(stream.events()).toContainEqual(['pwa.surface.closed', 'invite.share']);
    expect(stream.events()).not.toContainEqual(['pwa.surface.closed', 'recipe.detail']);
    view.rerender(<Nested invite />);
    expect(stream.events().filter((event) => event[1] === 'invite.share')).toEqual([
      ['pwa.surface.opened', 'invite.share'],
      ['pwa.surface.closed', 'invite.share'],
      ['pwa.surface.opened', 'invite.share'],
    ]);
    expect(JSON.stringify(stream.raw())).not.toMatch(/PRIVATE_|https:/);
  } finally {
    view.unmount();
    stream.stop();
  }
});

it('does not report an invite mounted and dismissed entirely while the document is hidden', async () => {
  const stream = startPresentationStream();
  stream.visibility.mockReturnValue('hidden');
  const view = render(
    <InviteLinkDialog memberId="PRIVATE_ID" memberName="PRIVATE_NAME" onClose={vi.fn()} />
  );
  try {
    await screen.findByText('https://private.example/PRIVATE_INVITE_URL');
    view.unmount();
    await Promise.resolve();
    stream.visibility.mockReturnValue('visible');
    stream.observe();
    expect(stream.events()).toEqual([]);
  } finally {
    stream.stop();
  }
});
