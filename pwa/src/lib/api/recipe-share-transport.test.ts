import { afterEach, expect, it, vi } from 'vitest';
vi.mock('./demo-session', () => ({
  demoFetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
}));
vi.mock('@/store/familyStore', () => ({
  useFamilyStore: {
    getState: () => ({ selectedFamilyMemberId: '09000000-0000-4000-8000-000000000001' }),
  },
}));
vi.mock('@/store/plannerStore', () => ({
  usePlannerStore: {
    getState: () => ({ localMoveSeq: 0, confirmedMoveSeq: 0, sseConnectionId: null }),
  },
}));
import { importRecipeShareBundle } from './recipes';
import { builders } from '@/testing/builders';
afterEach(() => vi.unstubAllGlobals());
it('does not create a second imported recipe after a committed request loses its successful reply', async () => {
  let created = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      created++;
      return created === 1
        ? new Response(JSON.stringify({ message: 'Reply lost after publication.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json', 'Retry-After': '0' },
          })
        : new Response(JSON.stringify({ data: builders.recipe() }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
    })
  );
  let failure: unknown;
  try {
    await importRecipeShareBundle(builders.recipeShareBundle());
  } catch (error) {
    failure = error;
  }
  expect(created).toBe(1);
  expect(failure).toBeDefined();
});
