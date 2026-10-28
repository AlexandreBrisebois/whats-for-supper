import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/image', () => ({
  default: ({ fill: _fill, priority: _priority, unoptimized: _unoptimized, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
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
  tWithVars: (_key: string, fallback: string) => fallback,
}));

vi.mock('@/lib/imageUtils', () => ({
  getImageUrl: (value: string) => value,
}));

import { QuickCaptureTrigger } from './HomeSections';

describe('home mobile sizing', () => {
  it('renders the quick capture trigger in a denser mobile layout', () => {
    render(<QuickCaptureTrigger />);

    expect(screen.getByTestId('quick-capture-trigger')).toHaveClass('p-4', 'sm:p-6');
  });
});
