import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { PdfCaptureConfirmation } from './PdfCaptureConfirmation';

let mockLocale: 'en' | 'fr' = 'en';

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string, localeArg?: 'en' | 'fr') =>
    localeArg === 'fr' ? `fr:${_key}:${fallback}` : fallback,
  getLocale: () => mockLocale,
  setLocale: vi.fn(),
}));

vi.mock('@/components/common/LocaleProvider', () => ({
  useLocale: () => ({ locale: mockLocale, setCurrentLocale: vi.fn() }),
}));

describe('PDF confirmation', () => {
  beforeEach(() => {
    mockLocale = 'en';
  });

  it('shows filename, guidance and metadata; locks Save synchronously without Cancel or dish selection', async () => {
    let done!: () => void;
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          done = resolve;
        })
    );
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
    render(
      <PdfCaptureConfirmation
        file={new File(['pdf'], 'supper.pdf')}
        enabled={false}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByTestId('pdf-save')).toBeDisabled();
  });

  it('uses dual-mode semantic role tokens, associated label, 48px rating buttons, and active locale', () => {
    mockLocale = 'fr';
    render(
      <PdfCaptureConfirmation file={new File(['pdf'], 'supper.pdf')} enabled onSave={vi.fn()} />
    );

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveClass('text-ink-body', 'font-bold');
    expect(heading).not.toHaveClass('font-black');
    expect(heading).toHaveTextContent('fr:capture.pdf.title');

    const notesInput = screen.getByLabelText('fr:capture.notes:Notes (Optional)');
    expect(notesInput).toHaveAttribute('data-testid', 'pdf-notes');
    expect(notesInput).toHaveClass(
      'border-icon-affordance',
      'text-ink-body',
      'placeholder:text-ink-muted'
    );
    expect(notesInput).toHaveClass('focus-visible:outline-ink-body');

    const dislikeBtn = screen.getByTestId('pdf-rating-1');
    const likeBtn = screen.getByTestId('pdf-rating-2');
    const loveBtn = screen.getByTestId('pdf-rating-3');
    expect(dislikeBtn).toHaveClass('min-h-12', 'min-w-12');
    fireEvent.click(dislikeBtn);
    expect(dislikeBtn).toHaveClass('border-hearth-line', 'text-hearth-ink');
    fireEvent.click(likeBtn);
    expect(likeBtn).toHaveClass('border-garden-line', 'text-garden-ink');
    fireEvent.click(loveBtn);
    expect(loveBtn).toHaveClass('border-ink-body', 'text-ink-body');
  });
});
