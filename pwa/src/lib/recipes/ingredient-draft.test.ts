import { describe, expect, it } from 'vitest';
import { ingredientDraft, prepareIngredientDrafts } from './ingredient-draft';
import { parseIngredientAmount } from './ingredient-amount';

describe('exact original amount drafts', () => {
  it.each(['0', '⅓', '1/3', '2 ½', '0,5', '2–3', '9007199254740993'])(
    'retains exact valid notation %s',
    (notation) => {
      const row = { ...ingredientDraft(), description: 'pasta', amount: notation };
      const result = prepareIngredientDrafts([row]);
      expect(result.invalid).toBe(false);
      expect(result.lines[0].amountText).toBe(notation);
      expect(result.lines[0].amount).toEqual(parseIngredientAmount(notation));
    }
  );
  it.each([
    '-1',
    '1/0',
    '1,000',
    'NaN',
    '1e3',
    '3–2',
    '1-2-3',
    '999999999999999999999999999999999999999',
  ])('rejects invalid %s', (amount) => {
    expect(
      prepareIngredientDrafts([{ ...ingredientDraft(), description: 'pasta', amount }]).invalid
    ).toBe(true);
  });
  it('keeps independently unknown amount/unit and requires a description on a partial row', () => {
    const row = { ...ingredientDraft(), description: 'Fresh basil leaves' };
    expect(prepareIngredientDrafts([row]).lines[0]).toMatchObject({
      amount: null,
      amountText: null,
      unit: null,
    });
    expect(prepareIngredientDrafts([{ ...row, unit: 'tsp' }]).lines[0]).toMatchObject({
      amount: null,
      unit: { text: 'tsp', definitionId: null },
    });
    expect(prepareIngredientDrafts([{ ...row, description: '', amount: '1' }]).invalid).toBe(true);
    expect(prepareIngredientDrafts([ingredientDraft()]).lines).toEqual([]);
  });
});
