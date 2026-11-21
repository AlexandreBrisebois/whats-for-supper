import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NonCookingVignette } from './NonCookingVignette';

describe('NonCookingVignette', () => {
  it.each([
    ['eating_out', 'eating_out', 'lucide-utensils-crossed'],
    ['order_in', 'order_in', 'lucide-shopping-bag'],
    ['custom', 'custom', 'lucide-calendar-days'],
    ['mystery', 'mystery', 'lucide-sparkles'],
    [null, 'order_in', 'lucide-shopping-bag'],
    [undefined, 'order_in', 'lucide-shopping-bag'],
  ] as const)(
    'renders a decorative Cookbook Bookmark vignette for kind %s with its medallion icon',
    (inputKind, expectedKind, expectedIconClass) => {
      render(<NonCookingVignette kind={inputKind} testId="vignette-under-test" />);

      const container = screen.getByTestId('vignette-under-test');
      expect(container).toHaveAttribute('aria-hidden', 'true');
      expect(container).toHaveAttribute('data-vignette-kind', expectedKind);
      expect(container).toHaveClass('w-full', 'aspect-[25/11]');

      const backdropSvg = container.querySelector('svg[data-vignette-scene="true"]');
      expect(backdropSvg).not.toBeNull();
      expect(backdropSvg).toHaveAttribute('aria-hidden', 'true');

      const medallionIcon = container.querySelector(`.${expectedIconClass}`);
      expect(medallionIcon).not.toBeNull();
    }
  );

  it('uses unique SVG definition ids across multiple mounted vignettes', () => {
    const { container } = render(
      <>
        <NonCookingVignette kind="eating_out" testId="first-vignette" />
        <NonCookingVignette kind="order_in" testId="second-vignette" />
      </>
    );

    const ids = Array.from(container.querySelectorAll('defs [id]')).map((el) =>
      el.getAttribute('id')
    );
    expect(ids.length).toBeGreaterThanOrEqual(4);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
