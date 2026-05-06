import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as aisleMapperModule from './aisleMapper';
import { mapIngredientToSection } from './aisleMapper';
import type { GrocerySection } from './aisleMapper';

// All valid GrocerySection values
const GROCERY_SECTIONS: GrocerySection[] = [
  'Produce',
  'Meat',
  'Seafood',
  'Dairy & Eggs',
  'Frozen',
  'Bakery',
  'Pantry',
  'Beverages',
  'Deli',
  'Grocery',
];

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

describe('mapIngredientToSection — property tests', () => {
  // Feature: grocery-section-categorization, Property 1: closed-set section assignment
  it('P1: returns a value in the GrocerySection union for any string input', () => {
    fc.assert(
      fc.property(fc.string(), (name) => {
        const result = mapIngredientToSection(name);
        expect(GROCERY_SECTIONS).toContain(result);
      }),
      { numRuns: 200 }
    );
  });

  // Feature: grocery-section-categorization, Property 2: idempotence of section mapping
  it('P2: calling twice with the same input returns the same result', () => {
    fc.assert(
      fc.property(fc.string(), (name) => {
        const first = mapIngredientToSection(name);
        const second = mapIngredientToSection(name);
        expect(first).toBe(second);
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Unit Tests — one example per section
// ---------------------------------------------------------------------------

describe('mapIngredientToSection — unit tests', () => {
  it('assigns "tomato" to Produce', () => {
    expect(mapIngredientToSection('tomato')).toBe('Produce');
  });

  it('assigns "chicken breast" to Meat', () => {
    expect(mapIngredientToSection('chicken breast')).toBe('Meat');
  });

  it('assigns "salmon" to Seafood', () => {
    expect(mapIngredientToSection('salmon')).toBe('Seafood');
  });

  it('assigns "milk" to Dairy & Eggs', () => {
    expect(mapIngredientToSection('milk')).toBe('Dairy & Eggs');
  });

  it('assigns "frozen peas" to Frozen', () => {
    expect(mapIngredientToSection('frozen peas')).toBe('Frozen');
  });

  it('assigns "bread" to Bakery', () => {
    expect(mapIngredientToSection('bread')).toBe('Bakery');
  });

  it('assigns "olive oil" to Pantry', () => {
    expect(mapIngredientToSection('olive oil')).toBe('Pantry');
  });

  it('assigns "coffee" to Beverages', () => {
    expect(mapIngredientToSection('coffee')).toBe('Beverages');
  });

  it('assigns "salami" to Deli', () => {
    expect(mapIngredientToSection('salami')).toBe('Deli');
  });

  it('assigns "xyzzy" to Grocery (fallback)', () => {
    expect(mapIngredientToSection('xyzzy')).toBe('Grocery');
  });

  it('assigns empty string to Grocery (fallback)', () => {
    expect(mapIngredientToSection('')).toBe('Grocery');
  });
});

// ---------------------------------------------------------------------------
// Backward-compatibility check — old 5-section names must NOT be exported
// ---------------------------------------------------------------------------

describe('backward-compatibility — old exports removed', () => {
  it('does not export AisleSection type (no runtime value)', () => {
    // AisleSection was a type-only export — types are erased at runtime,
    // so we verify the module has no runtime property named 'AisleSection'.
    expect(aisleMapperModule).not.toHaveProperty('AisleSection');
  });

  it('does not export mapIngredientToAisle function', () => {
    expect(aisleMapperModule).not.toHaveProperty('mapIngredientToAisle');
  });

  it('does not export groupIngredientsByAisle function', () => {
    expect(aisleMapperModule).not.toHaveProperty('groupIngredientsByAisle');
  });
});
