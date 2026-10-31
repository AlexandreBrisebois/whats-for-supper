import { observeOpening } from '@/lib/telemetry/opening';
import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import GlobalError from './global-error';
const { submit, enabled } = vi.hoisted(() => ({
  submit: vi.fn(async (_input: unknown) => {}),
  enabled: vi.fn(async () => true),
}));
vi.mock('@/lib/telemetry/actions', () => ({
  reportBrowserObservation: async () => {},
  reportBrowserError: submit,
  readErrorReportingEnabled: enabled,
}));
afterEach(() => {
  submit.mockClear();
  enabled.mockClear();
  localStorage.clear();
});
it('replaces the whole document without providers/observer and reports standalone once', async () => {
  localStorage.setItem('locale', 'fr');
  const reset = vi.fn();
  render(
    <StrictMode>
      <GlobalError error={new Error('private-root')} reset={reset} />
    </StrictMode>,
    { container: document }
  );
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  expect(submit.mock.calls[0][0]).toMatchObject({ reason: 'browser.render' });
  expect(submit.mock.calls[0][0]).not.toHaveProperty('sessionId');
  expect(document.documentElement.lang).toBe('fr');
  expect(document.querySelector('html > body main')).toBeTruthy();
  expect(document.querySelector('style')).toBeTruthy();
  const button = screen.getByRole('button');
  expect(button.textContent).not.toBe('Try again');
  fireEvent.click(button);
  expect(reset).toHaveBeenCalledOnce();
  expect(screen.getByRole('link').getAttribute('href')).toBe('/home');
});
it('retains existing document scope and Home stage with no surviving provider or observer', () => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  const records: unknown[] = [];
  observeOpening(document, true, '/home', async (input) => {
    records.push(input);
  });
  render(<GlobalError error={new Error('private-root')} reset={() => {}} />, {
    container: document,
  });
  expect(submit).toHaveBeenCalledOnce();
  expect(submit.mock.calls[0][0]).toMatchObject({
    reason: 'browser.render',
    screen: 'home',
    sequence: 3,
    sessionId: (records[0] as { sessionId: string }).sessionId,
  });
});
