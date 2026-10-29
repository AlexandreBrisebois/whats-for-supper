import { expect, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** Measure the rendered foreground against its composited ancestor backgrounds. */
export async function recordGotoContrast(control: Locator, path: string, focus = false) {
  const measured = await control.evaluate((node) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    const rgba = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    };
    const backgrounds: number[][] = [];
    for (let current: Element | null = node; current; current = current.parentElement)
      backgrounds.unshift(rgba(getComputedStyle(current).backgroundColor));
    let background = [255, 255, 255];
    let adjacent = background;
    for (const [index, layer] of backgrounds.entries()) {
      if (index === backgrounds.length - 1) adjacent = [...background];
      background = background.map(
        (value, channel) => (layer[channel] * layer[3]) / 255 + value * (1 - layer[3] / 255)
      );
    }
    const css = getComputedStyle(node);
    return {
      foreground: rgba(css.color),
      background,
      adjacent,
      outline: rgba(css.outlineColor),
      outlineWidth: parseFloat(css.outlineWidth),
      outlineStyle: css.outlineStyle,
      opacity: css.opacity,
      label: node.textContent,
      pressed: node.getAttribute('aria-pressed'),
      disabled: node.hasAttribute('disabled'),
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
    };
  });
  const luminance = (color: number[]) =>
    color
      .slice(0, 3)
      .map((value) => {
        const scaled = value / 255;
        return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const ratio = (foreground: number[], background: number[]) => {
    const composed = foreground
      .slice(0, 3)
      .map(
        (value, index) =>
          (value * foreground[3]) / 255 + background[index] * (1 - foreground[3] / 255)
      );
    const a = luminance(composed),
      b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const textContrast = ratio(measured.foreground, measured.background);
  const focusContrast = ratio(measured.outline, measured.adjacent);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify({ ...measured, textContrast, focusContrast }, null, 2));
  expect(textContrast).toBeGreaterThanOrEqual(4.5);
  expect(Number(measured.opacity)).toBe(1);
  if (focus) {
    expect(measured.outlineWidth).toBeGreaterThanOrEqual(2);
    expect(measured.outlineStyle).not.toBe('none');
    expect(focusContrast).toBeGreaterThanOrEqual(3);
  }
  return { textContrast, focusContrast };
}
