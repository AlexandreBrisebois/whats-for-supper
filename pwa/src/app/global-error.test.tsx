import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import GlobalError from './global-error';
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
it('replaces the document with localized accessible fallback and reset without providers', async () => {
  localStorage.setItem('locale', 'fr');
  const reset = vi.fn();
  render(
    <StrictMode>
      <GlobalError error={new Error('private-root')} reset={reset} />
    </StrictMode>,
    { container: document }
  );

  expect(document.documentElement.lang).toBe('fr');
  expect(document.querySelector('html > body main')).toBeTruthy();
  expect(document.querySelector('style')).toBeTruthy();
  const button = screen.getByRole('button');
  expect(button.textContent).not.toBe('Try again');
  fireEvent.click(button);
  expect(reset).toHaveBeenCalledOnce();
  expect(screen.getByRole('link').getAttribute('href')).toBe('/home');
});
