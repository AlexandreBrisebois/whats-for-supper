import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { formatCookingInstruction } from './instructionPresentation';

describe('cookbook instruction paragraphs', () => {
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

  it('keeps related sentences together, including decimal quantities', () => {
    const text = 'Use 1.5 cups. Heat to 200°C. Wait 30 seconds.';
    expect(formatCookingInstruction(text)).toEqual([text]);
  });

  it('preserves explicit paragraph breaks without treating every line as a paragraph', () => {
    const text = 'Fill the pita. Add lemon.\nContinue assembling.\n\nMake a salad. Serve together.';
    expect(formatCookingInstruction(text)).toEqual([
      'Fill the pita. Add lemon.\nContinue assembling.\n\n',
      'Make a salad. Serve together.',
    ]);
  });

  it('preserves Windows paragraph breaks and whitespace exactly', () => {
    expect(formatCookingInstruction('Cook.\r\n \r\nServe.')).toEqual(['Cook.\r\n \r\n', 'Serve.']);
  });
});
