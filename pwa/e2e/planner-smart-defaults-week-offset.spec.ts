import { test, expect } from './fixtures';
import { MOCK_IDS, currentMonday, toDateStr, setupCommonRoutes } from './mock-api';

test.describe('Planner smart defaults on active non-zero voting week', () => {
  test('shows pending vote signal on weekOffset=1 when voting is open', async ({ page, baseURL }) => {
    await setupCommonRoutes(page);
    const baseUrl = baseURL || 'http://127.0.0.1:3000';
    await page.context().addCookies([
      { name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl },
    ]);
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    const buildWeekDays = (weekOffset: number) => {
      const monday = currentMonday();
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setUTCDate(monday.getUTCDate() + weekOffset * 7 + i);
        return {
          day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          date: toDateStr(d),
          recipe: null,
          status: 0,
        };
      });
    };

    await page.route((url) => url.pathname === '/api/schedule', async (route) => {
      const weekOffset = Number(new URL(route.request().url()).searchParams.get('weekOffset') ?? '0');
      const status = weekOffset === 1 ? 1 : 0;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            weekOffset,
            locked: false,
            status,
            days: buildWeekDays(weekOffset),
          },
        }),
      });
    });

    await page.route('**/api/schedule/*/smart-defaults', async (route) => {
      const weekOffset = Number(route.request().url().match(/\/api\/schedule\/(\-?\d+)\/smart-defaults/)?.[1] ?? '0');
      if (weekOffset !== 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              weekOffset,
              familySize: 3,
              consensusThreshold: 2,
              preSelectedRecipes: [],
              openSlots: [],
              consensusRecipesCount: 0,
              isVotingOpen: false,
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            weekOffset: 1,
            familySize: 3,
            consensusThreshold: 2,
            preSelectedRecipes: [
              {
                recipeId: MOCK_IDS.RECIPE_TACOS,
                name: 'Street Tacos',
                heroImageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47',
                voteCount: 2,
                familySize: 3,
                unanimousVote: false,
                dayIndex: 0,
                isLocked: false,
              },
            ],
            openSlots: [],
            consensusRecipesCount: 0,
            isVotingOpen: true,
          },
        }),
      });
    });

    await page.goto('/planner');
    await expect(page.getByTestId('day-card-0')).toBeVisible();

    await page.getByTestId('next-week').click();

    await expect(page.getByTestId('vote-count').first()).toBeVisible();
  });
});
