vi.mock('next/navigation', () => ({ usePathname: () => '/discovery' }));
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FamilyNudgeDialog } from './FamilyNudgeDialog';

const mocks = vi.hoisted(() => ({ getVotingLink: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getVotingLink: mocks.getVotingLink }));

describe('FamilyNudgeDialog', () => {
  beforeEach(() => {
    mocks.getVotingLink.mockReset();
    mocks.getVotingLink.mockResolvedValue('');
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });

  it('does not create a link or share until opened and uses the existing fallback', async () => {
    const { rerender } = render(<FamilyNudgeDialog open={false} onClose={vi.fn()} />);
    expect(mocks.getVotingLink).not.toHaveBeenCalled();
    rerender(<FamilyNudgeDialog open onClose={vi.fn()} />);
    await screen.findByText(`${window.location.origin}/discovery`);
    expect(screen.getByTestId('planner-nudge-copy')).toBeEnabled();
    expect(screen.queryByTestId('planner-nudge-share')).not.toBeInTheDocument();
  });

  it('contains keyboard focus, dismisses with Escape and restores the trigger', async () => {
    const close = vi.fn();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const { rerender, unmount } = render(<FamilyNudgeDialog open onClose={close} />);
    const first = screen.getByTestId('planner-nudge-close');
    await waitFor(() => expect(first).toHaveFocus());
    await screen.findByText(`${window.location.origin}/discovery`);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByTestId('planner-nudge-copy')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
    rerender(<FamilyNudgeDialog open={false} onClose={close} />);
    await waitFor(() => expect(trigger).toHaveFocus());
    unmount();
    trigger.remove();
  });
});

// Run the real declaration/coordinator path rather than mocking the observation hook.

it('retains nudge readiness, dismissal and reopening', async () => {
  let resolveLink!: (value: string) => void;
  mocks.getVotingLink.mockReturnValue(
    new Promise<string>((resolve) => {
      resolveLink = resolve;
    })
  );
  const close = vi.fn();
  const view = render(<FamilyNudgeDialog open={false} onClose={close} />);
  try {
    view.rerender(<FamilyNudgeDialog open onClose={close} />);
    expect(screen.getByTestId('planner-nudge-copy')).toBeDisabled();

    resolveLink('https://private.example/PRIVATE_NUDGE_URL');
    await screen.findByText('https://private.example/PRIVATE_NUDGE_URL');
    view.rerender(<FamilyNudgeDialog open onClose={close} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
    view.rerender(<FamilyNudgeDialog open={false} onClose={close} />);

    view.rerender(<FamilyNudgeDialog open onClose={close} />);
  } finally {
    view.unmount();
  }
});
