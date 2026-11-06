import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/recipes',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('@/locales', () => ({ t: (_key: string, fallback: string) => fallback }));
vi.mock('@/store/discoveryStore', () => ({
  useDiscoveryStore: () => ({ hasPendingCards: false, setHasPendingCards: vi.fn() }),
}));
vi.mock('@/lib/api/discovery', () => ({ getCategories: vi.fn().mockResolvedValue([]) }));

import { Navigation } from './Navigation';

describe('Navigation', () => {
  it('shows Recipes as the current library destination with a book icon', () => {
    render(<Navigation />);

    const recipes = screen.getByRole('link', { name: 'Recipes' });
    expect(recipes).toHaveAttribute('href', '/recipes');
    expect(recipes).toHaveAttribute('aria-current', 'page');
    expect(recipes.querySelector('.lucide-book-open')).toBeInTheDocument();
    expect(recipes.querySelector('.lucide-search')).not.toBeInTheDocument();
  });
});
