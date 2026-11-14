import { describe, expect, it } from 'vitest';
import { ingredientProjectionText } from './ingredient-presentation';

describe('server-owned package presentation', () => {
  it('uses the exact server presentation instead of dropping fixed capacity or rounding the count', () => {
    expect(
      ingredientProjectionText({
        originalText: '2 cans tomatoes (400 g / cans; net)',
        displayText: '1/3 cans tomatoes (400 g / cans; net)',
        quantity: 1 / 3,
        unitText: 'cans',
        name: 'tomatoes',
        status: 'scaled',
      } as Parameters<typeof ingredientProjectionText>[0] & { displayText: string })
    ).toBe('1/3 cans tomatoes (400 g / cans; net)');
  });
  it('keeps the existing presentation fallback for a line without derived text', () => {
    expect(
      ingredientProjectionText({
        originalText: '200 g pasta',
        quantity: 400,
        unitText: 'g',
        name: 'pasta',
        status: 'scaled',
      })
    ).toBe('400 g pasta');
    expect(
      ingredientProjectionText({ originalText: 'Fresh basil leaves', status: 'unquantified' })
    ).toBe('Fresh basil leaves');
  });
});
