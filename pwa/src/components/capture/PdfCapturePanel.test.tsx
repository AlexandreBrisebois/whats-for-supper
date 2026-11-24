import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PdfCapturePanel } from './PdfCapturePanel';
import { usePdfCaptureStore } from '@/store/pdfCaptureStore';
import { useFamilyStore } from '@/store/familyStore';
import { claimSharedPdf, discardSharedPdf } from '@/lib/pdfShare';

let mockLocale: 'en' | 'fr' = 'en';
vi.mock('@/components/common/LocaleProvider', () => ({
  useLocale: () => ({ locale: mockLocale, setCurrentLocale: vi.fn() }),
}));

const mockPush = vi.fn();
const navigation = vi.hoisted(() => ({ query: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));
vi.mock('@/lib/api/recipes', () => ({ createPdfRecipe: vi.fn() }));
vi.mock('@/lib/pdfShare', () => ({
  claimSharedPdf: vi.fn(),
  discardSharedPdf: vi.fn(async () => {}),
}));

const member = '550e8400-e29b-41d4-a716-446655440001';
const another = '550e8400-e29b-41d4-a716-446655440002';
const file = new File(['%PDF'], 'supper.pdf', { type: 'application/pdf' });
const resetPhotos = () => {};
beforeEach(() => {
  navigation.query = '';
  mockLocale = 'en';
  vi.clearAllMocks();
  usePdfCaptureStore.getState().reset();
  useFamilyStore.setState({ selectedFamilyMemberId: member });
});
afterEach(() => {
  cleanup();
  usePdfCaptureStore.getState().reset();
});

describe('PDF capture draft ownership', () => {
  it('clears an existing draft when capture changes to Family GOTO', async () => {
    usePdfCaptureStore.getState().select(file, member);
    const view = render(<PdfCapturePanel isGoto={false} resetPhotos={resetPhotos} />);
    expect(screen.getByTestId('pdf-confirmation')).toBeInTheDocument();
    view.rerender(<PdfCapturePanel isGoto resetPhotos={resetPhotos} />);
    await waitFor(() => expect(usePdfCaptureStore.getState().selection).toBeNull());
  });
  it('clears a PDF when navigation delivers a text link to the same capture page', async () => {
    usePdfCaptureStore.getState().select(file, member);
    const view = render(<PdfCapturePanel isGoto={false} resetPhotos={resetPhotos} />);
    navigation.query = 'url=https%3A%2F%2Fexample.com%2Fsupper';
    view.rerender(<PdfCapturePanel isGoto={false} resetPhotos={resetPhotos} />);
    await waitFor(() => expect(usePdfCaptureStore.getState().selection).toBeNull());
  });
  it('a member switch and switch back cannot restore an in-flight delivery', async () => {
    navigation.query = 'share=opaque-token';
    let deliver!: (value: { token: string; file: File }) => void;
    vi.mocked(claimSharedPdf).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          deliver = resolve;
        })
    );
    render(<PdfCapturePanel isGoto={false} resetPhotos={resetPhotos} />);
    await waitFor(() => expect(claimSharedPdf).toHaveBeenCalled());
    act(() => useFamilyStore.setState({ selectedFamilyMemberId: another }));
    act(() => useFamilyStore.setState({ selectedFamilyMemberId: member }));
    await act(async () => {
      deliver({ token: 'opaque-token', file });
    });
    expect(usePdfCaptureStore.getState().selection).toBeNull();
  });

  it('renders share error with role=alert, semantic text-hearth-ink token, and reactive locale', () => {
    navigation.query = 'pdfShareError=1';
    mockLocale = 'fr';
    render(<PdfCapturePanel isGoto={false} resetPhotos={resetPhotos} />);

    const errorEl = screen.getByTestId('pdf-share-error');
    expect(errorEl).toHaveAttribute('role', 'alert');
    expect(errorEl.className).toContain('text-hearth-ink');
    expect(errorEl.className).not.toContain('text-terracotta-700');
    expect(errorEl).toHaveTextContent(/partagez le pdf|choisissez/i);
  });

  it('discards staged shared PDF token, resets draft, and navigates to /home when cancel is clicked', async () => {
    usePdfCaptureStore.getState().select(file, member, 'share-token-123');
    render(<PdfCapturePanel isGoto={false} resetPhotos={resetPhotos} />);

    const cancelBtn = screen.getByTestId('capture-cancel-btn');
    fireEvent.click(cancelBtn);

    expect(discardSharedPdf).toHaveBeenCalledWith('share-token-123');
    expect(usePdfCaptureStore.getState().selection).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/home');
  });
});
