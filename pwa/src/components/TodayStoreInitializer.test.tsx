import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TodayStoreInitializer } from './TodayStoreInitializer';
import { useTodayStore } from '@/store/todayStore';

describe('TodayStoreInitializer local day', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('does not seed Home with the server’s Monday plan while it is Sunday locally', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 11, 23, 30));
    const init = vi.spyOn(useTodayStore.getState(), 'init');
    render(
      <TodayStoreInitializer
        todaysRecipe={null}
        todayStatus={3}
        todayDate="2026-10-12"
        nonCooking={{ kind: 'order_in' }}
      />
    );
    expect(init).not.toHaveBeenCalled();
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
        nonCooking={plan}
      />
    );
    expect(init).toHaveBeenCalledWith(null, 3, plan);
  });
});
