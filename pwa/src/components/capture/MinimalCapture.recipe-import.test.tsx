import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MinimalCapture from './MinimalCapture';

import CaptureWithPdf from './CaptureWithPdf';
import { useFeatureFlagStore } from '@/store/featureFlagStore';
import { usePdfCaptureStore } from '@/store/pdfCaptureStore';

const memberId = '11111111-1111-4111-8111-111111111111';
let selectedMemberId: string | null = null;

const mockPush = vi.fn();
const demoMode = vi.hoisted(() => ({
  mode: false as boolean | null,
  loading: false,
  error: false,
  retry: vi.fn(),
}));
vi.mock('@/components/demo/DemoModeProvider', () => ({ useDemoMode: () => demoMode }));
vi.mock('./PdfCapturePanel', () => ({ PdfCapturePanel: () => null }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/capture',
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
  getLocale: () => 'en',
  setLocale: vi.fn(),
}));

vi.mock('@/components/common/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en', setCurrentLocale: vi.fn() }),
}));

let mockImages: any[] = [];
const mockSubmitRecipe = vi.fn();
const mockSubmitUrl = vi.fn();

vi.mock('@/hooks/useCapture', () => ({
  useCapture: () => ({
    images: mockImages,
    addImage: vi.fn(),
    removeImage: vi.fn(),
    isSubmitting: false,
    submitRecipe: mockSubmitRecipe,
    submitUrl: mockSubmitUrl,
    clearError: vi.fn(),
    reset: vi.fn(),
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
      selectedFamilyMemberId: selectedMemberId,
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

const mockPushNotification = vi.fn();
const libraryStoreState = {
  notifications: [] as any[],
  dismissNotification: vi.fn(),
  pushNotification: mockPushNotification,
};
const librarySubscribers = new Set<any>();

vi.mock('@/store/libraryStore', () => ({
  useLibraryStore: Object.assign(
    (selector: (state: any) => unknown) => selector(libraryStoreState),
    {
      getState: () => libraryStoreState,
      subscribe: (cb: any) => {
        librarySubscribers.add(cb);
        return () => {
          librarySubscribers.delete(cb);
        };
      },
    }
  ),
}));

const mockGetRecipes = vi.fn();
const mockImportBundle = vi.hoisted(() => vi.fn());
const mockDeleteRecipe = vi.fn();
const mockById = vi.fn().mockReturnValue({
  delete: mockDeleteRecipe,
});

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      recipes: {
        describe: { post: vi.fn() },
        importBundle: { post: mockImportBundle },
        get: (...args: any[]) => mockGetRecipes(...args),
        byId: (id: any) => mockById(id),
      },
    },
  },
}));

const mockAddToast = vi.fn();
vi.mock('@/store/uiStore', () => ({
  useUiStore: (selector: any) =>
    selector({
      addToast: mockAddToast,
    }),
}));

vi.mock('@/components/recipes/RecipeDetailSheet', () => ({
  RecipeDetailSheet: ({ recipeId, onClose }: { recipeId: string; onClose: () => void }) => (
    <div data-testid="recipe-detail-sheet" data-recipe-id={recipeId}>
      <button data-testid="close-recipe-detail-btn" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

function privateBundleFile() {
  return new File(
    [
      JSON.stringify({
        version: '1.0',
        recipe: {
          name: 'private-recipe-sentinel',
          ingredients: ['private-ingredient-sentinel'],
          instructions: [
            {
              name: 'private-section-sentinel',
              itemListElement: [{ text: 'private-step-sentinel' }],
            },
          ],
          isSynthesized: false,
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
    'private-file-sentinel.txt',
    { type: 'text/plain' }
  );
}

describe('MinimalCapture recipe import', () => {
  it('keeps the local picker attached while unknown mode becomes non-demo', () => {
    demoMode.mode = null;
    const view = render(<CaptureWithPdf />);
    const picker = screen.getByTestId('import-prepared-file-input');
    demoMode.mode = false;
    view.rerender(<CaptureWithPdf />);
    expect(picker.isConnected).toBe(true);
    expect(screen.getByTestId('import-recipe-file-input')).toBe(picker);
  });
  it('keeps reviewed text bundles available without AI photo, PDF, link or describe entry', async () => {
    render(<MinimalCapture preparedOnly />);
    const input = screen.getByTestId('import-prepared-file-input');
    expect(input).toHaveAttribute('accept', '.txt,.recipe,.json,text/plain,application/json');
    expect(screen.queryByTestId('capture-take-photo-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('capture-gallery-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('capture-secondary-action-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('capture-secondary-action-describe')).not.toBeInTheDocument();
    fireEvent.change(input, {
      target: { files: [new File(['%PDF'], 'private.pdf', { type: 'application/pdf' })] },
    });
    expect(usePdfCaptureStore.getState().selection).toBeNull();
    expect(screen.getByTestId('bundle-import-error')).toHaveTextContent(
      'Choose a shared recipe text file'
    );
    expect(mockSubmitRecipe).not.toHaveBeenCalled();
    expect(mockSubmitUrl).not.toHaveBeenCalled();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    demoMode.mode = false;
    selectedMemberId = null;
    useFeatureFlagStore.setState({ memberId: null, flags: {}, loading: false, error: null });
    usePdfCaptureStore.getState().reset();
    mockImages = [];
    mockSubmitRecipe.mockResolvedValue('test-recipe-id');
    mockSubmitUrl.mockResolvedValue('test-recipe-id');
    mockGetRecipes.mockResolvedValue({ recipes: [] });
    mockImportBundle.mockResolvedValue({
      data: { id: memberId, name: 'Imported Shared Recipe', isReady: true },
    });
    libraryStoreState.notifications = [];
    librarySubscribers.clear();
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['loading', { memberId, flags: {}, loading: true, error: null }],
    ['failed', { memberId, flags: {}, loading: false, error: 'unavailable' }],
    [
      'legacy disabled override',
      {
        memberId,
        flags: {
          'preview-pdf-recipe-import': {
            key: 'preview-pdf-recipe-import',
            mode: 'opt-in' as const,
            enabled: false,
          },
        },
        loading: false,
        error: null,
      },
    ],
  ])('stages a selected PDF while the feature snapshot is %s', (_name, state) => {
    selectedMemberId = memberId;
    useFeatureFlagStore.setState(state);
    render(<MinimalCapture />);
    const file = new File(['%PDF'], 'supper.pdf', { type: 'application/pdf' });

    fireEvent.change(screen.getByTestId('import-recipe-file-input'), {
      target: { files: [file] },
    });

    expect(usePdfCaptureStore.getState().selection?.file).toBe(file);
    expect(usePdfCaptureStore.getState().selection?.memberId).toBe(memberId);
    expect(screen.queryByTestId('bundle-import-error')).not.toBeInTheDocument();
  });

  it.each(['goto', 'missing-member'])('does not stage a PDF when %s', (scenario) => {
    selectedMemberId = memberId;
    if (scenario === 'missing-member') selectedMemberId = null;
    render(<MinimalCapture intent={scenario === 'goto' ? 'goto' : undefined} />);
    fireEvent.change(screen.getByTestId('import-recipe-file-input'), {
      target: { files: [new File(['%PDF'], 'supper.pdf', { type: 'application/pdf' })] },
    });

    expect(usePdfCaptureStore.getState().selection).toBeNull();
    expect(screen.getByTestId('bundle-import-error')).toHaveTextContent('Choose a PDF file');
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
    expect(screen.getByTestId('import-recipe-file-input')).toHaveAttribute(
      'accept',
      '.txt,text/plain,.pdf,application/pdf'
    );
  });

  it.each([false, true])(
    'reviews and imports a valid .txt bundle without AI (preparedOnly=%s)',
    async (preparedOnly) => {
      render(<MinimalCapture preparedOnly={preparedOnly} />);

      const input = screen.getByTestId(
        preparedOnly ? 'import-prepared-file-input' : 'import-recipe-file-input'
      ) as HTMLInputElement;
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
        preparedOnly ? 'shared.recipe' : 'shared.txt',
        { type: 'text/plain' }
      );

      fireEvent.change(input, { target: { files: [file] } });
      expect(await screen.findByTestId('bundle-preview-card')).toBeVisible();
      expect(screen.queryByTestId('bundle-preview-synthesis-badge')).toBeNull();

      // Steps are collapsed behind Preview steps disclosure by default
      const toggle = screen.getByTestId('bundle-preview-steps-toggle');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('bundle-preview-section-title')).toBeNull();

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');

      const sections = screen.getAllByTestId('bundle-preview-section-title');
      expect(sections[0]).toHaveTextContent('Main Steps');
      expect(sections[0].className).toContain('text-garden-ink');

      const steps = screen.getAllByTestId('bundle-preview-step-text');
      expect(steps[0]).toHaveTextContent('Simmer');
      expect(steps[1]).toHaveTextContent('Serve');

      expect(screen.getByTestId('accept-bundle-btn')).toBeVisible();
      expect(screen.queryByTestId('reject-bundle-btn')).toBeNull();
      expect(mockImportBundle).not.toHaveBeenCalled();

      // Importer can set rating and notes before importing
      fireEvent.click(screen.getByTestId('bundle-rating-3'));
      fireEvent.change(screen.getByTestId('bundle-notes-input'), {
        target: { value: 'Serve with crusty bread' },
      });

      fireEvent.click(screen.getByTestId('accept-bundle-btn'));
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/home'));
      expect(screen.queryByTestId('bundle-import-success')).toBeNull();
      expect(mockPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ready',
          name: 'Imported Shared Recipe',
        })
      );
      expect(mockImportBundle).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '1.0',
          recipe: expect.objectContaining({
            name: 'Imported Shared Recipe',
            rating: 3,
            notes: 'Serve with crusty bread',
          }),
        }),
        expect.objectContaining({
          options: [expect.objectContaining({ maxRetries: 0 })],
        })
      );
      expect(mockSubmitRecipe).not.toHaveBeenCalled();
      expect(mockSubmitUrl).not.toHaveBeenCalled();
    }
  );

  it('initializes editable importer notes from bundle if present', async () => {
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
      'backup.txt',
      { type: 'text/plain' }
    );

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByTestId('bundle-preview-card')).toBeVisible();
    expect(screen.getByTestId('bundle-notes-input')).toHaveValue('This is a personal note.');
  });

  it('shows bundle-import-error without .recipe reference for invalid bundle files', async () => {
    render(<MinimalCapture />);

    const input = screen.getByTestId('import-recipe-file-input') as HTMLInputElement;
    const file = new File(['not-json'], 'broken.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const err = screen.getByTestId('bundle-import-error');
      expect(err).toBeVisible();
      expect(err.textContent).not.toContain('.recipe');
    });
  });

  it('cancels a parsed bundle via top-right cancel button and navigates to /home', async () => {
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
      'shared.txt',
      { type: 'text/plain' }
    );

    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByTestId('bundle-preview-card')).toBeVisible();

    fireEvent.click(screen.getByTestId('capture-cancel-btn'));

    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  it('File Import Duplicate: shows warning banner and lets the user view the existing recipe', async () => {
    const duplicateId = '550e8400-e29b-41d4-a716-446655440001';
    const duplicateRecipe = {
      id: duplicateId,
      name: 'Imported Shared Recipe',
      sourceUrl: 'https://example.com/spaghetti',
      isReady: true,
    };
    mockGetRecipes.mockResolvedValue({
      recipes: [duplicateRecipe],
    });

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
                itemListElement: [{ text: 'Simmer' }],
              },
            ],
            isSynthesized: true,
          },
          info: {
            exportedAtUtc: '2026-05-14T16:00:00Z',
            bundleSource: 'wfs-share',
            appVersion: '0.1.0',
            recipeId: duplicateId,
          },
          hero: null,
          originals: [],
        }),
      ],
      'shared.recipe',
      { type: 'application/json' }
    );

    fireEvent.change(input, { target: { files: [file] } });

    // Wait for the duplicate warning banner to appear
    const banner = await screen.findByTestId('duplicate-recipe-warning');
    expect(banner).toBeVisible();
    expect(banner.textContent).toContain('This recipe already exists in your library.');

    // Clicking "View existing recipe" triggers the detail sheet overlay
    const viewBtn = screen.getByTestId('view-existing-recipe-btn');
    fireEvent.click(viewBtn);

    const detailSheet = await screen.findByTestId('recipe-detail-sheet');
    expect(detailSheet).toBeVisible();
    expect(detailSheet).toHaveAttribute('data-recipe-id', duplicateId);

    // Closing the detail sheet closes it
    const closeBtn = screen.getByTestId('close-recipe-detail-btn');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('recipe-detail-sheet')).toBeNull();
  });

  it('URL Capture Duplicate: shows warning banner when typing a duplicate URL', async () => {
    vi.useFakeTimers();
    const duplicateRecipe = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Spaghetti Carbonara',
      sourceUrl: 'https://example.com/spaghetti',
      isReady: true,
    };
    mockGetRecipes.mockResolvedValue({
      recipes: [duplicateRecipe],
    });

    render(<MinimalCapture />);

    // Click "Paste recipe link" secondary action
    fireEvent.click(screen.getByTestId('capture-secondary-action-link'));

    const urlInput = screen.getByPlaceholderText(/paste a recipe link/i) as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'https://example.com/spaghetti' } });

    // Advance timers by 500ms for debounce
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    vi.useRealTimers();

    // Check duplicate warning banner
    const banner = await screen.findByTestId('duplicate-recipe-warning');
    expect(banner).toBeVisible();
    expect(banner.textContent).toContain(
      'You already have a recipe from this link: Spaghetti Carbonara'
    );

    // Click "View existing recipe" triggers detail sheet
    const viewBtn = screen.getByTestId('view-existing-recipe-btn');
    fireEvent.click(viewBtn);

    const detailSheet = await screen.findByTestId('recipe-detail-sheet');
    expect(detailSheet).toBeVisible();
    expect(detailSheet).toHaveAttribute('data-recipe-id', '550e8400-e29b-41d4-a716-446655440001');
  });

  it('Describe Capture Duplicate: shows warning banner when typing a duplicate recipe name', async () => {
    vi.useFakeTimers();
    const duplicateRecipe = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Oven Baked Salmon',
      isReady: true,
    };
    mockGetRecipes.mockResolvedValue({
      recipes: [duplicateRecipe],
    });

    render(<MinimalCapture />);

    // Click "Describe a recipe" secondary action
    fireEvent.click(screen.getByTestId('capture-secondary-action-describe'));

    const nameInput = screen.getByPlaceholderText(/our family spaghetti/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Oven Baked Salmon' } });

    // Advance timers by 500ms for debounce
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    vi.useRealTimers();

    // Check duplicate warning banner below the name input field
    const banner = await screen.findByTestId('duplicate-recipe-warning');
    expect(banner).toBeVisible();
    expect(banner.textContent).toContain('A recipe with this name already exists in your library.');

    // Click "View existing recipe" triggers detail sheet
    const viewBtn = screen.getByTestId('view-existing-recipe-btn');
    fireEvent.click(viewBtn);

    const detailSheet = await screen.findByTestId('recipe-detail-sheet');
    expect(detailSheet).toBeVisible();
    expect(detailSheet).toHaveAttribute('data-recipe-id', '550e8400-e29b-41d4-a716-446655440001');
  });

  it('observes bundle review, error retry, and direct /home return', async () => {
    const view = render(<MinimalCapture preparedOnly />);
    try {
      const picker = screen.getByTestId('import-prepared-file-input');
      expect(picker).toHaveClass('hidden');

      fireEvent.change(picker, { target: { files: [privateBundleFile()] } });
      expect(await screen.findByTestId('bundle-preview-card')).toBeVisible();

      mockImportBundle.mockRejectedValueOnce(new Error('private-error-sentinel'));
      fireEvent.click(screen.getByTestId('accept-bundle-btn'));
      expect(await screen.findByTestId('bundle-import-error')).toBeVisible();

      fireEvent.click(screen.getByTestId('accept-bundle-btn'));
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/home'));
    } finally {
      view.unmount();
      await act(async () => {});
    }
  });

  it('closes a pre-mounted review while PDF selection hides capture and reopens only on reveal', async () => {
    const view = render(<CaptureWithPdf />);
    try {
      fireEvent.change(screen.getByTestId('import-recipe-file-input'), {
        target: { files: [privateBundleFile()] },
      });
      expect(await screen.findByTestId('bundle-preview-card')).toBeVisible();

      await act(async () => {
        usePdfCaptureStore
          .getState()
          .select(
            new File(['%PDF'], 'private-hidden-file-sentinel.pdf', { type: 'application/pdf' }),
            memberId
          );
      });
      expect(screen.getByTestId('bundle-preview-card')).not.toBeVisible();

      view.rerender(<CaptureWithPdf />);

      await act(async () => {
        usePdfCaptureStore.getState().reset();
      });
      expect(screen.getByTestId('bundle-preview-card')).toBeVisible();
    } finally {
      view.unmount();
      await act(async () => {});
    }
  });
});
