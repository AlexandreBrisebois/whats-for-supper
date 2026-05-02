import { test, expect } from '@playwright/test';
import { parseRecipeSteps } from '../src/lib/cooking/stepParser';

test.describe('Step Parser Logic', () => {
  test('handles flat string array', () => {
    const input = ['Chop onions', 'Sauté until golden'];
    const result = parseRecipeSteps(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      index: 1,
      title: 'Step 1',
      instruction: 'Chop onions',
    });
  });

  test('handles flat HowToStep array', () => {
    const input = [{ name: 'Prep', text: 'Chop onions' }, { text: 'Sauté until golden' }];
    const result = parseRecipeSteps(input);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Prep');
    expect(result[1].title).toBe('Step 2');
    expect(result[1].instruction).toBe('Sauté until golden');
  });

  test('handles HowToSection array (Issue 1)', () => {
    const input = [
      {
        '@type': 'HowToSection',
        name: 'Preparation',
        itemListElement: [
          { '@type': 'HowToStep', text: 'Chop the onions' },
          { '@type': 'HowToStep', text: 'Mince the garlic' },
        ],
      },
      {
        '@type': 'HowToSection',
        name: 'Cooking',
        itemListElement: [{ '@type': 'HowToStep', text: 'Sauté onions and garlic' }],
      },
    ];
    const result = parseRecipeSteps(input as any);
    expect(result).toHaveLength(3);

    // Preparation is generic (see GENERIC_SECTION_NAMES), so no prefix
    expect(result[0].instruction).toBe('Chop the onions');

    // Cooking is NOT generic, so it adds a prefix
    expect(result[2].instruction).toBe('Cooking: Sauté onions and garlic');
  });

  test('handles empty or null input', () => {
    expect(parseRecipeSteps([])).toHaveLength(0);
    expect(parseRecipeSteps(undefined)).toHaveLength(0);
  });
});
