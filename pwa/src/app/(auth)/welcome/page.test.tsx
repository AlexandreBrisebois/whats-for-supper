import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  healthGet: vi.fn(),
  replace: vi.fn(),
  authenticateWithPassphrase: vi.fn(),
  setHearthCookie: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      health: {
        get: (...args: unknown[]) => mocks.healthGet(...args),
      },
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  authenticateWithPassphrase: (...args: unknown[]) => mocks.authenticateWithPassphrase(...args),
  setHearthCookie: (...args: unknown[]) => mocks.setHearthCookie(...args),
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
}));

import WelcomePage from './page';
import { InstallIdentityProvider } from '@/components/identity/IdentityHint';

describe('WelcomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.healthGet.mockResolvedValue({ demoMode: false });
  });

  it.each(['stable', 'beta'] as const)(
    'keeps welcome branding and controls for %s',
    async (channel) => {
      for (const demo of [false, true]) {
        const view = render(
          <InstallIdentityProvider identity={{ demo, channel }}>
            <WelcomePage />
          </InstallIdentityProvider>
        );
        await waitFor(() => expect(mocks.healthGet).toHaveBeenCalled());
        expect(screen.getByTestId('welcome-title')).toHaveTextContent("What's For Supper?");
        expect(screen.getByTestId('passphrase-input')).toHaveValue('');
        expect(screen.getByTestId('welcome-enter-btn')).toBeDisabled();
        if (demo || channel === 'beta')
          expect(screen.getByTestId('identity-hint')).toHaveTextContent(demo ? 'Demo' : 'Beta');
        else expect(screen.queryByTestId('identity-hint')).not.toBeInTheDocument();
        view.unmount();
      }
    }
  );

  it('pre-populates the passphrase in demo mode', async () => {
    mocks.healthGet.mockResolvedValue({ demoMode: true });

    render(<WelcomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('passphrase-input')).toHaveValue('Swipe-Match-Cook');
    });
  });
});
