/**
 * Unit tests for TonightPivotCard — rendering logic.
 * Migrated from home-goto.spec.ts (empty-state header, GOTO-ready button
 * label and add-goto-btn visibility).
 * Pure prop-driven render assertions — no browser or API mocking needed.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/lib/imageUtils', () => ({
  getImageUrl: (src: string) => src ?? '',
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/home/TonightMenuCard', () => ({
  TonightCardBase: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

import { setLocale } from '@/locales';

beforeEach(() => {
  setLocale('en');
  vi.clearAllMocks();
});

import { TonightPivotCard } from './TonightPivotCard';

const baseProps = {
  hasCheckedActive: true,
  onConfirmGoto: vi.fn(),
  onDiscover: vi.fn(),
  onOrderIn: vi.fn(),
};

describe('TonightPivotCard — empty state (no GOTO configured)', () => {
  it('identifies the ordinary empty night', () => {
    render(
      <TonightPivotCard
        {...baseProps}
        gotoDescription={null}
        gotoRecipeId={null}
        gotoStatus={null}
      />
    );
    expect(screen.getByTestId('pivot-card-header')).toHaveTextContent(
      'Nothing planned for tonight'
    );
  });

  it('offers unfiltered Browse recipe selection after the initial read settles', () => {
    render(
      <TonightPivotCard
        {...baseProps}
        gotoDescription={null}
        gotoRecipeId={null}
        gotoStatus={null}
      />
    );
    expect(screen.queryByTestId('add-goto-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('discover-btn')).toHaveAccessibleName('Search');
  });

  it('does not render confirm-goto-btn', () => {
    render(
      <TonightPivotCard
        {...baseProps}
        gotoDescription={null}
        gotoRecipeId={null}
        gotoStatus={null}
      />
    );
    expect(screen.queryByTestId('confirm-goto-btn')).not.toBeInTheDocument();
  });
});

describe('TonightPivotCard — GOTO ready state', () => {
  it('shows "Make this tonight" as the primary button label', () => {
    render(
      <TonightPivotCard
        {...baseProps}
        gotoDescription="Family Lasagna"
        gotoRecipeId="recipe-1"
        gotoStatus="ready"
      />
    );
    expect(screen.getByTestId('confirm-goto-btn')).toHaveTextContent('Make this tonight');
  });

  it('does not render add-goto-btn when a GOTO is configured', () => {
    render(
      <TonightPivotCard
        {...baseProps}
        gotoDescription="Family Lasagna"
        gotoRecipeId="recipe-1"
        gotoStatus="ready"
      />
    );
    expect(screen.queryByTestId('add-goto-btn')).not.toBeInTheDocument();
  });
});

it('shows a custom supper plan as the primary text instead of a GOTO suggestion', () => {
  render(
    <TonightPivotCard
      gotoDescription="Fallback pasta"
      gotoRecipeId={null}
      onConfirmGoto={() => {}}
      onDiscover={() => {}}
      onOrderIn={() => {}}
      nonCookingLabel="Emma’s birthday supper"
    />
  );
  expect(screen.getByTestId('today-non-cooking-label')).toHaveTextContent('Emma’s birthday supper');
  expect(screen.queryByText('Nothing planned yet')).not.toBeInTheDocument();
});

it.each([
  ['order_in', 'lucide-shopping-bag'],
  ['eating_out', 'lucide-utensils-crossed'],
  ['custom', 'lucide-calendar-days'],
] as const)('shows the %s icon in the non-cooking hero', (kind, iconClass) => {
  render(
    <TonightPivotCard
      {...baseProps}
      gotoDescription={null}
      gotoRecipeId={null}
      nonCookingLabel="Saved plan"
      nonCookingKind={kind}
    />
  );
  expect(screen.getByTestId('pivot-card-image-area').querySelector(`.${iconClass}`)).not.toBeNull();
});

it('does not show a GOTO recipe image on a non-cooking day', () => {
  render(
    <TonightPivotCard
      {...baseProps}
      gotoDescription="Fallback pasta"
      gotoRecipeId={null}
      gotoImageUrl="/pasta.jpg"
      nonCookingLabel="Eating out"
    />
  );
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

it.each([
  ['ready', 'recipe-1', ['confirm-goto-btn', 'discover-btn', 'order-in-btn']],
  ['pending', 'recipe-1', ['discover-btn', 'order-in-btn']],
  [null, 'recipe-1', ['discover-btn', 'order-in-btn']],
  [null, null, ['discover-btn', 'order-in-btn']],
])('orders immediate choices before setup for %s / %s', (status, id, order) => {
  render(
    <TonightPivotCard
      {...baseProps}
      gotoRecipeId={id}
      gotoStatus={status}
      gotoDescription="Family Lasagna"
    />
  );
  const card = screen.getByTestId('tonight-pivot-card');
  expect(
    Array.from(card.querySelectorAll('button, a')).map((el) => el.getAttribute('data-testid'))
  ).toEqual(order);
  expect(screen.getByText('Nothing planned for tonight')).toBeVisible();
  if (status === 'ready') expect(screen.getByText("Your family's GOTO")).toBeVisible();
  else expect(screen.queryByTestId('confirm-goto-btn')).not.toBeInTheDocument();
  expect(baseProps.onConfirmGoto).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId('discover-btn'));
  fireEvent.click(screen.getByTestId('order-in-btn'));
  expect(baseProps.onDiscover).toHaveBeenCalledTimes(1);
  expect(baseProps.onOrderIn).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('order-in-btn')).toHaveAccessibleName('Take Out');
  expect(screen.getByTestId('order-in-btn').querySelector('svg')).toHaveAttribute(
    'aria-hidden',
    'true'
  );
});

it.each([
  ['ready', 'Le GOTO de votre famille'],
  ['pending', 'Votre GOTO est en préparation…'],
  [null, 'Vérification de votre GOTO…'],
])('localizes French %s context and actions', (status, feedback) => {
  setLocale('fr');
  render(
    <TonightPivotCard
      {...baseProps}
      gotoRecipeId="recipe-1"
      gotoStatus={status}
      gotoDescription="Lasagne"
    />
  );
  expect(screen.getByTestId('pivot-card-header')).toHaveTextContent('Rien de prévu pour ce soir');
  expect(screen.getByText(feedback)).toBeVisible();
  expect(screen.getByTestId('discover-btn')).toHaveAccessibleName('Rechercher');
  expect(screen.getByTestId('order-in-btn')).toHaveAccessibleName('À emporter');
  if (status === 'ready')
    expect(screen.getByTestId('confirm-goto-btn')).toHaveAccessibleName(
      'Préparer ce repas ce soir'
    );
});

it('retains saved Mystery context and ready choices without calling the day unplanned', () => {
  render(
    <TonightPivotCard
      {...baseProps}
      gotoRecipeId="recipe-1"
      gotoStatus="ready"
      gotoDescription="Family Lasagna"
      nonCookingLabel="Mystery night"
      nonCookingKind="mystery"
    />
  );
  expect(screen.getByTestId('pivot-card-header')).toHaveTextContent('Mystery night');
  expect(screen.queryByText('Nothing planned for tonight')).not.toBeInTheDocument();
  expect(screen.getByText("Your family's GOTO")).toBeVisible();
  fireEvent.click(screen.getByTestId('confirm-goto-btn'));
  expect(baseProps.onConfirmGoto).toHaveBeenCalledTimes(1);
});

describe('Tonight pivot image availability', () => {
  it.each(['en', 'fr'] as const)(
    'uses the normal proposal beneath the Mystery header in %s',
    (locale) => {
      setLocale(locale);
      const label = locale === 'fr' ? 'Souper mystère' : 'Mystery night';
      const props = {
        ...baseProps,
        gotoRecipeId: 'one',
        gotoDescription: 'Garden supper',
        gotoStatus: 'ready',
        nonCookingLabel: label,
        nonCookingKind: 'mystery' as const,
      };
      const { rerender } = render(<TonightPivotCard {...props} />);
      const header = screen.getByTestId('pivot-card-header');
      const image = screen.getByRole('img', { name: 'Garden supper' });
      expect(header).toHaveTextContent(label);
      expect(screen.getAllByText(label)).toHaveLength(1);
      expect(header.compareDocumentPosition(image) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(image).toHaveAttribute('src', '/api/recipes/one/hero');
      expect(image.parentElement).toHaveClass('aspect-[5/4]');
      expect(screen.queryByTestId('today-non-cooking-label')).not.toBeInTheDocument();
      expect(baseProps.onConfirmGoto).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId('discover-btn'));
      fireEvent.click(screen.getByTestId('order-in-btn'));
      expect(baseProps.onDiscover).toHaveBeenCalledTimes(1);
      expect(baseProps.onOrderIn).toHaveBeenCalledTimes(1);
      expect(baseProps.onConfirmGoto).not.toHaveBeenCalled();
      rerender(<TonightPivotCard {...props} gotoImageUrl="/explicit.jpg" />);
      expect(screen.getByRole('img')).toHaveAttribute('src', '/explicit.jpg');
      fireEvent.error(screen.getByRole('img'));
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(header).toHaveTextContent(label);
      expect(screen.getByTestId('confirm-goto-btn')).toBeVisible();
      fireEvent.click(screen.getByTestId('confirm-goto-btn'));
      expect(baseProps.onConfirmGoto).toHaveBeenCalledTimes(1);
      rerender(<TonightPivotCard {...props} gotoStatus="pending" />);
      expect(screen.queryByTestId('confirm-goto-btn')).not.toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByTestId('today-non-cooking-label')).toHaveTextContent(label);
    }
  );

  it('keeps choices after failure and resets only for a changed source or recipe', () => {
    const props = {
      ...baseProps,
      gotoRecipeId: 'one',
      gotoDescription: 'Garden supper',
      gotoStatus: 'ready',
      gotoImageUrl: '/first.jpg',
    };
    const { rerender } = render(<TonightPivotCard {...props} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('confirm-goto-btn')).toBeVisible();
    expect(baseProps.onConfirmGoto).not.toHaveBeenCalled();
    rerender(<TonightPivotCard {...props} gotoDescription="Hydrated supper" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    rerender(<TonightPivotCard {...props} gotoImageUrl="/second.jpg" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/second.jpg');
    fireEvent.error(screen.getByRole('img'));
    rerender(<TonightPivotCard {...props} gotoRecipeId="two" gotoImageUrl="/second.jpg" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/second.jpg');
  });
});

it.each([
  ['ordinary empty', null, null, null, true, true],
  ['initial read pending', null, null, null, false, false],
  ['ready', 'recipe-1', 'ready', null, true, false],
  ['pending', 'recipe-1', 'pending', null, true, false],
  ['checking', 'recipe-1', null, null, true, false],
  ['saved Mystery', null, null, 'Mystery night', true, false],
] as const)(
  'limits education to settled ordinary empty: %s',
  (_name, id, status, label, settled, visible) => {
    render(
      <TonightPivotCard
        {...baseProps}
        gotoRecipeId={id}
        gotoStatus={status}
        gotoDescription={id ? 'Family supper' : null}
        nonCookingLabel={label}
        nonCookingKind={label ? 'mystery' : null}
        hasCheckedActive={settled}
      />
    );
    if (visible) {
      expect(screen.getByTestId('goto-setup-helper')).toHaveTextContent(
        'Tap the on favourite recipes so we can suggest one here.'
      );
      expect(screen.queryByRole('link', { name: 'Choose GOTO recipes' })).not.toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'star' })).toBeVisible();
      expect(screen.getByTestId('goto-setup-helper')).not.toHaveTextContent(/no GOTOs|empty list/i);
    } else {
      expect(screen.queryByTestId('goto-setup-helper')).not.toBeInTheDocument();
      expect(screen.queryByTestId('add-goto-btn')).not.toBeInTheDocument();
    }
  }
);

describe('Mystery without a proposal', () => {
  it.each(['en', 'fr'] as const)(
    'explains checking and unavailable states in %s without claiming an empty list',
    (locale) => {
      setLocale(locale);
      const props = {
        ...baseProps,
        gotoDescription: null,
        gotoRecipeId: null,
        gotoStatus: null,
        nonCookingKind: 'mystery' as const,
        nonCookingLabel: locale === 'fr' ? 'Souper mystère' : 'Mystery night',
      };
      const { rerender } = render(<TonightPivotCard {...props} hasCheckedActive={false} />);
      expect(screen.getByTestId('mystery-plan-illustration').querySelector('svg')).toHaveAttribute(
        'width',
        '104'
      );
      expect(screen.getByTestId('mystery-availability')).toHaveTextContent(
        locale === 'fr' ? 'Vérification de votre GOTO' : 'Checking your GOTO'
      );
      rerender(<TonightPivotCard {...props} hasCheckedActive />);
      expect(screen.getByTestId('mystery-availability')).toHaveTextContent(
        locale === 'fr'
          ? 'Aucune suggestion GOTO disponible pour le moment.'
          : 'No GOTO suggestion available right now.'
      );
      expect(screen.queryByTestId('confirm-goto-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('goto-setup-helper')).not.toBeInTheDocument();
    }
  );
});
