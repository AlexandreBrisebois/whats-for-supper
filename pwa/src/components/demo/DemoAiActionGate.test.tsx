import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoAiActionGate } from './DemoAiActionGate';
import CaptureWithPdf from '@/components/capture/CaptureWithPdf';

const mode = vi.hoisted(() => ({
  mode: true as boolean | null,
  loading: false,
  error: false,
  retry: vi.fn(),
}));
vi.mock('./DemoModeProvider', () => ({ useDemoMode: () => mode }));
vi.mock('@/components/capture/MinimalCapture', () => ({
  default: () => <input aria-label="Private photo" type="file" />,
}));
vi.mock('@/components/capture/PdfCapturePanel', () => ({
  PdfCapturePanel: () => <input aria-label="Private PDF" type="file" />,
}));

describe('honest AI entry', () => {
  beforeEach(() => Object.assign(mode, { mode: true, loading: false, error: false }));
  it('explains demo restrictions before mounting private upload controls', () => {
    render(<CaptureWithPdf />);
    expect(screen.queryByLabelText('Private photo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Private PDF')).not.toBeInTheDocument();
    expect(screen.getByText(/AI capture and generation are unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /prepared recipes/i })).toHaveAttribute(
      'href',
      '/recipes'
    );
  });
  it('withholds AI actions while permission is unknown and offers retry on failure', () => {
    Object.assign(mode, { mode: null, error: true });
    render(
      <DemoAiActionGate>
        <input aria-label="Private photo" type="file" />
      </DemoAiActionGate>
    );
    expect(screen.queryByLabelText('Private photo')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
  it('keeps normal controls available outside demo', () => {
    mode.mode = false;
    render(
      <DemoAiActionGate>
        <input aria-label="Private photo" type="file" />
      </DemoAiActionGate>
    );
    expect(screen.getByLabelText('Private photo')).toBeInTheDocument();
  });
});
