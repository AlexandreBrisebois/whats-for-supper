import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

/** Browser geometry and rendered colour inputs shared by the two Tonight card suites. */
export async function expectTonightLayout(
  page: Page,
  card: Locator,
  testInfo: TestInfo,
  label: string
) {
  await expect
    .poll(() =>
      card.evaluate((node) =>
        Array.from(node.querySelectorAll<HTMLElement>('*')).every(
          (el) =>
            !el.dataset.layoutFont ||
            Math.abs(parseFloat(getComputedStyle(el).fontSize) - parseFloat(el.style.fontSize)) <
              0.1
        )
      )
    )
    .toBe(true);
  await card.evaluate(async (node) => {
    await Promise.all(
      node.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {}))
    );
  });
  const geometry = await card.evaluate((node) => {
    const outer = node.getBoundingClientRect();
    const elements = Array.from(
      node.querySelectorAll<HTMLElement>('h2, h3, h4, p, button, a, span')
    ).filter(
      (el) => getComputedStyle(el).pointerEvents !== 'none' && el.getBoundingClientRect().width > 0
    );
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    const rgb = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    };
    return {
      pageWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
      clipped: elements
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return (
            r.left < outer.left - 1 ||
            r.right > outer.right + 1 ||
            r.top < outer.top - 1 ||
            r.bottom > outer.bottom + 1 ||
            el.scrollWidth > el.clientWidth + 1
          );
        })
        .map((el) => el.textContent),
      targets: elements
        .filter((el) => el.matches('button, a'))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { text: el.textContent, width: r.width, height: r.height };
        }),
      text: elements
        .filter(
          (el) => el.textContent?.trim() && !el.querySelector('h2, h3, h4, p, button, a, span')
        )
        .map((el) => {
          const r = el.getBoundingClientRect();
          const css = getComputedStyle(el);
          const control = el.closest('button, a');
          return {
            text: el.textContent,
            foreground: rgb(css.color),
            fontSize: css.fontSize,
            fontWeight: css.fontWeight,
            lineHeight: css.lineHeight,
            rect: { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height },
            borderRect: control
              ? (() => {
                  const r = control.getBoundingClientRect();
                  return { x: r.left + scrollX, y: r.top + scrollY, height: r.height };
                })()
              : null,
            border: control ? rgb(getComputedStyle(control).borderTopColor) : null,
          };
        }),
    };
  });
  expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.clipped).toEqual([]);
  for (const target of geometry.targets) {
    expect(target.width, target.text ?? '').toBeGreaterThanOrEqual(48);
    expect(target.height, target.text ?? '').toBeGreaterThanOrEqual(48);
  }
  for (const text of geometry.text) {
    expect(parseFloat(text.lineHeight), text.text ?? '').toBeGreaterThanOrEqual(
      parseFloat(text.fontSize)
    );
  }
  const controls = card.locator('button:visible, a:visible');
  const clearance = [];
  for (const control of await controls.all()) {
    await expect(control).toHaveAccessibleName(/\S/);
    await control.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const position = await control.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const nav = document.querySelector('nav')!.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {
        label: el.textContent,
        top: r.top,
        bottom: r.bottom,
        navTop: nav.top,
        hit: hit === el || el.contains(hit),
      };
    });
    expect(position.top).toBeGreaterThanOrEqual(0);
    expect(position.bottom).toBeLessThanOrEqual(position.navTop);
    expect(position.hit, JSON.stringify(position)).toBe(true);
    clearance.push(position);
  }
  // Full-page image coordinates match the document-space rectangles above.
  const screenshot = testInfo.outputPath(`${label}.png`);
  await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
  // Separate surface sample avoids fixed navigation/dev overlays in document-space colour sampling.
  // The ordinary screenshot above and center hit-testing retain navigation evidence.
  await page.screenshot({
    path: testInfo.outputPath(`${label}-surface.png`),
    fullPage: true,
    animations: 'disabled',
    style: 'nav, nextjs-portal { visibility: hidden !important; }',
  });
  const measurements = testInfo.outputPath(`${label}.json`);
  await writeFile(measurements, JSON.stringify({ ...geometry, clearance }, null, 2));
  await testInfo.attach(label, { path: screenshot, contentType: 'image/png' });
  await testInfo.attach(`${label}-measurements`, {
    path: measurements,
    contentType: 'application/json',
  });
}

/** Measure available controls without activating callbacks or submitting a plan change. */
export async function recordTonightControlStates(page: Page, card: Locator, testInfo: TestInfo) {
  for (const control of await card.locator('button:visible, a:visible').all()) {
    const id = await control.getAttribute('data-testid');
    await control.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await control.focus();
    // Real keyboard navigation establishes focus-visible rather than pointer focus.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(control).toBeFocused();
    const outline = await control.evaluate((el) => getComputedStyle(el).outlineWidth);
    expect(parseFloat(outline)).toBeGreaterThanOrEqual(2);
    for (const state of ['focus', 'hover', 'pressed'] as const) {
      if (state === 'hover') await control.hover();
      if (state === 'pressed') await page.mouse.down();
      const path = testInfo.outputPath(`${id}-${state}.png`);
      // Locator screenshots wait for geometry to settle, including pressed scale and hover filters.
      await control.screenshot({ path, animations: 'disabled' });
      const styles = await control.evaluate((el) => {
        const css = getComputedStyle(el);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d')!;
        const rgb = (color: string) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          return Array.from(ctx.getImageData(0, 0, 1, 1).data);
        };
        const r = el.getBoundingClientRect();
        return {
          label: el.textContent,
          foreground: rgb(css.color),
          border: rgb(css.borderTopColor),
          filter: css.filter,
          outline: css.outline,
          width: r.width,
          height: r.height,
        };
      });
      expect(styles.width).toBeGreaterThanOrEqual(48);
      expect(styles.height).toBeGreaterThanOrEqual(48);
      await writeFile(testInfo.outputPath(`${id}-${state}.json`), JSON.stringify(styles, null, 2));
      await testInfo.attach(`${id}-${state}`, { path, contentType: 'image/png' });
    }
    // Release outside the card so measurement cannot activate an action.
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await control.blur();
    await control.evaluate(async (el) => {
      await Promise.all(
        el.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {}))
      );
    });
  }
}
