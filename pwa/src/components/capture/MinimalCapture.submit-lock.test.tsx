import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const mockPush = vi.fn();
const submitRecipeMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/locales', () => ({
  t: (_key: string, defaultValue: string) => defaultValue,
  tWithVars: (_key: string, defaultValue: string) => defaultValue,
}));

vi.mock('@/hooks/useCapture', () => ({
  useCapture: () => ({
    images: [new File(['image'], 'dish.jpg', { type: 'image/jpeg' })],
    addImage: vi.fn(),
    removeImage: vi.fn(),
    isSubmitting: false,
    submitRecipe: submitRecipeMock,
    submitUrl: vi.fn(),
    clearError: vi.fn(),
    error: null,
    rating: 0,
    setRating: vi.fn(),
    notes: '',
    setNotes: vi.fn(),
    selectedDishPhotoIndex: 0,
    setSelectedDishPhotoIndex: vi.fn(),
  }),
}));

vi.mock('@/store/familyStore', () => ({
  useFamilyStore: (selector?: (state: any) => any) => {
    const state = {
      saveSetting: vi.fn().mockResolvedValue(undefined),
      loadGoTo: vi.fn().mockResolvedValue({ items: [] }),
      saveGoTo: vi.fn().mockResolvedValue(undefined),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/store/captureStore', () => ({
  useCaptureStore: {
    getState: () => ({
      addPending: vi.fn(),
    }),
  },
}));

vi.mock('@/store/libraryStore', () => ({
  useLibraryStore: Object.assign(
    (selector: (state: { notifications: never[] }) => unknown) => selector({ notifications: [] }),
    {
      getState: () => ({
        dismissNotification: vi.fn(),
      }),
    }
  ),
}));

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      recipes: {
        describe: { post: vi.fn() },
      },
    },
  },
}));

import MinimalCapture from './MinimalCapture';

describe('MinimalCapture photo submit locking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview-image'),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('submits only once when Save Recipe is clicked twice before the request settles', async () => {
    let resolveSubmit: ((value: string | null) => void) | undefined;
    submitRecipeMock.mockImplementation(
      () =>
        new Promise<string | null>((resolve) => {
          resolveSubmit = resolve;
        })
    );

    render(<MinimalCapture />);

    const saveButton = screen.getByRole('button', { name: /save recipe/i });

    await act(async () => {
      saveButton.click();
      saveButton.click();
    });

    expect(submitRecipeMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /uploading photos/i })).toBeDisabled();
    expect(screen.getByText(/large photos can take a few seconds/i)).toBeTruthy();
    expect(screen.queryByTestId('capture-photo-upload-overlay')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(screen.getByTestId('capture-photo-upload-overlay')).toBeTruthy();

    await act(async () => {
      resolveSubmit?.(null);
      await Promise.resolve();
    });

    expect(screen.queryByTestId('capture-photo-upload-overlay')).toBeNull();
    expect(screen.getByRole('button', { name: /save recipe/i })).toBeEnabled();
  });

  it('restores the save state after a failed upload attempt', async () => {
    let resolveSubmit: ((value: string | null) => void) | undefined;
    submitRecipeMock.mockImplementation(
      () =>
        new Promise<string | null>((resolve) => {
          resolveSubmit = resolve;
        })
    );

    render(<MinimalCapture />);

    await act(async () => {
      screen.getByRole('button', { name: /save recipe/i }).click();
    });

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(screen.getByTestId('capture-photo-upload-overlay')).toBeTruthy();

    await act(async () => {
      resolveSubmit?.(null);
      await Promise.resolve();
    });

    expect(screen.queryByTestId('capture-photo-upload-overlay')).toBeNull();
    expect(screen.getByRole('button', { name: /save recipe/i })).toBeEnabled();
  });
});
