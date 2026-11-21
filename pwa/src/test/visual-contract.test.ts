import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

export type VisualViolationRule =
  | 'off-palette-color'
  | 'opaque-ochre-control-fill'
  | 'white-on-base-sage'
  | 'bare-ochre-or-sage-text'
  | 'micro-typography-below-12px'
  | 'faint-charcoal-copy'
  | 'raw-non-semantic-role';

export interface VisualViolation {
  file: string;
  line: number;
  rule: VisualViolationRule;
  token: string;
}

/**
 * Temporary Era 1-2 ratchet allowlist (`src/...` path -> exact observed violation count).
 *
 * Rules:
 * - New files MUST have 0 violations (cannot be added here without explicit authorization).
 * - When a legacy file is migrated, reduce its count or remove its entry in the same PR.
 * - Any allowlisted file whose count drops below its recorded cap fails with tightening
 *   instructions so migration gains cannot silently regress.
 */
export const LEGACY_ERA_ALLOWLIST: Record<string, number> = {};

function scanLine(file: string, lineNumber: number, line: string): VisualViolation[] {
  const hits: VisualViolation[] = [];

  for (const match of line.matchAll(
    /(?<![\w-])(?:text|bg|border|ring|fill)-(?:(?:indigo|lavender|pink|ochre-dark)(?:-\d+)?|red-\d+)(?![\w-])/g
  )) {
    hits.push({ file, line: lineNumber, rule: 'off-palette-color', token: match[0] });
  }

  for (const match of line.matchAll(/(?<![\w-])bg-ochre(?:-(?:400|500))?(?![\w-/])/g)) {
    hits.push({ file, line: lineNumber, rule: 'opaque-ochre-control-fill', token: match[0] });
  }

  if (
    /(?<![\w-])bg-sage(?:-500)?(?![\w-/])/.test(line) &&
    /(?<![\w-])text-white(?![\w-/])/.test(line)
  ) {
    hits.push({
      file,
      line: lineNumber,
      rule: 'white-on-base-sage',
      token: 'bg-sage + text-white',
    });
  }

  for (const match of line.matchAll(/(?<![\w-])text-(?:ochre|sage)(?![\w-/])/g)) {
    hits.push({ file, line: lineNumber, rule: 'bare-ochre-or-sage-text', token: match[0] });
  }

  for (const match of line.matchAll(/(?<![\w-])text-\[(?:[1-9]|10|11)px\](?![\w-])/g)) {
    hits.push({ file, line: lineNumber, rule: 'micro-typography-below-12px', token: match[0] });
  }

  for (const match of line.matchAll(/(?<![\w-])text-charcoal\/(?:20|25|30|35|40)(?![\w-])/g)) {
    hits.push({ file, line: lineNumber, rule: 'faint-charcoal-copy', token: match[0] });
  }

  for (const match of line.matchAll(
    /(?<![\w-])(?:text-charcoal(?:-[4-9]00|\/(?:55|60|70|75|80))?|outline-charcoal|bg-terracotta|text-terracotta(?:-[6-8]00)?|text-sage-(?:600|700|800|900)|text-ochre-(?:600|700|800|900)|border-charcoal-(?:200|300))(?![\w-/])|(?<![\w-])bg-sage-(?:600|700)(?![\w-])/g
  )) {
    hits.push({ file, line: lineNumber, rule: 'raw-non-semantic-role', token: match[0] });
  }

  return hits;
}

export function scanSource(file: string, content: string): VisualViolation[] {
  const violations: VisualViolation[] = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    violations.push(...scanLine(file, index + 1, line));
  });
  return violations;
}

export function evaluateRatchet(
  filesByPath: Record<string, string>,
  allowlist: Record<string, number>
): string[] {
  const failures: string[] = [];
  const observedCounts: Record<string, number> = {};

  for (const [file, content] of Object.entries(filesByPath)) {
    const violations = scanSource(file, content);
    observedCounts[file] = violations.length;
    const allowedMax = allowlist[file];

    if (allowedMax === undefined && violations.length > 0) {
      const sample = violations
        .map((v) => `  - ${v.file}:${v.line} [${v.rule}] "${v.token}"`)
        .join('\n');
      failures.push(
        `Non-allowlisted file ${file} has ${violations.length} visual contract violation(s):\n${sample}`
      );
    } else if (allowedMax !== undefined && violations.length > allowedMax) {
      const sample = violations
        .map((v) => `  - ${v.file}:${v.line} [${v.rule}] "${v.token}"`)
        .join('\n');
      failures.push(
        `Allowlisted file ${file} regressed (${violations.length} > allowed ${allowedMax}):\n${sample}`
      );
    } else if (allowedMax !== undefined && violations.length === 0) {
      failures.push(
        `Stale allowlist entry: ${file} now has 0 violations. Remove it from LEGACY_ERA_ALLOWLIST to lock in migration progress.`
      );
    } else if (allowedMax !== undefined && violations.length < allowedMax) {
      failures.push(
        `Tighten allowlist entry: ${file} dropped from ${allowedMax} to ${violations.length} violations. Update LEGACY_ERA_ALLOWLIST['${file}'] = ${violations.length}.`
      );
    }
  }

  for (const allowlistedFile of Object.keys(allowlist)) {
    if (!(allowlistedFile in filesByPath)) {
      failures.push(
        `Missing allowlisted file: ${allowlistedFile} no longer exists. Remove it from LEGACY_ERA_ALLOWLIST.`
      );
    }
  }

  return failures;
}

function collectPwaUiSources(pwaRoot: string): Record<string, string> {
  const files: Record<string, string> = {};
  const roots = [path.join(pwaRoot, 'src/app'), path.join(pwaRoot, 'src/components')];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
        const relPath = path.relative(pwaRoot, fullPath).replaceAll(path.sep, '/');
        files[relPath] = fs.readFileSync(fullPath, 'utf8');
      }
    }
  }

  for (const root of roots) {
    walk(root);
  }
  return files;
}

describe('Family Cookbook visual contract scanner', () => {
  it('flags off-palette hues, opaque bg-ochre fills across any ink, white-on-base-sage, bare ochre/sage text, micro-type, and faint charcoal copy', () => {
    const sample = [
      'const a = "text-indigo bg-pink border-lavender-200 ring-red-500";',
      'const b = "bg-ochre text-white";',
      'const c = "bg-ochre text-charcoal";',
      'const d = "bg-ochre-400 text-ochre-900";',
      'const e = "bg-sage text-white";',
      'const f = "text-ochre text-sage";',
      'const g = "text-[10px] text-[11px] text-charcoal/40 text-charcoal/20";',
    ].join('\n');

    const violations = scanSource('src/components/Sample.tsx', sample);
    expect(violations).toEqual([
      {
        file: 'src/components/Sample.tsx',
        line: 1,
        rule: 'off-palette-color',
        token: 'text-indigo',
      },
      { file: 'src/components/Sample.tsx', line: 1, rule: 'off-palette-color', token: 'bg-pink' },
      {
        file: 'src/components/Sample.tsx',
        line: 1,
        rule: 'off-palette-color',
        token: 'border-lavender-200',
      },
      {
        file: 'src/components/Sample.tsx',
        line: 1,
        rule: 'off-palette-color',
        token: 'ring-red-500',
      },
      {
        file: 'src/components/Sample.tsx',
        line: 2,
        rule: 'opaque-ochre-control-fill',
        token: 'bg-ochre',
      },
      {
        file: 'src/components/Sample.tsx',
        line: 3,
        rule: 'opaque-ochre-control-fill',
        token: 'bg-ochre',
      },
      {
        file: 'src/components/Sample.tsx',
        line: 3,
        rule: 'raw-non-semantic-role',
        token: 'text-charcoal',
      },
      {
        file: 'src/components/Sample.tsx',
        line: 4,
        rule: 'opaque-ochre-control-fill',
        token: 'bg-ochre-400',
      },
      {
        file: 'src/components/Sample.tsx',
        line: 4,
        rule: 'raw-non-semantic-role',
        token: 'text-ochre-900',
      },
      {
        file: 'src/components/Sample.tsx',
        line: 5,
        rule: 'white-on-base-sage',
        token: 'bg-sage + text-white',
      },
      {
        file: 'src/components/Sample.tsx',
        line: 6,
        rule: 'bare-ochre-or-sage-text',
        token: 'text-ochre',
      },
      {
        file: 'src/components/Sample.tsx',
        line: 6,
        rule: 'bare-ochre-or-sage-text',
        token: 'text-sage',
      },
      {
        file: 'src/components/Sample.tsx',
        line: 7,
        rule: 'micro-typography-below-12px',
        token: 'text-[10px]',
      },
      {
        file: 'src/components/Sample.tsx',
        line: 7,
        rule: 'micro-typography-below-12px',
        token: 'text-[11px]',
      },
      {
        file: 'src/components/Sample.tsx',
        line: 7,
        rule: 'faint-charcoal-copy',
        token: 'text-charcoal/40',
      },
      {
        file: 'src/components/Sample.tsx',
        line: 7,
        rule: 'faint-charcoal-copy',
        token: 'text-charcoal/20',
      },
    ]);
  });

  it('flags raw non-semantic palette classes that bypass dual-mode role tokens', () => {
    const raw =
      'className="text-charcoal text-charcoal-600 outline-charcoal bg-terracotta text-terracotta-700 bg-sage-700 text-sage-800 text-ochre-800 border-charcoal-200"';
    const violations = scanSource('src/components/Legacy.tsx', raw);
    expect(violations.map((v) => [v.rule, v.token])).toEqual([
      ['raw-non-semantic-role', 'text-charcoal'],
      ['raw-non-semantic-role', 'text-charcoal-600'],
      ['raw-non-semantic-role', 'outline-charcoal'],
      ['raw-non-semantic-role', 'bg-terracotta'],
      ['raw-non-semantic-role', 'text-terracotta-700'],
      ['raw-non-semantic-role', 'bg-sage-700'],
      ['raw-non-semantic-role', 'text-sage-800'],
      ['raw-non-semantic-role', 'text-ochre-800'],
      ['raw-non-semantic-role', 'border-charcoal-200'],
    ]);
  });

  it('permits compliant Era 3 role-locked pairings and >= 12px typography without false positives', () => {
    const cleanEra3 = [
      'const primary = "bg-hearth-fill text-cream-100 hover:bg-hearth-fill-hover active:bg-hearth-fill-active";',
      'const sunlight = "bg-ochre-50 bg-ochre-100 hover:bg-ochre-200 text-sunlight-ink border-sunlight-line";',
      'const sunlightAmbient = "bg-ochre/10 border-ochre/20 bg-white text-sunlight-ink";',
      'const garden = "bg-sage-50 text-garden-ink bg-garden-fill text-white bg-sage/15 border-garden-line";',
      'const destructive = "bg-terracotta-50 text-hearth-ink border-hearth-line";',
      'const type = "text-xs text-[12px] text-ink-body text-ink-muted border-chrome-line outline-ink-body bg-charcoal-200 text-charcoal/10";',
    ].join('\n');

    expect(scanSource('src/components/CleanEra3.tsx', cleanEra3)).toEqual([]);
  });

  it('enforces strict ratchet semantics for new violations, stale allowlist entries, tightening, and regressions', () => {
    expect(
      evaluateRatchet(
        { 'src/components/NewCard.tsx': '<button className="bg-ochre text-charcoal" />' },
        {}
      )[0]
    ).toContain('Non-allowlisted file src/components/NewCard.tsx');

    expect(
      evaluateRatchet(
        { 'src/components/OldCard.tsx': '<button className="bg-hearth-fill text-cream-100" />' },
        { 'src/components/OldCard.tsx': 2 }
      )[0]
    ).toContain('Remove it from LEGACY_ERA_ALLOWLIST');

    expect(
      evaluateRatchet(
        { 'src/components/OldCard.tsx': '<span className="text-[10px]" />' },
        { 'src/components/OldCard.tsx': 3 }
      )[0]
    ).toContain("Update LEGACY_ERA_ALLOWLIST['src/components/OldCard.tsx'] = 1");

    expect(
      evaluateRatchet(
        { 'src/components/OldCard.tsx': '<span className="text-[10px] text-indigo" />' },
        { 'src/components/OldCard.tsx': 1 }
      )[0]
    ).toContain('regressed (2 > allowed 1)');
  });

  it('passes live pwa/src/app and pwa/src/components scan with zero un-allowlisted or stale entries', () => {
    const pwaRoot = path.resolve(__dirname, '../..');
    const sources = collectPwaUiSources(pwaRoot);

    for (const era3CleanFile of [
      'src/components/ui/button.tsx',
      'src/components/ui/SolarLoader.tsx',
      'src/components/home/TonightMenuCard.tsx',
      'src/components/home/TonightPivotCard.tsx',
    ]) {
      expect(LEGACY_ERA_ALLOWLIST[era3CleanFile]).toBeUndefined();
      expect(scanSource(era3CleanFile, sources[era3CleanFile])).toEqual([]);
    }

    expect(Object.keys(LEGACY_ERA_ALLOWLIST)).toHaveLength(0);

    const failures = evaluateRatchet(sources, LEGACY_ERA_ALLOWLIST);
    expect(failures, failures.join('\n\n')).toEqual([]);
  });

  it('keeps all 9 Tier 1 pull-forward decision & recovery surfaces Era 3 clean with zero removed controls', () => {
    const pwaRoot = path.resolve(__dirname, '../..');
    const sources = collectPwaUiSources(pwaRoot);
    const tier1Files = [
      'src/components/planner/useSupperServingsEditor.tsx',
      'src/app/(app)/planner/page.tsx',
      'src/components/planner/GroceryList.tsx',
      'src/components/profile/UsualPortionsSection.tsx',
      'src/components/recipes/PlanningDayChooser.tsx',
      'src/components/recipes/NonCookingReplacementConfirmation.tsx',
      'src/components/recipes/RecipeDetailSheet.tsx',
      'src/components/planner/CooksMode.tsx',
      'src/app/(app)/recipes/RecipesExperience.tsx',
    ];
    const bannedRemovedIdentifiers = [
      'portions-review',
      'planning-day-cancel',
      'search-restart-expired',
      'recipe-reconcile-open',
      'recipe-reconcile-apply',
      'recipes.restartSearch',
      'recipes.checkSavedRecipe',
      'recipes.reconcileDraft',
      'recipes.applyReviewedDraft',
      'profile.reviewCurrentPortions',
    ];

    for (const file of tier1Files) {
      expect(sources[file], `Expected Tier 1 file ${file} in UI source scan`).toBeDefined();
      expect(scanSource(file, sources[file]), `Era 3 scan failures in ${file}`).toEqual([]);
      for (const removed of bannedRemovedIdentifiers) {
        expect(
          sources[file],
          `Removed pull-forward control ${removed} must not reappear in ${file}`
        ).not.toContain(removed);
      }
    }
  });
});
