import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PdfCaptureConfirmation } from './PdfCaptureConfirmation';

vi.mock('@/locales', () => ({ t: (_key: string, fallback: string) => fallback }));
describe('PDF confirmation', () => {
  it('shows filename, guidance and metadata; locks Save synchronously without Cancel or dish selection', async () => {
    let done!: () => void;
    const save = vi.fn(() => new Promise<void>((resolve) => { done = resolve; }));
    render(<PdfCaptureConfirmation file={new File(['pdf'], 'supper.pdf')} enabled onSave={save} />);
    expect(screen.getByText('supper.pdf')).toBeTruthy();
    expect(screen.getByText(/one recipe/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
    expect(screen.queryByText(/main dish/i)).toBeNull();
    fireEvent.click(screen.getByTestId('pdf-rating-3'));
    fireEvent.change(screen.getByTestId('pdf-notes'), { target: { value: ' less salt ' } });
    await act(async () => {
      screen.getByTestId('pdf-save').click();
      screen.getByTestId('pdf-save').click();
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(3, 'less salt');
    expect(screen.getByTestId('pdf-save')).toBeDisabled();
    await act(async () => done());
  });
  it('does not permit submission before effective enablement', () => {
    render(<PdfCaptureConfirmation file={new File(['pdf'], 'supper.pdf')} enabled={false} onSave={vi.fn()} />);
    expect(screen.getByTestId('pdf-save')).toBeDisabled();
  });
});
