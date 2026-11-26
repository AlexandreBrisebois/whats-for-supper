import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemberPickerList } from './MemberPickerList';

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
}));

const MEMBERS = [
  { id: 'ABC', name: 'Sam' },
  { id: 'def', name: 'Maya' },
  { id: 'ghi', name: 'Léo' },
];

describe('MemberPickerList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders scrollable list with min-h-12 rows in household order and no completion cues', () => {
    const onSelect = vi.fn();
    render(
      <MemberPickerList
        id="picker-list"
        ariaLabel="Choose member"
        members={MEMBERS}
        onSelect={onSelect}
        listTestId="picker-menu"
        getOptionTestId={(m) => `picker-option-${m.id}`}
      />
    );

    const list = screen.getByRole('list', { name: 'Choose member' });
    expect(list).toHaveAttribute('id', 'picker-list');
    expect(list).toHaveClass('max-h-[min(60dvh,24rem)]', 'overflow-y-auto');

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Sam', 'Maya', 'Léo']);
    for (const button of buttons) {
      expect(button).toHaveClass('min-h-12');
    }

    fireEvent.click(screen.getByTestId('picker-option-def'));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith({ id: 'def', name: 'Maya' });
  });

  it('marks selectedMemberId case-insensitively with aria-current and Check icon', () => {
    render(
      <MemberPickerList
        id="picker-list"
        ariaLabel="Active member"
        members={MEMBERS}
        selectedMemberId="abc"
        onSelect={vi.fn()}
      />
    );

    const samButton = screen.getByRole('button', { name: /Sam/ });
    expect(samButton).toHaveAttribute('aria-current', 'true');
    expect(samButton.querySelector('svg')).toBeInTheDocument();

    const mayaButton = screen.getByRole('button', { name: /Maya/ });
    expect(mayaButton).not.toHaveAttribute('aria-current');
  });

  it('dismisses on Escape returning focus to returnFocusRef, and on outside mousedown', () => {
    const onDismiss = vi.fn();
    const triggerRef = createRef<HTMLButtonElement>();

    render(
      <div>
        <button ref={triggerRef} type="button">
          Trigger
        </button>
        <div data-testid="outside">Outside</div>
        <MemberPickerList
          id="picker-list"
          ariaLabel="Choose member"
          members={MEMBERS}
          onSelect={vi.fn()}
          onDismiss={onDismiss}
          outsideClickIgnoreRef={triggerRef}
          returnFocusRef={triggerRef}
        />
      </div>
    );

    const mayaButton = screen.getByRole('button', { name: /Maya/ });
    mayaButton.focus();
    fireEvent.keyDown(mayaButton, { key: 'Escape' });

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(triggerRef.current).toHaveFocus();

    fireEvent.mouseDown(triggerRef.current!);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
