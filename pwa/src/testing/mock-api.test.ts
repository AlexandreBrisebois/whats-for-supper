import { describe, expect, it, vi } from 'vitest';
import type { Page, Route } from '@playwright/test';
import { MOCK_IDS, setupCommonRoutes } from '../../e2e/mock-api';

async function assignmentWithNotificationError(error: Error) {
  const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(
      async (pattern: Parameters<Page['route']>[0], handler: (route: Route) => Promise<unknown>) =>
        handlers.set(pattern, handler)
    ),
    evaluate: vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(error),
  };
  await setupCommonRoutes(page as unknown as Page);
  const fulfill = vi.fn().mockResolvedValue(undefined);
  const route = {
    request: () => ({
      method: () => 'POST',
      url: () => 'http://localhost/api/schedule/assign',
      postDataJSON: () => ({ weekOffset: 1, dayIndex: 2, recipeId: MOCK_IDS.RECIPE_CHICKEN }),
    }),
    fulfill,
  } as unknown as Route;
  return { handlers, fulfill, assign: () => handlers.get('**/api/schedule/assign**')!(route) };
}

describe('stateful mock post-commit session notifications', () => {
  it.each(['', '.'])(
    'preserves committed state when navigation drops a notification (%s)',
    async (suffix) => {
      const { handlers, fulfill, assign } = await assignmentWithNotificationError(
        new Error(
          `page.evaluate: Execution context was destroyed, most likely because of a navigation${suffix}`
        )
      );
      await expect(assign()).resolves.toBeUndefined();
      expect(fulfill).toHaveBeenCalled();
      const read = vi.fn();
      await handlers.get('**/api/discovery/session')!({
        request: () => ({ method: () => 'GET' }),
        fulfill: read,
      } as unknown as Route);
      expect(read.mock.calls[0][0].json.data.revision).toBe(1);
      const url = new URL('http://localhost/api/schedule?weekOffset=1');
      const scheduleHandler = [...handlers].find(
        ([pattern]) => typeof pattern === 'function' && pattern(url)
      )![1];
      const schedule = vi.fn();
      await scheduleHandler({
        request: () => ({ method: () => 'GET', url: () => url.href }),
        fulfill: schedule,
      } as unknown as Route);
      expect(schedule.mock.calls[0][0].json.data.days[2].recipe.id).toBe(MOCK_IDS.RECIPE_CHICKEN);
    }
  );

  it('surfaces unexpected notification errors', async () => {
    const error = new Error('page.evaluate: snapshot serialization failed');
    const { assign } = await assignmentWithNotificationError(error);
    await expect(assign()).rejects.toBe(error);
  });
});
