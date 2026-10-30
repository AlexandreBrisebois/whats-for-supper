// Source-maintained inventory, not an exhaustive dynamic-overlay detector.
import { expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { classifyScreen } from './opening';

const root = path.resolve(import.meta.dirname, '../..');
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}
const routes = {
  '/': 'other', // redirect-only, excluded by the eligibility gate
  '/welcome': 'welcome',
  '/onboarding': 'onboarding',
  '/invite': 'invite',
  '/home': 'home',
  '/recipes': 'search',
  '/capture': 'capture',
  '/capture/confirm': 'capture.confirm',
  '/planner': 'planner',
  '/discovery': 'discovery',
  '/profile': 'profile',
  '/profile/settings': 'profile.settings',
  '/browse-all-stack': 'browse.stack',
};
// Named coverage debt; keys are source owners, reasons explain why they remain bespoke.
export const overlayExceptions: Record<string, string> = {
  'common/Modal.tsx': 'Shared visual container; migrate only with a selected semantic consumer.',
  'demo/DemoDialog.tsx':
    'Native Demo action/reset dialog: adoption deferred; no operation outcome inference.',
  'identity/DemoContext.tsx':
    'Demo/Beta introductions: keep entry-screen meaning; adoption deferred.',
  'discovery/FamilyNudgeDialog.tsx': 'Family convergence prompt: presentation adoption deferred.',
  'common/InviteLinkDialog.tsx': 'Invitation sharing: presentation adoption deferred.',
  'home/SkipRecoveryDialog.tsx': 'Tonight recovery and drafts: adoption deferred.',
  'planner/NonCookingDaySheet.tsx': 'Recipe-free plan draft: adoption deferred.',
  'planner/PlanningPivotSheet.tsx': 'Meal-change options: adoption deferred.',
  'planner/CooksMode.tsx': 'Cooking view: adoption deferred; no completion inference.',
  'planner/GroceryList.tsx':
    'Phone full-screen list is a primary screen; companion declared by Planner.',
  'recipes/RecipeDetailSheet.tsx': 'Recipe detail and nested decisions: adoption deferred.',
  'recipes/RecipeFiltersSheet.tsx': 'Filter drafts: adoption deferred.',
  'recipes/RecipeImportIssueSheet.tsx': 'Issue note and re-import: adoption deferred.',
  'recipes/RecycleBinSheet.tsx': 'Restore/purge decisions: adoption deferred.',
  'recipes/OriginalPhotosViewer.tsx': 'Photo viewer gestures: adoption deferred.',
  'capture/ImageReview.tsx': 'Capture image review: adoption deferred.',
  'capture/MinimalCapture.tsx': 'Capture progress/error overlays: adoption deferred.',
};
it('inventories every page with an exact classification or explicit other decision', () => {
  const actual = files(path.join(root, 'app'))
    .filter((p) => p.endsWith('/page.tsx'))
    .map(
      (p) =>
        '/' +
        path
          .relative(path.join(root, 'app'), path.dirname(p))
          .split(path.sep)
          .filter((s) => s && !s.startsWith('('))
          .join('/')
    );
  expect(actual.sort()).toEqual(Object.keys(routes).sort());
  for (const [route, label] of Object.entries(routes)) expect(classifyScreen(route)).toBe(label);
  expect(classifyScreen('/unreviewed/private-sentinel')).toBe('other');
});
it('requires a named source-owner exception for known bespoke overlay candidates', () => {
  const candidates = files(path.join(root, 'components'))
    .filter(
      (p) =>
        p.endsWith('.tsx') &&
        !p.endsWith('.test.tsx') &&
        /fixed inset-0|<dialog\b|role=["']dialog|<Modal\b|<Sheet\b|<Dialog\b/.test(
          readFileSync(p, 'utf8')
        )
    )
    .map((p) => path.relative(path.join(root, 'components'), p));
  expect(candidates.sort()).toEqual(
    [...Object.keys(overlayExceptions), 'planner/QuickFindModal.tsx'].sort()
  );
  for (const [owner, reason] of Object.entries(overlayExceptions)) {
    expect(readFileSync(path.join(root, 'components', owner), 'utf8')).toBeTruthy();
    expect(reason.length).toBeGreaterThan(20);
  }
  // Blind spots: portals, computed class names/roles, third-party and runtime overlays.
  // No claim of exhaustive detection or runtime presentation follows from this search.
});
it('keeps one static identity declaration per adopted surface owner', () => {
  const quick = readFileSync(path.join(root, 'components/planner/QuickFindModal.tsx'), 'utf8');
  expect(quick.match(/useSurfacePresentation\('quick.find', true\)/g)).toHaveLength(1);
  const planner = readFileSync(path.join(root, 'app/(app)/planner/page.tsx'), 'utf8');
  expect(planner.match(/registerPlannerPresentation\(document,/g)).toHaveLength(1);
});
