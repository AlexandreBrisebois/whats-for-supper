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
});
