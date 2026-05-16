import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MinimalCapture from './MinimalCapture';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/locales', () => ({
  t: (_key: string, value: string) => value,
  tWithVars: (_key: string, value: string, vars?: Record<string, unknown>) => {
    if (!vars) return value;
    return Object.entries(vars).reduce(
      (result, [key, current]) => result.replace(`{{${key}}}`, String(current)),
      value
    );
  },
}));

vi.mock('@/hooks/useCapture', () => ({
  useCapture: () => ({
    images: [],
    addImage: vi.fn(),
    removeImage: vi.fn(),
    isSubmitting: false,
    submitRecipe: vi.fn(),
    submitUrl: vi.fn(),
    clearError: vi.fn(),
    error: null,
    rating: 0,
    setRating: vi.fn(),
    notes: '',
    setNotes: vi.fn(),
    selectedDishPhotoIndex: null,
    setSelectedDishPhotoIndex: vi.fn(),
  }),
}));

vi.mock('@/store/familyStore', () => ({
  useFamilyStore: (selector: (state: any) => unknown) =>
    selector({
      familySettings: { family_goto: { items: [] } },
      loadGoTo: vi.fn().mockResolvedValue(undefined),
      saveGoTo: vi.fn().mockResolvedValue(undefined),
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
    (selector: (state: any) => unknown) => selector({ notifications: [] }),
    {
      getState: () => ({ notifications: [], dismissNotification: vi.fn() }),
      subscribe: vi.fn(() => vi.fn()),
    }
  ),
}));

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      recipes: {
        describe: { post: vi.fn() },
        importBundle: { post: vi.fn() },
      },
    },
  },
}));

describe('MinimalCapture recipe import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps Camera/Gallery primary and renders secondary actions in the required order', () => {
    render(<MinimalCapture />);

    expect(screen.getByRole('button', { name: 'Take a photo' })).toBeVisible();
    expect(screen.getByText('Pick from Gallery')).toBeVisible();

    const secondaryActions = screen.getAllByTestId(/capture-secondary-action-/);
    expect(secondaryActions.map((node) => node.textContent)).toEqual([
      'Paste recipe link',
      'Describe a recipe',
      'Import recipe file',
    ]);

    expect(screen.getByTestId('import-recipe-file-btn')).toBeVisible();
  });

  it('enters bundle review state after selecting a valid .recipe file', async () => {
    render(<MinimalCapture />);

    const input = screen.getByTestId('import-recipe-file-input') as HTMLInputElement;
    const file = new File(
      [
        JSON.stringify({
          version: '1.0',
          recipe: {
            name: 'Imported Shared Recipe',
            ingredients: ['1 onion'],
            instructions: [
              {
                name: 'Main Steps',
                itemListElement: [{ text: 'Simmer' }, { text: 'Serve' }],
              },
            ],
            isSynthesized: true,
          },
          info: {
            exportedAtUtc: '2026-05-14T16:00:00Z',
            bundleSource: 'wfs-share',
            appVersion: '0.1.0',
          },
          hero: null,
          originals: [],
        }),
      ],
      'shared.recipe',
      { type: 'application/json' }
    );

    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByTestId('bundle-preview-card')).toBeVisible();

    const sections = screen.getAllByTestId('bundle-preview-section-title');
    expect(sections[0]).toHaveTextContent('Main Steps');

    const steps = screen.getAllByTestId('bundle-preview-step-text');
    expect(steps[0]).toHaveTextContent('Simmer');
    expect(steps[1]).toHaveTextContent('Serve');

    expect(screen.getByTestId('accept-bundle-btn')).toBeVisible();
    expect(screen.getByTestId('reject-bundle-btn')).toBeVisible();
  });

  it('renders optional notes in the bundle preview if present', async () => {
    render(<MinimalCapture />);

    const input = screen.getByTestId('import-recipe-file-input') as HTMLInputElement;
    const file = new File(
      [
        JSON.stringify({
          version: '1.0',
          recipe: {
            name: 'Backup Recipe',
            ingredients: ['1 onion'],
            instructions: [
              {
                name: 'Main Steps',
                itemListElement: [{ text: 'Simmer' }],
              },
            ],
            notes: 'This is a personal note.',
            isSynthesized: true,
          },
          info: {
            exportedAtUtc: '2026-05-14T16:00:00Z',
            bundleSource: 'wfs-share',
            appVersion: '0.1.0',
          },
          hero: null,
          originals: [],
        }),
      ],
      'backup.recipe',
      { type: 'application/json' }
    );

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByTestId('bundle-preview-card')).toBeVisible();
    expect(screen.getByTestId('bundle-preview-notes')).toHaveTextContent(
      'This is a personal note.'
    );
  });

  it('shows bundle-import-error for invalid bundle files', async () => {
    render(<MinimalCapture />);

    const input = screen.getByTestId('import-recipe-file-input') as HTMLInputElement;
    const file = new File(['not-json'], 'broken.recipe', { type: 'application/json' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('bundle-import-error')).toBeVisible();
    });
  });

  it('returns to the default capture view after rejecting a parsed bundle', async () => {
    render(<MinimalCapture />);

    const input = screen.getByTestId('import-recipe-file-input') as HTMLInputElement;
    const file = new File(
      [
        JSON.stringify({
          version: '1.0',
          recipe: {
            name: 'Imported Shared Recipe',
            ingredients: ['1 onion'],
            instructions: [
              {
                name: 'Main Steps',
                itemListElement: [{ text: 'Simmer' }, { text: 'Serve' }],
              },
            ],
            isSynthesized: true,
          },
          info: {
            exportedAtUtc: '2026-05-14T16:00:00Z',
            bundleSource: 'wfs-share',
            appVersion: '0.1.0',
          },
          hero: null,
          originals: [],
        }),
      ],
      'shared.recipe',
      { type: 'application/json' }
    );

    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(await screen.findByTestId('reject-bundle-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('bundle-preview-card')).toBeNull();
    });

    expect(screen.getByTestId('import-recipe-file-btn')).toBeVisible();
  });
});
