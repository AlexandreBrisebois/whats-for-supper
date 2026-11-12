import { describe, expect, it } from 'vitest';
import type { RecipeIngredientLine } from '@/lib/api/generated/models';
import { ingredientDraft, prepareIngredientDrafts } from './ingredient-draft';
import { parseIngredientAmount } from './ingredient-amount';

const saved = () =>
  ingredientDraft({
    id: 'a522de35-320f-4577-b143-24735337f98f',
    description: 'tomatoes',
    amount: parseIngredientAmount('2'),
    amountText: '2',
    unit: { text: 'cans', definitionId: null },
    scaling: 'proportional',
    shopping: { name: 'tomatoes', foodId: null, mappingRevision: null },
    packageEscaped: {
      countUnit: { text: 'cans', definitionId: null },
      capacity: {
        amount: parseIngredientAmount('400'),
        unit: { text: 'g', definitionId: null },
      },
      basis: 'net',
    },
  } as RecipeIngredientLine);

describe('explicit package drafts', () => {
  it('creates declared package facts without parsing ingredient prose', () => {
    const draft = {
      ...ingredientDraft(),
      description: 'tomatoes',
      amount: '2',
      unit: 'cans',
      packageEnabled: true,
      packageCountUnit: 'cans',
      packageCapacityAmount: '400',
      packageCapacityUnit: 'g',
      packageBasis: 'net' as const,
    };
    const result = prepareIngredientDrafts([draft]);
    expect(result.invalid).toBe(false);
    expect(result.lines[0].packageEscaped).toEqual({
      countUnit: { text: 'cans', definitionId: null },
      capacity: {
        amount: parseIngredientAmount('400'),
        unit: { text: 'g', definitionId: null },
      },
      basis: 'net',
    });
    expect(
      prepareIngredientDrafts([{ ...ingredientDraft(), description: 'Two 400 g cans' }]).lines[0]
        .packageEscaped
    ).toBeNull();
  });
  it('reopens, edits and explicitly clears a saved package', () => {
    expect(saved()).toMatchObject({
      packageEnabled: true,
      packageCountUnit: 'cans',
      packageCapacityAmount: '400',
      packageCapacityUnit: 'g',
      packageBasis: 'net',
    });
    const edited = prepareIngredientDrafts([
      { ...saved(), packageCapacityAmount: '1/3', packageBasis: 'drained' as const },
    ]);
    expect(edited.lines[0].packageEscaped).toMatchObject({
      capacity: { amount: parseIngredientAmount('1/3') },
      basis: 'drained',
    });
    expect(
      prepareIngredientDrafts([{ ...saved(), packageEnabled: false }]).lines[0].packageEscaped
    ).toBeNull();
  });
  it('keeps the declared package label when the independently nullable ingredient unit is cleared', () => {
    const result = prepareIngredientDrafts([{ ...saved(), unit: '' }]);
    expect(result.invalid).toBe(false);
    expect(result.lines[0].unit).toBeNull();
    expect(result.lines[0].packageEscaped?.countUnit).toEqual({ text: 'cans', definitionId: null });
  });
  it('keeps a package-only partial row invalid instead of silently dropping its declaration', () => {
    const result = prepareIngredientDrafts([
      {
        ...ingredientDraft(),
        packageEnabled: true,
        packageCountUnit: 'cans',
        packageCapacityAmount: '400',
        packageCapacityUnit: 'g',
        packageBasis: 'net' as const,
      },
    ]);
    expect(result.invalid).toBe(true);
    expect(result.lines).toHaveLength(1);
  });
  it.each(['0', '1/3', '300–400'])(
    'retains the contracted exact capacity %s',
    (packageCapacityAmount) => {
      const result = prepareIngredientDrafts([{ ...saved(), packageCapacityAmount }]);
      expect(result.invalid).toBe(false);
      expect(result.lines[0].packageEscaped?.capacity?.amount).toEqual(
        parseIngredientAmount(packageCapacityAmount)
      );
      expect(result.lines[0].amount).toEqual(parseIngredientAmount('2'));
    }
  );
  it.each([
    { packageCapacityAmount: '' },
    { packageCapacityAmount: '1/0' },
    { packageCapacityUnit: '' },
    { packageCountUnit: '' },
  ])('retains an incomplete or invalid package draft for correction: %j', (patch) => {
    expect(prepareIngredientDrafts([{ ...saved(), ...patch }]).invalid).toBe(true);
  });
  it('retains same-path definitions and clears a definition when that literal label changes', () => {
    const row = saved();
    row.source.packageEscaped!.capacity!.unit = { text: 'g', definitionId: 'saved-mass-gram' };
    expect(prepareIngredientDrafts([row]).lines[0].packageEscaped?.capacity?.unit).toEqual({
      text: 'g',
      definitionId: 'saved-mass-gram',
    });
    expect(
      prepareIngredientDrafts([{ ...row, packageCapacityUnit: 'ml' }]).lines[0].packageEscaped
        ?.capacity?.unit
    ).toEqual({ text: 'ml', definitionId: null });
  });
});
