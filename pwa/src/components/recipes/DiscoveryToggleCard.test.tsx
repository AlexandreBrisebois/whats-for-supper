import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DiscoveryToggleCard } from './DiscoveryToggleCard';
import { setLocale, t } from '@/locales';

afterEach(() => {
  cleanup();
  setLocale('en');
});

describe('DiscoveryToggleCard', () => {
  for (const locale of ['en', 'fr'] as const) {
    for (const pressed of [false, true]) {
      it(`uses the concise ${locale} subtitle when pressed=${pressed}`, () => {
        setLocale(locale);
        const onToggle = vi.fn().mockResolvedValue(undefined);
        render(<DiscoveryToggleCard isDiscoverable={pressed} onToggle={onToggle} />);
        const button = screen.getByTestId('action-toggle-discovery');
        expect(button).toHaveTextContent(
          t('discovery.showsInDiscovery', 'Shows in Discovery voting')
        );
        expect(button).toHaveAttribute('aria-pressed', String(pressed));
        expect(button).toHaveAccessibleName(
          pressed
            ? t('recipes.turnOffDiscovery', 'Turn off Discovery for this recipe')
            : t('recipes.turnOnDiscovery', 'Turn on Discovery for this recipe')
        );
        fireEvent.click(button);
        expect(onToggle).toHaveBeenCalledTimes(1);
      });
    }
  }
  it('keeps pending controls disabled without invoking the handler', () => {
    const onToggle = vi.fn();
    render(
      <DiscoveryToggleCard
        isDiscoverable={false}
        isLoading
        onToggle={onToggle}
        testId="pending-toggle"
      />
    );
    const button = screen.getByTestId('pending-toggle');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onToggle).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});
