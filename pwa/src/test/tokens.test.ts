import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import tailwindConfig from '../../tailwind.config';

const CHARCOAL_STOPS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
] as const;

const SEMANTIC_COLOR_ROLES = [
  'ink-body',
  'ink-muted',
  'hearth-fill',
  'hearth-fill-hover',
  'hearth-fill-active',
  'hearth-ink',
  'hearth-line',
  'garden-fill',
  'garden-fill-deep',
  'garden-ink',
  'garden-line',
  'sunlight-ink',
  'sunlight-line',
  'chrome-line',
  'icon-affordance',
] as const;

function parseCssThemeTokens(css: string): Record<string, string> {
  const themeMatch = css.match(/@theme\s*\{([\s\S]*?)\n\}/);
  if (!themeMatch) {
    throw new Error('Could not find @theme block in globals.css');
  }

  const tokens: Record<string, string> = {};
  const tokenRegex = /--color-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g;
  for (const match of themeMatch[1].matchAll(tokenRegex)) {
    tokens[match[1]] = match[2].toUpperCase();
  }
  return tokens;
}

function parseCssCustomProperties(
  css: string,
  blockRegex: RegExp,
  blockName: string,
  varPrefix: string
): Record<string, string> {
  const match = css.match(blockRegex);
  if (!match) {
    throw new Error(`Could not find ${blockName} block in globals.css`);
  }

  const tokens: Record<string, string> = {};
  const propRegex = new RegExp(`--${varPrefix}-([a-z0-9-]+)\\s*:\\s*([^;]+)\\s*;`, 'g');
  for (const propMatch of match[1].matchAll(propRegex)) {
    const rawValue = propMatch[2].trim();
    tokens[propMatch[1]] = /^#[0-9a-fA-F]{6}$/.test(rawValue) ? rawValue.toUpperCase() : rawValue;
  }
  return tokens;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const l1 = relativeLuminance(foregroundHex);
  const l2 = relativeLuminance(backgroundHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Family Cookbook design tokens', () => {
  const globalsCssPath = path.resolve(__dirname, '../app/globals.css');
  const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');
  const cssTokens = parseCssThemeTokens(globalsCss);
  const twColors = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<
    string,
    Record<string, string>
  >;

  it('defines monotonically darker warm espresso-ink charcoal stops 50..900 across globals.css and tailwind.config.ts', () => {
    let previousLuminance = Number.POSITIVE_INFINITY;

    for (const stop of CHARCOAL_STOPS) {
      const cssHex = cssTokens[`charcoal-${stop}`];
      const twHex = twColors.charcoal?.[stop]?.toUpperCase();

      expect(cssHex, `globals.css missing --color-charcoal-${stop}`).toMatch(/^#[0-9A-F]{6}$/);
      expect(twHex, `tailwind.config.ts missing charcoal.${stop}`).toMatch(/^#[0-9A-F]{6}$/);
      expect(cssHex, `charcoal-${stop} mismatch between globals.css and tailwind.config.ts`).toBe(
        twHex
      );

      const [r, g, b] = hexToRgb(cssHex);
      expect(
        r >= g && g >= b,
        `charcoal-${stop} (${cssHex}) should stay warm/neutral (R >= G >= B, not cool blue-slate)`
      ).toBe(true);

      const lum = relativeLuminance(cssHex);
      expect(
        lum,
        `charcoal-${stop} (${cssHex}, Y=${lum.toFixed(4)}) must be strictly darker than previous stop (Y=${previousLuminance.toFixed(4)})`
      ).toBeLessThan(previousLuminance);

      previousLuminance = lum;
    }

    expect(cssTokens.charcoal).toBe('#28231F');
    expect(twColors.charcoal?.DEFAULT?.toUpperCase()).toBe('#28231F');
    expect(contrastRatio(cssTokens.charcoal, cssTokens.cream)).toBeGreaterThanOrEqual(14);
    expect(contrastRatio(cssTokens['charcoal-600'], cssTokens.cream)).toBeGreaterThanOrEqual(7);
  });

  it('synchronizes brand anchors across globals.css and tailwind.config.ts including #B85542 terracotta', () => {
    expect(cssTokens.terracotta).toBe('#B85542');
    expect(cssTokens['terracotta-500']).toBe('#B85542');
    expect(twColors.terracotta?.DEFAULT?.toUpperCase()).toBe('#B85542');
    expect(twColors.terracotta?.['500']?.toUpperCase()).toBe('#B85542');

    expect(cssTokens.ochre).toBe('#E1AD01');
    expect(twColors.ochre?.DEFAULT?.toUpperCase()).toBe('#E1AD01');

    expect(cssTokens.sage).toBe('#8A9A5B');
    expect(twColors.sage?.DEFAULT?.toUpperCase()).toBe('#8A9A5B');

    expect(cssTokens.cream).toBe('#FDFCF0');
    expect(twColors.cream?.DEFAULT?.toUpperCase()).toBe('#FDFCF0');
  });

  it('satisfies role-locked WCAG 2.2 AA contrast floors across Hearth, Sunlight, Garden, and Error pairings', () => {
    // Hearth Primary
    expect(contrastRatio(cssTokens['cream-100'], cssTokens.terracotta)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#FFFFFF', cssTokens.terracotta)).toBeGreaterThanOrEqual(4.5);

    // Sunlight Voting & Highlight
    expect(contrastRatio(cssTokens['ochre-800'], cssTokens['ochre-50'])).toBeGreaterThanOrEqual(
      6.7
    );
    expect(contrastRatio(cssTokens['ochre-800'], cssTokens['ochre-100'])).toBeGreaterThanOrEqual(
      6.7
    );
    expect(contrastRatio(cssTokens['ochre-800'], cssTokens['ochre-200'])).toBeGreaterThanOrEqual(
      6.7
    );
    expect(contrastRatio(cssTokens['ochre-800'], '#FFFFFF')).toBeGreaterThanOrEqual(6.7);

    // Garden Participation & Completion (Tonal Botanical + Option A Deep Herb Solid)
    expect(contrastRatio(cssTokens['sage-700'], cssTokens['sage-50'])).toBeGreaterThanOrEqual(5.5);
    expect(contrastRatio(cssTokens['sage-800'], cssTokens['sage-50'])).toBeGreaterThanOrEqual(5.5);
    expect(contrastRatio(cssTokens['sage-700'], cssTokens['sage-100'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(cssTokens['sage-800'], cssTokens['sage-100'])).toBeGreaterThanOrEqual(7);
    expect(contrastRatio('#FFFFFF', cssTokens['sage-600'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#FFFFFF', cssTokens['sage-700'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(cssTokens['cream-100'], cssTokens['sage-700'])).toBeGreaterThanOrEqual(
      4.5
    );

    // Error & Destructive
    expect(
      contrastRatio(cssTokens['terracotta-700'], cssTokens['terracotta-50'])
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('exposes .cookbook-bg alongside the legacy .solar-earth-bg utility', () => {
    expect(globalsCss).toMatch(/\.cookbook-bg\b/);
    expect(globalsCss).toMatch(/\.solar-earth-bg\b/);
  });

  it('defines dual-mode semantic role tokens across :root, :root[data-contrast="high"], @theme inline, and tailwind.config.ts', () => {
    const standardRoles = parseCssCustomProperties(
      globalsCss,
      /(?:^|\n):root\s*\{([\s\S]*?)\n\}/,
      ':root',
      'role'
    );
    const highRoles = parseCssCustomProperties(
      globalsCss,
      /(?:^|\n):root\[data-contrast=['"]high['"]\]\s*\{([\s\S]*?)\n\}/,
      ':root[data-contrast="high"]',
      'role'
    );
    const inlineTheme = parseCssCustomProperties(
      globalsCss,
      /@theme\s+inline\s*\{([\s\S]*?)\n\}/,
      '@theme inline',
      'color'
    );
    const twAllColors = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<string, unknown>;

    for (const role of SEMANTIC_COLOR_ROLES) {
      expect(standardRoles[role], `:root missing --role-${role}`).toMatch(/^#[0-9A-F]{6}$/);
      expect(highRoles[role], `:root[data-contrast="high"] missing --role-${role}`).toMatch(
        /^#[0-9A-F]{6}$/
      );
      expect(inlineTheme[role], `@theme inline missing --color-${role}`).toBe(
        `var(--role-${role})`
      );
      expect(twAllColors[role], `tailwind.config.ts missing semantic key ${role}`).toBe(
        `var(--role-${role})`
      );
    }

    expect(standardRoles['nav-bg']).toContain('rgba(253, 252, 240');
    expect(standardRoles['nav-border']).toBeTruthy();
    expect(highRoles['nav-bg']).toBe('#FDFCF0');
    expect(highRoles['nav-border']).toBe('#6E645B');

    const highGlassNavMatch = globalsCss.match(
      /:root\[data-contrast=['"]high['"]\]\s+\.glass-nav\s*\{([\s\S]*?)\}/
    );
    expect(highGlassNavMatch, 'High contrast .glass-nav override missing').not.toBeNull();
    expect(highGlassNavMatch![1]).toMatch(/backdrop-filter:\s*none/);
    expect(highGlassNavMatch![1]).toContain('var(--role-nav-bg)');
  });

  it('enforces cooled herb Garden colors and Standard AA (>= 4.5:1 text, >= 3.0:1 icons) vs High Contrast AAA (>= 7.0:1, ochre >= 6.76:1) floors', () => {
    const std = parseCssCustomProperties(
      globalsCss,
      /(?:^|\n):root\s*\{([\s\S]*?)\n\}/,
      ':root',
      'role'
    );
    const high = parseCssCustomProperties(
      globalsCss,
      /(?:^|\n):root\[data-contrast=['"]high['"]\]\s*\{([\s\S]*?)\n\}/,
      ':root[data-contrast="high"]',
      'role'
    );

    // Cooled herb Garden anchors (distinct from olive-toned sage-600/700)
    expect(std['garden-fill']).toBe('#4E6E52');
    expect(std['garden-fill-deep']).toBe('#3D5940');
    expect(std['garden-ink']).toBe('#4E6E52');
    expect(high['garden-fill']).toBe('#324D36');
    expect(high['garden-fill-deep']).toBe('#243A27');
    expect(high['garden-ink']).toBe('#324D36');

    // Standard AA floors
    expect(contrastRatio(std['ink-body'], cssTokens.cream)).toBeGreaterThanOrEqual(14);
    expect(contrastRatio(std['ink-muted'], cssTokens.cream)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(cssTokens['cream-100'], std['hearth-fill'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#FFFFFF', std['hearth-fill'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#FFFFFF', std['hearth-fill-hover'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#FFFFFF', std['hearth-fill-active'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(std['hearth-ink'], '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(std['hearth-ink'], cssTokens['terracotta-50'])).toBeGreaterThanOrEqual(
      4.5
    );
    expect(contrastRatio('#FFFFFF', std['garden-fill'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#FFFFFF', std['garden-fill-deep'])).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio(std['garden-ink'], '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(std['garden-ink'], cssTokens['sage-50'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(std['garden-ink'], cssTokens['sage-100'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(std['sunlight-ink'], '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(std['sunlight-ink'], cssTokens['ochre-100'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(std['sunlight-ink'], cssTokens['ochre-200'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(std['icon-affordance'], cssTokens.cream)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(std['icon-affordance'], '#FFFFFF')).toBeGreaterThanOrEqual(3.0);

    // High Contrast AAA floors
    expect(contrastRatio(high['ink-body'], cssTokens.cream)).toBeGreaterThanOrEqual(17);
    expect(contrastRatio(high['ink-muted'], cssTokens.cream)).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio(cssTokens['cream-100'], high['hearth-fill'])).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio('#FFFFFF', high['hearth-fill'])).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio('#FFFFFF', high['hearth-fill-hover'])).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio('#FFFFFF', high['hearth-fill-active'])).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio(high['hearth-ink'], '#FFFFFF')).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio(high['hearth-ink'], cssTokens['terracotta-50'])).toBeGreaterThanOrEqual(
      7.0
    );
    expect(contrastRatio('#FFFFFF', high['garden-fill'])).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio('#FFFFFF', high['garden-fill-deep'])).toBeGreaterThanOrEqual(11.0);
    expect(contrastRatio(high['garden-ink'], '#FFFFFF')).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio(high['garden-ink'], cssTokens['sage-50'])).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio(high['garden-ink'], cssTokens['sage-100'])).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio(high['sunlight-ink'], '#FFFFFF')).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio(high['sunlight-ink'], cssTokens['ochre-100'])).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio(high['sunlight-ink'], cssTokens['ochre-200'])).toBeGreaterThanOrEqual(
      6.75
    );
    expect(contrastRatio(high['icon-affordance'], cssTokens.cream)).toBeGreaterThanOrEqual(7.0);
    expect(contrastRatio(high['icon-affordance'], '#FFFFFF')).toBeGreaterThanOrEqual(7.0);
  });
});
