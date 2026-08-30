import type { Page } from './fixtures';
import { expect, test } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';
import {
  RecipeDto_sourceTypeObject,
  RecipeImportIssueReasonObject,
  RecipeImportIssueStatusObject,
  type RecipeDto,
  type RecipeImportIssueDto,
} from '../src/lib/api/generated/models/index';

type ImportTerminalStatus = 'completed' | 'failed';

interface RecipeHarnessState {
  recipe: RecipeDto;
  terminalStatus: ImportTerminalStatus;
  importStatusReads: number;
  lastReportBody: Record<string, unknown> | null;
}

const searchResult = (
  recipe: RecipeDto,
  importIssueStatus: RecipeImportIssueDto['status'] | null = null
) => ({
  id: recipe.id,
  name: recipe.name,
  imageUrl: recipe.imageUrl,
  totalTime: recipe.totalTime,
  rating: recipe.rating,
  isDiscoverable: recipe.isDiscoverable,
  notes: recipe.notes ?? null,
  reasons: [],
  plannerFitNote: null,
  importIssueStatus,
});

async function authenticate(page: Page) {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);
  await page.addInitScript((id) => {
    localStorage.setItem(
      'family-storage',
      JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
    );
  }, MOCK_IDS.MEMBER_ALEX);
}

async function installRecipeHarness(
  page: Page,
  overrides: Partial<RecipeDto> = {},
  terminalStatus: ImportTerminalStatus = 'completed'
): Promise<RecipeHarnessState> {
  await authenticate(page);
  await setupCommonRoutes(page);

  const state: RecipeHarnessState = {
    recipe: builders.recipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Weeknight Tomato Pasta',
      description: 'A family pasta recipe imported from the web.',
      imageUrl: 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0',
      ingredients: ['Pasta', 'Tomatoes'],
      sourceType: RecipeDto_sourceTypeObject.Url,
      canReimport: true,
      isReady: true,
      importIssue: null,
      ...overrides,
    }),
    terminalStatus,
    importStatusReads: 0,
    lastReportBody: null,
  };

  await page.route('**/api/recipes/search', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          topPick: null,
          results: [searchResult(state.recipe, state.recipe.importIssue?.status ?? null)],
          appliedFilters: {},
          searchMode: 'standard',
          resultPath: 'lexical-only',
        },
      }),
    });
  });

  await page.route(`**/api/recipes/${state.recipe.id}**`, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();

    if (pathname.endsWith('/import-report')) {
      if (method === 'PUT') {
        const body = request.postDataJSON() as {
          reasons: RecipeImportIssueDto['reasons'];
          note?: string | null;
        };
        state.lastReportBody = body;
        state.recipe = {
          ...state.recipe,
          importIssue: {
            reasons: body.reasons,
            note: body.note ?? null,
            status: RecipeImportIssueStatusObject.Reported,
          },
        };
      } else if (method === 'DELETE') {
        state.recipe = { ...state.recipe, importIssue: null };
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ recipe: state.recipe }),
      });
      return;
    }

    if (pathname.endsWith('/import')) {
      if (method === 'POST') {
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({ importId: MOCK_IDS.PHOTO_NEW }),
        });
        return;
      }

      state.importStatusReads += 1;
      if (state.terminalStatus === 'completed' && state.recipe.importIssue) {
        const hasDuplicate = state.recipe.importIssue.reasons?.includes(
          RecipeImportIssueReasonObject.Duplicate
        );
        state.recipe = {
          ...state.recipe,
          importIssue: {
            ...state.recipe.importIssue,
            status: hasDuplicate
              ? RecipeImportIssueStatusObject.Reported
              : RecipeImportIssueStatusObject.ReadyToReview,
          },
        };
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: state.terminalStatus,
          errorMessage:
            state.terminalStatus === 'failed'
              ? 'SQL timeout in CompleteRecipeImportReportProcessor at internal-host:5432'
              : null,
        }),
      });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ recipe: state.recipe }),
      });
      return;
    }

    await route.fallback();
  });

  return state;
}

async function openRecipeDetail(page: Page, recipeId = MOCK_IDS.RECIPE_LASAGNA) {
  await page.goto('/recipes');
  await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });
  await page.getByTestId(`recipe-card-${recipeId}`).click();
  await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
}

test.describe('Recipe import issue reporting', () => {
  test('reports, updates, re-imports to Ready to review, and resolves one active issue', async ({
    page,
  }) => {
    const state = await installRecipeHarness(page);
    await openRecipeDetail(page);

    await page.getByTestId('action-gear-menu').click();
    await expect(page.getByTestId('action-report-import-issue')).toHaveText('Report issue');
    await page.getByTestId('action-report-import-issue').click();
    await page.getByTestId('import-issue-reason-ingredients').click();
    await page.getByTestId('import-issue-save').click();

    await expect(page.getByTestId('recipe-import-issue-status-reported')).toBeVisible();
    expect(state.recipe.importIssue?.reasons).toEqual([RecipeImportIssueReasonObject.Ingredients]);

    await page.getByTestId('action-gear-menu').click();
    await expect(page.getByTestId('action-report-import-issue')).toHaveText('Review issue');
    await page.getByTestId('action-report-import-issue').click();
    await page.getByTestId('import-issue-reason-steps').click();
    await page.getByTestId('import-issue-note-disclosure').click();
    await page
      .getByTestId('import-issue-note')
      .fill('The quantities and final two steps need another pass.');
    await page.getByTestId('import-issue-save').click();

    expect(state.lastReportBody).toEqual({
      reasons: [RecipeImportIssueReasonObject.Ingredients, RecipeImportIssueReasonObject.Steps],
      note: 'The quantities and final two steps need another pass.',
    });

    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-reimport-recipe').click();
    await expect.poll(() => state.importStatusReads).toBeGreaterThan(0);
    await expect(page.getByTestId('recipe-import-issue-status-readyToReview')).toBeVisible();

    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-report-import-issue').click();
    await page.getByTestId('import-issue-resolve').click();

    await expect(page.getByTestId('toast').filter({ hasText: 'Marked as resolved' })).toBeVisible();
    await expect(page.getByTestId('recipe-import-issue-status-readyToReview')).toHaveCount(0);
    expect(state.recipe.importIssue).toBeNull();
  });

  test('merges Cook Mode step reporting without losing the current step or checked ingredients', async ({
    page,
  }) => {
    const state = await installRecipeHarness(page, {
      importIssue: {
        reasons: [RecipeImportIssueReasonObject.Ingredients],
        note: 'Keep this note.',
        status: RecipeImportIssueStatusObject.Reported,
      },
    });
    await openRecipeDetail(page);

    await page.getByTestId('time-cook-btn').click();
    await expect(page.getByTestId('cooks-mode-overlay')).toBeVisible();
    const firstIngredient = page.getByTestId('ingredient-toggle').first();
    await firstIngredient.click();
    await expect(firstIngredient).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('cooks-mode-step-next').click();
    const stepText = await page.getByTestId('cooks-mode-step-text').textContent();

    await page.getByTestId('cooks-mode-report-steps').click();
    await expect(page.getByTestId('import-issue-reason-ingredients')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.getByTestId('import-issue-reason-steps')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.getByTestId('import-issue-note')).toHaveValue('Keep this note.');
    await page.getByTestId('import-issue-save').click();

    await expect(page.getByTestId('cooks-mode-step-text')).toHaveText(stepText ?? '');
    await page.getByTestId('cooks-mode-step-prev').click();
    await expect(page.getByTestId('ingredient-toggle').first()).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(state.lastReportBody).toEqual({
      reasons: [RecipeImportIssueReasonObject.Ingredients, RecipeImportIssueReasonObject.Steps],
      note: 'Keep this note.',
    });
  });

  test('keeps a failed re-import publicly Reported and never renders diagnostics', async ({
    page,
  }) => {
    const state = await installRecipeHarness(
      page,
      {
        importIssue: {
          reasons: [RecipeImportIssueReasonObject.Steps],
          note: null,
          status: RecipeImportIssueStatusObject.Reported,
        },
      },
      'failed'
    );
    await openRecipeDetail(page);

    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-reimport-recipe').click();
    await expect.poll(() => state.importStatusReads).toBeGreaterThan(0);

    await expect(
      page.getByTestId('recipe-detail-sheet').getByTestId('recipe-import-issue-status-reported')
    ).toBeVisible();
    const publicDetail = page.getByTestId('recipe-detail-sheet');
    await expect(publicDetail).not.toContainText('SQL timeout');
    await expect(publicDetail).not.toContainText('CompleteRecipeImportReportProcessor');
    await expect(publicDetail).not.toContainText('internal-host');
  });

  test('mobile review filters return regular Reported and Ready results without Top Pick', async ({
    page,
  }) => {
    await authenticate(page);
    await setupCommonRoutes(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const reported = builders.recipe({
      id: MOCK_IDS.RECIPE_STIR_FRY,
      name: 'Reported Stir Fry',
    });
    const ready = builders.recipe({
      id: MOCK_IDS.RECIPE_TACOS,
      name: 'Ready Tacos',
    });
    let lastFilters: Record<string, boolean> = {};

    await page.route('**/api/recipes/search', async (route) => {
      const body = route.request().postDataJSON() as {
        filters?: Record<string, boolean>;
      };
      lastFilters = body.filters ?? {};
      const readyOnly = Boolean(lastFilters.readyToReviewOnly);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: searchResult(reported, RecipeImportIssueStatusObject.Reported),
            results: readyOnly
              ? [searchResult(ready, RecipeImportIssueStatusObject.ReadyToReview)]
              : [
                  searchResult(reported, RecipeImportIssueStatusObject.Reported),
                  searchResult(ready, RecipeImportIssueStatusObject.ReadyToReview),
                ],
            appliedFilters: lastFilters,
            searchMode: 'standard',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes');
    await page.getByTestId('mobile-filters-button').click();
    await page.getByTestId('mobile-filter-reported').click();
    await page.getByTestId('mobile-filter-apply').click();

    await expect.poll(() => lastFilters).toEqual({ reportedOnly: true });
    await expect(page.getByTestId('recipe-card-top-pick')).toHaveCount(0);
    await expect(page.getByTestId(`recipe-card-${reported.id}`)).toBeVisible();
    await expect(page.getByTestId(`recipe-card-${ready.id}`)).toBeVisible();

    await page.getByTestId('mobile-filters-button').click();
    await page.getByTestId('mobile-filter-reported-active').click();
    await page.getByTestId('mobile-filter-ready-to-review').click();
    await page.getByTestId('mobile-filter-apply').click();

    await expect.poll(() => lastFilters).toEqual({ readyToReviewOnly: true });
    await expect(page.getByTestId(`recipe-card-${reported.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`recipe-card-${ready.id}`)).toBeVisible();
    await expect(page.getByTestId('recipe-card-top-pick')).toHaveCount(0);
  });

  test('Feeling Lucky never promotes a recipe with an active report', async ({ page }) => {
    await authenticate(page);
    await setupCommonRoutes(page);

    const currentPick = builders.recipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Current Pick',
    });
    const reported = builders.recipe({
      id: MOCK_IDS.RECIPE_STIR_FRY,
      name: 'Reported Stir Fry',
    });
    const ready = builders.recipe({
      id: MOCK_IDS.RECIPE_TACOS,
      name: 'Ready Tacos',
    });
    const eligible = builders.recipe({
      id: MOCK_IDS.RECIPE_CHICKEN,
      name: 'Eligible Chicken',
    });

    await page.route('**/api/recipes/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: searchResult(currentPick),
            results: [
              searchResult(reported, RecipeImportIssueStatusObject.Reported),
              searchResult(ready, RecipeImportIssueStatusObject.ReadyToReview),
              searchResult(eligible),
            ],
            appliedFilters: {},
            searchMode: 'standard',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes');
    await page.getByTestId('top-pick-feeling-lucky').click();

    await expect(page.getByTestId('recipe-card-top-pick')).toContainText('Eligible Chicken');
    await expect(page.getByTestId('recipe-card-top-pick')).not.toContainText('Reported Stir Fry');
    await expect(page.getByTestId('recipe-card-top-pick')).not.toContainText('Ready Tacos');
  });

  test('allows duplicate-only reporting for synthesized recipes and preserves the Healthy filter contract', async ({
    page,
  }) => {
    await authenticate(page);
    await setupCommonRoutes(page);

    let synthesized = builders.recipe({
      id: MOCK_IDS.RECIPE_GOTO_STUB,
      name: 'Synthesized Healthy Bowl',
      sourceType: RecipeDto_sourceTypeObject.Synthesized,
      canReimport: false,
      isHealthyChoice: true,
    });
    let lastFilters: Record<string, boolean> = {};

    await page.route('**/api/recipes/search', async (route) => {
      const body = route.request().postDataJSON() as {
        filters?: Record<string, boolean>;
      };
      lastFilters = body.filters ?? {};
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: null,
            results: [searchResult(synthesized)],
            appliedFilters: lastFilters,
            searchMode: 'standard',
            resultPath: 'lexical-only',
          },
        }),
      });
    });
    await page.route(`**/api/recipes/${synthesized.id}**`, async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON() as {
          reasons: RecipeImportIssueDto['reasons'];
          note?: string | null;
        };
        synthesized = {
          ...synthesized,
          importIssue: {
            reasons: body.reasons,
            note: body.note ?? null,
            status: RecipeImportIssueStatusObject.Reported,
          },
        };
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ recipe: synthesized }),
      });
    });

    await page.goto('/recipes');
    await page.getByTestId('filter-healthy').click();
    await expect.poll(() => lastFilters).toEqual({ healthyOnly: true });
    await expect(page.getByTestId(`recipe-card-${synthesized.id}`)).toBeVisible();

    await page.getByTestId(`recipe-card-${synthesized.id}`).click();
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-report-import-issue').click();
    await expect(page.getByTestId('import-issue-reason-ingredients')).toBeDisabled();
    await expect(page.getByTestId('import-issue-reason-steps')).toBeDisabled();
    await expect(page.getByTestId('import-issue-content-ineligible')).toBeVisible();
    await page.getByTestId('import-issue-reason-duplicate').click();
    await page.getByTestId('import-issue-save').click();
    await expect.poll(() => synthesized.importIssue?.reasons).toEqual([
      RecipeImportIssueReasonObject.Duplicate,
    ]);
    await expect(page.getByTestId('action-reimport-recipe')).toHaveCount(0);
  });
});
