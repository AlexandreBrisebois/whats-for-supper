import type { Locator, Page } from '@playwright/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const playwrightExpectCalls = vi.hoisted(() => {
  const records: Array<{ target: unknown; assertion: string; args: unknown[] }> = [];
  const expectFn = vi.fn((target: unknown) => ({
    toBeVisible: vi.fn(async () => {
      records.push({ target, assertion: 'toBeVisible', args: [] });
    }),
    toHaveAttribute: vi.fn(async (...args: unknown[]) => {
      records.push({ target, assertion: 'toHaveAttribute', args });
    }),
    toHaveCSS: vi.fn(async (...args: unknown[]) => {
      records.push({ target, assertion: 'toHaveCSS', args });
    }),
    toHaveCount: vi.fn(async (...args: unknown[]) => {
      records.push({ target, assertion: 'toHaveCount', args });
    }),
  }));
  return { records, expectFn };
});

vi.mock('@playwright/test', () => ({
  expect: playwrightExpectCalls.expectFn,
}));

import {
  LANDMARK_NAMES,
  LANDMARK_TEST_IDS,
  cooksModeOverlay,
  expectCooksModeClosed,
  expectCooksModeOpen,
  expectPlanningDayChooserClosed,
  expectPlanningDayChooserOpen,
  expectPrimaryNavigation,
  expectRecipeDetailSheetClosed,
  expectRecipeDetailSheetOpen,
  expectRecipeFiltersSheetClosed,
  expectRecipeFiltersSheetOpen,
  expectSkipRecoveryDialogClosed,
  expectSkipRecoveryDialogOpen,
  planningDayChooser,
  primaryNavLink,
  primaryNavigation,
  recipeDetailSheet,
  recipeFiltersSheet,
  skipRecoveryDialog,
} from '../../e2e/helpers/landmarks';

interface FakeLocator {
  expr: string;
  and: (other: FakeLocator) => FakeLocator;
  filter: (opts: { has: FakeLocator }) => FakeLocator;
  getByRole: (role: string, opts?: Record<string, unknown>) => FakeLocator;
  getByTestId: (testId: string) => FakeLocator;
}

function makeLocator(expr: string): FakeLocator {
  return {
    expr,
    and: (other) => makeLocator(`${expr} && ${other.expr}`),
    filter: ({ has }) => makeLocator(`${expr}[has=${has.expr}]`),
    getByRole: (role, opts) => makeLocator(`${expr} >> role=${role}${formatOpts(opts)}`),
    getByTestId: (testId) => makeLocator(`${expr} >> testid=${testId}`),
  };
}

function formatOpts(opts?: Record<string, unknown>): string {
  if (!opts) return '';
  const entries = Object.entries(opts).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return '';
  return `(${entries.map(([k, v]) => `${k}:${String(v)}`).join(',')})`;
}

function createFakePage(): Page {
  const root = {
    getByRole: (role: string, opts?: Record<string, unknown>) =>
      makeLocator(`role=${role}${formatOpts(opts)}`),
    getByTestId: (testId: string) => makeLocator(`testid=${testId}`),
  };
  return root as unknown as Page;
}

function exprOf(locator: Locator): string {
  return (locator as unknown as FakeLocator).expr;
}

describe('Playwright landmark & dialog helpers', () => {
  beforeEach(() => {
    playwrightExpectCalls.records.length = 0;
    playwrightExpectCalls.expectFn.mockClear();
  });

  it('composes semantic navigation and destination link locators with canonical testids', () => {
    const page = createFakePage();

    expect(exprOf(primaryNavigation(page))).toBe(
      `role=navigation && testid=${LANDMARK_TEST_IDS.primaryNavigation}`
    );
    expect(exprOf(primaryNavigation(page, { name: "Jordan's turn" }))).toBe(
      `role=navigation(name:Jordan's turn) && testid=${LANDMARK_TEST_IDS.primaryNavigation}`
    );
    expect(exprOf(primaryNavLink(page, 'planner', { name: 'Planner' }))).toBe(
      `role=navigation && testid=${LANDMARK_TEST_IDS.primaryNavigation} >> role=link(name:Planner) && role=navigation && testid=${LANDMARK_TEST_IDS.primaryNavigation} >> testid=nav-item-planner`
    );
  });

  it('composes dialog role + accessible name + canonical testid across modal surfaces', () => {
    const page = createFakePage();

    expect(exprOf(recipeDetailSheet(page))).toBe(
      `role=dialog(name:${LANDMARK_NAMES.recipeDetailSheet}) && testid=${LANDMARK_TEST_IDS.recipeDetailSheet}`
    );
    expect(exprOf(planningDayChooser(page))).toBe(
      `role=dialog(name:${LANDMARK_NAMES.planningDayChooser}) && testid=${LANDMARK_TEST_IDS.planningDayChooser}`
    );
    expect(exprOf(skipRecoveryDialog(page))).toBe(
      `role=dialog(name:${LANDMARK_NAMES.skipRecoveryDialog}) && testid=${LANDMARK_TEST_IDS.skipRecoveryDialog}`
    );
    expect(exprOf(recipeFiltersSheet(page))).toBe(
      `role=dialog(name:${LANDMARK_NAMES.recipeFiltersSheet})[has=testid=${LANDMARK_TEST_IDS.recipeFiltersApply}]`
    );
  });

  it('scopes CooksMode overlay to level-2 recipe heading when recipeName is supplied', () => {
    const page = createFakePage();

    expect(exprOf(cooksModeOverlay(page))).toBe(`testid=${LANDMARK_TEST_IDS.cooksModeOverlay}`);
    expect(exprOf(cooksModeOverlay(page, { recipeName: 'Sunday Lasagna' }))).toBe(
      `testid=${LANDMARK_TEST_IDS.cooksModeOverlay}[has=role=heading(level:2,name:Sunday Lasagna) && testid=${LANDMARK_TEST_IDS.cooksModeRecipeHeading}]`
    );
  });

  it('asserts modal dialog visibility, aria-modal, active navigation, CooksMode readiness, and closed states', async () => {
    const page = createFakePage();

    await expectPrimaryNavigation(page, { active: 'recipes' });
    await expectRecipeDetailSheetOpen(page);
    await expectPlanningDayChooserOpen(page);
    await expectSkipRecoveryDialogOpen(page);
    await expectRecipeFiltersSheetOpen(page);
    await expectCooksModeOpen(page, { recipeName: 'Chili' });

    await expectRecipeDetailSheetClosed(page);
    await expectPlanningDayChooserClosed(page);
    await expectSkipRecoveryDialogClosed(page);
    await expectRecipeFiltersSheetClosed(page);
    await expectCooksModeClosed(page);

    expect(playwrightExpectCalls.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assertion: 'toHaveAttribute', args: ['aria-current', 'page'] }),
        expect.objectContaining({ assertion: 'toHaveAttribute', args: ['aria-modal', 'true'] }),
        expect.objectContaining({ assertion: 'toHaveCSS', args: ['opacity', '1'] }),
        expect.objectContaining({ assertion: 'toHaveCount', args: [0] }),
      ])
    );
  });
});
