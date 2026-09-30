import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PreviewFeaturesSection } from './PreviewFeaturesSection';
import { useFeatureFlagStore } from '@/store/featureFlagStore';

vi.mock('@/lib/api/featureFlags', () => ({
  updateFeatureFlag: vi.fn(),
  getFeatureFlags: vi.fn(),
}));

describe('PreviewFeaturesSection', () => {
  beforeEach(() => useFeatureFlagStore.setState({ flags: {}, pending: {}, mutationErrors: {} }));

  it('is absent when no opt-in previews are available', () => {
    render(<PreviewFeaturesSection />);
    expect(screen.queryByTestId('preview-features-section')).toBeNull();
  });

  it('discloses an accessible preview switch', async () => {
    useFeatureFlagStore.setState({
      flags: {
        'single-page-recipe-steps': {
          key: 'single-page-recipe-steps',
          mode: 'opt-in',
          enabled: false,
          memberEnabled: false,
          displayName: 'Recipe on one page',
          description: 'After getting ready, scroll through all the cooking steps on one page.',
        },
      },
      setEnabled: vi.fn().mockResolvedValue(true),
    });
    render(<PreviewFeaturesSection />);
    const disclosure = screen.getByRole('button', { name: /Preview features/i });
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('switch', { name: /Recipe on one page/i })).not.toBeChecked();
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() =>
      expect(useFeatureFlagStore.getState().setEnabled).toHaveBeenCalledWith(
        'single-page-recipe-steps',
        true
      )
    );
  });
});
