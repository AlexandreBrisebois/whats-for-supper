import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';
import { assertCookbookVisualA11y } from './visual-a11y-contract';

async function authenticateAlex(page: Parameters<typeof setupCommonRoutes>[0]) {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: baseUrl,
      httpOnly: true,
    },
  ]);
  await page.addInitScript((id) => {
    localStorage.setItem(
      'family-storage',
      JSON.stringify({
        state: {
          selectedFamilyMemberId: id,
          familyMembers: [{ id, name: 'Alex' }],
          _hasHydrated: true,
          hasLoaded: true,
        },
        version: 0,
      })
    );
  }, MOCK_IDS.MEMBER_ALEX);
}

test.describe('Home Capture Activity & Unified Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAlex(page);
    await setupCommonRoutes(page);
  });

  test('hydrates parallel captures across reload, opens Sheet, links Searchable duplicate review, and leaves /capture untouched', async ({
    page,
  }) => {
    const prepItemId = '110e8400-e29b-41d4-a716-446655440001';
    const prepWorkflowId = '220e8400-e29b-41d4-a716-446655440002';
    const prepRecipeId = '330e8400-e29b-41d4-a716-446655440003';
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/captures/activity', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [
              {
                id: prepItemId,
                workflowInstanceId: prepWorkflowId,
                recipeId: prepRecipeId,
                stage: 'preparing',
                title: 'Grandma Chili',
                sourceWorkflowId: 'goto-synthesis',
                sourceType: 'description',
                stepName: 'synthesize_recipe',
                stepLabel: 'Writing recipe',
                previewText: 'Grandma slow chili',
                friendlyReason: null,
                retryCount: 0,
                isReady: false,
                isSuspectedDuplicate: false,
                updatedAt: '2026-11-24T12:00:00Z',
              },
              {
                id: MOCK_IDS.RECIPE_SPAGHETTI,
                workflowInstanceId: null,
                recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
                stage: 'enriching',
                title: 'Sunday Pasta',
                sourceWorkflowId: 'url-import',
                sourceType: 'url',
                stepName: null,
                stepLabel: null,
                previewText: null,
                friendlyReason: null,
                retryCount: 0,
                isReady: true,
                isSuspectedDuplicate: true,
                updatedAt: '2026-11-24T11:59:00Z',
              },
            ],
          },
        }),
      })
    );

    await page.goto('/home');
    const trigger = page.getByTestId('quick-capture-trigger');
    await expect(trigger).toContainText('Snap, paste, upload, or describe');
    await expect(trigger).not.toContainText('Photo or Link');

    const bar = page.getByTestId('capture-activity-bar');
    await expect(bar).toBeVisible();
    await expect(bar).toContainText(/Preparing 2 recipes/i);
    await expect(page.getByTestId('capture-activity-progress')).toBeVisible();
    await expect(page.getByTestId('capture-in-flight-add-another')).toHaveCount(0);
    expect(await page.locator('body').innerText()).not.toMatch(/[✓✔✅]/);

    // Reload survives via GET /api/captures/activity
    await page.reload();
    await expect(bar).toBeVisible();

    await bar.click();
    const sheet = page.getByTestId('capture-activity-sheet');
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId(`activity-preparing-${prepItemId}`)).toBeVisible();

    const dupLink = page.getByTestId(`activity-recipe-link-${MOCK_IDS.RECIPE_SPAGHETTI}`);
    await expect(dupLink).toHaveAttribute(
      'href',
      `/recipes?open=${MOCK_IDS.RECIPE_SPAGHETTI}&reviewDuplicate=1`
    );

    // Zero floating popups on other tabs
    await page.goto('/planner');
    await expect(page.getByTestId('library-toast-card')).toHaveCount(0);
    await expect(page.locator('[data-testid^="recipe-failure-banner-"]')).toHaveCount(0);

    // /capture remains pure single-purpose intake
    await page.goto('/capture');
    await expect(page.getByTestId('capture-take-photo-btn')).toBeVisible();
    await expect(page.getByTestId('capture-activity-bar')).toHaveCount(0);
    await expect(page.getByTestId('capture-activity-sheet')).toHaveCount(0);
  });

  test('supports Copy details -> Details copied, inline Cancel/Delete auto-close, isReady Dismiss, and Sunlight Retry enrichment', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      let copied = '';
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (text: string) => {
            copied = text;
            (window as any).__copiedCaptureDetails = text;
          },
          readText: async () => copied,
        },
        configurable: true,
      });
    });

    const failId = '880e8400-e29b-41d4-a716-446655440091';
    const pausedRecipeId = MOCK_IDS.RECIPE_LASAGNA;

    let activityItems: any[] = [
      {
        id: failId,
        workflowInstanceId: failId,
        recipeId: '990e8400-e29b-41d4-a716-446655440099',
        stage: 'failed',
        title: 'Grandma Chili',
        sourceWorkflowId: 'goto-synthesis',
        sourceType: 'description',
        stepName: 'synthesize_recipe',
        stepLabel: 'Writing recipe',
        previewText: 'Grandma slow-simmered chili',
        friendlyReason: 'Couldn’t write the recipe right now. Retry to generate it again.',
        retryCount: 1,
        isReady: false,
        isSuspectedDuplicate: false,
        updatedAt: '2026-11-24T12:00:00Z',
      },
      {
        id: pausedRecipeId,
        workflowInstanceId: null,
        recipeId: pausedRecipeId,
        stage: 'enrichment_paused',
        title: 'Roasted Cauliflower Tacos',
        sourceWorkflowId: 'url-import',
        sourceType: 'url',
        stepName: null,
        stepLabel: null,
        previewText: null,
        friendlyReason: 'Smart search paused',
        retryCount: 0,
        isReady: true,
        isSuspectedDuplicate: false,
        updatedAt: '2026-11-24T11:58:00Z',
      },
    ];

    let deleteCount = 0;
    let reindexCount = 0;

    await page.route('**/api/captures/activity', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: activityItems } }),
      })
    );
    await page.route(`**/api/captures/failures/${failId}/details`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            workflowInstanceId: failId,
            recipeId: '990e8400-e29b-41d4-a716-446655440099',
            sourceWorkflowId: 'goto-synthesis',
            sourceType: 'description',
            failedStep: 'synthesize_recipe',
            friendlyReason: 'Couldn’t write the recipe right now.',
            errorMessage: 'OpenAI 504 Timeout',
            stackTrace: 'at SynthesizeRecipe.ExecuteAsync()',
            retryCount: 1,
            lastFailedAt: '2026-11-24T12:00:00Z',
          },
        }),
      })
    );
    await page.route(`**/api/captures/failures/${failId}`, async (route) => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      deleteCount++;
      activityItems = activityItems.filter((i) => i.id !== failId);
      return route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { cleared: true, cleanupCommandId: MOCK_IDS.CLEANUP_COMMAND },
        }),
      });
    });
    await page.route(`**/api/recipes/${pausedRecipeId}/reindex`, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      reindexCount++;
      activityItems = activityItems.map((i) =>
        i.id === pausedRecipeId ? { ...i, stage: 'enriching' } : i
      );
      return route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ data: { queued: true } }),
      });
    });

    await page.goto('/home');
    const bar = page.getByTestId('capture-activity-bar');
    await expect(bar).toContainText(/1 needs attention/i);
    await expect(page.getByTestId('capture-activity-progress')).toHaveCount(0);

    await bar.click();
    const sheet = page.getByTestId('capture-activity-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet).not.toContainText('OpenAI 504 Timeout');

    // Copy details -> neutral Details copied
    await page.getByTestId(`action-copy-${failId}`).click();
    await expect(page.getByTestId(`failed-capture-copied-${failId}`)).toHaveText('Details copied');
    const copiedText = await page.evaluate(() => (window as any).__copiedCaptureDetails);
    expect(copiedText).toContain('OpenAI 504 Timeout');
    expect(copiedText).toContain(failId);

    // Cancel inline confirm does not delete
    await page.getByTestId(`action-clear-${failId}`).click();
    await page.getByTestId(`action-clear-cancel-${failId}`).click();
    expect(deleteCount).toBe(0);

    // Non-destructive Sunlight Retry enrichment
    await expect(page.getByTestId(`activity-enrichment-paused-${pausedRecipeId}`)).toBeVisible();
    await expect(page.getByTestId(`action-clear-${pausedRecipeId}`)).toHaveCount(0);
    await page.getByTestId(`action-retry-enrichment-${pausedRecipeId}`).click();
    expect(reindexCount).toBe(1);

    // Delete final failure when no other failures or active items? Clear enriched then delete final failure -> auto-closes
    activityItems = [activityItems.find((i) => i.id === failId)].filter(Boolean);
    await page.reload();
    await page.getByTestId('capture-activity-bar').click();
    await page.getByTestId(`action-clear-${failId}`).click();
    await expect(page.getByTestId(`action-clear-confirm-${failId}`)).toContainText('Delete');
    await page.getByTestId(`action-clear-confirm-${failId}`).click();
    expect(deleteCount).toBe(1);
    await expect(page.getByTestId('capture-activity-sheet')).toHaveCount(0);
    await expect(page.getByTestId('capture-activity-bar')).toHaveCount(0);
  });

  for (const mode of ['standard', 'high'] as const) {
    const contrastLevel = mode === 'high' ? 'aaa' : 'aa';
    const failA11yId = '440e8400-e29b-41d4-a716-446655440004';

    test(`satisfies ${contrastLevel.toUpperCase()} (${mode}) and EN/FR 320px zero-overflow visual a11y`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.route('**/api/captures/activity', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              items: [
                {
                  id: failA11yId,
                  workflowInstanceId: failA11yId,
                  recipeId: MOCK_IDS.RECIPE_LASAGNA,
                  stage: 'failed',
                  title: 'Grandma Chili',
                  sourceWorkflowId: 'goto-synthesis',
                  sourceType: 'description',
                  stepName: 'synthesize_recipe',
                  stepLabel: 'Writing recipe',
                  previewText:
                    'https://example.com/very-long-recipe-url-that-must-wrap-cleanly-at-320px',
                  friendlyReason: 'Couldn’t write the recipe from your description.',
                  retryCount: 0,
                  isReady: true,
                  isSuspectedDuplicate: false,
                  updatedAt: '2026-11-24T12:00:00Z',
                },
                {
                  id: MOCK_IDS.RECIPE_SPAGHETTI,
                  workflowInstanceId: null,
                  recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
                  stage: 'enrichment_paused',
                  title: 'Roasted Cauliflower Tacos',
                  sourceWorkflowId: 'url-import',
                  sourceType: 'url',
                  stepName: null,
                  stepLabel: null,
                  previewText: null,
                  friendlyReason: null,
                  retryCount: 0,
                  isReady: true,
                  isSuspectedDuplicate: false,
                  updatedAt: '2026-11-24T11:58:00Z',
                },
              ],
            },
          }),
        })
      );

      // Set contrast + French on FR iteration (check both EN on standard, FR on high)
      await page.goto('/profile');
      await expect(page.getByTestId('selected-member-name')).toHaveText('Alex');
      const prefSave = page.waitForResponse(
        (r) =>
          r.url().endsWith(`/api/family/${MOCK_IDS.MEMBER_ALEX}/preferences`) &&
          r.request().method() === 'PUT'
      );
      await page.getByTestId(`contrast-btn-${mode}`).click();
      await prefSave;

      if (mode === 'high') {
        const langSave = page.waitForResponse(
          (r) =>
            r.url().endsWith(`/api/family/${MOCK_IDS.MEMBER_ALEX}/preferences`) &&
            r.request().method() === 'PUT'
        );
        await page.getByTestId('locale-btn-fr').click();
        await langSave;
      }

      await page.goto('/home');
      const bar = page.getByTestId('capture-activity-bar');
      await expect(bar).toBeVisible();
      if (mode === 'high') {
        await expect(page.getByTestId('quick-capture-trigger')).toContainText(
          'Photo, lien, fichier ou idée'
        );
      }
      await assertCookbookVisualA11y(page, { contrastLevel });

      await bar.click();
      const sheet = page.getByTestId('capture-activity-sheet');
      await expect(sheet).toBeVisible();
      await page.getByTestId(`action-clear-${failA11yId}`).click();
      await expect(page.getByTestId(`action-clear-confirm-${failA11yId}`)).toContainText(
        mode === 'high' ? 'Ignorer' : 'Dismiss'
      );

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(overflow).toBe(false);
      await assertCookbookVisualA11y(page, {
        contrastLevel,
        rootSelector: '[data-testid="capture-activity-sheet"]',
      });
    });
  }
});
