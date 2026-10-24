import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PreviewFeaturesSection } from './PreviewFeaturesSection';
import { useFeatureFlagStore } from '@/store/featureFlagStore';

vi.mock('@/lib/api/featureFlags', () => ({
  updateFeatureFlag: vi.fn(),
  getFeatureFlags: vi.fn(),
}));

describe('PreviewFeaturesSection', () => {
  afterEach(() => localStorage.removeItem('locale'));
  beforeEach(() =>
    useFeatureFlagStore.setState({
      flags: {},
      pending: {},
      mutationErrors: {},
      error: null,
      refresh: vi.fn(),
    })
  );

  it('is absent when no opt-in previews are available', () => {
    render(<PreviewFeaturesSection />);
    expect(screen.queryByTestId('preview-features-section')).toBeNull();
  });

  it('shows a retryable diagnostic when the preview snapshot cannot load', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    useFeatureFlagStore.setState({ error: 'Unable to load preview features.', refresh });

    render(<PreviewFeaturesSection />);

    expect(screen.getByTestId('preview-features-section')).toHaveTextContent(
      'Unable to load preview features.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it('discloses an accessible preview switch', async () => {
    useFeatureFlagStore.setState({
      flags: {
        'future-test-preview': {
          key: 'future-test-preview',
          mode: 'opt-in',
          enabled: false,
          memberEnabled: false,
          displayName: 'Future test preview',
          description: 'Exercises reusable preview controls.',
        },
      },
      setEnabled: vi.fn().mockResolvedValue(true),
    });
    render(<PreviewFeaturesSection />);
    const disclosure = screen.getByRole('button', { name: /Preview features/i });
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('switch', { name: /Future test preview/i })).not.toBeChecked();
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() =>
      expect(useFeatureFlagStore.getState().setEnabled).toHaveBeenCalledWith(
        'future-test-preview',
        true
      )
    );
  });

  it('translates the load error and retry action into French', () => {
    localStorage.setItem('locale', 'fr');
    useFeatureFlagStore.setState({ error: 'Unable to load preview features.' });
    render(<PreviewFeaturesSection />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Impossible de charger les fonctionnalités en aperçu.'
    );
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });

  it('keeps server-provided copy for an unknown preview feature', () => {
    localStorage.setItem('locale', 'fr');
    useFeatureFlagStore.setState({
      flags: {
        'future-preview': {
          key: 'future-preview',
          mode: 'opt-in',
          enabled: false,
          memberEnabled: false,
          displayName: 'Future preview',
          description: 'Server-provided explanation.',
        },
      },
    });
    render(<PreviewFeaturesSection />);
    fireEvent.click(screen.getByRole('button', { name: /Fonctionnalités en aperçu/ }));
    expect(screen.getByRole('switch', { name: /Future preview/ })).toBeInTheDocument();
    expect(screen.getByText('Server-provided explanation.')).toBeInTheDocument();
  });

  it('uses server metadata and translates save feedback and announcements into French', async () => {
    localStorage.setItem('locale', 'fr');
    const key = 'future-test-preview';
    useFeatureFlagStore.setState({
      flags: {
        [key]: {
          key,
          mode: 'opt-in',
          enabled: false,
          memberEnabled: false,
          displayName: 'Future test preview',
          description: 'Exercises reusable preview controls.',
        },
      },
      pending: { [key]: true },
      mutationErrors: { [key]: "Couldn't save. Try again." },
      setEnabled: vi.fn().mockResolvedValue(true),
    });
    const { rerender } = render(<PreviewFeaturesSection />);
    fireEvent.click(screen.getByRole('button', { name: /Fonctionnalités en aperçu/ }));
    expect(screen.getByRole('switch', { name: /Future test preview/ })).toBeDisabled();
    expect(screen.getByText('Exercises reusable preview controls.')).toBeInTheDocument();
    expect(screen.getByText('Enregistrement…')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Impossible d’enregistrer.');
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(screen.getByText('Aperçu activé')).toBeInTheDocument());
    useFeatureFlagStore.setState({
      flags: { [key]: { ...useFeatureFlagStore.getState().flags[key], memberEnabled: true } },
      pending: {},
      mutationErrors: {},
    });
    rerender(<PreviewFeaturesSection />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(screen.getByText('Aperçu désactivé')).toBeInTheDocument());
  });
});
