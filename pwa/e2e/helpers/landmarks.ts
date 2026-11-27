import { expect, type Locator, type Page } from '@playwright/test';

export const LANDMARK_TEST_IDS = {
  primaryNavigation: 'app-bottom-navigation',
  recipeDetailSheet: 'recipe-detail-sheet',
  cooksModeOverlay: 'cooks-mode-overlay',
  cooksModeLoading: 'cooks-mode-loading',
  cooksModeRecipeHeading: 'cooks-mode-recipe-name',
  cooksModeViewToggle: 'cooking-view-toggle',
  cooksModeClose: 'close-cooks-mode',
  planningDayChooser: 'planning-day-chooser',
  planningDayClose: 'planning-day-close',
  skipRecoveryDialog: 'recovery-dialog-panel',
  skipRecoveryTitle: 'recovery-dialog-title',
  skipRecoveryClose: 'recovery-close',
  recipeFiltersApply: 'mobile-filter-apply',
} as const;

export const LANDMARK_NAMES = {
  recipeDetailSheet: 'Recipe detail',
  cooksModeViewGroup: 'View',
  cooksModeClose: "Close cook's mode",
  planningDayChooser: 'Change day',
  skipRecoveryDialog: 'Plan B',
  recipeFiltersSheet: 'Filter recipes',
} as const;

export type PrimaryNavDestination = 'home' | 'recipes' | 'discovery' | 'planner' | 'profile';

export interface AccessibleNameOptions {
  name?: string | RegExp;
  exact?: boolean;
}

export interface CooksModeLandmarkOptions {
  recipeName?: string | RegExp;
}

const toRoleOpts = (opts?: AccessibleNameOptions) =>
  opts?.name !== undefined ? { name: opts.name, exact: opts.exact } : undefined;

const modalDialog = (page: Page, fallbackName: string, opts?: AccessibleNameOptions) =>
  page.getByRole('dialog', { name: opts?.name ?? fallbackName, exact: opts?.exact });

/** Primary bottom navigation landmark (`<nav data-testid="app-bottom-navigation">`). */
export function primaryNavigation(page: Page, options?: AccessibleNameOptions): Locator {
  return page
    .getByRole('navigation', toRoleOpts(options))
    .and(page.getByTestId(LANDMARK_TEST_IDS.primaryNavigation));
}

/** Canonical primary navigation destination link inside `app-bottom-navigation`. */
export function primaryNavLink(
  page: Page,
  destination: PrimaryNavDestination,
  options?: AccessibleNameOptions
): Locator {
  const nav = primaryNavigation(page);
  return nav.getByRole('link', toRoleOpts(options)).and(nav.getByTestId(`nav-item-${destination}`));
}

/** Modal `RecipeDetailSheet` dialog combining ARIA `dialog` role/name and `recipe-detail-sheet`. */
export function recipeDetailSheet(page: Page, options?: AccessibleNameOptions): Locator {
  return modalDialog(page, LANDMARK_NAMES.recipeDetailSheet, options).and(
    page.getByTestId(LANDMARK_TEST_IDS.recipeDetailSheet)
  );
}

/** Full-screen `CooksMode` overlay (`cooks-mode-overlay`), optionally scoped to a recipe heading. */
export function cooksModeOverlay(page: Page, options?: CooksModeLandmarkOptions): Locator {
  const overlay = page.getByTestId(LANDMARK_TEST_IDS.cooksModeOverlay);
  if (options?.recipeName === undefined) return overlay;
  const heading = page
    .getByRole('heading', { level: 2, name: options.recipeName })
    .and(page.getByTestId(LANDMARK_TEST_IDS.cooksModeRecipeHeading));
  return overlay.filter({ has: heading });
}

/** Modal `PlanningDayChooser` dialog combining ARIA `dialog` role/name and `planning-day-chooser`. */
export function planningDayChooser(page: Page, options?: AccessibleNameOptions): Locator {
  return modalDialog(page, LANDMARK_NAMES.planningDayChooser, options).and(
    page.getByTestId(LANDMARK_TEST_IDS.planningDayChooser)
  );
}

/** Modal `SkipRecoveryDialog` ("Plan B") combining ARIA `dialog` role/name and `recovery-dialog-panel`. */
export function skipRecoveryDialog(page: Page, options?: AccessibleNameOptions): Locator {
  return modalDialog(page, LANDMARK_NAMES.skipRecoveryDialog, options).and(
    page.getByTestId(LANDMARK_TEST_IDS.skipRecoveryDialog)
  );
}

/** Modal `RecipeFiltersSheet` combining ARIA `dialog` role/name and `mobile-filter-apply`. */
export function recipeFiltersSheet(page: Page, options?: AccessibleNameOptions): Locator {
  return modalDialog(page, LANDMARK_NAMES.recipeFiltersSheet, options).filter({
    has: page.getByTestId(LANDMARK_TEST_IDS.recipeFiltersApply),
  });
}

async function expectModalDialogOpen(dialog: Locator): Promise<Locator> {
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  return dialog;
}

export async function expectPrimaryNavigation(
  page: Page,
  options?: AccessibleNameOptions & { active?: PrimaryNavDestination }
): Promise<Locator> {
  const nav = primaryNavigation(page, options);
  await expect(nav).toBeVisible();
  if (options?.active) {
    await expect(primaryNavLink(page, options.active)).toHaveAttribute('aria-current', 'page');
  }
  return nav;
}

export const expectRecipeDetailSheetOpen = (page: Page, options?: AccessibleNameOptions) =>
  expectModalDialogOpen(recipeDetailSheet(page, options));

export const expectRecipeDetailSheetClosed = async (page: Page): Promise<void> => {
  await expect(page.getByTestId(LANDMARK_TEST_IDS.recipeDetailSheet)).toHaveCount(0);
};

export async function expectCooksModeOpen(
  page: Page,
  options?: CooksModeLandmarkOptions
): Promise<Locator> {
  const overlay = cooksModeOverlay(page, options);
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveCSS('opacity', '1');
  const heading = overlay
    .getByRole('heading', { level: 2, name: options?.recipeName })
    .and(overlay.getByTestId(LANDMARK_TEST_IDS.cooksModeRecipeHeading));
  await expect(heading).toBeVisible();
  return overlay;
}

export const expectCooksModeClosed = async (page: Page): Promise<void> => {
  await expect(page.getByTestId(LANDMARK_TEST_IDS.cooksModeOverlay)).toHaveCount(0);
};

export const expectPlanningDayChooserOpen = (page: Page, options?: AccessibleNameOptions) =>
  expectModalDialogOpen(planningDayChooser(page, options));

export const expectPlanningDayChooserClosed = async (page: Page): Promise<void> => {
  await expect(page.getByTestId(LANDMARK_TEST_IDS.planningDayChooser)).toHaveCount(0);
};

export const expectSkipRecoveryDialogOpen = (page: Page, options?: AccessibleNameOptions) =>
  expectModalDialogOpen(skipRecoveryDialog(page, options));

export const expectSkipRecoveryDialogClosed = async (page: Page): Promise<void> => {
  await expect(page.getByTestId(LANDMARK_TEST_IDS.skipRecoveryDialog)).toHaveCount(0);
};

export const expectRecipeFiltersSheetOpen = (page: Page, options?: AccessibleNameOptions) =>
  expectModalDialogOpen(recipeFiltersSheet(page, options));

export const expectRecipeFiltersSheetClosed = async (
  page: Page,
  options?: AccessibleNameOptions
): Promise<void> => {
  await expect(recipeFiltersSheet(page, options)).toHaveCount(0);
};
