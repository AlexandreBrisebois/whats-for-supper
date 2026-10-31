import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useHorizontalCardMotion } from './useHorizontalCardMotion';

const start = vi.hoisted(() => vi.fn());
vi.mock('framer-motion', () => ({
  useMotionValue: () => ({}),
  useTransform: () => ({}),
  useAnimation: () => ({}),
  useDragControls: () => ({ start }),
}));

function Surface({ front = true }: { front?: boolean }) {
  const { startDrag } = useHorizontalCardMotion(front);
  return (
    <div role="button" data-testid="surface" onPointerDown={startDrag}>
      <span data-testid="body">Card body</span>
      <button onPointerDown={() => childPointerDown()}>
        <span data-testid="button">Action</span>
      </button>
      <a href="#detail" data-testid="link">
        Link
      </a>
      <input data-testid="input" />
      <textarea data-testid="textarea" />
      <select data-testid="select">
        <option>Option</option>
      </select>
      <div role="button" data-testid="custom-button">
        Custom button
      </div>
      <div contentEditable suppressContentEditableWarning data-testid="editable">
        Editable
      </div>
    </div>
  );
}
const childPointerDown = vi.fn();
beforeEach(() => vi.clearAllMocks());

describe('horizontal card surface activation', () => {
  it.each(['surface', 'body'])('starts movement from %s without a hold', (target) => {
    render(<Surface />);
    fireEvent.pointerDown(screen.getByTestId(target), { isPrimary: true, button: 0 });
    expect(start).toHaveBeenCalledTimes(1);
  });

  it.each(['button', 'link', 'input', 'textarea', 'select', 'custom-button', 'editable'])(
    'leaves descendant %s in control of its pointer',
    (target) => {
      render(<Surface />);
      fireEvent.pointerDown(screen.getByTestId(target), { isPrimary: true, button: 0 });
      expect(start).not.toHaveBeenCalled();
      if (target === 'button') expect(childPointerDown).toHaveBeenCalledTimes(1);
    }
  );

  it('ignores a back card, secondary contact and right mouse button', () => {
    const view = render(<Surface front={false} />);
    fireEvent.pointerDown(screen.getByTestId('body'), { isPrimary: true, button: 0 });
    view.rerender(<Surface />);
    fireEvent.pointerDown(screen.getByTestId('body'), { isPrimary: false, button: 0 });
    fireEvent.pointerDown(screen.getByTestId('body'), { isPrimary: true, button: 2 });
    expect(start).not.toHaveBeenCalled();
  });
});
