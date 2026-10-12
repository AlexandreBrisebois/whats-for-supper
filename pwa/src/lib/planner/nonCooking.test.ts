import { describe, it, expect } from 'vitest';
import { nonCookingLabel } from './nonCooking';

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
