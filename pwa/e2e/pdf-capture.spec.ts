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
  test('a staged cold share is claimed once; a warm replacement owns its token', async ({ page }) => {
    await enable(page);
    await page.goto('/capture');
    await page.waitForFunction(() => Boolean(window.WfsPdfShare));
    const stage = async (name: string) => page.evaluate(async (filename) => {
      const bridge = window.WfsPdfShare as unknown as { stage(file: File): Promise<string> };
      return bridge.stage(new File(['%PDF-corrupt'], filename, { type: 'application/pdf' }));
    }, name);
    const old = await stage('old.pdf');
    const token = await stage('new.pdf');
    await page.evaluate(async (stale) => { await window.WfsPdfShare?.discard(stale); }, old);
    await page.goto('/capture?share=' + token);
    await expect(page.getByTestId('pdf-confirmation')).toContainText('new.pdf');
    await page.reload();
    await expect(page.getByTestId('pdf-confirmation')).toHaveCount(0);
    await expect(page.getByTestId('pdf-share-error')).toContainText(/again/);
    const warm = await stage('warm.pdf');
    await page.goto('/capture?share=' + warm);
    await expect(page.getByTestId('pdf-confirmation')).toContainText('warm.pdf');
  });
  test('interruption while claiming a share cannot restore a draft', async ({ page }) => {
    await enable(page);
    await page.addInitScript(() => {
      const poll = window.setInterval(() => {
        if (!window.WfsPdfShare) return;
        window.clearInterval(poll);
        window.WfsPdfShare.claim = async (token) => {
          Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
          document.dispatchEvent(new Event('visibilitychange'));
          await new Promise((resolve) => window.setTimeout(resolve, 50));
          Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
          return { token, file: new File(['%PDF'], 'interrupted.pdf', { type: 'application/pdf' }) };
        };
      }, 0);
    });
    await page.goto('/capture');
    await page.waitForFunction(() => Boolean(window.WfsPdfShare));
    await page.evaluate(() => { window.history.pushState(null, '', '/capture?share=interrupted'); window.dispatchEvent(new PopStateEvent('popstate')); });
    await expect(page.getByTestId('pdf-confirmation')).toHaveCount(0);
    await page.waitForTimeout(100);
    await expect(page.getByTestId('pdf-confirmation')).toHaveCount(0);
  });

  test('common PDF transport mock follows disabled and accepted contract', async ({ page }) => {
    await page.goto('/capture');
    const upload = async () => page.evaluate(async (memberId) => {
      const form = new FormData();
      form.append('file', new File(['%PDF'], 'supper.pdf', { type: 'application/pdf' }));
      form.append('rating', '0');
      const response = await fetch('/api/recipes/capture-pdf', { method: 'POST', headers: { 'X-Family-Member-Id': memberId }, body: form });
      return { status: response.status, body: await response.json() };
    }, MOCK_IDS.MEMBER_ALEX);
    const disabled = await upload();
    expect(disabled.status).toBe(409);
    expect(disabled.body.status).toBe(409);
    await enable(page);
    const accepted = await upload();
    expect(accepted.status).toBe(202);
    expect(accepted.body).toEqual({ data: { id: MOCK_IDS.RECIPE_LASAGNA } });
  });

  test('expired browser staging is cleaned and never restores a draft', async ({ page }) => {
    await page.goto('/capture');
    await page.waitForFunction(() => Boolean(window.WfsPdfShare));
    const token = await page.evaluate(async () => {
      const bridge = window.WfsPdfShare as unknown as { stage(file: File): Promise<string> };
      return bridge.stage(new File(['%PDF'], 'expired.pdf', { type: 'application/pdf' }));
    });
    await page.clock.setFixedTime(new Date('2026-05-04T12:11:00Z'));
    const restored = await page.evaluate(async (value) => {
      await window.WfsPdfShare?.cleanup?.();
      return (await window.WfsPdfShare?.claim(value)) !== null;
    }, token);
    expect(restored).toBe(false);
    await page.goto('/capture?share=' + token);
    await expect(page.getByTestId('pdf-confirmation')).toHaveCount(0);
    await expect(page.getByTestId('pdf-share-error')).toContainText(/again/);
  });

});
