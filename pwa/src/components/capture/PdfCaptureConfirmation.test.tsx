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

  it('shows terracotta-bar filename, cancel button, shared rating, and plain saving copy without spinner', async () => {
    let done!: () => void;
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          done = resolve;
        })
    );
    const onCancel = vi.fn();
    render(
      <PdfCaptureConfirmation
        file={new File(['pdf'], 'supper.pdf')}
        enabled
        onSave={save}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('pdf-file-context')).toHaveTextContent('supper.pdf');
    expect(screen.getByText(/10 pages · 20 MiB/i)).toBeTruthy();
    const cancelBtn = screen.getByTestId('capture-cancel-btn');
    expect(cancelBtn).toBeEnabled();
    expect(screen.queryByText(/main dish/i)).toBeNull();
    expect(screen.queryByText(/We’ll take you home as soon as your PDF is saved/i)).toBeNull();

    fireEvent.click(screen.getByTestId('pdf-rating-3'));
    fireEvent.change(screen.getByTestId('pdf-notes'), { target: { value: ' less salt ' } });
    await act(async () => {
      screen.getByTestId('pdf-save').click();
      screen.getByTestId('pdf-save').click();
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(3, 'less salt');
    const saveBtn = screen.getByTestId('pdf-save');
    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveTextContent('Preparing your PDF…');
    expect(saveBtn.querySelector('.animate-spin')).toBeNull();
    expect(screen.getByTestId('capture-cancel-btn')).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'We’ll take you home as soon as your PDF is saved.'
    );
    await act(async () => done());
  });

  it('does not permit submission before effective enablement', () => {
    render(
      <PdfCaptureConfirmation
        file={new File(['pdf'], 'supper.pdf')}
        enabled={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByTestId('pdf-save')).toBeDisabled();
  });

  it('uses dual-mode semantic role tokens, associated label, 48px shared rating buttons, and active locale', () => {
    mockLocale = 'fr';
    render(
      <PdfCaptureConfirmation
        file={new File(['pdf'], 'supper.pdf')}
        enabled
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('text-ink-body', 'font-bold');
    expect(heading).not.toHaveClass('font-black');
    expect(heading).toHaveTextContent('fr:capture.pdf.importHeading');

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
    expect(dislikeBtn).toHaveClass('min-h-12');
    fireEvent.click(dislikeBtn);
    expect(dislikeBtn).toHaveClass('bg-white', 'text-hearth-ink');
    expect(dislikeBtn.querySelector('svg')).toBeNull();
    fireEvent.click(likeBtn);
    expect(likeBtn).toHaveClass('bg-white', 'text-garden-ink');
    fireEvent.click(loveBtn);
    expect(loveBtn).toHaveClass('bg-white', 'text-ink-body');
  });
});
