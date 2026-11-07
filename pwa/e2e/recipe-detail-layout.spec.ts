import { test, expect, type Page } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';
import fs from 'node:fs';
import path from 'node:path';

const recipeId = MOCK_IDS.RECIPE_LASAGNA;
const title = { en: 'Ground beef fajitas', fr: 'Fajitas au bœuf haché' };
const notes = {
  en: 'Use less chilli for the children. Keep the salsa at the table.',
  fr: 'Mettre moins de piment pour les enfants. Servir la salsa à table.',
};
const ingredients = [
  '8 tortillas',
  '500 g ground beef',
  '1 sachet fajita seasoning',
  '1 onion',
  '2 bell peppers',
  '150 g corn',
  '125 ml sour cream',
  '250 ml mild salsa',
  '½ lettuce',
  '200 g grated cheddar',
  '15 ml vegetable oil',
];
const frenchIngredients = [
  '8 tortillas',
  '500 g bœuf haché',
  '1 sachet épices à fajitas',
  '1 oignon',
  '2 poivrons',
  '150 g maïs',
  '125 ml crème sûre',
  '250 ml salsa douce',
  '1/2 laitue',
  '200 g fromage cheddar râpé',
  '15 ml huile végétale',
];
const steps = {
  en: [
    [
      'Prepare the vegetables',
      'Slice the onion and peppers. Shred the lettuce and grate the cheddar.',
    ],
    [
      'Cook the filling',
      'Heat the oil in a large pan over medium-high heat. Brown the ground beef.',
      'Add the onion, peppers and corn. Cook for 5–7 minutes until tender.',
      'Add the fajita seasoning and a little water if needed. Stir and simmer for 2 minutes.',
    ],
    [
      'Assemble',
      'Warm the tortillas according to the package instructions.',
      'Fill each tortilla with beef, salsa, sour cream, lettuce and cheddar.',
    ],
  ],
  fr: [
    [
      'Préparation des légumes',
      'Émincer l’oignon et couper les poivrons en fines lanières. Hacher la laitue et râper le fromage cheddar.',
    ],
    [
      'Cuisson de la garniture',
      'Dans une grande poêle, faire chauffer l’huile à feu moyen-vif et faire dorer le bœuf haché jusqu’à ce qu’il ne soit plus rosé.',
      'Ajouter l’oignon, les poivrons et le maïs. Cuire pendant 5 à 7 minutes jusqu’à ce que les légumes soient tendres.',
      'Saupoudrer les épices à fajitas sur le mélange et ajouter un peu d’eau si nécessaire. Bien mélanger et laisser mijoter 2 minutes.',
    ],
    [
      'Assemblage',
      'Réchauffer les tortillas selon les instructions sur l’emballage.',
      'Garnir chaque tortilla avec la préparation de bœuf, puis ajouter la salsa douce, la crème sûre, la laitue et le fromage cheddar.',
    ],
  ],
};
const photoNames = ['original', 'bright', 'dark'] as const;

async function prepare(
  page: Page,
  locale: 'en' | 'fr',
  options: {
    photo?: (typeof photoNames)[number] | 'missing';
    missingInstructions?: boolean;
    long?: boolean;
    notes?: string;
    failNotesSave?: boolean;
    reviewAmounts?: boolean;
    originalServings?: number;
  } = {}
) {
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: id,
            familyMembers: [{ id, name: 'Alex', browseViewMode: 'stack' }],
            hasLoaded: true,
          },
          version: 0,
        })
      ),
    MOCK_IDS.MEMBER_ALEX
  );
  await setupCommonRoutes(page);
  const recipe = builders.recipe({
    id: recipeId,
    name: title[locale] + (options.long ? ' · ' + title[locale].repeat(4) : ''),
    description:
      locale === 'en'
        ? 'Warm tortillas, spiced beef and colourful vegetables. Put the toppings on the table and let everyone make their own.'
        : 'Des tortillas chaudes, du bœuf épicé et des légumes colorés. Chacun choisit ses garnitures à table.',
    ingredients: locale === 'en' ? ingredients : frenchIngredients,
    recipeInstructions: options.missingInstructions
      ? []
      : (steps[locale].map(([name, ...text]) => ({
          '@type': 'HowToSection',
          name,
          itemListElement: text.map((text) => ({ '@type': 'HowToStep', text })),
        })) as any),
    notes: options.notes ?? notes[locale],
    rating: 3,
    servings: options.originalServings ?? null,
    imageUrl: options.photo === 'missing' ? null : `/api/recipes/${recipeId}/hero`,
    sourceType: 'photos',
    sourceUrl: null,
    imageCount: 2,
    finishedDishIndex: 0,
    isReady: true,
    isDiscoverable: true,
    cuisineType: 'Mexican',
    mealTypes: ['Supper'],
  });
  let failNotesSave = options.failNotesSave;
  await page.route(`**/api/recipes/${recipeId}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      const patch = route.request().postDataJSON();
      if (failNotesSave && Object.hasOwn(patch, 'notes')) {
        failNotesSave = false;
        return route.fulfill({ status: 400, json: { error: 'Save rejected' } });
      }
      Object.assign(recipe, patch);
      return route.fulfill({ json: {} });
    }
    return route.fulfill({ json: { recipe, updatedAt: '2026-05-04T12:00:00Z' } });
  });
  await page.route('**/api/recipes/search', (route) =>
    route.fulfill({
      json: {
        data: {
          topPick: null,
          results: [recipe],
          appliedFilters: {},
          searchMode: 'explicit',
          resultPath: 'lexical-only',
        },
      },
    })
  );
  await page.route(`**/api/recipes/${recipeId}/hero`, (route) =>
    route.fulfill({
      body: fs.readFileSync(
        path.resolve(
          'e2e/fixtures/recipe-photos',
          `${options.photo === 'missing' ? 'original' : options.photo || 'original'}.webp`
        )
      ),
      contentType: 'image/webp',
    })
  );
  await page.route(`**/api/recipes/${recipeId}/original/*`, (route) =>
    route.fulfill({
      body: fs.readFileSync(path.resolve('e2e/fixtures/recipe-photos/original.webp')),
      contentType: 'image/webp',
    })
  );
  const mutations: string[] = [];
  page.on('request', (req) => {
    if (
      req.url().includes('/api/') &&
      new URL(req.url()).pathname !== '/api/recipes/search' &&
      !['GET', 'HEAD'].includes(req.method())
    )
      mutations.push(req.method() + ' ' + new URL(req.url()).pathname);
  });
  await page.goto(
    `/recipes?focus=search&addToDay=2&weekOffset=0&referenceWeekStartDate=2026-05-04${options.reviewAmounts ? `&reviewAmounts=true&open=${recipeId}&sourceGroceryWeekOffset=0&sourceGroceryReferenceWeekStartDate=2026-05-04` : ''}`
  );
  if (!options.reviewAmounts) {
    await page.getByTestId('recipe-search-input').fill('fajitas');
    await page.getByTestId('recipe-search-input').press('Enter');
    await page.getByTestId('stack-card-front').click();
  }
  await expect(page.getByTestId('recipe-detail-name')).toContainText(title[locale]);
  await page.addStyleTag({ content: 'nextjs-portal{display:none}' });
  return mutations;
}

for (const locale of ['en', 'fr'] as const)
  test.describe(`recipe detail layout ${locale}`, () => {
    test.use({ appLocale: locale });
    test('visible Similar opens existing search without plan or recipe writes', async ({
      page,
    }) => {
      const mutations = await prepare(page, locale, { originalServings: 2 });
      const similar = page.getByTestId('action-find-similar');
      await expect(similar).toHaveCount(1);
      await expect(similar).toHaveAccessibleName(
        locale === 'fr' ? 'Trouver similaire' : 'Find Similar'
      );
      await page.getByTestId('action-gear-menu').click();
      await expect(page.getByTestId('action-find-similar')).toHaveCount(1);
      await page.getByTestId('action-gear-menu').click();
      const search = page.waitForRequest(
        (r) =>
          r.method() === 'POST' &&
          new URL(r.url()).pathname === '/api/recipes/search' &&
          r.postDataJSON()?.similarToRecipeId === recipeId
      );
      await similar.click();
      await search;
      await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(0);
      await expect(page.getByTestId('search-similar-chip-remove')).toBeVisible();
      await expect(page.getByTestId('stack-card-front')).toBeVisible();
      expect(mutations).toEqual([]);
    });
    test('keeps Cook top-left and dated actions in one row without navigation writes', async ({
      page,
    }) => {
      const mutations = await prepare(page, locale, { originalServings: 2 });
      const cook = page.getByTestId('action-cooks-mode');
      await expect(
        page.getByTestId('recipe-detail-toolbar').getByTestId('action-cooks-mode')
      ).toHaveCount(1);
      await expect(
        page.getByTestId('recipe-planning-actions').getByTestId('action-cooks-mode')
      ).toHaveCount(0);
      const plan = page.getByTestId('action-add-to-day');
      const change = page.getByTestId('action-change-day');
      for (const width of [320, 390, 834]) {
        await page.setViewportSize({ width, height: 844 });
        const p = (await plan.boundingBox())!;
        const c = (await change.boundingBox())!;
        expect(Math.abs(p.y - c.y)).toBeLessThan(2);
        expect(p.height).toBeGreaterThanOrEqual(48);
        expect(c.height).toBeGreaterThanOrEqual(48);
        await expect(cook).toBeInViewport();
      }
      expect(mutations).toEqual([]);
    });
    test('grocery original review never exposes an automatic dated assignment', async ({
      page,
    }) => {
      await prepare(page, locale, { reviewAmounts: true });
      await expect(page.getByTestId('action-cooks-mode')).toHaveCount(1);
      await expect(page.getByTestId('action-add-to-day')).toHaveCount(0);
      await expect(page.getByTestId('recipe-ingredient-projection')).toHaveCount(0);
      await expect(page.getByTestId('time-cook-btn')).toHaveCount(0);
      await expect(page.getByTestId('action-begin-planning')).toHaveAccessibleName(
        locale === 'fr' ? 'Planifier' : 'Plan'
      );
      await page.getByTestId('action-begin-planning').click();
      await expect(page.getByTestId('action-add-to-day')).toBeEnabled();
    });
    test('icon-only Change day retains its localized name, fixed target and keyboard chooser', async ({
      page,
    }) => {
      const mutations = await prepare(page, locale, { originalServings: 2 });
      const name = locale === 'fr' ? 'Changer de jour' : 'Change day';
      for (const [width, height, scale] of [
        [390, 844, 1],
        [320, 740, 2],
        [834, 1112, 1],
        [844, 390, 1],
      ]) {
        await page.setViewportSize({ width, height });
        await page.evaluate((scale) => {
          document.documentElement.style.fontSize = `${scale * 16}px`;
        }, scale);
        const change = page.getByRole('button', { name, exact: true });
        await expect(change).toHaveAttribute('title', name);
        expect((await change.textContent())?.trim()).toBe('');
        const box = (await change.boundingBox())!;
        expect(box.width).toBe(48);
        expect(box.height).toBeGreaterThanOrEqual(48);
        await page.keyboard.press('Tab');
        await change.focus();
        await expect(change).toBeFocused();
        await expect(change).toBeInViewport();
        await change.press('Enter');
        await expect(page.getByTestId('planning-day-chooser')).toBeVisible();
        await page.getByTestId('planning-day-cancel').focus();
        await page.getByTestId('planning-day-cancel').press('Enter');
        await expect(change).toBeFocused();
        await page.screenshot({
          path: test.info().outputPath(`${locale}-icon-only-${width}-${height}-${scale}.png`),
        });
      }
      expect(mutations).toEqual([]);
    });
    test('keyboard notes focus has a clear two-pixel indicator', async ({ page }) => {
      await prepare(page, locale);
      const shortcut = page.getByTestId('recipe-family-notes-shortcut');
      await page.keyboard.press('Tab');
      await shortcut.focus();
      await shortcut.press('Enter');
      const input = page.getByTestId('recipe-notes-input');
      await expect(input).toBeFocused();
      const focus = await input.evaluate((el) => ({
        width: parseFloat(getComputedStyle(el).outlineWidth),
        style: getComputedStyle(el).outlineStyle,
      }));
      expect(focus.width).toBeGreaterThanOrEqual(2);
      expect(focus.style).toBe('solid');
      await expect
        .poll(() => input.evaluate((el) => getComputedStyle(el).outlineColor))
        .toBe('rgb(184, 85, 66)');
      await page.screenshot({
        path: test.info().outputPath(`${locale}-notes-settled-keyboard-focus.png`),
      });
    });
    test('enlarged footer keyboard scrolling reveals each action and notes clears a shortened viewport', async ({
      page,
    }) => {
      await prepare(page, locale, { photo: 'dark', originalServings: 2 });
      await page.setViewportSize({ width: 320, height: 740 });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
      await page.keyboard.press('Tab');
      const plan = page.getByTestId('action-add-to-day');
      await plan.focus();
      for (const id of ['action-add-to-day', 'action-change-day']) {
        const action = page.getByTestId(id);
        await expect(action).toBeFocused();
        await expect(action).toBeInViewport();
        const box = (await action.boundingBox())!;
        const footer = (await page.getByTestId('recipe-planning-actions').boundingBox())!;
        expect(box.y).toBeGreaterThanOrEqual(footer.y - 1);
        expect(box.y + box.height).toBeLessThanOrEqual(footer.y + footer.height + 1);
        expect(await action.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        await page.screenshot({
          path: test.info().outputPath(`${locale}-320-200-focus-${id}.png`),
        });
        await page.keyboard.press('Tab');
      }
      const cook = page.getByTestId('recipe-detail-toolbar').getByTestId('action-cooks-mode');
      await cook.focus();
      await expect(cook).toBeFocused();
      await expect(cook).toBeInViewport();
      expect((await cook.boundingBox())!.height).toBeGreaterThanOrEqual(48);
      await page.setViewportSize({ width: 390, height: 390 });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '16px';
      });
      const shortcut = page.getByTestId('recipe-family-notes-shortcut');
      await shortcut.focus();
      await shortcut.press('Enter');
      const input = page.getByTestId('recipe-notes-input');
      await expect(input).toBeFocused();
      await input.scrollIntoViewIfNeeded();
      const bottom = (await input.boundingBox())!;
      const footer = (await page.getByTestId('recipe-planning-actions').boundingBox())!;
      expect(bottom.y + bottom.height).toBeLessThanOrEqual(footer.y + 1);
      await page.screenshot({
        path: test.info().outputPath(`${locale}-short-keyboard-notes.png`),
      });
    });

    for (const photo of ['bright', 'dark'] as const)
      test(`keyboard capsule material and rating semantics on ${photo} photo`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await prepare(page, locale, { photo, originalServings: 2 });
        const original = page.getByTestId('action-view-original');
        await original.scrollIntoViewIfNeeded();
        await page.keyboard.press('Tab');
        await original.focus();
        const style = async () =>
          original.evaluate((el) => {
            const css = getComputedStyle(el),
              box = el.getBoundingClientRect();
            return {
              color: css.color,
              background: css.backgroundColor,
              outline: css.outline,
              shadow: css.boxShadow,
              focusVisible: el.matches(':focus-visible'),
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
            };
          });
        const focused = await style();
        expect(focused.focusVisible).toBe(true);
        expect(focused.outline).toContain('solid 2px');
        const prefix = test.info().outputPath(`${locale}-${photo}-capsule`);
        await page.screenshot({ path: prefix + '-keyboard.png' });
        await original.press('Enter');
        await expect(page.getByTestId('action-close-viewer')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(original).toBeFocused();
        const returned = await style();
        expect(returned.focusVisible).toBe(true);
        await original.hover();
        await expect.poll(async () => (await style()).background).toContain('/ 0.9');
        const hovered = await style();
        await page.screenshot({ path: prefix + '-hover.png' });
        await page.mouse.down();
        const pressed = await style();
        await page.screenshot({ path: prefix + '-pressed.png' });
        await page.mouse.move(0, 0);
        await page.mouse.up();
        const rating = page.getByTestId('recipe-rating-selector');
        await rating.scrollIntoViewIfNeeded();
        const choices = await rating.getByRole('button').evaluateAll((elements) =>
          elements.map((el) => {
            const css = getComputedStyle(el),
              box = el.getBoundingClientRect();
            return {
              name: el.textContent,
              pressed: el.getAttribute('aria-pressed'),
              color: css.color,
              background: css.backgroundColor,
              border: css.borderWidth,
              opacity: css.opacity,
              width: box.width,
              height: box.height,
            };
          })
        );
        await expect(page.getByTestId('recipe-rating-selected')).toHaveCount(0);
        const selectedRating = rating.getByRole('button', { pressed: true });
        await expect(selectedRating).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        expect(choices).toHaveLength(3);
        expect(choices.filter((choice) => choice.pressed === 'true')).toHaveLength(1);
        for (const choice of choices) {
          expect(choice.border).toBe('0px');
          expect(choice.opacity).toBe('1');
          expect(choice.width).toBeGreaterThanOrEqual(48);
          expect(choice.height).toBeGreaterThanOrEqual(48);
        }
        const metrics = { focused, returned, hovered, pressed, choices };
        fs.writeFileSync(prefix + '-metrics.json', JSON.stringify(metrics, null, 2));
        await testInfo.attach('actual material states', {
          body: JSON.stringify(metrics),
          contentType: 'application/json',
        });
      });

    test('narrow empty and failed notes retain text, keyboard focus, retry and close flush', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 740 });
      await prepare(page, locale, { notes: '', failNotesSave: true, photo: 'missing' });
      const input = page.getByTestId('recipe-notes-input');
      await input.scrollIntoViewIfNeeded();
      await page.keyboard.press('Tab');
      await input.focus();
      const prefix = test.info().outputPath(`${locale}-notes`);
      await page.screenshot({ path: prefix + '-empty-keyboard.png' });
      await input.fill(locale === 'fr' ? 'Moins de piment' : 'Less chilli');
      await expect(page.getByTestId('recipe-notes-retry')).toBeVisible();
      await input.scrollIntoViewIfNeeded();
      await page.screenshot({ path: prefix + '-error.png' });
      await page.getByTestId('recipe-notes-retry').click();
      await expect(page.getByTestId('recipe-notes-saved')).toBeVisible();
      await input.fill(
        locale === 'fr' ? 'Conserver ce texte plus récent' : 'Retain this newer text'
      );
      await page.getByTestId('action-close-sheet').click();
      await page.getByTestId('stack-card-front').click();
      await expect(page.getByTestId('recipe-notes-input')).toHaveValue(
        locale === 'fr' ? 'Conserver ce texte plus récent' : 'Retain this newer text'
      );
    });
    test('empty notes stay writable through failed autosave, retry, deletion and reopen', async ({
      page,
    }) => {
      await prepare(page, locale, { notes: '', failNotesSave: true });
      const input = page.getByTestId('recipe-notes-input');
      await input.scrollIntoViewIfNeeded();
      await expect(input).toBeVisible();
      await expect(page.getByTestId('recipe-add-note')).toHaveCount(0);
      await input.fill('Less chilli');
      await expect(page.getByTestId('recipe-notes-retry')).toBeVisible();
      await expect(input).toHaveValue('Less chilli');
      await page.getByTestId('recipe-notes-retry').click();
      await expect(page.getByTestId('recipe-notes-saved')).toBeVisible();
      await input.fill('');
      await expect(page.getByTestId('recipe-notes-saved')).toBeVisible();
      await expect(input).toBeVisible();
      await page.getByTestId('action-close-sheet').click();
      await page.getByTestId('stack-card-front').click();
      await expect(page.getByTestId('recipe-notes-input')).toHaveValue('');
    });
    test('reading reflows and keeps dated actions reachable across the composition matrix', async ({
      page,
    }, testInfo) => {
      test.setTimeout(120_000);
      const sizes = [
        [390, 844],
        [320, 740],
        [844, 390],
        [834, 1112],
        [1112, 834],
      ];
      const metrics: unknown[] = [];
      const mutations = await prepare(page, locale);
      await expect(
        page.getByRole('button', { name: locale === 'fr' ? 'J’adore' : 'Love', exact: true })
      ).toHaveAttribute('aria-pressed', 'true');
      for (const [width, height] of sizes)
        for (const scale of [1, 2]) {
          await page.setViewportSize({ width, height });
          await page.evaluate((scale) => {
            document.documentElement.style.fontSize = `${scale * 16}px`;
          }, scale);
          const sheet = page.getByTestId('recipe-detail-sheet');
          await page.getByTestId('recipe-detail-reading').evaluate((el) => (el.scrollTop = 0));
          await page.evaluate(() => document.fonts.ready);
          const info = await sheet.evaluate((el) => {
            const box = el.getBoundingClientRect();
            const read = document.querySelector('[data-testid="recipe-detail-reading"]')!;
            return {
              top: box.top,
              bottom: box.bottom,
              footerHeight: document
                .querySelector('[data-testid="recipe-planning-actions"]')!
                .getBoundingClientRect().height,
              width: box.width,
              height: box.height,
              overflow: el.scrollWidth > el.clientWidth,
              readingHeight: read.clientHeight,
              viewportWidth: innerWidth,
              viewportHeight: innerHeight,
            };
          });
          expect(info.overflow).toBe(false);
          expect(info.top).toBeGreaterThanOrEqual(0);
          expect(info.bottom).toBeLessThanOrEqual(height + 1);
          expect(info.footerHeight).toBeLessThanOrEqual(height * 0.45 + 1);
          expect(info.readingHeight).toBeGreaterThanOrEqual(96);
          if (width < 768 || height < 500) {
            expect(info.width).toBe(width);
            expect(info.height).toBe(height);
          } else {
            expect(info.width).toBeLessThan(width);
            expect(info.height).toBeLessThan(height);
          }
          const ending = await page.getByTestId('recipe-detail-sheet').evaluate((sheet) => {
            const rating = sheet.querySelector('[data-testid=recipe-rating-selector]')!;
            const notes = sheet.querySelector('[data-testid=recipe-family-notes]')!;
            const ask = sheet.querySelector('[data-testid=action-toggle-discovery]')!;
            const instructions = sheet.querySelector(
              '[aria-labelledby=recipe-instructions-heading]'
            )!;
            return {
              afterInstructions: !!(
                instructions.compareDocumentPosition(rating) & Node.DOCUMENT_POSITION_FOLLOWING
              ),
              notesAfterRating: !!(
                rating.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING
              ),
              askAfterNotes: !!(
                notes.compareDocumentPosition(ask) & Node.DOCUMENT_POSITION_FOLLOWING
              ),
            };
          });
          expect(ending).toEqual({
            afterInstructions: true,
            notesAfterRating: true,
            askAfterNotes: true,
          });
          const add = page.getByTestId('action-add-to-day');
          await expect(add).toBeInViewport();
          expect((await add.boundingBox())!.height).toBeGreaterThanOrEqual(48);
          const original = page.getByTestId('action-view-original');
          await original.scrollIntoViewIfNeeded();
          await expect(original).toBeInViewport();
          await page.screenshot({
            path: test.info().outputPath(`${width}x${height}-${locale}-${scale}-identity.png`),
          });
          await page.getByTestId('recipe-family-notes-shortcut').click();
          await expect(page.getByTestId('recipe-notes-input')).toBeFocused();
          const input = page.getByTestId('recipe-notes-input');
          await input.scrollIntoViewIfNeeded();
          await page
            .getByTestId('recipe-detail-reading')
            .evaluate((el) => (el.scrollTop = el.scrollHeight));
          expect(await sheet.evaluate((el) => el.scrollTop)).toBe(0);
          await expect(page.getByTestId('action-close-sheet')).toBeInViewport();
          const bottom = (await input.boundingBox())!;
          const footer = (await page.getByTestId('recipe-planning-actions').boundingBox())!;
          expect(bottom.y + bottom.height).toBeLessThanOrEqual(footer.y + 1);
          await page.screenshot({
            path: test.info().outputPath(`${width}x${height}-${locale}-${scale}-reading.png`),
          });
          metrics.push({ locale, scale, ...info });
        }
      expect(mutations).toEqual([]);
      fs.writeFileSync(
        test.info().outputPath(`group5-${locale}-metrics.json`),
        JSON.stringify(metrics, null, 2)
      );
      await testInfo.attach('layout measurements', {
        body: JSON.stringify(metrics, null, 2),
        contentType: 'application/json',
      });
    });
    for (const photo of ['bright', 'dark', 'missing'] as const)
      test(`stable source and long content with ${photo} imagery`, async ({ page }) => {
        await page.setViewportSize({
          width: photo === 'dark' ? 834 : 390,
          height: photo === 'dark' ? 1112 : 844,
        });
        const mutations = await prepare(page, locale, {
          photo,
          missingInstructions: photo === 'missing',
          long: photo === 'missing',
        });
        if (photo === 'missing') {
          await page.setViewportSize({ width: 320, height: 740 });
          await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
        }
        await page.getByTestId('action-view-original').scrollIntoViewIfNeeded();
        await page.getByTestId('recipe-detail-sheet').screenshot({
          path: test.info().outputPath(`${locale}-${photo}.png`),
        });
        if (photo !== 'missing') {
          await page.setViewportSize({
            width: photo === 'dark' ? 390 : 834,
            height: photo === 'dark' ? 844 : 1112,
          });
          await page.getByTestId('action-view-original').scrollIntoViewIfNeeded();
          await page.getByTestId('recipe-detail-sheet').screenshot({
            path: test.info().outputPath(`${locale}-${photo}-alternate.png`),
          });
        }
        await page.getByTestId('action-view-original').click();
        await expect(page.getByTestId('action-close-viewer')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('action-view-original')).toBeFocused();
        expect(mutations).toEqual([]);
      });
    test('keyboard trapping, return, constrained editing and chooser controls stay usable', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 740 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const mutations = await prepare(page, locale);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
      await page.getByTestId('action-change-day').click();
      const chooser = page.getByTestId('planning-day-chooser');
      await expect(chooser).toBeVisible();
      expect(await chooser.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(false);
      for (const id of ['planning-week-previous', 'planning-week-next', 'planning-day-cancel']) {
        const button = page.getByTestId(id);
        await button.scrollIntoViewIfNeeded();
        await button.focus();
        await expect(button).toBeInViewport();
      }
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('planning-week-previous')).toBeFocused();
      await page.getByTestId('planning-day-cancel').click();
      await page.getByTestId('action-gear-menu').click();
      await page.getByTestId('action-edit-recipe').click();
      const edit = page.getByTestId('recipe-edit-name-input');
      await edit.focus();
      await edit.scrollIntoViewIfNeeded();
      // A smaller visual viewport approximates keyboard clearance; no OS keyboard is claimed.
      await page.setViewportSize({ width: 320, height: 390 });
      await edit.scrollIntoViewIfNeeded();
      await expect(edit).toBeInViewport();
      const cancel = page.getByTestId('recipe-cancel-edits');
      await cancel.scrollIntoViewIfNeeded();
      await expect(cancel).toBeInViewport();
      await cancel.click();
      await page.getByTestId('action-close-sheet').click();
      await expect(page.getByTestId('stack-card-front')).toBeFocused();
      expect(mutations).toEqual([]);
    });
    test('non-cooking consent reflows at 200% and cancellation preserves both plans', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 740 });
      const mutations = await prepare(page, locale);
      const week = builders.scheduleDays();
      Object.assign(week.days[2], {
        status: 3,
        nonCooking: { kind: 'order_in', label: 'Take Out' },
        removalToken: 'v1.' + 'A'.repeat(43),
      });
      await page.route(
        (url) => url.pathname === '/api/schedule',
        (route) => route.fulfill({ json: { data: week } })
      );
      await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
      await page.getByTestId('action-add-to-day').click();
      const consent = page.getByTestId('non-cooking-confirmation');
      await expect(consent).toBeVisible();
      expect(await consent.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(false);
      for (const id of ['non-cooking-confirm', 'non-cooking-cancel']) {
        const button = page.getByTestId(id);
        await button.scrollIntoViewIfNeeded();
        await expect(button).toBeInViewport();
      }
      await consent.screenshot({
        path: test.info().outputPath(`${locale}-consent-200.png`),
      });
      await page.getByTestId('non-cooking-cancel').click();
      expect(mutations).toEqual([]);
    });
  });

// Run the same specimen twice with pinned source manifests: baseline before any
// Group 5 production hunks, after once qualified. Screenshot metrics are evidence,
// not an assertion of measured contrast or OS keyboard/device validation.
for (const locale of ['en', 'fr'] as const)
  test.describe(`group5 matched actual render ${locale}`, () => {
    test.use({ appLocale: locale });
    const specimens = [
      { name: 'phone-light', width: 390, height: 844, photo: 'bright', text: 1, yield: 2 },
      { name: 'phone-dark', width: 390, height: 844, photo: 'dark', text: 1, yield: 2 },
      { name: 'tablet-light', width: 834, height: 1112, photo: 'bright', text: 1, yield: 2 },
      { name: 'tablet-dark', width: 834, height: 1112, photo: 'dark', text: 1, yield: 2 },
      { name: 'short', width: 844, height: 390, photo: 'dark', text: 1, yield: 2 },
      {
        name: 'narrow-unknown',
        width: 320,
        height: 740,
        photo: 'bright',
        text: 1,
        yield: undefined,
      },
      {
        name: 'narrow-200-unknown-missing',
        width: 320,
        height: 740,
        photo: 'missing',
        text: 2,
        yield: undefined,
      },
      { name: 'narrow-200-light', width: 320, height: 740, photo: 'bright', text: 2, yield: 2 },
      { name: 'narrow-200-dark', width: 320, height: 740, photo: 'dark', text: 2, yield: 2 },
    ] as const;
    for (const specimen of specimens)
      test(specimen.name, async ({ page }, testInfo) => {
        const phase = process.env.WFS_GROUP5_RENDER_PHASE ?? 'after';
        expect(['baseline', 'after']).toContain(phase);
        const mutations = await prepare(page, locale, {
          photo: specimen.photo,
          originalServings: specimen.yield,
          long: specimen.width === 320,
        });
        await page.setViewportSize({ width: specimen.width, height: specimen.height });
        await page.evaluate((scale) => {
          document.documentElement.style.fontSize = `${16 * scale}px`;
        }, specimen.text);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.evaluate(() => document.fonts.ready);
        const folder = test.info().outputPath(phase);
        fs.mkdirSync(folder, { recursive: true });
        const prefix = path.join(folder, `${locale}-${specimen.name}`);
        const original = page.getByTestId('action-view-original');
        await original.scrollIntoViewIfNeeded();
        await original.focus();
        await page.screenshot({ path: prefix + '-hero-focus.png' });
        const collect = async () =>
          page.getByTestId('recipe-detail-sheet').evaluate((sheet) => {
            const ids = [
              'recipe-rating-selector',
              'recipe-notes-input',
              'action-view-original',
              'action-add-to-day',
              'action-change-day',
              'action-cooks-mode',
              'recipe-planning-actions',
            ];
            return {
              overflow: sheet.scrollWidth > sheet.clientWidth,
              controls: Object.fromEntries(
                ids.map((id) => {
                  const element = sheet.querySelector<HTMLElement>(`[data-testid="${id}"]`);
                  if (!element) return [id, null];
                  const style = getComputedStyle(element),
                    box = element.getBoundingClientRect();
                  return [
                    id,
                    {
                      x: box.x,
                      y: box.y,
                      width: box.width,
                      height: box.height,
                      color: style.color,
                      background: style.backgroundColor,
                      border: style.border,
                      outline: style.outline,
                      opacity: style.opacity,
                    },
                  ];
                })
              ),
            };
          });
        const metrics: unknown[] = [await collect()];
        await original.click();
        await expect(page.getByTestId('action-close-viewer')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(original).toBeFocused();
        const notesInput = page.getByTestId('recipe-notes-input');
        await page.getByTestId('recipe-family-notes-shortcut').click();
        await expect(notesInput).toBeFocused();
        await notesInput.scrollIntoViewIfNeeded();
        await page.screenshot({ path: prefix + '-notes-focus.png' });
        metrics.push(await collect());
        if (phase === 'after') {
          expect(
            await page
              .getByTestId('recipe-detail-sheet')
              .evaluate((el) => el.scrollWidth > el.clientWidth)
          ).toBe(false);
          expect(await page.getByTestId('action-add-to-day').boundingBox()).not.toBeNull();
          const plan = page.getByTestId('action-add-to-day');
          expect(await plan.locator('.lucide-arrow-right-left').count()).toBe(0);
          expect(
            await page.getByTestId('action-change-day').locator('.lucide-arrow-right-left').count()
          ).toBe(1);
          await expect(
            page.getByText(locale === 'fr' ? 'Détails des portions' : 'Serving details', {
              exact: true,
            })
          ).toHaveCount(0);
          const change = page.getByTestId('action-change-day');
          await expect(change).toHaveAccessibleName(
            locale === 'fr' ? 'Changer de jour' : 'Change day'
          );
          expect((await change.textContent())?.trim()).toBe('');
          expect((await change.boundingBox())!.width).toBe(48);
          for (const id of [
            'action-view-original',
            'action-add-to-day',
            'action-change-day',
            'action-cooks-mode',
          ])
            expect((await page.getByTestId(id).boundingBox())!.height).toBeGreaterThanOrEqual(48);
          const notesBox = (await notesInput.boundingBox())!;
          const footer = (await page.getByTestId('recipe-planning-actions').boundingBox())!;
          expect(notesBox.y + notesBox.height).toBeLessThanOrEqual(footer.y + 1);
        }
        expect(mutations).toEqual([]);
        fs.writeFileSync(prefix + '-metrics.json', JSON.stringify(metrics, null, 2));
        await testInfo.attach('matched render metrics', {
          body: JSON.stringify(metrics),
          contentType: 'application/json',
        });
      });
  });

test.describe('automatic planning date freshness', () => {
  test.use({ appLocale: 'en', timezoneId: 'Asia/Tokyo' });
  test('refreshes an expired dated action without writing until its replacement is activated', async ({
    page,
  }) => {
    const mutations = await prepare(page, 'en');
    let today = '2026-05-04';
    const writes: { body: any; reference: string | null }[] = [];
    await page.route(
      (url) => url.pathname === '/api/schedule',
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const url = new URL(route.request().url());
        const calendar = builders.deploymentCalendar({
          timeZone: 'America/Toronto',
          today,
          capturedAtUtc: today + 'T16:00:00Z',
          nextDayAtUtc: today === '2026-05-04' ? '2026-05-05T04:00:00Z' : '2026-05-06T04:00:00Z',
          referenceWeekStartDate: url.searchParams.get('referenceWeekStartDate') ?? '2026-05-04',
        });
        const week = builders.scheduleDays(
          Number(url.searchParams.get('weekOffset') ?? 0),
          calendar
        );
        if (writes.length) week.days[1].recipe = builders.scheduleRecipe({ id: recipeId });
        await route.fulfill({ json: { data: week } });
      }
    );
    await page.route('**/api/schedule/assign**', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      writes.push({
        body: route.request().postDataJSON(),
        reference: new URL(route.request().url()).searchParams.get('referenceWeekStartDate'),
      });
      await route.fulfill({ json: { data: { message: 'Recipe assigned' } } });
    });
    await page.goto('/recipes?open=' + recipeId);
    const action = page.getByTestId('action-add-to-day');
    await expect(action).toContainText('May 4');
    today = '2026-05-05';
    await action.click();
    await expect(action).toContainText('May 5');
    expect(writes).toEqual([]);
    expect(mutations).toEqual([]);
    await action.click();
    await expect(page).toHaveURL(
      /success=1&dayIndex=1&weekOffset=0&referenceWeekStartDate=2026-05-04/
    );
    expect(writes).toEqual([
      {
        body: { weekOffset: 0, dayIndex: 1, recipeId, requireEmpty: true },
        reference: '2026-05-04',
      },
    ]);
    expect(mutations).toEqual(['POST /api/schedule/assign']);
  });
});
