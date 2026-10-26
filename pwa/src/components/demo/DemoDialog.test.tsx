import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DemoDialog } from './DemoDialog';

it('leaves destination focus alone on departure even with a connected trigger', () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
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
