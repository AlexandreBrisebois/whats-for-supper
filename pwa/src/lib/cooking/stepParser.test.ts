import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseRecipeSteps } from './stepParser';
import { builders } from '../../testing/builders';

describe('Step Parser Logic', () => {
  it('handles flat string array', () => {
    const input = ['Chop onions', 'Sauté until golden'];
    const result = parseRecipeSteps(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      index: 1,
      title: 'Step 1',
      instruction: 'Chop onions',
    });
  });

  it('handles flat HowToStep array', () => {
    const input = [{ name: 'Prep', text: 'Chop onions' }, { text: 'Sauté until golden' }];
    const result = parseRecipeSteps(input);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Prep');
    expect(result[1].title).toBe('Step 2');
    expect(result[1].instruction).toBe('Sauté until golden');
  });

  it('handles HowToSection array (Issue 1)', () => {
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
    const result = parseRecipeSteps(input);
    expect(result).toHaveLength(3);

    // Preparation is generic (see GENERIC_SECTION_NAMES), so no prefix
    expect(result[0].instruction).toBe('Chop the onions');

    // Cooking is NOT generic, so it adds a prefix
    expect(result[2].instruction).toBe('Cooking: Sauté onions and garlic');
  });

  it('handles empty or null input', () => {
    expect(parseRecipeSteps([])).toHaveLength(0);
    expect(parseRecipeSteps(undefined)).toHaveLength(0);
  });

  it('parses real HowToSection[] recipe — 3 sections, 8 steps (bug condition)', () => {
    const recipe = builders.recipe({
      recipeInstructions: [
        {
          '@type': 'HowToSection',
          name: 'Spaghetti Preparation',
          itemListElement: [
            {
              '@type': 'HowToStep',
              text: 'Bring a large pot of salted water to a boil and cook the spaghetti according to package instructions until al dente.',
            },
            {
              '@type': 'HowToStep',
              text: 'While the pasta cooks, warm the marinara sauce in a large skillet over medium heat.',
            },
            {
              '@type': 'HowToStep',
              text: 'Drain the spaghetti and toss it directly into the skillet with the sauce until well coated.',
            },
          ],
        },
        {
          '@type': 'HowToSection',
          name: 'Garlic Bread Preparation',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Preheat your oven to 200°C (400°F).' },
            {
              '@type': 'HowToStep',
              text: 'In a small bowl, mix the softened butter with minced garlic and dried oregano.',
            },
            {
              '@type': 'HowToStep',
              text: 'Slice the bread into thick rounds or lengthwise, and spread the garlic butter generously over the cut sides.',
            },
            {
              '@type': 'HowToStep',
              text: 'Place the bread on a baking sheet and toast in the oven for 5 to 8 minutes until the edges are golden brown and crispy.',
            },
          ],
        },
        {
          '@type': 'HowToSection',
          name: 'Serving',
          itemListElement: [
            {
              '@type': 'HowToStep',
              text: 'Serve the hot spaghetti in bowls topped with parmesan cheese, with the warm garlic bread on the side.',
            },
          ],
        },
      ] as any,
    });
    const result = parseRecipeSteps(recipe.recipeInstructions);
    expect(result.length).toBe(8);
  });
});

describe('Step Parser — Preservation Properties', () => {
  it('string array: step count equals number of non-empty trimmed strings', () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { minLength: 1 }), (strings) => {
        const nonEmpty = strings.filter((s) => s.trim().length > 0);
        const result = parseRecipeSteps(strings);
        return result.length === nonEmpty.length;
      })
    );
  });

  it('flat HowToStep array: step count equals entries with non-empty text or name', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.option(fc.string()),
            text: fc.option(fc.string()),
          }),
          { minLength: 1 }
        ),
        (items) => {
          const withContent = items.filter((item) => {
            const text = item.text?.trim() ?? '';
            const name = item.name?.trim() ?? '';
            return text.length > 0 || name.length > 0;
          });
          const result = parseRecipeSteps(items);
          return result.length === withContent.length;
        }
      )
    );
  });

  it('empty array and undefined always return []', () => {
    expect(parseRecipeSteps([])).toEqual([]);
    expect(parseRecipeSteps(undefined)).toEqual([]);
  });
});
