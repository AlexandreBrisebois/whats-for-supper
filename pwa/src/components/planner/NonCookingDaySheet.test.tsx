import {
  observeOpening,
  presentationChanged,
  registerPlannerPresentation,
} from '@/lib/telemetry/opening';
import type { BrowserObservation } from '@/lib/telemetry/navigation';
vi.mock('next/navigation', () => ({ usePathname: () => '/planner' }));
import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NonCookingDaySheet } from './NonCookingDaySheet';

describe('NonCookingDaySheet', () => {
  it('puts Mystery night first and defaults to it for a new plan without a textbox', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<NonCookingDaySheet date="2026-10-12" onSave={onSave} onClose={vi.fn()} />);
    const choices = screen.getByRole('group', { name: 'Supper plan' });
    expect(choices.querySelector('button')).toBe(screen.getByTestId('non-cooking-mystery'));
    expect(screen.getByTestId('non-cooking-mystery')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));
    expect(onSave).toHaveBeenCalledWith({ kind: 'mystery', customLabel: null });
  });

  it('saves Mystery night without typing and preserves the custom draft', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<NonCookingDaySheet date="2026-10-12" onSave={onSave} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'We made plans' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('non-cooking-other-plans'));
    const input = screen.getByLabelText('Tell the family the plan');
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'Supper at Grandma’s' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mystery night' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText('We’ll figure out supper that day.')).not.toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));
    expect(onSave).toHaveBeenCalledWith({ kind: 'mystery', customLabel: null });
    fireEvent.click(screen.getByTestId('non-cooking-other-plans'));
    expect(screen.getByLabelText('Tell the family the plan')).toHaveValue('Supper at Grandma’s');
  });

  it('offers removing the plan without a Cancel button and only clears the day', async () => {
    const onClear = vi.fn().mockResolvedValue(undefined);
    const onSave = vi.fn();
    render(
      <NonCookingDaySheet
        date="2026-10-12"
        plan={{ kind: 'order_in' }}
        onSave={onSave}
        onClear={onClear}
        onClose={vi.fn()}
      />
    );
    const remove = screen.getByRole('button', { name: 'Remove supper plan' });
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    await act(async () => fireEvent.click(remove));
    expect(onClear).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('localizes the sheet, choices and date in French', () => {
    localStorage.setItem('locale', 'fr');
    try {
      render(<NonCookingDaySheet date="2026-10-12" onSave={vi.fn()} onClose={vi.fn()} />);
      expect(screen.getByRole('dialog')).toHaveAccessibleName('Quel est le plan? lundi 12 octobre');
      expect(screen.getByRole('button', { name: 'Commander' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Souper mystère' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'On a des plans' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
    } finally {
      localStorage.removeItem('locale');
    }
  });
  it('has a readable date-specific title and explicit saving feedback', async () => {
    let finish!: () => void;
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    render(<NonCookingDaySheet date="2026-10-12" onSave={onSave} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('What’s the plan? Monday, October 12');
    expect(screen.getByRole('button', { name: 'Mystery night' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Eating out' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    await act(async () => finish());
  });

  it('closes with the top X without saving and restores focus to the trigger', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const onSave = vi.fn();
    const onClose = vi.fn();
    const view = render(<NonCookingDaySheet date="2026-10-12" onSave={onSave} onClose={onClose} />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
  it('shows four choices and preserves custom typing while saving only the selected preset', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<NonCookingDaySheet date="2026-10-12" onSave={onSave} onClose={vi.fn()} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('non-cooking-other-plans'));
    fireEvent.change(screen.getByTestId('non-cooking-custom-label'), {
      target: { value: 'Supper at Grandma’s' },
    });
    fireEvent.click(screen.getByTestId('non-cooking-eating-out'));
    expect(screen.getByLabelText('Tell the family the plan')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('non-cooking-other-plans'));
    expect(screen.getByTestId('non-cooking-custom-label')).toHaveValue('Supper at Grandma’s');
    fireEvent.click(screen.getByTestId('non-cooking-order-in'));
    await act(async () => fireEvent.click(screen.getByTestId('non-cooking-save')));
    expect(onSave).toHaveBeenCalledWith({ kind: 'order_in', customLabel: 'Supper at Grandma’s' });
  });

  it.each(['order_in', 'eating_out'] as const)(
    'edits and clears the optional %s message using the same field',
    async (kind) => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(
        <NonCookingDaySheet
          date="2026-10-12"
          plan={{ kind, customLabel: 'Luigi’s' }}
          onSave={onSave}
          onClose={vi.fn()}
        />
      );
      const input = screen.getByLabelText('Tell the family the plan');
      expect(
        screen.getByTestId(`non-cooking-${kind === 'order_in' ? 'order-in' : 'eating-out'}`)
      ).toHaveAttribute('aria-pressed', 'true');
      expect(input).toHaveValue('Luigi’s');
      expect(input).not.toHaveFocus();
      fireEvent.change(input, { target: { value: 'x'.repeat(81) } });
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('1–80');
      fireEvent.change(input, { target: { value: '  Try the new café  ' } });
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));
      expect(onSave).toHaveBeenLastCalledWith({ kind, customLabel: 'Try the new café' });
      fireEvent.change(input, { target: { value: '  ' } });
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));
      expect(onSave).toHaveBeenLastCalledWith({ kind, customLabel: null });
    }
  );

  it('requires a custom message and retains it after a failed save', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('offline'));
    render(<NonCookingDaySheet date="2026-10-12" onSave={onSave} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('non-cooking-other-plans'));
    await act(async () => fireEvent.click(screen.getByTestId('non-cooking-save')));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('non-cooking-custom-label'), {
      target: { value: '  Emma’s birthday supper  ' },
    });
    await act(async () => fireEvent.click(screen.getByTestId('non-cooking-save')));
    expect(onSave).toHaveBeenCalledWith({ kind: 'custom', customLabel: 'Emma’s birthday supper' });
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByTestId('non-cooking-custom-label')).toHaveValue(
      '  Emma’s birthday supper  '
    );
  });
});

// Run the real declaration/coordinator path rather than mocking the observation hook.
function startPresentationStream() {
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const releasePlanner = registerPlannerPresentation(document, 'planner', false);
  const submit = vi.fn<(event: BrowserObservation) => Promise<void>>().mockResolvedValue();
  const observe = () => observeOpening(document, true, '/planner', submit);
  observe();
  submit.mockClear();
  document.addEventListener(presentationChanged, observe);
  return {
    observe,
    visibility,
    events: () => submit.mock.calls.map(([event]) => [event.eventName, event.screen]),
    raw: () => submit.mock.calls.map(([event]) => event),
    stop: () => {
      document.removeEventListener(presentationChanged, observe);
      releasePlanner();
      visibility.mockRestore();
    },
  };
}

it('observes the non-cooking sheet through draft edits, failed save and cancel/reopen', async () => {
  const stream = startPresentationStream();
  const props = {
    date: '2026-10-12',
    onSave: vi.fn().mockRejectedValue(new Error('offline')),
    onClose: vi.fn(),
  };
  let view = render(<NonCookingDaySheet {...props} />);
  try {
    fireEvent.click(screen.getByTestId('non-cooking-other-plans'));
    fireEvent.change(screen.getByTestId('non-cooking-custom-label'), {
      target: { value: 'PRIVATE_PLAN_NOTE' },
    });
    await act(async () => fireEvent.click(screen.getByTestId('non-cooking-save')));
    expect(screen.getByTestId('non-cooking-custom-label')).toHaveValue('PRIVATE_PLAN_NOTE');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
    expect(stream.events()).toEqual([['pwa.surface.opened', 'planning.non_cooking']]);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledOnce();
    view.unmount();
    await Promise.resolve();
    view = render(<NonCookingDaySheet {...props} />);
    expect(stream.events()).toEqual([
      ['pwa.surface.opened', 'planning.non_cooking'],
      ['pwa.surface.closed', 'planning.non_cooking'],
      ['pwa.surface.opened', 'planning.non_cooking'],
    ]);
    expect(JSON.stringify(stream.raw())).not.toMatch(/PRIVATE_PLAN_NOTE|2026-10|custom/);
  } finally {
    view.unmount();
    stream.stop();
  }
});
