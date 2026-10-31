import { describe, it, expect } from 'vitest';
import { nonCookingLabel, nonCookingNote } from './nonCooking';

describe('Mystery night display', () => {
  it('shows the localized preset instead of falling back to Ordering In', () => {
    expect(nonCookingLabel({ kind: 'mystery', customLabel: null })).toBe('Mystery night');
    localStorage.setItem('locale', 'fr');
    try {
      expect(nonCookingLabel({ kind: 'mystery' })).toBe('Souper mystère');
    } finally {
      localStorage.removeItem('locale');
    }
  });
});

it('localizes Take Out and the legacy fallback without rewriting a user note', () => {
  const plan = { kind: 'order_in' as const, customLabel: 'Order In with Grandma' };
  expect(nonCookingLabel(plan)).toBe('Take Out');
  expect(nonCookingLabel(null)).toBe('Take Out');
  expect(nonCookingNote(plan)).toBe('Order In with Grandma');
  localStorage.setItem('locale', 'fr');
  try {
    expect(nonCookingLabel(plan)).toBe('À emporter');
    expect(nonCookingLabel(null)).toBe('À emporter');
    expect(nonCookingNote(plan)).toBe('Order In with Grandma');
  } finally {
    localStorage.removeItem('locale');
  }
});
