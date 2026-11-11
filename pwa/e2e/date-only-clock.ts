import type { Page } from '@playwright/test';

// Pin the civil calendar without replacing performance/RAF: their clock must
// remain aligned with the native animation timeline after each navigation.
export async function pinCivilDate(page: Page, isoDate: string) {
  await page.addInitScript((value) => {
    const RealDate = Date;
    const pinned = new RealDate(value).getTime();
    // @ts-ignore
    globalThis.Date = class extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(pinned);
        } else {
          // @ts-ignore
          super(...args);
        }
      }
      static now() {
        return pinned;
      }
    };
  }, isoDate);
}
