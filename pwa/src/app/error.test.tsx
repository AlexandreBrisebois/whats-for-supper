import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ErrorFallback from './error';
import { observeOpening } from '@/lib/telemetry/opening';

const { submit, presentation } = vi.hoisted(() => ({
  submit: vi.fn(async (_input: unknown) => {}),
  presentation: vi.fn(async (_input: unknown) => {}),
}));
vi.mock('@/lib/telemetry/actions', () => ({
  reportBrowserObservation: presentation,
  reportBrowserError: submit,
  readErrorReportingEnabled: async () => true,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/home' }));
afterEach(() => {
  vi.restoreAllMocks();
  submit.mockClear();
  localStorage.clear();
});
it('reports once across effect replay before fallback presentation, then rearms reset for the same Error', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  observeOpening(document, true, '/home', async () => {});
  const failure = new Error('private-render-sentinel');
  const reset = vi.fn();
  const view = render(
    <StrictMode>
      <ErrorFallback error={failure} reset={reset} />
    </StrictMode>
  );
  expect(submit).toHaveBeenCalledTimes(1);
  expect(submit.mock.calls[0][0]).toMatchObject({
    reason: 'browser.render',
    screen: 'home',
    sequence: 3,
  });
  expect(presentation).toHaveBeenCalledWith(
    expect.objectContaining({ eventName: 'pwa.screen.presented', screen: 'error', sequence: 4 })
  );
  const first = submit.mock.calls[0][0];
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(reset).toHaveBeenCalledOnce();
  view.unmount();
  render(<ErrorFallback error={failure} reset={reset} />);
  expect(submit).toHaveBeenCalledTimes(2);
  expect(submit.mock.calls[1][0]).not.toEqual(first);
  expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
});
it('keeps server-marked failures server-owned, with localized fallback and working reset', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  localStorage.setItem('locale', 'fr');
  const reset = vi.fn();
  render(
    <ErrorFallback
      error={Object.assign(new Error('private'), { digest: 'private-digest' })}
      reset={reset}
    />
  );
  expect(submit).not.toHaveBeenCalled();
  const button = screen.getByRole('button');
  expect(button.textContent).not.toBe('Try again');
  fireEvent.click(button);
  expect(reset).toHaveBeenCalledOnce();
});
