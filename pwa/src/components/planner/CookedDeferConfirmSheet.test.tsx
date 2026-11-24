import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  let locale: 'en' | 'fr' = 'en';
  return {
    getLocale: () => locale,
    setLocale: (value: 'en' | 'fr') => {
      locale = value;
    },
  };
});

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/locales', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/locales')>();
  return {
    ...actual,
    t: (key: string, fallback: string) => actual.t(key, fallback, mocks.getLocale()),
    getLocale: mocks.getLocale,
  };
});

import { CookedDeferConfirmSheet } from './CookedDeferConfirmSheet';

describe('CookedDeferConfirmSheet', () => {
  beforeEach(() => {
    mocks.setLocale('en');
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <CookedDeferConfirmSheet
        isOpen={false}
        onClose={vi.fn()}
        date="2026-05-11"
        recipeName="Pasta Carbonara"
        onSelect={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders English Option 3 copy without claiming groceries are excluded', () => {
    render(
      <CookedDeferConfirmSheet
        isOpen={true}
        onClose={vi.fn()}
        date="2026-05-11"
        recipeName="Pasta Carbonara"
        onSelect={vi.fn()}
      />
    );

    const dialog = screen.getByTestId('cooked-defer-sheet');
    expect(dialog).toHaveTextContent('Pasta Carbonara');
    expect(dialog).toHaveTextContent('This meal is marked cooked. How should we move it?');
    expect(screen.getByTestId('cooked-defer-reset')).toHaveTextContent('Cook it next week');
    expect(screen.getByTestId('cooked-defer-reset')).toHaveTextContent(
      'Move as planned and clear cooked status'
    );
    expect(screen.getByTestId('cooked-defer-preserve')).toHaveTextContent('Already cooked');
    expect(screen.getByTestId('cooked-defer-preserve')).toHaveTextContent(
      'Keep it marked cooked (prepped ahead or frozen)'
    );
    expect(dialog.textContent?.toLowerCase()).not.toContain('grocer');
  });

  it('renders French Option 3 copy without claiming groceries are excluded', () => {
    mocks.setLocale('fr');
    render(
      <CookedDeferConfirmSheet
        isOpen={true}
        onClose={vi.fn()}
        date="2026-05-11"
        recipeName="Pâtes Carbonara"
        onSelect={vi.fn()}
      />
    );

    const dialog = screen.getByTestId('cooked-defer-sheet');
    expect(dialog).toHaveTextContent('Pâtes Carbonara');
    expect(dialog).toHaveTextContent(
      'Ce repas est marqué cuisiné. Comment souhaitez-vous le déplacer ?'
    );
    expect(screen.getByTestId('cooked-defer-reset')).toHaveTextContent(
      'Cuisiner la semaine prochaine'
    );
    expect(screen.getByTestId('cooked-defer-reset')).toHaveTextContent(
      'Déplace comme prévu et efface le statut cuisiné'
    );
    expect(screen.getByTestId('cooked-defer-preserve')).toHaveTextContent('Déjà cuisiné');
    expect(screen.getByTestId('cooked-defer-preserve')).toHaveTextContent(
      "Garde le statut cuisiné (préparé d'avance ou congelé)"
    );
    expect(dialog.textContent?.toLowerCase()).not.toContain('épicerie');
  });

  it('dispatches reset, preserve, or dismiss without mutation', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <CookedDeferConfirmSheet
        isOpen={true}
        onClose={onClose}
        date="2026-05-11"
        recipeName="Pasta Carbonara"
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByTestId('cooked-defer-reset'));
    expect(onSelect).toHaveBeenLastCalledWith('reset');

    fireEvent.click(screen.getByTestId('cooked-defer-preserve'));
    expect(onSelect).toHaveBeenLastCalledWith('preserve');

    fireEvent.keyDown(screen.getByTestId('cooked-defer-sheet'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('cooked-defer-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('disables choice buttons and dismissal while pending', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <CookedDeferConfirmSheet
        isOpen={true}
        onClose={onClose}
        date="2026-05-11"
        recipeName="Pasta Carbonara"
        pending={true}
        onSelect={onSelect}
      />
    );

    expect(screen.getByTestId('cooked-defer-reset')).toBeDisabled();
    expect(screen.getByTestId('cooked-defer-preserve')).toBeDisabled();
    fireEvent.click(screen.getByTestId('cooked-defer-backdrop'));
    fireEvent.keyDown(screen.getByTestId('cooked-defer-sheet'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('uses Era 3 Hearth primary and Garden secondary disposition hierarchy with reduced-motion and reflow classes', () => {
    render(
      <CookedDeferConfirmSheet
        isOpen={true}
        onClose={vi.fn()}
        date="2026-05-11"
        recipeName="Pasta Carbonara"
        onSelect={vi.fn()}
      />
    );

    const resetBtn = screen.getByTestId('cooked-defer-reset');
    const preserveBtn = screen.getByTestId('cooked-defer-preserve');

    expect(resetBtn).toHaveClass(
      'min-h-[68px]',
      'rounded-[1.25rem]',
      'border-[1.5px]',
      'border-hearth-line',
      'bg-terracotta-50',
      'motion-reduce:transition-none'
    );
    expect(resetBtn.querySelector('.bg-hearth-fill.text-cream-100')).not.toBeNull();
    expect(resetBtn.querySelectorAll('svg')).toHaveLength(1);
    expect(resetBtn.querySelector('[class*="[overflow-wrap:anywhere]"]')).not.toBeNull();

    expect(preserveBtn).toHaveClass(
      'min-h-[68px]',
      'rounded-[1.25rem]',
      'border',
      'border-chrome-line',
      'bg-white',
      'motion-reduce:transition-none'
    );
    expect(preserveBtn.querySelector('.bg-sage-50.text-garden-ink')).not.toBeNull();
    expect(preserveBtn.querySelectorAll('svg')).toHaveLength(1);
    expect(preserveBtn.querySelector('[class*="[overflow-wrap:anywhere]"]')).not.toBeNull();
  });
});
