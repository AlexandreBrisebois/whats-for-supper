import { test, expect, type Page } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

if (process.env.FRESH_PER_ITEM_USE === '1') {
  for (const photo of [false, true]) {
    test(`fresh ${photo ? 'photo' : 'URL'} per-item use scales the count and retains a fixed dose through correction`, async ({
      browser,
      request,
      baseURL,
    }, info) => {
      test.setTimeout(180_000);
      const id = photo ? process.env.FRESH_PHOTO_RECIPE_ID! : process.env.FRESH_URL_RECIPE_ID!;
      const tofu = photo ? 'photo tofu' : 'tofu';
      const oil = photo ? 'photo oil' : 'oil';
      const date = photo ? '2026-10-25' : '2026-10-12';
      const week = photo ? 2 : 1;
      const planner = `/planner?weekOffset=${week}&referenceWeekStartDate=2026-10-05`;
      const secret = process.env.HEARTH_SECRET!;
      const members = process.env.FRESH_URL_MEMBERS!.split(',');
      const headers = { 'X-Hearth-Secret': secret };
      const scalar = (n: string, d = '1') => ({ kind: 'scalar', value: { n, d } });
      const clause = (count: string, dose: string) =>
        `For all ${count} pieces of ${tofu}, use exactly ${dose} tsp of ${oil} on each piece.`;
      const source = clause('4', '1/2');
      const neutral =
        'Cook for 20 minutes at 180 °C in a 20 cm pan; retain the 400 g package label.';
      const read = async () => {
        const response = await request.get(`${baseURL}/api/recipes/${id}`, { headers });
        expect(response.status()).toBe(200);
        return (await response.json()).recipe;
      };
      const assertGraph = (recipe: any, denominator: string) => {
        const step = recipe.instructionSections[0].steps[0];
        expect(step.bindings).toHaveLength(2);
        expect(step.bindings[0]).toMatchObject({
          role: 'whole',
          ingredientLineId: recipe.ingredientLines[0].id,
          validatedContentRevision: recipe.contentRevision,
          validatedTextRevision: step.textRevision,
          stepId: step.id,
          status: 'validated',
          payload: {
            relationshipEvidence: {
              rule: 'explicit-per-item-clause',
              sourceRevision: recipe.ingredientLines[0].provenance.sourceRef,
            },
          },
        });
        expect(step.bindings[1]).toMatchObject({
          role: 'perItem',
          ingredientLineId: recipe.ingredientLines[1].id,
          validatedContentRevision: recipe.contentRevision,
          validatedTextRevision: step.textRevision,
          stepId: step.id,
          status: 'validated',
          payload: {
            dose: { amount: scalar('1', denominator), unit: { text: 'tsp', definitionId: null } },
            countBindingId: step.bindings[0].id,
            relationshipEvidence: {
              rule: 'explicit-per-item-clause',
              sourceRevision: recipe.ingredientLines[1].provenance.sourceRef,
            },
          },
        });
        expect(step.bindings[0].id).not.toBe(step.bindings[1].id);
        for (const binding of step.bindings) {
          expect(binding.payload.allocationGroup).toBeUndefined();
          expect(binding.payload.allocationGroupId).toBeUndefined();
          expect(step.text.slice(binding.span.start, binding.span.end)).toBe(
            binding.span.expectedText
          );
        }
        expect(step.bindings[1].span.expectedText).toBe(`1/${denominator} tsp`);
        expect(recipe.instructionSections[0].steps[1].bindings).toHaveLength(1);
        expect(recipe.instructionSections[0].steps[1].bindings[0].role).toBe('whole');
        expect(recipe.instructionSections[0].steps[2].text).toBe(neutral);
        expect(recipe.instructionSections[0].steps[2].bindings).toHaveLength(0);
      };
      const initial = await read();
      expect(initial).toMatchObject({
        name: photo ? 'Photo Per-item tofu' : 'Per-item tofu',
        isReady: true,
        servings: 4,
        ingredients: [`4 pieces ${tofu}`, `2 tsp ${oil}`, '100 ml sauce'],
      });
      expect(initial.sourceUrl).toBe(photo ? null : 'https://example.test/live-pasta');
      expect(initial.ingredientLines.map((row: any) => row.provenance.origin)).toEqual([
        'source',
        'source',
        'source',
      ]);
      const initialSourceRefs = initial.ingredientLines.map((row: any) => row.provenance.sourceRef);
      for (const sourceRef of initialSourceRefs) {
        expect(typeof sourceRef).toBe('string');
        expect(sourceRef.length).toBeGreaterThan(0);
      }
      expect(initial.instructionSections[0].steps[0].text).toBe(source);
      assertGraph(initial, '2');
      const first = initial.instructionSections[0].steps[0];
      const bindingIds = first.bindings.map((binding: any) => binding.id);
      const sauceId = initial.instructionSections[0].steps[1].bindings[0].id;
      const demand = async (count: string, totalOil: string) => {
        const response = await request.get(
          `${baseURL}/api/schedule?weekOffset=${week}&referenceWeekStartDate=2026-10-05`,
          { headers }
        );
        expect(response.status()).toBe(200);
        const groceries = (await response.json()).data.groceryItems;
        for (const [key, amount] of [
          [tofu, count],
          [oil, totalOil],
          ['sauce', '200'],
        ]) {
          const rows = groceries.filter((row: any) => row.normalizedKey === key);
          expect(rows).toHaveLength(1);
          expect(rows[0].recipeIds).toContain(id);
          expect(rows[0].quantity).toEqual(scalar(amount));
        }
      };
      // This existing native-fixture route invokes the real recompute service.
      // Its consumer result is separate from actual worker and DV qualification.
      const recompute = async () => {
        const response = await request.post(
          `${baseURL}/_test/fresh-url/recompute${photo ? '-photo' : ''}`,
          { headers }
        );
        expect(response.status()).toBe(200);
      };
      await demand('8', '4');
      const family = (await (await request.get(`${baseURL}/api/family`, { headers })).json()).data;
      expect(members).toHaveLength(2);
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
        const openCook = async (page: Page) => {
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
        const coherentCook = async (count: string, totalOil: string, dose: string) => {
          await expect(cook.getByTestId('cooks-mode-step-text')).toHaveText(clause(count, dose));
          await expect(cook.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
          await cook.getByTestId('cooks-mode-step-prev').click();
          await expect(sauce).toHaveAttribute('aria-checked', 'true');
          await expect(
            cook.getByTestId('ingredient-toggle').filter({ hasText: `${count} pieces ${tofu}` })
          ).toBeVisible();
          await expect(
            cook.getByTestId('ingredient-toggle').filter({ hasText: `${totalOil} tsp ${oil}` })
          ).toBeVisible();
          await cook.getByTestId('cooks-mode-step-next').click();
          await expect(cook.getByTestId('cooks-mode-step-text')).toHaveText(clause(count, dose));
        };
        await coherentCook('8', '4', '1/2');
        let lastSaved = initial;
        for (const correction of [
          {
            index: 0,
            original: '4',
            amount: '6',
            oldCount: '8',
            oldOil: '4',
            count: '12',
            totalOil: '4',
          },
          {
            index: 1,
            original: '2',
            amount: '3',
            oldCount: '12',
            oldOil: '4',
            count: '12',
            totalOil: '6',
          },
        ]) {
          await editor.goto(`/recipes?open=${id}`);
          await editor.getByTestId('action-gear-menu').click();
          await editor.getByRole('button', { name: 'Edit', exact: true }).click();
          await expect(editor.getByTestId(`recipe-edit-amount-${correction.index}`)).toHaveValue(
            correction.original
          );
          await editor
            .getByTestId(`recipe-edit-amount-${correction.index}`)
            .fill(correction.amount);
          const saving = editor.waitForResponse(
            (response) =>
              response.request().method() === 'PATCH' &&
              new URL(response.url()).pathname === `/api/recipes/${id}`
          );
          await editor.getByTestId('recipe-save-edits').click();
          const reply = await saving;
          expect(reply.status(), await reply.text()).toBe(200);
          lastSaved = (await reply.json()).recipe;
          assertGraph(lastSaved, '2');
          expect(lastSaved.ingredientLines.map((row: any) => row.provenance.sourceRef)).toEqual(
            initialSourceRefs
          );
          expect(lastSaved.instructionSections[0].steps[0].text).toBe(source);
          expect(lastSaved.instructionSections[0].steps[0].textRevision).toBe(first.textRevision);
          expect(
            lastSaved.instructionSections[0].steps[0].bindings.map((binding: any) => binding.id)
          ).toEqual(bindingIds);
          expect(lastSaved.instructionSections[0].steps[0].bindings[1].payload).toEqual(
            first.bindings[1].payload
          );
          expect(lastSaved.ingredientLines[0].amountText).toBe('6');
          expect(lastSaved.ingredientLines[1].amountText).toBe(correction.index === 0 ? '2' : '3');
          expect(lastSaved.ingredientLines[2]).toEqual(initial.ingredientLines[2]);
          expect(lastSaved.instructionSections[0].steps[1].bindings[0].id).toBe(sauceId);
          await cook.evaluate(() => window.dispatchEvent(new Event('focus')));
          await expect(cook.getByTestId('cooking-quantities-available')).toBeVisible();
          await coherentCook(correction.oldCount, correction.oldOil, '1/2');
          await cook.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
          await coherentCook(correction.count, correction.totalOil, '1/2');
          await expect(cook.getByTestId('cooking-step-uncertainty')).toHaveCount(0);
          await recompute();
          await demand(correction.count, correction.totalOil);
        }
        await openCook(editor);
        await editor.getByTestId('cooking-view-step-by-step').click();
        await editor.getByTestId('cooks-mode-step-next').click();
        await editor.getByTestId('cooks-mode-edit-step').click();
        await expect(editor.getByRole('textbox')).toHaveValue(source);
        const changed = clause('6', '1/3');
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
        assertGraph(saved, '3');
        expect(saved.ingredientLines.map((row: any) => row.provenance.sourceRef)).toEqual(
          initialSourceRefs
        );
        expect(saved.instructionSections[0].steps[0].text).toBe(changed);
        expect(saved.instructionSections[0].steps[0].textRevision).not.toBe(first.textRevision);
        for (const binding of saved.instructionSections[0].steps[0].bindings)
          expect(bindingIds).not.toContain(binding.id);
        expect(saved.instructionSections[0].steps[0].bindings[0].span.expectedText).toBe(
          '6 pieces'
        );
        expect(saved.instructionSections[0].steps[1].bindings[0].id).toBe(sauceId);
        expect(saved.ingredientLines).toEqual(lastSaved.ingredientLines);
        await expect(editor.getByTestId('cooks-mode-step-text')).toHaveText(clause('12', '1/3'));
        await cook.evaluate(() => window.dispatchEvent(new Event('focus')));
        await expect(cook.getByTestId('cooking-quantities-available')).toBeVisible();
        await coherentCook('12', '6', '1/2');
        await cook.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
        await coherentCook('12', '6', '1/3');
        await expect(cook.getByTestId('cooking-step-uncertainty')).toHaveCount(0);
        await cook.getByTestId('cooking-view-all-steps').click();
        await expect(cook.getByTestId('cooks-mode-instructions')).toContainText(
          clause('12', '1/3')
        );
        await expect(cook.getByTestId('cooks-mode-instructions')).toContainText(
          'Add all 200 ml sauce.'
        );
        await expect(cook.getByTestId('cooks-mode-instructions')).toContainText(neutral);
        await cook.getByRole('button', { name: 'Ingredients', exact: true }).click();
        await expect(sauce).toHaveAttribute('aria-checked', 'true');
        await expect(
          cook.getByTestId('ingredient-toggle').filter({ hasText: `12 pieces ${tofu}` })
        ).toBeVisible();
        await expect(
          cook.getByTestId('ingredient-toggle').filter({ hasText: `6 tsp ${oil}` })
        ).toBeVisible();
        await cook.getByRole('button', { name: 'Resume steps', exact: true }).click();
        await expect(cook.getByTestId('cooks-mode-instructions')).toContainText(
          clause('12', '1/3')
        );
        await cook.getByTestId('cooking-view-step-by-step').click();
        await expect(cook.getByTestId('cooks-mode-step-text')).toHaveText(clause('12', '1/3'));
        await cook
          .getByTestId('cooks-mode-instructions')
          .screenshot({ path: info.outputPath('per-item-refreshed.png'), animations: 'disabled' });
        await recompute();
        await demand('12', '6');
        const final = await read();
        assertGraph(final, '3');
        expect(final.ingredientLines.map((row: any) => row.amountText)).toEqual(['6', '3', '100']);
        expect(final.instructionSections[0].steps[0].text).toBe(changed);
        expect(final.ingredientLines.map((row: any) => row.provenance.sourceRef)).toEqual(
          initialSourceRefs
        );
        expect(final.instructionSections[0].steps[1].bindings[0].id).toBe(sauceId);
      } finally {
        await Promise.all(contexts.map((context) => context.close()));
      }
    });
  }
}
