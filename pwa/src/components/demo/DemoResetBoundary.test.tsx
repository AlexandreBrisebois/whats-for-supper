import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DemoRequestSession } from '@/lib/api/demo-session';
import { DemoResetBoundary } from './DemoResetBoundary';
import { usePdfCaptureStore } from '@/store/pdfCaptureStore';

vi.mock('@/components/common/LocaleProvider', () => ({ useLocale: () => ({ locale: 'en' }) }));

describe('interrupted demo task', () => {
  it('removes the old editor, invalidates PDF ownership, and offers an accessible refresh without erasing preferences', async () => {
    const session = new DemoRequestSession(vi.fn(), '/api/health');
    localStorage.setItem('locale', 'fr');
    localStorage.setItem('wfs-demo-context-ack', 'yes');
    usePdfCaptureStore.getState().select(new File(['pdf'], 'sample.pdf'), 'member', 'old-share');
    session.observe('old');
    render(
      <DemoResetBoundary session={session}>
        <input aria-label="Old draft" defaultValue="Visitor edit" />
      </DemoResetBoundary>
    );
    expect(screen.getByLabelText('Old draft')).toBeInTheDocument();
    act(() => session.observe('new'));
    expect(screen.queryByLabelText('Old draft')).not.toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Continue with the reset demo' })
    ).toBeInTheDocument();
    await waitFor(() => expect(usePdfCaptureStore.getState().selection).toBeNull());
    expect(screen.getByRole('alert')).toHaveTextContent('The shared demo has reset');
    expect(localStorage.getItem('locale')).toBe('fr');
    expect(localStorage.getItem('wfs-demo-context-ack')).toBe('yes');
  });
});
