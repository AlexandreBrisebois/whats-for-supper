import { expect, type Locator, type TestInfo } from '@playwright/test';

export async function expectDiscoveryGeometry(
  toggle: Locator,
  pressed: boolean,
  testInfo: TestInfo,
  label: string
) {
  const measure = () =>
    toggle.getByTestId('discovery-switch').evaluate((thumb) => {
      const track = thumb.parentElement!;
      const button = track.parentElement!;
      const t = track.getBoundingClientRect();
      const k = thumb.getBoundingClientRect();
      const b = button.getBoundingClientRect();
      const round = (n: number) => Math.round(n * 100) / 100;
      return {
        trackWidth: round(t.width),
        trackHeight: round(t.height),
        thumbWidth: round(k.width),
        thumbHeight: round(k.height),
        thumbOffset: round(k.left - t.left),
        thumbContained:
          k.left >= t.left && k.right <= t.right && k.top >= t.top && k.bottom <= t.bottom,
        trackContained:
          t.left >= b.left && t.right <= b.right && t.top >= b.top && t.bottom <= b.bottom,
        noHorizontalOverflow: button.scrollWidth <= button.clientWidth,
      };
    });
  try {
    await expect.poll(measure).toEqual({
      trackWidth: 56,
      trackHeight: 32,
      thumbWidth: 24,
      thumbHeight: 24,
      thumbOffset: pressed ? 28 : 4,
      thumbContained: true,
      trackContained: true,
      noHorizontalOverflow: true,
    });
  } finally {
    await testInfo.attach(`${label}-geometry`, {
      body: JSON.stringify(await measure(), null, 2),
      contentType: 'application/json',
    });
  }
}
