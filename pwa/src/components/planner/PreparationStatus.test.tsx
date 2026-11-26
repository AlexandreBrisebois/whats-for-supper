import { DateOnly } from '@microsoft/kiota-abstractions';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PreparationStatus } from './PreparationStatus';

describe('PreparationStatus', () => {
  afterEach(() => {
    localStorage.removeItem('locale');
  });

  it('renders full default status text for detailed contexts', () => {
    render(<PreparationStatus preparation={{ preparedOn: DateOnly.parse('2026-11-25') }} />);

    const status = screen.getByTestId('preparation-status');
    expect(status).toHaveTextContent('Already prepared');
    expect(status).toHaveTextContent('Prepared Wednesday, Nov 25');
  });

  it.each([
    {
      locale: 'en',
      preparedOn: '2026-11-25',
      expected: 'Prepared',
      titleMatch: 'Prepared Wednesday, Nov 25',
    },
    {
      locale: 'fr',
      preparedOn: '2026-11-25',
      expected: 'Préparé',
      titleMatch: 'Préparé mercredi 25 nov.',
    },
    {
      locale: 'en',
      preparedOn: '2026-05-05',
      expected: 'Prepared',
      titleMatch: 'Prepared Tuesday, May 5',
    },
    {
      locale: 'fr',
      preparedOn: '2026-05-05',
      expected: 'Préparé',
      titleMatch: 'Préparé mardi 5 mai',
    },
  ])(
    'renders compact pill without weekday ($locale, $preparedOn)',
    ({ locale, preparedOn, expected, titleMatch }) => {
      localStorage.setItem('locale', locale);
      render(
        <PreparationStatus
          preparation={{ preparedOn: DateOnly.parse(preparedOn) }}
          variant="compact"
        />
      );

      const status = screen.getByTestId('preparation-status');
      expect(status.textContent).toBe(expected);
      expect(status).toHaveAttribute('title', titleMatch);
    }
  );
});
