import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  useFamilyStore: () => ({
    saveSetting: vi.fn().mockResolvedValue(undefined),
  }),
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
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview-image'),
    });
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

    await act(async () => {
      resolveSubmit?.(null);
      await Promise.resolve();
    });
  });
});