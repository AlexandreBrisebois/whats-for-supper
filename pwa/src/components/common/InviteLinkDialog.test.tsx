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

it('retains nested invite readiness and dismissal without closing the parent modal', async () => {
  const onClose = vi.fn();
  let resolveLink!: (value: string) => void;
  mocks.getInviteLink.mockReturnValue(
    new Promise<string>((resolve) => {
      resolveLink = resolve;
    })
  );
  function Nested({ invite }: { invite: boolean }) {
    return (
      <Modal isOpen onClose={vi.fn()} title="PRIVATE_MODAL_TITLE">
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

    resolveLink('https://private.example/PRIVATE_INVITE_URL');
    await screen.findByText('https://private.example/PRIVATE_INVITE_URL');
    fireEvent.click(screen.getByTestId('invite-dialog-close'));
    expect(onClose).toHaveBeenCalledOnce();
    view.rerender(<Nested invite={false} />);
    await Promise.resolve();

    view.rerender(<Nested invite />);
  } finally {
    view.unmount();
  }
});
