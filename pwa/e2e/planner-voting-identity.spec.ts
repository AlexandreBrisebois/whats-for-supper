import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';

for (const demoMode of [false, true]) {
  for (const device of [
    { name: 'phone', width: 390, height: 844 },
    { name: 'iPad', width: 820, height: 1180 },
  ]) {
    test(`${demoMode ? 'demo' : 'ordinary'} ${device.name}: anchored voting survives entry and reload`, async ({
      page,
      baseURL,
    }, info) => {
      expect(['localhost', '127.0.0.1']).toContain(new URL(baseURL!).hostname);
      await page.setViewportSize(device);
      await setupCommonRoutes(page, undefined, { demoMode });
      await page.route(/^https?:\/\//, (route) => {
        const url = new URL(route.request().url());
        return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.fallback() : route.abort();
      });
      await page
        .context()
        .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
      await page.addInitScript((id) => {
        localStorage.setItem(
          'family-storage',
          JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
        );
        localStorage.setItem('wfs:mode-info:demo:dismissed', 'true');
      }, MOCK_IDS.MEMBER_ALEX);
      await page.goto('/planner?weekOffset=1');
      await expect(page.getByTestId('day-card-0')).toContainText('11');
      await expect(page.getByTestId('ask-family-cta')).toHaveCount(1);
      await page.getByTestId('ask-family-cta').click();
      await expect(page.getByTestId('close-voting-btn')).toBeVisible();
      // Real stateful mock votes determine the match; no prepared match payload.
      for (const member of [MOCK_IDS.MEMBER_ALEX, MOCK_IDS.MEMBER_JORDAN]) {
        await test.step(`vote as ${member}`, async () => {
          await page.evaluate(
            async ({ recipe, member }) => {
              const generation = (await fetch('/api/health')).headers.get('X-Demo-Generation');
              const response = await fetch(`/api/discovery/${recipe}/vote`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Family-Member-Id': member,
                  ...(generation ? { 'X-Demo-Generation': generation } : {}),
                },
                body: JSON.stringify({ vote: 1 }),
              });
              if (!response.ok) throw new Error(`Vote failed: ${response.status}`);
            },
            { recipe: MOCK_IDS.RECIPE_LASAGNA, member }
          );
        });
      }
      await page.goto('/home');
      await expect(page.getByTestId('voting-nudge-vote-now')).toBeVisible();
      await page.getByTestId('voting-nudge-vote-now').focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('like-button')).toBeVisible();
      // Same absolute round, expressed by the Home/Discovery matches handoff URL.
      await page.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-05-11');
      await expect(page.getByTestId('close-voting-btn')).toBeVisible();
      await expect(page.getByTestId('day-card-0')).toContainText('Mock Recipe');
      await page.reload();
      await expect(page.getByTestId('close-voting-btn')).toBeVisible();
      await expect(page.getByTestId('day-card-0')).toContainText('Mock Recipe');
      const identities = await page.evaluate(async () => ({
        session: (await (await fetch('/api/discovery/session')).json()).data,
        schedule: (
          await (await fetch('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-05-11')).json()
        ).data,
      }));
      expect(identities.session.weekStartDate).toBe('2026-05-11');
      expect(identities.schedule.weekStartDate).toBe(identities.session.weekStartDate);
      expect(identities.schedule.votingRoundId).toBe(identities.session.roundId);
      expect(identities.schedule.status).toBe(1);
      expect(identities.schedule.days.every((day: { recipe: unknown }) => !day.recipe)).toBe(true);
      await page.screenshot({
        path: info.outputPath('planner-voting.png'),
        fullPage: true,
        animations: 'disabled',
        style: 'nextjs-portal { visibility: hidden; }',
      });
      await page.getByTestId('prev-week').focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('ask-family-cta')).toBeVisible();
      await expect(page.getByTestId('close-voting-btn')).toHaveCount(0);
      await expect(page.getByTestId('day-card-0')).not.toContainText('Mock Recipe');
      const rejected = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/schedule/voting/open' &&
          response.request().method() === 'POST'
      );
      await page.getByTestId('ask-family-cta').focus();
      await page.keyboard.press('Enter');
      expect((await rejected).status()).toBe(409);
      await expect(page.getByTestId('ask-family-cta')).toBeVisible();
      await expect(page.getByTestId('close-voting-btn')).toHaveCount(0);
    });
  }
}
