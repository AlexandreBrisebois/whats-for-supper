import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PassThePhone } from './PassThePhone';

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string, vars: Record<string, string | number>) =>
    Object.entries(vars ?? {}).reduce(
      (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
      fallback
    ),
}));

const CURRENT_MEMBER = { id: 'member-alex', name: 'Alex' };
const OTHER_MEMBERS = [
  { id: 'member-sam', name: 'Sam' },
  { id: 'member-jordan', name: 'Jordan' },
  { id: 'member-leo', name: 'Léo' },
];

describe('PassThePhone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens scrollable chooser excluding current member with zero completion cues', () => {
    render(
      <PassThePhone
        currentMember={CURRENT_MEMBER}
        otherMembers={OTHER_MEMBERS}
        onConfirmHandoff={vi.fn()}
      />
    );

    const trigger = screen.getByTestId('discovery-pass-the-phone');
    expect(trigger).toHaveClass('bg-sage-50', 'border-garden-line', 'text-garden-ink');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const menu = screen.getByTestId('discovery-pass-the-phone-menu');
    expect(menu).toHaveClass('max-h-[min(60dvh,24rem)]', 'overflow-y-auto');

    const options = Array.from(menu.querySelectorAll('button'));
    expect(options.map((o) => o.textContent?.trim())).toEqual(['Sam', 'Jordan', 'Léo']);
    expect(menu).not.toHaveTextContent(/Alex|voted|done|waiting|\d+/i);
  });

  it('shows minimal curtain with Let’s go CTA and Cancel, and enters busy state while confirming', async () => {
    let resolveSwitch!: () => void;
    const onConfirmHandoff = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSwitch = resolve;
        })
    );

    render(
      <PassThePhone
        currentMember={CURRENT_MEMBER}
        otherMembers={OTHER_MEMBERS}
        onConfirmHandoff={onConfirmHandoff}
      />
    );

    fireEvent.click(screen.getByTestId('discovery-pass-the-phone'));
    fireEvent.click(screen.getByTestId('pass-the-phone-option-member-jordan'));

    const curtain = screen.getByTestId('discovery-handoff-curtain');
    expect(curtain).toBeVisible();
    expect(curtain).toHaveClass('fixed', 'inset-0', 'z-[70]', 'bg-cream');
    expect(screen.getByRole('heading', { name: 'Hand the phone to Jordan' })).toBeVisible();

    const confirmBtn = screen.getByTestId('discovery-handoff-confirm');
    const cancelBtn = screen.getByTestId('discovery-handoff-cancel');
    expect(confirmBtn).toHaveTextContent("Let's go, Jordan!");
    expect(confirmBtn).toHaveClass('bg-hearth-fill', 'min-h-14');
    expect(cancelBtn).toHaveTextContent('Cancel');
    expect(cancelBtn).toHaveClass('bg-white', 'border-chrome-line', 'min-h-12');

    fireEvent.click(confirmBtn);
    expect(onConfirmHandoff).toHaveBeenCalledExactlyOnceWith({
      id: 'member-jordan',
      name: 'Jordan',
    });
    expect(confirmBtn).toHaveAttribute('aria-busy', 'true');
    expect(confirmBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();

    await act(async () => {
      resolveSwitch();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('discovery-handoff-curtain')).not.toBeInTheDocument();
    });
  });

  it('returns focus to trigger on Escape or outside dismissal without switching', () => {
    const onConfirmHandoff = vi.fn();
    render(
      <div>
        <div data-testid="outside-area">Outside</div>
        <PassThePhone
          currentMember={CURRENT_MEMBER}
          otherMembers={OTHER_MEMBERS}
          onConfirmHandoff={onConfirmHandoff}
        />
      </div>
    );

    const trigger = screen.getByTestId('discovery-pass-the-phone');
    fireEvent.click(trigger);
    const firstOption = screen.getByTestId('pass-the-phone-option-member-sam');
    firstOption.focus();
    fireEvent.keyDown(firstOption, { key: 'Escape' });

    expect(screen.queryByTestId('discovery-pass-the-phone-menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(onConfirmHandoff).not.toHaveBeenCalled();

    fireEvent.click(trigger);
    expect(screen.getByTestId('discovery-pass-the-phone-menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside-area'));
    expect(screen.queryByTestId('discovery-pass-the-phone-menu')).not.toBeInTheDocument();
    expect(onConfirmHandoff).not.toHaveBeenCalled();
  });

  it('cancelling the curtain returns to wrap-up without calling onConfirmHandoff', () => {
    const onConfirmHandoff = vi.fn();
    render(
      <PassThePhone
        currentMember={CURRENT_MEMBER}
        otherMembers={OTHER_MEMBERS}
        onConfirmHandoff={onConfirmHandoff}
      />
    );

    const trigger = screen.getByTestId('discovery-pass-the-phone');
    fireEvent.click(trigger);
    fireEvent.click(screen.getByTestId('pass-the-phone-option-member-jordan'));
    expect(screen.getByTestId('discovery-handoff-curtain')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('discovery-handoff-cancel'));
    expect(screen.queryByTestId('discovery-handoff-curtain')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(onConfirmHandoff).not.toHaveBeenCalled();
  });

  it('keeps curtain open with Hearth inline error and Try again retry when handoff rejects', async () => {
    const onConfirmHandoff = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(undefined);

    render(
      <PassThePhone
        currentMember={CURRENT_MEMBER}
        otherMembers={OTHER_MEMBERS}
        onConfirmHandoff={onConfirmHandoff}
      />
    );

    fireEvent.click(screen.getByTestId('discovery-pass-the-phone'));
    fireEvent.click(screen.getByTestId('pass-the-phone-option-member-jordan'));
    fireEvent.click(screen.getByTestId('discovery-handoff-confirm'));

    const alert = await screen.findByTestId('discovery-handoff-error');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveClass('bg-terracotta-50', 'border-hearth-line', 'text-hearth-ink');
    expect(alert).toHaveTextContent("Couldn't switch to Jordan just now.");
    expect(alert).toHaveTextContent('Alex is still selected.');
    expect(screen.getByTestId('discovery-handoff-curtain')).toBeVisible();

    const retryBtn = screen.getByTestId('discovery-handoff-confirm');
    expect(retryBtn).toHaveTextContent('Try again');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(onConfirmHandoff).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('discovery-handoff-curtain')).not.toBeInTheDocument();
    });
  });
});
