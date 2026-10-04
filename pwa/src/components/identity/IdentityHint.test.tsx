import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IdentityHint, InstallIdentityProvider } from './IdentityHint';
import { LocaleProvider } from '@/components/common/LocaleProvider';
import { Header } from '@/components/common/Header';
import { Layout } from '@/components/common/Layout';

vi.mock('@/components/common/Navigation', () => ({ Navigation: () => null }));

describe('install identity hint', () => {
  it.each(['en', 'fr'] as const)(
    'covers every identity in %s without interactive elements',
    (locale) => {
      localStorage.setItem('locale', locale);
      for (const channel of ['stable', 'beta'] as const) {
        for (const demo of [false, true]) {
          const view = render(
            <LocaleProvider>
              <InstallIdentityProvider identity={{ demo, channel }}>
                <IdentityHint />
              </InstallIdentityProvider>
            </LocaleProvider>
          );
          if (!demo && channel === 'stable') {
            expect(screen.queryByTestId('identity-hint')).not.toBeInTheDocument();
          } else {
            const hint = screen.getByTestId('identity-hint');
            expect(hint).toHaveTextContent(
              demo ? (locale === 'fr' ? 'Démo' : 'Demo') : locale === 'fr' ? 'Bêta' : 'Beta'
            );
            expect(hint).toHaveAccessibleName(
              demo ? (locale === 'fr' ? 'Démo' : 'Demo') : locale === 'fr' ? 'Bêta' : 'Beta'
            );
            expect(hint).toHaveAccessibleDescription(
              demo && channel === 'beta'
                ? locale === 'fr'
                  ? 'Canal bêta'
                  : 'Beta release channel'
                : ''
            );
            expect(hint.tagName).toBe('SPAN');
            expect(hint).not.toHaveAttribute('tabindex');
            expect(hint).toHaveClass('pointer-events-none', 'absolute');
            expect(hint.querySelector('button,a,input')).toBeNull();
          }
          view.unmount();
        }
      }
    }
  );

  it('retains Header brand and actions with exactly one hint', () => {
    render(
      <InstallIdentityProvider identity={{ demo: true, channel: 'beta' }}>
        <Header rightAction={<button>Cancel</button>} />
      </InstallIdentityProvider>
    );
    expect(screen.getByRole('link', { name: 'Supper' })).toHaveAttribute('href', '/home');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(screen.getAllByTestId('identity-hint')).toHaveLength(1);
  });

  it.each([false, true])('places a single hint when hideHeader=%s', (hideHeader) => {
    render(
      <InstallIdentityProvider identity={{ demo: true, channel: 'stable' }}>
        <Layout hideHeader={hideHeader}>
          <button>Cook</button>
        </Layout>
      </InstallIdentityProvider>
    );
    expect(screen.getAllByTestId('identity-hint')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Cook' })).toBeEnabled();
  });
});
