// Feature: grocery-section-categorization
// Task 7.4: Make AISLE_ORDER configurable via environment variable

import type { GrocerySection } from './aisleMapper';

/**
 * All valid GrocerySection values. Used to validate entries from the env var.
 */
const VALID_SECTIONS: readonly GrocerySection[] = [
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

/**
 * The hardcoded default aisle order, used when NEXT_PUBLIC_AISLE_ORDER is not set
 * or contains unrecognised section names.
 */
export const DEFAULT_AISLE_ORDER: GrocerySection[] = [
  'Produce',
  'Deli',
  'Bakery',
  'Meat',
  'Seafood',
  'Dairy & Eggs',
  'Frozen',
  'Pantry',
  'Beverages',
  'Grocery',
];

function isValidSection(value: string): value is GrocerySection {
  return (VALID_SECTIONS as readonly string[]).includes(value);
}

/**
 * Parses the NEXT_PUBLIC_AISLE_ORDER environment variable.
 *
 * - If the env var is not set or is empty, returns the default order.
 * - If the env var contains any unrecognised section name, discards the entire
 *   value, emits a console.warn, and returns the default order.
 * - Otherwise returns the parsed order.
 */
function parseAisleOrder(): GrocerySection[] {
  const raw = process.env.NEXT_PUBLIC_AISLE_ORDER;

  if (!raw || raw.trim() === '') {
    return DEFAULT_AISLE_ORDER;
  }

  const entries = raw.split(',').map((s) => s.trim());
  const invalid = entries.filter((entry) => !isValidSection(entry));

  if (invalid.length > 0) {
    console.warn(
      `[aisleOrder] NEXT_PUBLIC_AISLE_ORDER contains unrecognised section(s): ${invalid.map((s) => JSON.stringify(s)).join(', ')}. ` +
        `Falling back to the default order. Valid sections are: ${VALID_SECTIONS.join(', ')}.`
    );
    return DEFAULT_AISLE_ORDER;
  }

  return entries as GrocerySection[];
}

/**
 * The display order for grocery sections.
 *
 * Configurable via the NEXT_PUBLIC_AISLE_ORDER environment variable as a
 * comma-separated list of GrocerySection names, e.g.:
 *   NEXT_PUBLIC_AISLE_ORDER="Produce,Deli,Bakery,Meat,Seafood,Dairy & Eggs,Frozen,Pantry,Beverages,Grocery"
 *
 * If the env var is absent, empty, or contains any unrecognised section name,
 * the hardcoded DEFAULT_AISLE_ORDER is used instead.
 */
export const AISLE_ORDER: GrocerySection[] = parseAisleOrder();
