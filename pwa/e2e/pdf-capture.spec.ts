import { test, expect } from './fixtures';
import { setupCommonRoutes, mockFeatureFlags, MOCK_IDS } from './mock-api';

const pdf = { name: 'supper.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-corrupt') };
test.describe('PDF import preview', () => {
  test.beforeEach(async ({ page }) => {
    const origin = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page.context().addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: origin }]);
    await setupCommonRoutes(page);
  });
  async function enable(page: Parameters<typeof mockFeatureFlags>[0]) {
    await mockFeatureFlags(page, [{ key: 'preview-pdf-recipe-import', mode: 'on', enabled: true }]);
  }
  test('picker includes PDF only when enabled and GOTO excludes it', async ({ page }) => {
    await page.goto('/capture');
    await expect(page.getByTestId('import-recipe-file-input')).not.toHaveAttribute('accept', /pdf/);
    await enable(page);
    await page.reload();
    await expect(page.getByTestId('import-recipe-file-input')).toHaveAttribute('accept', /pdf/);
    await page.goto('/capture?intent=goto');
    await expect(page.getByTestId('import-recipe-file-input')).not.toHaveAttribute('accept', /pdf/);
  });
  test('metadata is submitted once and acceptance returns Home without conversion', async ({ page }) => {
    await enable(page);
    let submissions = 0;
    let body = '';
    await page.route('**/api/recipes/capture-pdf', async (route) => {
      submissions++;
      body = route.request().postData() || '';
      await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ data: { id: MOCK_IDS.RECIPE_LASAGNA } }) });
    });
    await page.goto('/capture');
    await expect(page.getByTestId('import-recipe-file-input')).toHaveAttribute('accept', /pdf/);
    await page.getByTestId('import-recipe-file-input').setInputFiles(pdf);
    await expect(page.getByTestId('pdf-confirmation')).toBeVisible();
    await expect(page.getByTestId('capture-cancel-btn')).toHaveCount(0);
    await page.getByTestId('pdf-rating-3').click();
    await page.getByTestId('pdf-notes').fill('  less salt  ');
    await page.getByTestId('pdf-save').click();
    await expect(page).toHaveURL(/\/home/);
    expect(submissions).toBe(1);
    expect(body).toContain('name="file"');
    expect(body).toContain('less salt');
    expect(body).not.toContain('finishedDishImageIndex');
  });
  test('leaving and returning loses the draft; oversize is rejected locally', async ({ page }) => {
    await enable(page);
    await page.goto('/capture');
    await expect(page.getByTestId('import-recipe-file-input')).toHaveAttribute('accept', /pdf/);
    await page.getByTestId('import-recipe-file-input').setInputFiles(pdf);
    await page.goto('/home');
    await page.goto('/capture');
    await expect(page.getByTestId('pdf-confirmation')).toHaveCount(0);
    await page.getByTestId('import-recipe-file-input').setInputFiles({ ...pdf, buffer: Buffer.alloc(20971521) });
    await expect(page.getByTestId('bundle-import-error')).toContainText(/20 MiB/);
  });
});
