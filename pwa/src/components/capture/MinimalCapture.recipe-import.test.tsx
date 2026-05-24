import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
const mockDeleteRecipe = vi.fn();
const mockById = vi.fn().mockReturnValue({
  delete: mockDeleteRecipe,
});

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      recipes: {
        describe: { post: vi.fn() },
        importBundle: { post: vi.fn() },
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

describe('MinimalCapture recipe import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImages = [];
    mockSubmitRecipe.mockResolvedValue('test-recipe-id');
    mockSubmitUrl.mockResolvedValue('test-recipe-id');
    mockGetRecipes.mockResolvedValue({ recipes: [] });
    libraryStoreState.notifications = [];
    librarySubscribers.clear();
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  });

  afterEach(() => {
    vi.useRealTimers();
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
});
