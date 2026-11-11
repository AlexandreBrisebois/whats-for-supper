import { test, expect } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

if (process.env.FRESH_FIXED_USE === '1') {
  for (const photo of [false, true]) {
    test(`fresh ${photo ? 'photo' : 'URL'} explicit fixed use survives correction and coherent Cook refresh`, async ({
      browser,
      request,
      baseURL,
    }, info) => {
      test.setTimeout(180_000);
      const id = photo ? process.env.FRESH_PHOTO_RECIPE_ID! : process.env.FRESH_URL_RECIPE_ID!;
      const ingredient = photo ? 'photo oil' : 'oil';
      const date = photo ? '2026-10-25' : '2026-10-12';
      const week = photo ? 2 : 1;
      const planner = `/planner?weekOffset=${week}&referenceWeekStartDate=2026-10-05`;
      const secret = process.env.HEARTH_SECRET!;
      const members = process.env.FRESH_URL_MEMBERS!.split(',');
      const headers = { 'X-Hearth-Secret': secret };
      const read = async () =>
        (await (await request.get(`${baseURL}/api/recipes/${id}`, { headers })).json()).recipe;
      const initial = await read();
      const source = `For any number of portions, use exactly 1 tbsp ${ingredient}.`;
      expect(initial).toMatchObject({
        isReady: true,
        servings: 4,
        ingredients: [`2 tbsp ${ingredient}`, '100 ml sauce'],
      });
      expect(initial.sourceUrl).toBe(photo ? null : 'https://example.test/live-pasta');
      const first = initial.instructionSections[0].steps[0];
      expect(first.text).toBe(source);
      expect(first.bindings).toHaveLength(1);
      expect(first.bindings[0]).toMatchObject({
        role: 'fixed',
        ingredientLineId: initial.ingredientLines[0].id,
        validatedContentRevision: initial.contentRevision,
        validatedTextRevision: first.textRevision,
        payload: { relationshipEvidence: { rule: 'explicit-fixed-portions-clause' } },
      });
      expect(first.bindings[0].payload.allocationGroup).toBeUndefined();
      const demand = async (amount: string) => {
        const response = await request.get(
          `${baseURL}/api/schedule?weekOffset=${week}&referenceWeekStartDate=2026-10-05`,
          { headers }
        );
        expect(response.status()).toBe(200);
        const rows = (await response.json()).data.groceryItems.filter(
          (row: any) => row.normalizedKey === ingredient
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].quantity).toEqual({ kind: 'scalar', value: { n: amount, d: '1' } });
      };
      await demand('4');
      const family = (await (await request.get(`${baseURL}/api/family`, { headers })).json()).data;
      const contexts = await Promise.all(
        members.map(() => browser.newContext({ viewport: { width: 390, height: 844 } }))
      );
      try {
        for (const [index, context] of contexts.entries()) {
          await context.addCookies([
            { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
            { name: 'x-family-member-id', value: members[index], url: baseURL! },
          ]);
          await context.addInitScript(
            ({ member, familyMembers }) => {
              localStorage.setItem('locale', 'en');
              localStorage.setItem(
                'family-storage',
                JSON.stringify({
                  state: {
                    selectedFamilyMemberId: member,
                    familyMembers,
                    _hasHydrated: true,
                    hasLoaded: true,
                  },
                  version: 0,
                })
              );
            },
            { member: members[index], familyMembers: family }
          );
          await context.route('**/*', (route) => {
            const url = new URL(route.request().url());
            return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
              ['data:', 'blob:'].includes(url.protocol)
              ? route.continue()
              : route.abort('blockedbyclient');
          });
        }
        const [editor, cook] = await Promise.all(contexts.map((context) => context.newPage()));
        for (const page of [editor, cook])
          await page.clock.setFixedTime(new Date(`${date}T16:00:00Z`));
        const openCook = async (page: typeof cook) => {
          if (photo) {
            await page.goto(planner);
            await page.getByTestId('day-card-6').getByTestId('edit-recipe-button').click();
            await page.getByTestId('action-cooks-mode').click();
          } else {
            await page.goto('/home');
            await page.getByTestId('cook-mode-btn').click();
          }
          await expect(page.getByTestId('cooking-portion-context')).toContainText('8 portions');
        };
        await openCook(cook);
        const sauce = cook.getByTestId('ingredient-toggle').filter({ hasText: '200 ml sauce' });
        await sauce.click();
        await cook.getByTestId('cooking-view-step-by-step').click();
        await cook.getByTestId('cooks-mode-step-next').click();
        await expect(cook.getByTestId('cooks-mode-instructions')).toContainText(source);
        for (const [total, expected] of [
          ['3', '6'],
          ['1/2', '1'],
        ]) {
          await editor.goto(`/recipes?open=${id}`);
          await editor.getByTestId('action-gear-menu').click();
          await editor.getByRole('button', { name: 'Edit', exact: true }).click();
          await editor.getByTestId('recipe-edit-amount-0').fill(total);
          const saving = editor.waitForResponse(
            (response) =>
              response.request().method() === 'PATCH' &&
              new URL(response.url()).pathname === `/api/recipes/${id}`
          );
          await editor.getByTestId('recipe-save-edits').click();
          const reply = await saving;
          expect(reply.status(), await reply.text()).toBe(200);
          const saved = (await reply.json()).recipe;
          expect(saved.ingredientLines[1]).toEqual(initial.ingredientLines[1]);
          expect(saved.instructionSections[0].steps[0].text).toBe(source);
          expect(saved.instructionSections[0].steps[0].bindings[0].id).toBe(first.bindings[0].id);
          expect(saved.instructionSections[0].steps[0].bindings[0].payload).toEqual(
            first.bindings[0].payload
          );
          await cook.evaluate(() => window.dispatchEvent(new Event('focus')));
          await expect(cook.getByTestId('cooking-quantities-available')).toBeVisible();
          await expect(cook.getByTestId('cooks-mode-instructions')).toContainText(source);
          await cook.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
          await expect(cook.getByTestId('cooks-mode-instructions')).toContainText(source);
          await cook.getByTestId('cooks-mode-step-prev').click();
          await expect(sauce).toHaveAttribute('aria-checked', 'true');
          await expect(
            cook
              .getByTestId('ingredient-toggle')
              .filter({ hasText: `${expected} tbsp ${ingredient}` })
          ).toBeVisible();
          await cook.getByTestId('cooks-mode-step-next').click();
          expect(
            (
              await request.post(`${baseURL}/_test/fresh-url/recompute${photo ? '-photo' : ''}`, {
                headers,
              })
            ).status()
          ).toBe(200);
          await demand(expected);
        }
        await openCook(editor);
        await editor.getByTestId('cooking-view-step-by-step').click();
        await editor.getByTestId('cooks-mode-step-next').click();
        await editor.getByTestId('cooks-mode-edit-step').click();
        await expect(editor.getByRole('textbox')).toHaveValue(source);
        const changed = `For any number of portions, use exactly 1 tbsp of ${ingredient}.`;
        await editor.getByRole('textbox').fill(changed);
        const savingStep = editor.waitForResponse(
          (response) =>
            response.request().method() === 'PATCH' &&
            new URL(response.url()).pathname === `/api/recipes/${id}`
        );
        await editor.getByTestId('cooks-mode-save-edit').click();
        const reply = await savingStep;
        expect(reply.status(), await reply.text()).toBe(200);
        const saved = (await reply.json()).recipe;
        expect(saved.instructionSections[0].steps[0].bindings[0].role).toBe('fixed');
        expect(saved.instructionSections[0].steps[0].bindings[0].id).not.toBe(first.bindings[0].id);
        expect(saved.instructionSections[0].steps[1].bindings[0].id).toBe(
          initial.instructionSections[0].steps[1].bindings[0].id
        );
        await cook.evaluate(() => window.dispatchEvent(new Event('focus')));
        await expect(cook.getByTestId('cooking-quantities-available')).toBeVisible();
        await expect(cook.getByTestId('cooks-mode-instructions')).toContainText(source);
        await cook.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
        await expect(cook.getByTestId('cooks-mode-instructions')).toContainText(changed);
        await expect(cook.getByTestId('cooking-step-uncertainty')).toHaveCount(0);
        await cook
          .getByTestId('cooks-mode-instructions')
          .screenshot({ path: info.outputPath('fixed-refreshed.png'), animations: 'disabled' });
        await cook.getByTestId('cooks-mode-step-prev').click();
        await expect(sauce).toHaveAttribute('aria-checked', 'true');
        await demand('1');
        const final = await read();
        expect(final.instructionSections[0].steps[0].text).toBe(changed);
        expect(final.ingredientLines[0].amountText).toBe('1/2');
      } finally {
        await Promise.all(contexts.map((context) => context.close()));
      }
    });
  }
}
