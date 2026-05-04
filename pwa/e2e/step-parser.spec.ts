// BUG CONDITION EXPLORATION TEST
//
// Investigation finding: TypeScript's structural subtyping means HowToSection[] IS assignable
// to Array<{ name?: string; text?: string }> — the `name` property satisfies `name?: string`
// and extra properties (`@type`, `itemListElement`) are allowed. So NO TypeScript compile error
// occurs when the `as any` cast is removed.
//
// The actual bug condition is a type-level representation gap:
//   - `Recipe.recipeInstructions` is typed as `string[] | Array<{ name?: string; text?: string }>`
//   - At runtime, `unwrapUntypedNode` produces a `HowToSection[]` value
//   - The declared type does NOT include `HowToSection[]`, so the type system cannot express
//     or validate the actual runtime shape — it relies on `any` from `unwrapUntypedNode`
//   - The `parseRecipeSteps` parameter type is equally narrow, but structural subtyping
//     means TypeScript accepts the call without error
//
// The fix is to widen both types to `unknown[]` so the type system honestly represents
// the opaque JSON data from the API (see design.md).
//
// Counterexample (runtime, not compile-time):
//   The original test used `as any` as a workaround — not because TypeScript required it,
//   but because the author knew the type was wrong. Removing `as any` compiles fine,
//   and the runtime logic already handles HowToSection[] correctly via isHowToSection.

import { test, expect } from '@playwright/test';
import * as fc from 'fast-check';
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
    const result = parseRecipeSteps(input);
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

  // Bug condition exploration: real recipe shape from
  // data/recipes/3fe040b3-29e8-4e26-90b6-1401c0bf3d03/recipe.json
  // 3 HowToSection objects → 8 HowToStep entries total.
  // Validates that parseRecipeSteps handles the real HowToSection[] shape correctly.
  // The type fix (unknown[]) makes the type system honest about what the API actually returns.
  test('parses real HowToSection[] recipe — 3 sections, 8 steps (bug condition)', () => {
    const input = [
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
    ];
    const result = parseRecipeSteps(input);
    expect(result.length).toBe(8);
  });
});

// ── Preservation Property Tests ──────────────────────────────────────────────
//
// These tests run on UNFIXED code and must PASS — they document the baseline
// behavior that the fix must preserve for all non-HowToSection inputs.
//
// Validates: Requirements 3.1, 3.2, 3.3

test.describe('Step Parser — Preservation Properties', () => {
  // Property 1: String array preservation
  // For all non-empty string[] inputs, parseRecipeSteps returns exactly as many
  // steps as there are non-empty trimmed strings.
  // Validates: Requirements 3.1
  test('string array: step count equals number of non-empty trimmed strings', () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { minLength: 1 }), (strings) => {
        const nonEmpty = strings.filter((s) => s.trim().length > 0);
        const result = parseRecipeSteps(strings);
        return result.length === nonEmpty.length;
      })
    );
  });

  // Property 2: Flat HowToStep preservation
  // For all Array<{ name?: string; text?: string }> inputs (no itemListElement),
  // parseRecipeSteps returns exactly as many steps as there are entries with
  // non-empty text or name.
  // Validates: Requirements 3.2
  test('flat HowToStep array: step count equals entries with non-empty text or name', () => {
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

  // Property 3: Empty/undefined preservation
  // parseRecipeSteps([]) and parseRecipeSteps(undefined) always return [].
  // Validates: Requirements 3.3
  test('empty array and undefined always return []', () => {
    expect(parseRecipeSteps([])).toEqual([]);
    expect(parseRecipeSteps(undefined)).toEqual([]);
  });
});
