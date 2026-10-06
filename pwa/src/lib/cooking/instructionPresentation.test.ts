import { describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { formatCookingInstruction } from './instructionPresentation';

describe('scan-friendly instruction presentation', () => {
  it('preserves arbitrary extraction text exactly', () => {
    fc.assert(fc.property(fc.string(), (text) => formatCookingInstruction(text).join('') === text));
  });
  it.each([
    'Verser 60 ml (1/4 tasse). Cuire 1 minute, puis 30 secondes.',
    'Use 1.5 cups. Heat to 200°C (400°F). Cook for 5–8 minutes.',
    'Ajouter 1,5 l et ½ tasse. Remuer doucement.',
    'First line\nSecond line\n\nKeep every warning!',
    'No punctuation or measurements',
    '温める。よく混ぜる。',
    'Bake at 180°C until golden; do not leave unattended.',
  ])('preserves all source text: %s', (text) => {
    const formatted = formatCookingInstruction(text);
    expect(formatted.join('')).toBe(text);
  });

  it('separates sentences without splitting decimal quantities or temperatures', () => {
    const result = formatCookingInstruction('Use 1.5 cups. Heat to 200°C. Wait 30 seconds.');
    expect(result).toHaveLength(3);
    expect(result).toEqual(['Use 1.5 cups. ', 'Heat to 200°C. ', 'Wait 30 seconds.']);
  });

  it('keeps the complete instruction when sentence segmentation is unavailable', () => {
    vi.stubGlobal('Intl', { ...Intl, Segmenter: undefined });
    try {
      expect(formatCookingInstruction('Use 60 ml. Stir gently.').join('')).toBe(
        'Use 60 ml. Stir gently.'
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
