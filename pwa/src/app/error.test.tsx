import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ErrorFallback from './error';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

it('retains ordinary error logging, fallback and reset across effect replay', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});

  const failure = new Error('private-render-sentinel');
  const reset = vi.fn();
  const view = render(
    <StrictMode>
      <ErrorFallback error={failure} reset={reset} />
    </StrictMode>
  );

  expect(console.error).toHaveBeenCalledWith(failure);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(reset).toHaveBeenCalledOnce();
  view.unmount();
  render(<ErrorFallback error={failure} reset={reset} />);

  expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
});
it('provides localized fallback and working reset for server-marked failures', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  localStorage.setItem('locale', 'fr');
  const reset = vi.fn();
  render(
    <ErrorFallback
      error={Object.assign(new Error('private'), { digest: 'private-digest' })}
      reset={reset}
    />
  );

  const button = screen.getByRole('button');
  expect(button.textContent).not.toBe('Try again');
  fireEvent.click(button);
  expect(reset).toHaveBeenCalledOnce();
});
