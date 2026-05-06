// Feature: grocery-section-categorization
// Task 7.4: Unit tests for aisleOrder.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('aisleOrder', () => {
  const originalEnv = process.env.NEXT_PUBLIC_AISLE_ORDER;

  beforeEach(() => {
    // Clear module cache to force re-evaluation of the module with new env vars
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env var
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_AISLE_ORDER;
    } else {
      process.env.NEXT_PUBLIC_AISLE_ORDER = originalEnv;
    }
  });

  it('returns the default order when NEXT_PUBLIC_AISLE_ORDER is not set', async () => {
    delete process.env.NEXT_PUBLIC_AISLE_ORDER;
    const { AISLE_ORDER, DEFAULT_AISLE_ORDER } = await import('./aisleOrder');
    expect(AISLE_ORDER).toEqual(DEFAULT_AISLE_ORDER);
  });

  it('returns the default order when NEXT_PUBLIC_AISLE_ORDER is empty', async () => {
    process.env.NEXT_PUBLIC_AISLE_ORDER = '';
    const { AISLE_ORDER, DEFAULT_AISLE_ORDER } = await import('./aisleOrder');
    expect(AISLE_ORDER).toEqual(DEFAULT_AISLE_ORDER);
  });

  it('returns the default order when NEXT_PUBLIC_AISLE_ORDER is whitespace-only', async () => {
    process.env.NEXT_PUBLIC_AISLE_ORDER = '   ';
    const { AISLE_ORDER, DEFAULT_AISLE_ORDER } = await import('./aisleOrder');
    expect(AISLE_ORDER).toEqual(DEFAULT_AISLE_ORDER);
  });

  it('returns the parsed order when NEXT_PUBLIC_AISLE_ORDER is valid', async () => {
    process.env.NEXT_PUBLIC_AISLE_ORDER =
      'Produce,Meat,Dairy & Eggs,Frozen,Bakery,Pantry,Beverages,Deli,Seafood,Grocery';
    const { AISLE_ORDER } = await import('./aisleOrder');
    expect(AISLE_ORDER).toEqual([
      'Produce',
      'Meat',
      'Dairy & Eggs',
      'Frozen',
      'Bakery',
      'Pantry',
      'Beverages',
      'Deli',
      'Seafood',
      'Grocery',
    ]);
  });

  it('returns the parsed order when NEXT_PUBLIC_AISLE_ORDER has extra whitespace', async () => {
    process.env.NEXT_PUBLIC_AISLE_ORDER = ' Produce , Meat , Dairy & Eggs ';
    const { AISLE_ORDER } = await import('./aisleOrder');
    expect(AISLE_ORDER).toEqual(['Produce', 'Meat', 'Dairy & Eggs']);
  });

  it('falls back to default and warns when NEXT_PUBLIC_AISLE_ORDER contains one unknown section', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.NEXT_PUBLIC_AISLE_ORDER = 'Produce,UnknownSection,Meat';
    const { AISLE_ORDER, DEFAULT_AISLE_ORDER } = await import('./aisleOrder');
    expect(AISLE_ORDER).toEqual(DEFAULT_AISLE_ORDER);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'NEXT_PUBLIC_AISLE_ORDER contains unrecognised section(s): "UnknownSection"'
      )
    );
    consoleWarnSpy.mockRestore();
  });

  it('falls back to default and warns when NEXT_PUBLIC_AISLE_ORDER contains multiple unknown sections', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.NEXT_PUBLIC_AISLE_ORDER = 'Produce,BadSection1,Meat,BadSection2';
    const { AISLE_ORDER, DEFAULT_AISLE_ORDER } = await import('./aisleOrder');
    expect(AISLE_ORDER).toEqual(DEFAULT_AISLE_ORDER);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'NEXT_PUBLIC_AISLE_ORDER contains unrecognised section(s): "BadSection1", "BadSection2"'
      )
    );
    consoleWarnSpy.mockRestore();
  });

  it('falls back to default and warns when NEXT_PUBLIC_AISLE_ORDER is entirely invalid', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.NEXT_PUBLIC_AISLE_ORDER = 'InvalidSection1,InvalidSection2';
    const { AISLE_ORDER, DEFAULT_AISLE_ORDER } = await import('./aisleOrder');
    expect(AISLE_ORDER).toEqual(DEFAULT_AISLE_ORDER);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('NEXT_PUBLIC_AISLE_ORDER contains unrecognised section(s)')
    );
    consoleWarnSpy.mockRestore();
  });

  it('accepts a partial list of valid sections', async () => {
    process.env.NEXT_PUBLIC_AISLE_ORDER = 'Produce,Meat,Pantry';
    const { AISLE_ORDER } = await import('./aisleOrder');
    expect(AISLE_ORDER).toEqual(['Produce', 'Meat', 'Pantry']);
  });

  it('accepts all valid sections in a custom order', async () => {
    process.env.NEXT_PUBLIC_AISLE_ORDER =
      'Grocery,Beverages,Pantry,Frozen,Dairy & Eggs,Seafood,Meat,Bakery,Deli,Produce';
    const { AISLE_ORDER } = await import('./aisleOrder');
    expect(AISLE_ORDER).toEqual([
      'Grocery',
      'Beverages',
      'Pantry',
      'Frozen',
      'Dairy & Eggs',
      'Seafood',
      'Meat',
      'Bakery',
      'Deli',
      'Produce',
    ]);
  });
});
