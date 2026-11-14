import { describe, expect, it, vi } from 'vitest';
import type { Page, Route } from '@playwright/test';
import { setupCommonRoutes } from '../../e2e/mock-api';

describe('generic settings vocabulary authority guard', () => {
  it('rejects only the reserved POST, retains readable state, and keeps unrelated settings writable', async () => {
    const handlers = new Map<Parameters<Page['route']>[0], (route: Route) => Promise<unknown>>();
    const page = {
      route: vi.fn(
        async (
          pattern: Parameters<Page['route']>[0],
          handler: (route: Route) => Promise<unknown>
        ) => handlers.set(pattern, handler)
      ),
      evaluate: vi.fn().mockResolvedValue(undefined),
    };
    await setupCommonRoutes(page as unknown as Page);
    const handler = handlers.get('**/api/settings/*')!;
    const call = async (method: string, key: string, value?: unknown) => {
      const fulfill = vi.fn();
      await handler({
        request: () => ({
          method: () => method,
          url: () => `http://localhost/api/settings/${key}`,
          postDataJSON: () => ({ key, value }),
        }),
        fulfill,
        fallback: vi.fn(),
      } as unknown as Route);
      const response = fulfill.mock.calls[0][0];
      return { status: response.status, body: response.json ?? JSON.parse(response.body) };
    };
    const key = 'food_vocabulary_publication';
    const before = await call('GET', key);
    expect((await call('POST', `${key}_unrelated`, { keep: 'ordinary' })).status).toBe(200);
    const refused = await call('POST', key, { attempted: 'generic-authority-overwrite' });
    expect(refused.status).toBe(400);
    expect(await call('GET', key)).toEqual(before);
    expect((await call('GET', `${key}_unrelated`)).body.data.value).toEqual({ keep: 'ordinary' });
    expect((await call('POST', 'supper_servings_default', { servings: 4 })).status).toBe(400);
  });
});
