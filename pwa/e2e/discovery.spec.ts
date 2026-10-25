import { test, expect } from './fixtures';
import {
  MOCK_IDS,
  builders,
  setupCommonRoutes,
  mockSseWithFillTheGapInvalidated,
  mockSseWithVoteUpdated,
} from './mock-api';

const MOCK_CATEGORIES = ['Italian', 'Asian', 'Mexican'];

const MOCK_STACK = [
  builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Mock Gourmet Discovery' }),
  builders.recipe({ id: MOCK_IDS.RECIPE_CARBONARA, name: 'Mock Comfort Classic' }),
];

const ORDERED_SIX_RECIPE_STACK = [
  builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Oldest ranked recipe' }),
  builders.recipe({ id: MOCK_IDS.RECIPE_CHICKEN, name: 'Second ranked recipe' }),
  builders.recipe({ id: MOCK_IDS.RECIPE_GNOCCHI, name: 'Third ranked recipe' }),
  builders.recipe({ id: MOCK_IDS.RECIPE_CARBONARA, name: 'Fourth ranked recipe' }),
  builders.recipe({ id: MOCK_IDS.RECIPE_STIR_FRY, name: 'Fifth ranked recipe' }),
  builders.recipe({ id: MOCK_IDS.RECIPE_TACOS, name: 'Recently cooked recipe' }),
];

test.describe('Discovery Flow', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: id },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await setupCommonRoutes(page);

    await page.route(
      (url) => url.pathname.includes('/api/discovery/categories'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: MOCK_CATEGORIES }),
        });
      }
    );

    await page.route(
      (url) => url.pathname.endsWith('/api/discovery'),
      async (route) => {
        const requestedCategory = new URL(route.request().url()).searchParams.get('category');
        expect(requestedCategory).toBe('Supper');
        // The app might call /api/discovery or /api/discovery?category=...
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: MOCK_STACK }),
        });
      }
    );

    await page.route(
      (url) => url.pathname.includes('/api/discovery/') && url.pathname.endsWith('/vote'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );
  });

  test('both members stop on three confirmed matches while cards remain', async ({
    page,
    browser,
  }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // This exercises browser/store delivery only. The real PostgreSQL/SSE boundary
    // is covered separately by VotingSessionPostgresTests and the live suite.
    const otherContext = await browser.newContext();
    await otherContext.addCookies(await page.context().cookies());
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await otherContext.addCookies([
      { name: 'x-family-member-id', value: MOCK_IDS.MEMBER_JORDAN, url: baseUrl },
    ]);
    await otherContext.addInitScript((memberId) => {
      localStorage.setItem('locale', 'en');
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: memberId }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_JORDAN);
    const otherPage = await otherContext.newPage();
    await otherPage.clock.setFixedTime(new Date('2026-05-04T12:00:00Z'));
    await setupCommonRoutes(otherPage);

    const weekStartDate = builders.scheduleDays(1).weekStartDate;
    let session = {
      incarnationId: MOCK_IDS.MEMBER_TEST,
      revision: 1,
      roundId: MOCK_IDS.VOTING_ROUND,
      weekStartDate,
      phase: 'collecting',
      requiredSlots: 3,
      coveredSlots: 2,
      candidateCount: 2,
      smartDefaults: {
        familySize: 2,
        consensusThreshold: 2,
        consensusRecipesCount: 2,
        weekOffset: 1,
        weekStartDate,
        preSelectedRecipes: ORDERED_SIX_RECIPE_STACK.slice(0, 2).map((recipe, index) => ({
          dayIndex: index + 4,
          recipeId: recipe.id,
          name: recipe.name,
          voteCount: 2,
          unanimousVote: false,
          isLocked: false,
        })),
        openSlots: [{ dayIndex: 6 }],
      },
    };
    let submittedVotes = 0;
    for (const memberPage of [page, otherPage]) {
      await memberPage.route(
        (url) => url.pathname === '/api/discovery/categories',
        (route) => route.fulfill({ json: { data: ['Supper'] } })
      );
      await memberPage.route(
        (url) => url.pathname === '/api/discovery',
        (route) => route.fulfill({ json: { data: ORDERED_SIX_RECIPE_STACK } })
      );
      await memberPage.route(
        (url) => url.pathname === '/api/discovery/session',
        async (route) => {
          if (route.request().method() !== 'GET') return route.fallback();
          await route.fulfill({ json: { data: session } });
        }
      );
      await memberPage.route('**/api/discovery/*/vote', async (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        submittedVotes++;
        session = {
          ...session,
          revision: 2,
          phase: 'converged',
          coveredSlots: 3,
          candidateCount: 3,
          smartDefaults: {
            ...session.smartDefaults,
            consensusRecipesCount: 3,
            preSelectedRecipes: ORDERED_SIX_RECIPE_STACK.slice(0, 3).map((recipe, index) => ({
              dayIndex: index + 4,
              recipeId: recipe.id,
              name: recipe.name,
              voteCount: 2,
              unanimousVote: false,
              isLocked: false,
            })),
            openSlots: [],
          },
        };
        await route.fulfill({ json: { success: true } });
        for (const recipient of [page, otherPage]) {
          await recipient.evaluate((snapshot) => {
            const source = (window as unknown as Record<string, EventSource>).__sseSource;
            if (!source) throw new Error('Existing household stream is not mounted');
            source.dispatchEvent(
              new MessageEvent('voting_session_updated', {
                data: JSON.stringify({ type: 'voting_session_updated', session: snapshot }),
              })
            );
          }, session);
        }
      });
    }

    try {
      await Promise.all([page.goto('/discovery'), otherPage.goto('/discovery')]);
      for (const memberPage of [page, otherPage]) {
        await expect(memberPage.getByTestId('discovery-card').first()).toBeVisible();
      }
      const front = await page.getByTestId('discovery-card').first().boundingBox();
      if (!front) throw new Error('Front card has no drag target');
      await page.mouse.move(front.x + front.width / 2, front.y + front.height / 2);
      await page.mouse.down();
      await page.mouse.move(front.x + front.width / 2 + 30, front.y + front.height / 2);
      await otherPage.getByTestId('like-button').click();
      for (const memberPage of [page, otherPage]) {
        await expect(
          memberPage.getByRole('heading', { name: "Menu's in!", exact: true })
        ).toBeVisible();
        await expect(memberPage.getByTestId('like-button')).not.toBeVisible();
        await expect(memberPage.getByTestId('discovery-card')).toHaveCount(0);
        await expect(memberPage).toHaveURL(/\/discovery$/);
      }
      await page.mouse.up();
      const celebration = page.getByTestId('discovery-converged');
      await celebration.evaluate((element) => element.setAttribute('data-stable-check', 'same'));
      await page.evaluate((snapshot) => {
        const source = (window as unknown as Record<string, EventSource>).__sseSource;
        source.dispatchEvent(
          new MessageEvent('voting_session_updated', {
            data: JSON.stringify({
              type: 'voting_session_updated',
              session: { ...snapshot, revision: 3, candidateCount: 4 },
            }),
          })
        );
      }, session);
      await expect(celebration).toHaveAttribute('data-stable-check', 'same');
      await expect(celebration).toHaveAttribute('role', 'status');
      await expect(celebration).toHaveAttribute('aria-live', 'polite');
      await expect(celebration.locator('img')).toHaveCount(0);
      await expect(celebration.getByText('Your family found its matches.')).toBeVisible();
      for (const viewport of [
        { width: 320, height: 740, name: 'small-phone' },
        { width: 390, height: 844, name: 'phone' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1280, height: 900, name: 'desktop' },
      ]) {
        await page.setViewportSize(viewport);
        const geometry = await page.getByTestId('discovery-celebration-card').evaluate((card) => {
          const rect = card.getBoundingClientRect();
          const main = document.querySelector('main')!;
          const mainRect = main.getBoundingClientRect();
          const style = getComputedStyle(main);
          const top = mainRect.top + parseFloat(style.paddingTop);
          const bottom = mainRect.bottom - parseFloat(style.paddingBottom);
          const dock = document
            .querySelector('[data-testid="nav-item-discovery"]')!
            .getBoundingClientRect();
          return {
            centerError: Math.abs((rect.top + rect.bottom) / 2 - (top + bottom) / 2),
            dockClearance: dock.top - rect.bottom,
            horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
            animations: card.getAnimations({ subtree: true }).length,
          };
        });
        expect(geometry.centerError).toBeLessThanOrEqual(2);
        expect(geometry.dockClearance).toBeGreaterThan(0);
        expect(geometry.horizontalOverflow).toBeLessThanOrEqual(0);
        expect(geometry.animations).toBe(0);
        const screenshot = testInfo.outputPath(`convergence-${viewport.name}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        await testInfo.attach(`convergence-${viewport.name}`, {
          path: screenshot,
          contentType: 'image/png',
        });
      }
      // A previous grocery-tab visit must not intercept the matches handoff.
      await otherPage.setViewportSize({ width: 390, height: 844 });
      await otherPage.goto('/planner');
      await otherPage.getByTestId('grocery-tab').click();
      await otherPage.getByTestId('nav-item-discovery').click();
      await expect(otherPage.getByTestId('discovery-see-matches')).toBeVisible();
      const mutations: string[] = [];
      otherPage.on('request', (request) => {
        if (new URL(request.url()).pathname.startsWith('/api/') && request.method() !== 'GET')
          mutations.push(`${request.method()} ${new URL(request.url()).pathname}`);
      });
      const action = otherPage.getByTestId('discovery-see-matches');
      await action.focus();
      await expect(action).toBeFocused();
      const anchoredRead = otherPage.waitForRequest((request) => {
        const url = new URL(request.url());
        return (
          request.method() === 'GET' &&
          url.pathname === '/api/schedule' &&
          url.searchParams.get('weekOffset') === '0' &&
          url.searchParams.get('referenceWeekStartDate') === weekStartDate
        );
      });
      await otherPage.keyboard.press('Enter');
      await anchoredRead;
      await expect(otherPage).toHaveURL(
        `/planner?weekOffset=0&referenceWeekStartDate=${encodeURIComponent(weekStartDate)}`
      );
      await expect(otherPage.getByTestId('day-card-0')).toBeVisible();
      expect(mutations).toEqual([]);
      await otherPage.getByTestId('nav-item-discovery').click();
      await expect(otherPage.getByTestId('discovery-see-matches')).toBeVisible();
      await otherPage.getByTestId('discovery-see-matches').focus();
      await otherPage.keyboard.press('Space');
      await expect(otherPage).toHaveURL(/\/planner\?weekOffset=0&referenceWeekStartDate=/);
      expect(submittedVotes).toBe(1);
    } finally {
      await otherContext.close();
    }
  });

  test.describe('French convergence', () => {
    test.use({ appLocale: 'fr' });

    test('keeps translated matches copy readable on a short 320px screen', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.route(
        (url) => url.pathname === '/api/discovery/session',
        (route) =>
          route.fulfill({
            json: {
              data: {
                incarnationId: MOCK_IDS.MEMBER_TEST,
                revision: 1,
                roundId: MOCK_IDS.VOTING_ROUND,
                weekStartDate: '2026-05-11',
                phase: 'converged',
                requiredSlots: 3,
                coveredSlots: 3,
                candidateCount: 3,
                smartDefaults: { weekStartDate: '2026-05-11', preSelectedRecipes: [] },
              },
            },
          })
      );
      await page.goto('/discovery');
      await expect(page.getByRole('heading', { name: 'Le menu est prêt !' })).toBeVisible();
      await expect(page.getByText('Votre famille a trouvé ses recettes en commun.')).toBeVisible();
      const action = page.getByTestId('discovery-see-matches');
      await expect(action).toHaveAccessibleName('Découvrez vos recettes en commun');
      // Enlarged text may require scrolling, but never horizontal overflow or a clipped action.
      await page.addStyleTag({ content: 'html { font-size: 20px; }' });
      await page.evaluate(() =>
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        320
      );
      const actionBox = await action.boundingBox();
      const dock = await page.getByTestId('nav-item-discovery').boundingBox();
      expect(actionBox!.y + actionBox!.height).toBeLessThan(dock!.y);
      await action.click();
      await expect(page).toHaveURL('/planner?weekOffset=0&referenceWeekStartDate=2026-05-11');
    });
  });

  test('close, remove and reopen converge after one new match', async ({ page }) => {
    // Stateful route mocks verify browser lifecycle integration, not PostgreSQL.
    await setupCommonRoutes(page);
    await page.route(
      (url) => url.pathname === '/api/discovery',
      (route) => route.fulfill({ json: { data: ORDERED_SIX_RECIPE_STACK } })
    );
    await page.goto('/discovery');
    await expect(page.getByTestId('discovery-card').first()).toBeVisible();
    const mutate = async (path: string, method: string, body?: unknown, memberId?: string) =>
      page.evaluate(
        async ({ path, method, body, memberId }) => {
          const response = await fetch(path, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...(memberId ? { 'x-family-member-id': memberId } : {}),
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          });
          if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`);
        },
        { path, method, body, memberId }
      );
    for (const date of ['2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07']) {
      await mutate(`/api/schedule/day/${date}/validate`, 'POST', {
        status: 3,
        nonCooking: { kind: 'order_in' },
      });
    }
    await mutate('/api/schedule/voting/open?weekOffset=0', 'POST');
    for (const recipeId of [
      MOCK_IDS.RECIPE_LASAGNA,
      MOCK_IDS.RECIPE_CHICKEN,
      MOCK_IDS.RECIPE_GNOCCHI,
    ]) {
      for (const memberId of [MOCK_IDS.MEMBER_ALEX, MOCK_IDS.MEMBER_JORDAN]) {
        await mutate(`/api/discovery/${recipeId}/vote`, 'POST', { vote: 1 }, memberId);
      }
    }
    await expect(page.getByTestId('discovery-converged')).toBeVisible();
    await page.locator('[data-testid="nav-item-planner"]:visible').first().click();
    await expect(page.getByTestId('close-voting-btn')).toBeVisible();
    await page.getByTestId('close-voting-btn').click();
    await expect(page.getByTestId('ask-family-cta')).toBeVisible();
    await mutate('/api/schedule/day/2026-05-08/remove', 'DELETE');
    await page.getByTestId('ask-family-cta').click();
    await expect(page.getByTestId('nudge-family-cta')).toBeVisible();
    await page.locator('[data-testid="nav-item-discovery"]:visible').first().click();
    await expect(page.getByTestId('discovery-card').first()).toBeVisible();
    for (const memberId of [MOCK_IDS.MEMBER_ALEX, MOCK_IDS.MEMBER_JORDAN]) {
      await mutate(`/api/discovery/${MOCK_IDS.RECIPE_LASAGNA}/vote`, 'POST', { vote: 1 }, memberId);
    }
    await expect(page.getByTestId('discovery-converged')).toBeVisible();
    const snapshot = await page.evaluate(
      async () => (await (await fetch('/api/discovery/session')).json()).data
    );
    expect(snapshot.requiredSlots).toBe(1);
    expect(snapshot.coveredSlots).toBe(1);
  });

  test('an exhausted collecting feed offers a user-initiated family nudge', async ({ page }) => {
    await page.route(
      (url) => url.pathname === '/api/discovery',
      (route) => route.fulfill({ json: { data: [] } })
    );
    await page.route(
      (url) => url.pathname === '/api/discovery/session',
      (route) =>
        route.fulfill({
          json: {
            data: {
              incarnationId: MOCK_IDS.MEMBER_TEST,
              revision: 1,
              roundId: MOCK_IDS.VOTING_ROUND,
              weekStartDate: '2026-05-04',
              phase: 'collecting',
              requiredSlots: 3,
              coveredSlots: 0,
              candidateCount: 0,
              smartDefaults: {
                weekOffset: 0,
                weekStartDate: '2026-05-04',
                familySize: 2,
                consensusThreshold: 2,
                consensusRecipesCount: 0,
                preSelectedRecipes: [],
                openSlots: [{ dayIndex: 4 }, { dayIndex: 5 }, { dayIndex: 6 }],
              },
            },
          },
        })
    );
    await page.goto('/discovery');
    await expect(page.getByTestId('discovery-empty-state')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Capture a New Recipe' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh Feed' })).toBeVisible();
    await expect(page.getByTestId('planner-nudge-dialog')).toHaveCount(0);
    await page.getByTestId('discovery-nudge-family').click();
    await expect(page.getByRole('dialog', { name: 'Nudge the family' })).toBeVisible();
    await expect(page.getByTestId('planner-nudge-copy')).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('planner-nudge-dialog')).toHaveCount(0);
    await expect(page.getByTestId('discovery-nudge-family')).toBeFocused();
  });

  test('should fetch categories and then fetch the first category stack', async ({ page }) => {
    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId('discovery-card').first()).toBeVisible();
    await expect(page.getByTestId('discovery-card').first()).toContainText(
      /Mock Gourmet Discovery/i
    );
    await expect(page.getByTestId('discovery-card').first()).toContainText(/READY IN 30 MINS/i);
  });

  test('requests only the pinned Supper category in discovery', async ({ page }) => {
    await page.goto('/discovery');
    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('discovery-card').first()).toBeVisible();
  });

  test('presents and votes for the first server-ranked recipe', async ({ page }) => {
    const voteIds: string[] = [];

    await page.route(
      (url) => url.pathname.endsWith('/api/discovery') && !url.pathname.includes('/vote'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: ORDERED_SIX_RECIPE_STACK }),
        });
      }
    );
    await page.route(
      (url) => url.pathname.includes('/api/discovery/') && url.pathname.endsWith('/vote'),
      async (route) => {
        voteIds.push(route.request().url().split('/').at(-2) ?? '');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/discovery');
    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });

    const cards = page.getByTestId('discovery-card');
    await expect(cards).toHaveCount(4);
    await expect(page.locator('[data-testid="discovery-card"][data-front="true"]')).toContainText(
      'Oldest ranked recipe'
    );
    await expect(
      cards.evaluateAll((elements) => elements.map((element) => element.dataset.recipeId))
    ).resolves.toEqual(ORDERED_SIX_RECIPE_STACK.slice(0, 4).map((recipe) => recipe.id));
    await expect(page.getByText('Recently cooked recipe')).not.toBeVisible();

    await page.getByTestId('like-button').click();
    await expect.poll(() => voteIds).toEqual([MOCK_IDS.RECIPE_LASAGNA]);

    await page.getByTestId('dislike-button').click();
    await expect.poll(() => voteIds).toEqual([MOCK_IDS.RECIPE_LASAGNA, MOCK_IDS.RECIPE_CHICKEN]);
  });

  test('should swipe through pinned Supper stack and show summary', async ({ page }) => {
    // Each category returns MOCK_STACK on the first fetch (initial load / loadNextCategory),
    // then [] on subsequent fetches — simulating that all recipes in that category were voted.
    // Without this, the wrap-around in loadNextCategory would re-serve already-visited categories.
    const categoryServed = new Set<string>();
    await page.route(
      (url) => url.pathname.endsWith('/api/discovery') && !url.pathname.includes('/vote'),
      async (route) => {
        const category = new URL(route.request().url()).searchParams.get('category') ?? '';
        const firstTime = !categoryServed.has(category);
        categoryServed.add(category);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: firstTime ? MOCK_STACK : [] }),
        });
      }
    );

    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });

    // Pinned mode only serves Supper: 2 cards total.
    for (let i = 0; i < 2; i++) {
      const likeBtn = page.getByTestId('like-button');
      await expect(likeBtn).toBeEnabled({ timeout: 5_000 });
      await likeBtn.click();
    }

    await expect(page.getByTestId('discovery-empty-state')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('discovery-empty-state')).toContainText(/That's a wrap/i);
  });

  test('SSE fill_the_gap_invalidated: recipe card fades out and micro-badge appears', async ({
    page,
  }) => {
    // Arrange: SSE will emit fill_the_gap_invalidated after connected
    await mockSseWithFillTheGapInvalidated(page, 0);

    // The initial discovery stack has Lasagna + Carbonara.
    // After the SSE event fires, the API returns only Carbonara (Lasagna was planned).
    // The page should remove Lasagna from the stack and show the "Just planned ✓" badge.
    let discoveryCallCount = 0;
    await page.route(
      (url) => url.pathname.endsWith('/api/discovery'),
      async (route) => {
        const callIndex = discoveryCallCount++;
        if (callIndex === 0) {
          // First call (initial load): return both recipes
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: MOCK_STACK }),
          });
        } else {
          // Subsequent calls (silent refetch after SSE): return only Carbonara
          // Lasagna was planned — return stack without it
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: [
                builders.recipe({ id: MOCK_IDS.RECIPE_CARBONARA, name: 'Mock Comfort Classic' }),
              ],
            }),
          });
        }
      }
    );

    await page.goto('/discovery');

    // Wait for initial load to complete
    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('discovery-card').first()).toBeVisible();

    // Wait for SSE fill_the_gap_invalidated to trigger the silent refetch and remove Lasagna.
    // The card for Lasagna should fade out (no longer in the DOM).
    await expect(
      page.locator('[data-testid="discovery-card"]').filter({ hasText: /Mock Gourmet Discovery/i })
    ).not.toBeVisible({ timeout: 10_000 });

    // The "Just planned ✓" micro-badge should appear (sage green, inline at top of card stack)
    await expect(page.getByTestId('just-planned-badge')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('just-planned-badge')).toContainText(/Just planned/i);

    // Badge auto-fades after 2 seconds
    await expect(page.getByTestId('just-planned-badge')).not.toBeVisible({ timeout: 5_000 });
  });

  test('should auto-advance past empty first category to next non-empty category', async ({
    page,
  }) => {
    // Italian is empty (all voted), Asian has cards — page should land on Asian, not empty state
    await page.route(
      (url) => url.pathname.endsWith('/api/discovery') && !url.pathname.includes('/vote'),
      async (route) => {
        const category = new URL(route.request().url()).searchParams.get('category');
        if (category === 'Italian') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [] }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: MOCK_STACK }),
          });
        }
      }
    );

    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('discovery-card').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('discovery-empty-state')).not.toBeVisible();
  });

  test('should skip multiple empty categories before showing first non-empty category', async ({
    page,
  }) => {
    // Italian and Asian are empty, Mexican has cards
    await page.route(
      (url) => url.pathname.endsWith('/api/discovery') && !url.pathname.includes('/vote'),
      async (route) => {
        const category = new URL(route.request().url()).searchParams.get('category');
        if (category === 'Italian' || category === 'Asian') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [] }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: MOCK_STACK }),
          });
        }
      }
    );

    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('discovery-card').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('discovery-empty-state')).not.toBeVisible();
  });

  test('refresh button should be hidden while voting categories are available', async ({
    page,
  }) => {
    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('discovery-card').first()).toBeVisible({ timeout: 10_000 });

    // Refresh button must not be rendered while cards are present
    await expect(page.getByTestId('refresh-button')).not.toBeVisible();
  });

  test('refresh button should appear after pinned Supper stack is exhausted', async ({ page }) => {
    // Same "first-serve only" mock as the summary test — wrap-around must not
    // re-serve already-voted categories and prevent the empty state from appearing.
    const categoryServed = new Set<string>();
    await page.route(
      (url) => url.pathname.endsWith('/api/discovery') && !url.pathname.includes('/vote'),
      async (route) => {
        const category = new URL(route.request().url()).searchParams.get('category') ?? '';
        const firstTime = !categoryServed.has(category);
        categoryServed.add(category);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: firstTime ? MOCK_STACK : [] }),
        });
      }
    );

    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });

    // Pinned mode only serves Supper: 2 cards to exhaust everything.
    for (let i = 0; i < 2; i++) {
      const likeBtn = page.getByTestId('like-button');
      await expect(likeBtn).toBeEnabled({ timeout: 5_000 });
      await likeBtn.click();
    }

    await expect(page.getByTestId('discovery-empty-state')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('refresh-button')).toBeVisible({ timeout: 5_000 });
  });

  test('SSE fill_the_gap empties last card in category → auto-advances to next category', async ({
    page,
  }) => {
    await mockSseWithFillTheGapInvalidated(page, 0);

    // Italian has 1 card (Lasagna). After SSE, Italian refetch returns [] — Lasagna was planned.
    // The next category (Asian/Mexican) uses a DISTINCT stack with no "Mock Gourmet Discovery"
    // so the assertion that Lasagna disappears is reliable even across SSE reconnects.
    const NEXT_STACK = [
      builders.recipe({ id: MOCK_IDS.RECIPE_CARBONARA, name: 'Mock Comfort Classic' }),
      builders.recipe({ id: MOCK_IDS.RECIPE_CHICKEN, name: 'Mock Chicken Delight' }),
    ];

    let italianCallCount = 0;
    await page.route(
      (url) => url.pathname.endsWith('/api/discovery') && !url.pathname.includes('/vote'),
      async (route) => {
        const category = new URL(route.request().url()).searchParams.get('category');
        if (category === 'Italian') {
          const idx = italianCallCount++;
          if (idx === 0) {
            // Initial load: 1 card
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                data: [
                  builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Mock Gourmet Discovery' }),
                ],
              }),
            });
          } else {
            // Silent refetch after SSE: Lasagna was planned
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ data: [] }),
            });
          }
        } else {
          // Asian / Mexican — always return the distinct next-category stack
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: NEXT_STACK }),
          });
        }
      }
    );

    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('discovery-card').first()).toBeVisible();

    // After SSE fires and the refetch empties Italian, the page auto-advances.
    // Lasagna should disappear and be replaced by next-category cards.
    await expect(
      page.locator('[data-testid="discovery-card"]').filter({ hasText: /Mock Gourmet Discovery/i })
    ).not.toBeVisible({ timeout: 10_000 });

    // Empty state must NOT appear — we cycled to the next category
    await expect(page.getByTestId('discovery-empty-state')).not.toBeVisible({ timeout: 5_000 });

    // A card from the next category should be visible
    await expect(page.getByTestId('discovery-card').first()).toBeVisible({ timeout: 10_000 });
  });

  test('SSE vote_updated: voted card re-ranks without vote-specific ring; position-0 card unchanged', async ({
    page,
  }) => {
    // Arrange: 3-card stack so we have a card at position 2
    const STACK_3 = [
      builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Mock Gourmet Discovery' }),
      builders.recipe({ id: MOCK_IDS.RECIPE_CARBONARA, name: 'Mock Comfort Classic' }),
      builders.recipe({ id: MOCK_IDS.RECIPE_CHICKEN, name: 'Mock Chicken Delight' }),
    ];

    // Override the discovery route for this test to return 3 cards
    await page.route(
      (url) => url.pathname.endsWith('/api/discovery'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: STACK_3 }),
        });
      }
    );

    // SSE emits vote_updated for the recipe at position 2 (Chicken)
    await mockSseWithVoteUpdated(page, MOCK_IDS.RECIPE_CHICKEN, 1);

    await page.goto('/discovery');

    // Wait for initial load
    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('discovery-card').first()).toBeVisible();

    // The re-rank rule moves Chicken from position 2 to position 1 (never to 0).
    const cards = page.getByTestId('discovery-card');
    await expect(cards.nth(0)).toContainText('Mock Gourmet Discovery');
    await expect(cards.nth(1)).toContainText('Mock Chicken Delight');

    // Visual branch is neutralized: no vote-specific ring should exist.
    await expect(page.getByTestId('discovery-card-interest-ring')).toHaveCount(0);
  });
});
