import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/image', () => ({
  default: ({ fill: _fill, priority: _priority, unoptimized: _unoptimized, ...props }: any) => (
    <img {...props} alt={props.alt} />
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
}));

vi.mock('@/lib/imageUtils', () => ({
  getImageUrl: (value: string) => value,
}));

import { QuickCaptureTrigger } from './HomeSections';
import { TonightMenuCard } from './TonightMenuCard';
import { TonightPivotCard } from './TonightPivotCard';

describe('home mobile sizing', () => {
  it('renders tonight cards with taller mobile-first sizing', () => {
    const { rerender } = render(
      <TonightMenuCard
        recipeId="recipe-1"
        recipeName="Pasta Night"
        description="Simple dinner"
        imageUrl="/img/pasta.jpg"
      />
    );

    expect(screen.getByTestId('tonight-menu-card')).toHaveClass(
      'min-h-[28rem]',
      'h-[clamp(28rem,64vh,38rem)]'
    );

    rerender(
      <TonightPivotCard
        gotoDescription={null}
        gotoRecipeId={null}
        gotoImageUrl={null}
        gotoStatus={null}
        onConfirmGoto={() => {}}
        onDiscover={() => {}}
        onOrderIn={() => {}}
      />
    );

    expect(screen.getByTestId('tonight-pivot-card')).toHaveClass(
      'min-h-[28rem]',
      'h-[clamp(28rem,64vh,38rem)]'
    );
  });

  it('renders the quick capture trigger in a denser mobile layout', () => {
    render(<QuickCaptureTrigger />);

    expect(screen.getByTestId('quick-capture-trigger')).toHaveClass('p-4', 'sm:p-6');
  });
});