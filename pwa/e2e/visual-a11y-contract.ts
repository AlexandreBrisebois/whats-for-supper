import type { Page } from '@playwright/test';

export interface CookbookVisualA11yOptions {
  /** CSS selector for the root subtree to inspect. Defaults to `'body'`. */
  rootSelector?: string;
  /** CSS selectors for subtrees to exempt (e.g. unmigrated legacy chrome). */
  excludeSelectors?: string[];
  /** Target WCAG contrast level (`'aa'` = 4.5/3.0, `'aaa'` = 7.0/4.5). Defaults to `'aa'`. */
  contrastLevel?: 'aa' | 'aaa';
  /** Check computed WCAG foreground/background contrast. Defaults to `true`. */
  checkContrast?: boolean;
  /** Check interactive control hit target dimensions. Defaults to `true`. */
  checkTargetSize?: boolean;
  /** Check absence of horizontal overflow. Defaults to `true`. */
  checkHorizontalReflow?: boolean;
  /** Minimum CSS px width and height for interactive controls. Defaults to `48`. */
  minTargetPx?: number;
}

export async function assertCookbookVisualA11y(
  page: Page,
  options: CookbookVisualA11yOptions = {}
): Promise<void> {
  const {
    rootSelector = 'body',
    excludeSelectors = [],
    contrastLevel = 'aa',
    checkContrast = true,
    checkTargetSize = true,
    checkHorizontalReflow = true,
    minTargetPx = 48,
  } = options;

  await page.evaluate(() => document.fonts.ready);

  const violations = await page.evaluate(
    ({
      rootSelector: rootSel,
      excludeSelectors: excluded,
      contrastLevel: level,
      checkContrast: runContrast,
      checkTargetSize: runTargetSize,
      checkHorizontalReflow: runReflow,
      minTargetPx: targetMin,
    }) => {
      type Rgba = [number, number, number, number];
      const issues: string[] = [];

      const root = document.querySelector(rootSel);
      if (!root) {
        return [`[setup] Root selector "${rootSel}" was not found in the document.`];
      }

      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const parseChannel = (raw: string, max = 255): number => {
        if (raw.endsWith('%')) {
          return Math.max(0, Math.min(max, (parseFloat(raw) / 100) * max));
        }
        return Math.max(0, Math.min(max, parseFloat(raw)));
      };

      const parseAlpha = (raw: string | undefined): number => {
        if (!raw) return 1;
        if (raw.endsWith('%')) {
          return Math.max(0, Math.min(1, parseFloat(raw) / 100));
        }
        return Math.max(0, Math.min(1, parseFloat(raw)));
      };

      const parseColor = (cssColor: string): Rgba | null => {
        if (!cssColor || cssColor === 'none') return null;
        if (cssColor === 'transparent') return [0, 0, 0, 0];

        const rgbMatch = cssColor.match(
          /^\s*rgba?\(\s*([0-9.]+%?)\s*[,\s]\s*([0-9.]+%?)\s*[,\s]\s*([0-9.]+%?)(?:\s*[,/]\s*([0-9.]+%?))?\s*\)\s*$/i
        );
        if (rgbMatch) {
          return [
            parseChannel(rgbMatch[1], 255),
            parseChannel(rgbMatch[2], 255),
            parseChannel(rgbMatch[3], 255),
            parseAlpha(rgbMatch[4]),
          ];
        }

        const srgbMatch = cssColor.match(
          /^\s*color\(\s*srgb\s+([0-9.+-]+%?)\s+([0-9.+-]+%?)\s+([0-9.+-]+%?)(?:\s*\/\s*([0-9.+-]+%?))?\s*\)\s*$/i
        );
        if (srgbMatch) {
          const to255 = (token: string) =>
            token.endsWith('%')
              ? parseChannel(token, 255)
              : Math.max(0, Math.min(1, parseFloat(token))) * 255;
          return [
            to255(srgbMatch[1]),
            to255(srgbMatch[2]),
            to255(srgbMatch[3]),
            parseAlpha(srgbMatch[4]),
          ];
        }

        if (ctx) {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = 'rgba(0, 0, 0, 0)';
          ctx.fillStyle = cssColor;
          ctx.fillRect(0, 0, 1, 1);
          const data = ctx.getImageData(0, 0, 1, 1).data;
          return [data[0], data[1], data[2], data[3] / 255];
        }

        return null;
      };

      const compositeOver = (fg: Rgba, bg: Rgba): Rgba => {
        const alpha = fg[3];
        const inv = 1 - alpha;
        return [
          fg[0] * alpha + bg[0] * inv,
          fg[1] * alpha + bg[1] * inv,
          fg[2] * alpha + bg[2] * inv,
          alpha + bg[3] * inv,
        ];
      };

      const relativeLuminance = ([r, g, b]: Rgba): number => {
        const [rl, gl, bl] = [r, g, b].map((channel) => {
          const srgb = channel / 255;
          return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
      };

      const contrastRatio = (fg: Rgba, bg: Rgba): number => {
        const l1 = relativeLuminance(fg);
        const l2 = relativeLuminance(bg);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      };

      const isExcluded = (el: Element): boolean =>
        excluded.some((selector) => el.closest(selector) !== null);

      const isVisibleElement = (el: Element): boolean => {
        if (el.closest('[aria-hidden="true"], [hidden], template')) return false;
        let cur: Element | null = el;
        while (cur) {
          const style = window.getComputedStyle(cur);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            parseFloat(style.opacity) === 0
          ) {
            return false;
          }
          cur = cur.parentElement;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0.5 || rect.height <= 0.5) return false;
        return true;
      };

      const isVisuallyHidden = (el: Element, style: CSSStyleDeclaration): boolean => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1) return true;
        if (style.clip === 'rect(0px, 0px, 0px, 0px)') return true;
        if (style.clipPath === 'inset(50%)') return true;
        return false;
      };

      const describeElement = (el: Element): string => {
        const tag = el.tagName.toLowerCase();
        const testId = el.getAttribute('data-testid');
        const id = el.id ? `#${el.id}` : '';
        const text = (el.getAttribute('aria-label') || el.textContent || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 40);
        const selectorPart = testId ? `[data-testid="${testId}"]` : id;
        return `${tag}${selectorPart}${text ? ` ("${text}")` : ''}`;
      };

      const resolveCompositeBackground = (
        el: Element
      ): { color: Rgba; hasTranslucentBackdrop: boolean } => {
        const layers: Rgba[] = [];
        let hasTranslucentBackdrop = false;

        let cur: Element | null = el;
        while (cur) {
          const style = window.getComputedStyle(cur);
          const bg = parseColor(style.backgroundColor);
          const elementOpacity = Math.max(0, Math.min(1, parseFloat(style.opacity) || 1));

          if (bg && bg[3] > 0) {
            const effectiveAlpha = bg[3] * elementOpacity;
            layers.push([bg[0], bg[1], bg[2], effectiveAlpha]);
            if (effectiveAlpha >= 0.999) {
              break;
            }
          }

          if (
            (style.backdropFilter && style.backdropFilter !== 'none') ||
            (style.backgroundImage && style.backgroundImage !== 'none')
          ) {
            hasTranslucentBackdrop = true;
          }

          cur = cur.parentElement;
        }

        // Cream #FDFCF0 canvas fallback if ancestors are all transparent.
        let composite: Rgba = [253, 252, 240, 1];
        for (let i = layers.length - 1; i >= 0; i--) {
          composite = compositeOver(layers[i], composite);
        }
        return { color: composite, hasTranslucentBackdrop };
      };

      if (runContrast) {
        const candidates = [root, ...Array.from(root.querySelectorAll('*'))];
        for (const el of candidates) {
          if (isExcluded(el) || !isVisibleElement(el)) continue;
          if (
            el.closest(
              'button:disabled, input:disabled, select:disabled, textarea:disabled, [aria-disabled="true"]'
            )
          ) {
            continue;
          }

          const hasDirectText = Array.from(el.childNodes).some(
            (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
          );
          if (!hasDirectText) continue;

          const style = window.getComputedStyle(el);
          if (isVisuallyHidden(el, style)) continue;

          const fgParsed = parseColor(style.color);
          if (!fgParsed) continue;

          const { color: bg, hasTranslucentBackdrop } = resolveCompositeBackground(el);
          const elOpacity = Math.max(0, Math.min(1, parseFloat(style.opacity) || 1));
          const fgEffective: Rgba = [
            fgParsed[0],
            fgParsed[1],
            fgParsed[2],
            fgParsed[3] * elOpacity,
          ];
          const fgComposite = fgEffective[3] < 0.999 ? compositeOver(fgEffective, bg) : fgEffective;

          const fontSize = parseFloat(style.fontSize) || 16;
          const fontWeight =
            style.fontWeight === 'bold'
              ? 700
              : style.fontWeight === 'normal'
                ? 400
                : parseFloat(style.fontWeight) || 400;
          const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
          const normalMin = level === 'aaa' ? 7.0 : 4.5;
          const largeMin = level === 'aaa' ? 4.5 : 3.0;
          const minimum = isLargeText ? largeMin : normalMin;
          const ratio = contrastRatio(fgComposite, bg);

          if (ratio + 1e-4 < minimum) {
            const backdropNote = hasTranslucentBackdrop ? ' [translucent-backdrop]' : '';
            issues.push(
              `[contrast:${level.toUpperCase()}] ${describeElement(el)} has ${ratio.toFixed(2)}:1 (requires >= ${minimum.toFixed(1)}:1; font ${fontSize.toFixed(1)}px/${fontWeight})${backdropNote}`
            );
          }
        }
      }

      if (runTargetSize) {
        const interactiveSelector =
          'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"]';
        const controls = Array.from(root.querySelectorAll(interactiveSelector));
        if (root.matches(interactiveSelector)) controls.unshift(root);

        for (const control of controls) {
          if (isExcluded(control) || !isVisibleElement(control)) continue;
          if (control.matches(':disabled, [aria-disabled="true"]')) continue;

          const style = window.getComputedStyle(control);
          if (isVisuallyHidden(control, style)) continue;

          // Inline prose links inside running text are exempt from standalone button sizing.
          if (
            control.tagName === 'A' &&
            style.display === 'inline' &&
            control.closest('p, li, dd, blockquote')
          ) {
            continue;
          }

          const rect = control.getBoundingClientRect();
          let effectiveWidth = rect.width;
          let effectiveHeight = rect.height;
          if (
            control instanceof HTMLInputElement &&
            (control.type === 'checkbox' || control.type === 'radio')
          ) {
            const enclosingLabel = control.closest('label');
            if (enclosingLabel) {
              const labelRect = enclosingLabel.getBoundingClientRect();
              effectiveWidth = Math.max(rect.width, labelRect.width);
              effectiveHeight = Math.max(rect.height, labelRect.height);
            }
          }
          if (effectiveWidth < targetMin - 0.5 || effectiveHeight < targetMin - 0.5) {
            issues.push(
              `[target-size] ${describeElement(control)} measured ${Math.round(effectiveWidth)}x${Math.round(effectiveHeight)}px (requires >= ${targetMin}x${targetMin} CSS px)`
            );
          }
        }
      }

      if (runReflow) {
        const doc = document.documentElement;
        const rootRect = root.getBoundingClientRect();
        if (doc.scrollWidth > doc.clientWidth + 1) {
          issues.push(
            `[horizontal-reflow] documentElement scrollWidth=${doc.scrollWidth}px exceeds clientWidth=${doc.clientWidth}px`
          );
        }
        if (root instanceof HTMLElement && root.scrollWidth > root.clientWidth + 1) {
          issues.push(
            `[horizontal-reflow] ${describeElement(root)} scrollWidth=${root.scrollWidth}px exceeds clientWidth=${root.clientWidth}px`
          );
        }
        if (rootRect.right > doc.clientWidth + 1) {
          issues.push(
            `[horizontal-reflow] ${describeElement(root)} right=${Math.round(rootRect.right)}px exceeds viewport width=${doc.clientWidth}px`
          );
        }
      }

      return issues;
    },
    {
      rootSelector,
      excludeSelectors,
      contrastLevel,
      checkContrast,
      checkTargetSize,
      checkHorizontalReflow,
      minTargetPx,
    }
  );

  if (violations.length > 0) {
    throw new Error(
      `Cookbook visual/accessibility contract violations (${violations.length}):\n${violations
        .map((v) => `  - ${v}`)
        .join('\n')}`
    );
  }
}
