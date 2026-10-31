import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MinimalCapture from './MinimalCapture';
import { observeOpening, presentationChanged } from '@/lib/telemetry/opening';
import type { BrowserObservation } from '@/lib/telemetry/navigation';
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

const libraryStoreState = { notifications: [] as any[], dismissNotification: vi.fn() };
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

function startPresentationStream() {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const submit = vi.fn<(event: BrowserObservation) => Promise<void>>().mockResolvedValue();
  const observe = () => observeOpening(document, true, '/capture', submit);
  observe();
  submit.mockClear();
  document.addEventListener(presentationChanged, observe);
  return {
    events: () => submit.mock.calls.map(([event]) => [event.eventName, event.screen]),
    raw: () => submit.mock.calls.map(([event]) => event),
    observe,
    stop: () => document.removeEventListener(presentationChanged, observe),
  };
}

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

      const sections = screen.getAllByTestId('bundle-preview-section-title');
      expect(sections[0]).toHaveTextContent('Main Steps');

      const steps = screen.getAllByTestId('bundle-preview-step-text');
      expect(steps[0]).toHaveTextContent('Simmer');
      expect(steps[1]).toHaveTextContent('Serve');

      expect(screen.getByTestId('accept-bundle-btn')).toBeVisible();
      expect(screen.getByTestId('reject-bundle-btn')).toBeVisible();
      expect(mockImportBundle).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId('accept-bundle-btn'));
      expect(await screen.findByTestId('bundle-import-success')).toBeVisible();
      expect(mockImportBundle).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '1.0',
          recipe: expect.objectContaining({ name: 'Imported Shared Recipe' }),
        })
      );
      expect(mockSubmitRecipe).not.toHaveBeenCalled();
      expect(mockSubmitUrl).not.toHaveBeenCalled();
    }
  );

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

  it('Photo Success Duplicate & Discard action: shows warning, keeping anyway works, and discarding deletes the recipe', async () => {
    const newRecipeId = '550e8400-e29b-41d4-a716-446655440002';
    const duplicateRecipe = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Tacos',
      isReady: true,
    };

    // Default resolve for initial load
    mockGetRecipes.mockResolvedValue({ recipes: [] });
    mockSubmitRecipe.mockResolvedValue(newRecipeId);

    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    mockImages = [file];

    render(<MinimalCapture />);

    // Click Save
    const saveBtn = screen.getByTestId('capture-save-btn');
    fireEvent.click(saveBtn);

    // At this point we are in onSuccess = true, waiting for SSE.
    // Let's set up the API mock to return the duplicate recipe when searched by name 'Tacos'
    mockGetRecipes.mockImplementation(async (config: any) => {
      if (config?.query?.name === 'Tacos') {
        return { recipes: [duplicateRecipe] };
      }
      return { recipes: [] };
    });

    // Simulate SSE notification saying recipe is ready with name 'Tacos'
    libraryStoreState.notifications = [{ recipeId: newRecipeId, name: 'Tacos', type: 'ready' }];
    librarySubscribers.forEach((cb) => cb(libraryStoreState));

    // Success screen should be visible
    const successScreen = await screen.findByTestId('capture-success-screen');
    expect(successScreen).toBeVisible();

    // Verify duplicate warning banner is rendered
    const banner = await screen.findByTestId('duplicate-recipe-warning');
    expect(banner).toBeVisible();
    expect(banner.textContent).toContain('A recipe with this name already exists: Tacos');

    // Verify "Discard duplicate" button is present
    const discardBtn = screen.getByTestId('discard-duplicate-btn');
    expect(discardBtn).toBeVisible();

    // Test "Discard duplicate" click deletes duplicate and redirects
    fireEvent.click(discardBtn);

    // Verify API delete call is made for the newly created recipe ID (newRecipeId)
    expect(mockById).toHaveBeenCalledWith(newRecipeId);
    expect(mockDeleteRecipe).toHaveBeenCalled();

    // Verify toast is triggered and redirect to home happens
    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('Duplicate recipe discarded.');
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
  it('observes bundle review/reject/reopen and the actual ready panel without picker or import-result facts', async () => {
    const stream = startPresentationStream();
    const view = render(<MinimalCapture preparedOnly />);
    try {
      const picker = screen.getByTestId('import-prepared-file-input');
      expect(picker).toHaveClass('hidden');
      expect(stream.events()).toEqual([]);
      fireEvent.change(picker, { target: { files: [privateBundleFile()] } });
      expect(await screen.findByTestId('bundle-preview-card')).toBeVisible();
      expect(stream.events()).toEqual([['pwa.surface.opened', 'capture.bundle_review']]);
      fireEvent.click(screen.getByTestId('reject-bundle-btn'));
      await act(async () => {});
      expect(stream.events().at(-1)).toEqual(['pwa.surface.closed', 'capture.bundle_review']);
      expect(mockImportBundle).not.toHaveBeenCalled();
      fireEvent.change(screen.getByTestId('import-prepared-file-input'), {
        target: { files: [privateBundleFile()] },
      });
      expect(await screen.findByTestId('bundle-preview-card')).toBeVisible();
      expect(stream.events().at(-1)).toEqual(['pwa.surface.opened', 'capture.bundle_review']);
      mockImportBundle.mockRejectedValueOnce(new Error('private-error-sentinel'));
      fireEvent.click(screen.getByTestId('accept-bundle-btn'));
      expect(await screen.findByTestId('bundle-import-error')).toBeVisible();
      expect(stream.events()).toHaveLength(3);
      fireEvent.click(screen.getByTestId('accept-bundle-btn'));
      expect(await screen.findByTestId('bundle-import-success')).toBeVisible();
      expect(stream.events()).toEqual([
        ['pwa.surface.opened', 'capture.bundle_review'],
        ['pwa.surface.closed', 'capture.bundle_review'],
        ['pwa.surface.opened', 'capture.bundle_review'],
        ['pwa.surface.closed', 'capture.bundle_review'],
        ['pwa.surface.opened', 'capture.ready'],
      ]);
      expect(JSON.stringify(stream.raw())).not.toContain('sentinel');
      expect(stream.raw().every((event) => event.eventName.startsWith('pwa.surface.'))).toBe(true);
    } finally {
      view.unmount();
      await act(async () => {});
      stream.stop();
    }
  });

  it('observes actual URL overlay, retry, queued and ready panels without implying a captured recipe', async () => {
    const stream = startPresentationStream();
    let reject: ((error: Error) => void) | undefined;
    let resolve: ((id: string) => void) | undefined;
    mockSubmitUrl.mockImplementationOnce(
      () =>
        new Promise((_resolve, failure) => {
          reject = failure;
        })
    );
    const view = render(
      <MinimalCapture initialUrl="https://private-url-sentinel.invalid/recipe" />
    );
    try {
      expect(stream.events()).toEqual([]);
      fireEvent.click(screen.getByTestId('capture-url-save-btn'));
      expect(screen.getByText('Capturing link...')).toBeVisible();
      expect(stream.events()).toEqual([['pwa.surface.opened', 'capture.upload']]);
      await act(async () => {
        reject?.(new Error('private-error-sentinel'));
      });
      expect(screen.getByTestId('capture-url-error')).toBeVisible();
      expect(stream.events().at(-1)).toEqual(['pwa.surface.closed', 'capture.upload']);
      mockSubmitUrl.mockImplementationOnce(
        () =>
          new Promise((success) => {
            resolve = success;
          })
      );
      fireEvent.click(screen.getByTestId('capture-url-save-btn'));
      expect(stream.events().at(-1)).toEqual(['pwa.surface.opened', 'capture.upload']);
      await act(async () => {
        resolve?.(memberId);
      });
      expect(screen.getByTestId('capture-success-heading')).toHaveTextContent('Recipe queued');
      expect(stream.events().slice(-2)).toEqual([
        ['pwa.surface.closed', 'capture.upload'],
        ['pwa.surface.opened', 'capture.queued'],
      ]);
      await act(async () => {
        libraryStoreState.notifications = [
          { recipeId: 'other-private-id', name: 'private-unrelated-sentinel', type: 'ready' },
        ];
        librarySubscribers.forEach((callback) => callback(libraryStoreState));
      });
      expect(stream.events()).toHaveLength(5);
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      await act(async () => {
        libraryStoreState.notifications = [
          { recipeId: memberId, name: 'private-ready-sentinel', type: 'ready' },
        ];
        librarySubscribers.forEach((callback) => callback(libraryStoreState));
      });
      expect(screen.getByTestId('capture-success-heading')).toHaveTextContent(
        'private-ready-sentinel is ready!'
      );
      expect(stream.events()).toHaveLength(5);
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
      stream.observe();
      expect(stream.events().slice(-2)).toEqual([
        ['pwa.surface.closed', 'capture.queued'],
        ['pwa.surface.opened', 'capture.ready'],
      ]);
      expect(JSON.stringify(stream.raw())).not.toContain('sentinel');
      expect(stream.raw().every((event) => event.eventName.startsWith('pwa.surface.'))).toBe(true);
    } finally {
      view.unmount();
      await act(async () => {});
      stream.stop();
    }
  });

  it('closes a pre-mounted review while PDF selection hides capture and reopens only on reveal', async () => {
    const stream = startPresentationStream();
    const view = render(<CaptureWithPdf />);
    try {
      fireEvent.change(screen.getByTestId('import-recipe-file-input'), {
        target: { files: [privateBundleFile()] },
      });
      expect(await screen.findByTestId('bundle-preview-card')).toBeVisible();
      expect(stream.events()).toEqual([['pwa.surface.opened', 'capture.bundle_review']]);
      await act(async () => {
        usePdfCaptureStore
          .getState()
          .select(
            new File(['%PDF'], 'private-hidden-file-sentinel.pdf', { type: 'application/pdf' }),
            memberId
          );
      });
      expect(screen.getByTestId('bundle-preview-card')).not.toBeVisible();
      expect(stream.events().at(-1)).toEqual(['pwa.surface.closed', 'capture.bundle_review']);
      view.rerender(<CaptureWithPdf />);
      expect(stream.events()).toHaveLength(2);
      await act(async () => {
        usePdfCaptureStore.getState().reset();
      });
      expect(screen.getByTestId('bundle-preview-card')).toBeVisible();
      expect(stream.events().at(-1)).toEqual(['pwa.surface.opened', 'capture.bundle_review']);
      expect(JSON.stringify(stream.raw())).not.toContain('sentinel');
    } finally {
      view.unmount();
      await act(async () => {});
      stream.stop();
    }
  });
});
