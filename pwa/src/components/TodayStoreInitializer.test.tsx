import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TodayStoreInitializer } from './TodayStoreInitializer';
import { useTodayStore } from '@/store/todayStore';

const calendar = {
  timeZone: 'UTC',
  capturedAtUtc: '2026-10-12T01:30:00Z',
  today: '2026-10-12',
  currentWeekStartDate: '2026-10-12',
  referenceWeekStartDate: '2026-10-12',
  nextDayAtUtc: '2026-10-13T00:00:00Z',
};

describe('TodayStoreInitializer authoritative day', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('seeds the deployment Monday plan even while the device is on Sunday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 11, 23, 30));
    const init = vi.spyOn(useTodayStore.getState(), 'init');
    render(
      <TodayStoreInitializer
        todaysRecipe={null}
        todayStatus={3}
        todayDate="2026-10-12"
        calendar={calendar as any}
        nonCooking={{ kind: 'order_in' }}
      />
    );
    expect(init).toHaveBeenCalledWith(null, 3, { kind: 'order_in' }, calendar);
  });

  it.each([
    { kind: 'eating_out' as const, customLabel: null },
    { kind: 'custom' as const, customLabel: "Supper at mom's" },
  ])('initializes the same local day with its saved $kind details', (plan) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 11, 23, 30));
    const init = vi.spyOn(useTodayStore.getState(), 'init');
    render(
      <TodayStoreInitializer
        todaysRecipe={null}
        todayStatus={3}
        todayDate="2026-10-11"
        calendar={{ ...calendar, today: '2026-10-11' } as any}
        nonCooking={plan}
      />
    );
    expect(init).toHaveBeenCalledWith(null, 3, plan, { ...calendar, today: '2026-10-11' });
  });
});
