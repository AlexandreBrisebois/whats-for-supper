import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  readQuickVotesSettings: vi.fn(),
  saveQuickVotesSettings: vi.fn(),
}));

vi.mock('@/lib/api/quick-votes', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/quick-votes')>('@/lib/api/quick-votes');
  return {
    ...actual,
    readQuickVotesSettings: (...args: unknown[]) => mocks.readQuickVotesSettings(...args),
    saveQuickVotesSettings: (...args: unknown[]) => mocks.saveQuickVotesSettings(...args),
  };
});

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
}));

import { QuickVotesSettingsSection } from './QuickVotesSettingsSection';

describe('QuickVotesSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readQuickVotesSettings.mockResolvedValue({ enabled: false, targetLikes: 16 });
    mocks.saveQuickVotesSettings.mockImplementation(async (next) => next);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults switch to OFF and keeps How it works collapsed', async () => {
    render(<QuickVotesSettingsSection />);

    const toggle = await screen.findByTestId('quick-votes-switch');
    expect(toggle).toHaveAttribute('role', 'switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByTestId('quick-votes-target-input')).not.toBeInTheDocument();

    const disclosure = screen.getByTestId('quick-votes-how-it-works-toggle');
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('quick-votes-how-it-works-body')).not.toBeInTheDocument();
  });

  it('toggles ON, reveals numeric target (default 16) + min-h-12 steppers, and saves immediately', async () => {
    render(<QuickVotesSettingsSection />);

    const toggle = await screen.findByTestId('quick-votes-switch');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mocks.saveQuickVotesSettings).toHaveBeenCalledWith({
        enabled: true,
        targetLikes: 16,
      });
    });

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    const input = screen.getByTestId('quick-votes-target-input');
    expect(input).toHaveValue(16);

    const decrease = screen.getByTestId('quick-votes-decrease');
    const increase = screen.getByTestId('quick-votes-increase');
    expect(decrease.className).toContain('min-h-12');
    expect(increase.className).toContain('min-h-12');
  });

  it('supports numbers above 18 with no upper cap and stepper adjustments', async () => {
    mocks.readQuickVotesSettings.mockResolvedValue({ enabled: true, targetLikes: 16 });
    render(<QuickVotesSettingsSection />);

    const input = await screen.findByTestId('quick-votes-target-input');
    fireEvent.click(screen.getByTestId('quick-votes-increase'));

    await waitFor(() => {
      expect(mocks.saveQuickVotesSettings).toHaveBeenCalledWith({
        enabled: true,
        targetLikes: 17,
      });
    });

    fireEvent.change(input, { target: { value: '24' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mocks.saveQuickVotesSettings).toHaveBeenCalledWith({
        enabled: true,
        targetLikes: 24,
      });
    });

    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mocks.saveQuickVotesSettings).toHaveBeenCalledWith({
        enabled: true,
        targetLikes: 100,
      });
    });
  });

  it('disables decrement at 1 and rejects < 1 or non-integer values inline without posting', async () => {
    mocks.readQuickVotesSettings.mockResolvedValue({ enabled: true, targetLikes: 1 });
    render(<QuickVotesSettingsSection />);

    const decrease = await screen.findByTestId('quick-votes-decrease');
    expect(decrease).toBeDisabled();

    const input = screen.getByTestId('quick-votes-target-input');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toBeVisible();
    expect(mocks.saveQuickVotesSettings).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '1.5' } });
    fireEvent.blur(input);

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.saveQuickVotesSettings).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.saveQuickVotesSettings).not.toHaveBeenCalled();
  });

  it('expands How it works with family-wide scope note and non-blocking guidance', async () => {
    render(<QuickVotesSettingsSection />);

    const disclosure = await screen.findByTestId('quick-votes-how-it-works-toggle');
    fireEvent.click(disclosure);

    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    const body = screen.getByTestId('quick-votes-how-it-works-body');
    expect(body).toHaveTextContent(/Applies to everyone in the family\./i);
    expect(body).toHaveTextContent(/never blocks voting/i);
    expect(disclosure).toHaveAttribute('aria-controls', body.id);

    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('quick-votes-how-it-works-body')).not.toBeInTheDocument();
  });

  it('shows inline Hearth recovery with Retry when loading fails', async () => {
    mocks.readQuickVotesSettings
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce({ enabled: true, targetLikes: 12 });

    render(<QuickVotesSettingsSection />);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();
    const retry = screen.getByTestId('quick-votes-retry');
    fireEvent.click(retry);

    await waitFor(() => {
      expect(screen.getByTestId('quick-votes-switch')).toHaveAttribute('aria-checked', 'true');
    });
    expect(screen.getByTestId('quick-votes-target-input')).toHaveValue(12);
  });

  it('preserves user intent and shows inline Retry when saving fails', async () => {
    mocks.readQuickVotesSettings.mockResolvedValue({ enabled: false, targetLikes: 16 });
    mocks.saveQuickVotesSettings
      .mockRejectedValueOnce(new Error('Save failed'))
      .mockResolvedValueOnce({ enabled: true, targetLikes: 16 });

    render(<QuickVotesSettingsSection />);

    const toggle = await screen.findByTestId('quick-votes-switch');
    fireEvent.click(toggle);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    const retry = screen.getByTestId('quick-votes-retry');
    await act(async () => {
      fireEvent.click(retry);
    });

    await waitFor(() => {
      expect(mocks.saveQuickVotesSettings).toHaveBeenCalledTimes(2);
      expect(mocks.saveQuickVotesSettings).toHaveBeenLastCalledWith({
        enabled: true,
        targetLikes: 16,
      });
    });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByTestId('quick-votes-retry')).not.toBeInTheDocument();
  });

  it('preserves typed targetLikes if switch save resolves while user is editing', async () => {
    let resolveSwitch!: (val: { enabled: boolean; targetLikes: number }) => void;
    mocks.saveQuickVotesSettings
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSwitch = resolve;
          })
      )
      .mockImplementation(async (next) => next);

    render(<QuickVotesSettingsSection />);
    const toggle = await screen.findByTestId('quick-votes-switch');
    fireEvent.click(toggle);

    const input = screen.getByTestId('quick-votes-target-input');
    fireEvent.change(input, { target: { value: '24' } });

    await act(async () => {
      resolveSwitch({ enabled: true, targetLikes: 16 });
    });

    expect(input).toHaveValue(24);
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mocks.saveQuickVotesSettings).toHaveBeenLastCalledWith({
        enabled: true,
        targetLikes: 24,
      });
    });
  });
});
