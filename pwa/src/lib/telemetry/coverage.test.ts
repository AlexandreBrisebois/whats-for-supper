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
const m5Owners = {
  'planner/PlanningPivotSheet.tsx': ['planning.pivot'],
  'planner/NonCookingDaySheet.tsx': ['planning.non_cooking'],
  'home/SkipRecoveryDialog.tsx': ['planning.recovery'],
  'discovery/FamilyNudgeDialog.tsx': ['discovery.nudge'],
  'common/InviteLinkDialog.tsx': ['invite.share'],
  'profile/ProfileDropdown.tsx': ['profile.members'],
  'capture/ImageReview.tsx': ['capture.image_review'],
  'capture/MinimalCapture.tsx': [
    'capture.bundle_review',
    'capture.upload',
    'capture.queued',
    'capture.ready',
  ],
};
const adoptedOwners = {
  ...m5Owners,
  'planner/QuickFindModal.tsx': ['quick.find'],
  'planner/CooksMode.tsx': ['cooking.reader'],
  'recipes/RecipeDetailSheet.tsx': ['recipe.detail', 'recipe.plan'],
  'recipes/ActionGearMenu.tsx': ['recipe.actions'],
  'recipes/RecipeFiltersSheet.tsx': ['recipe.filters'],
  'recipes/RecipeImportIssueSheet.tsx': ['recipe.issue'],
  'recipes/RecycleBinSheet.tsx': ['recipe.bin', 'recipe.purge'],
  'recipes/OriginalPhotosViewer.tsx': ['original.photos'],
};
// Structural owners remain explicit; all selected semantic consumers are adopted.
export const overlayExceptions: Record<string, string> = {
  'common/Modal.tsx':
    'Structural visual container; only its explicit semantic consumer identity is observed.',
  'planner/GroceryList.tsx':
    'Phone full-screen list is a primary screen; companion declared by Planner.',
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
        (/fixed inset-0|<dialog\b|role=["']dialog|<Modal\b|<Sheet\b|<Dialog\b/.test(
          readFileSync(p, 'utf8')
        ) ||
          ['recipes/ActionGearMenu.tsx', 'profile/ProfileDropdown.tsx'].includes(
            path.relative(path.join(root, 'components'), p)
          ))
    )
    .map((p) => path.relative(path.join(root, 'components'), p));
  expect(candidates.sort()).toEqual(
    [
      ...Object.keys(overlayExceptions),
      ...Object.keys(adoptedOwners),
      'demo/DemoDialog.tsx',
      'identity/DemoContext.tsx',
    ].sort()
  );
  for (const [owner, reason] of Object.entries(overlayExceptions)) {
    expect(readFileSync(path.join(root, 'components', owner), 'utf8')).toBeTruthy();
    expect(reason.length).toBeGreaterThan(20);
  }
  // Action/member flyouts are explicitly included despite their non-dialog markup.
  // Blind spots: portals, computed class names/roles, third-party and runtime overlays.
  // No claim of exhaustive detection or runtime presentation follows from this search.
});
it('keeps one static identity declaration per adopted surface owner', () => {
  const quick = readFileSync(path.join(root, 'components/planner/QuickFindModal.tsx'), 'utf8');
  expect(quick.match(/useSurfacePresentation\('quick.find', true\)/g)).toHaveLength(1);
  const planner = readFileSync(path.join(root, 'app/(app)/planner/page.tsx'), 'utf8');
  expect(planner.match(/registerPlannerPresentation\(document,/g)).toHaveLength(1);
});

it('requires static declarations for every adopted semantic owner, including the bespoke flyout', () => {
  for (const [owner, identities] of Object.entries(adoptedOwners)) {
    expect(overlayExceptions).not.toHaveProperty(owner);
    const source = readFileSync(path.join(root, 'components', owner), 'utf8');
    const declarations = [...source.matchAll(/useSurfacePresentation\(\s*'([^']+)'/g)].map(
      (match) => match[1]
    );
    expect(declarations.sort()).toEqual([...identities].sort());
  }
  const modal = readFileSync(path.join(root, 'components/common/Modal.tsx'), 'utf8');
  expect(modal).toContain('useSurfacePresentation(surfaceIdentity, isOpen)');
});

it('traces introduction consumers through the one native dialog presentation owner', () => {
  const demo = readFileSync(path.join(root, 'components/demo/DemoDialog.tsx'), 'utf8');
  const explanation = readFileSync(
    path.join(root, 'components/identity/DemoExplanation.tsx'),
    'utf8'
  );
  const context = readFileSync(path.join(root, 'components/identity/DemoContext.tsx'), 'utf8');
  expect(demo).toContain("surfaceIdentity = 'demo.dialog'");
  expect(demo).toContain('useSurfacePresentation(surfaceIdentity,');
  expect(explanation).toContain('surfaceIdentity="demo.introduction"');
  expect(context).toContain('<DemoExplanation');
  expect(overlayExceptions).not.toHaveProperty('demo/DemoDialog.tsx');
  expect(overlayExceptions).not.toHaveProperty('identity/DemoContext.tsx');
});

// App declarations cannot confirm platform-owned presentation or return.
export const platformExceptions = {
  confirm: 'Browser confirmation remains unobservable; no acceptance or cancellation fact.',
  picker: 'File/camera pickers belong to the browser or OS, without a presentation observer.',
  share:
    'Native share sheets/external apps have intent only, without delivery/read/return evidence.',
};
