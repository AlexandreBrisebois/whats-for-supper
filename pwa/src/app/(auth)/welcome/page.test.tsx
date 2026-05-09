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

describe('WelcomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.healthGet.mockResolvedValue({ demoMode: false });
  });

  it('pre-populates the passphrase in demo mode', async () => {
    mocks.healthGet.mockResolvedValue({ demoMode: true });

    render(<WelcomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('passphrase-input')).toHaveValue('Swipe-Match-Cook');
    });
  });
});
