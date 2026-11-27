import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((destination: string): never => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: (destination: string) => mocks.redirect(destination),
}));

import LegacyBrowseRedirect from './page';

describe('LegacyBrowseRedirect', () => {
  beforeEach(() => {
    mocks.redirect.mockClear();
  });

  it('redirects bare /browse-all-stack requests to /recipes without a trailing query mark', async () => {
    await expect(LegacyBrowseRedirect({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'NEXT_REDIRECT:/recipes'
    );

    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith('/recipes');
  });

  it.each([
    ['gotoOnly', 'true', '/recipes?gotoOnly=true'],
    ['discoverableOnly', '1', '/recipes?discoverableOnly=1'],
    ['focus', 'poultry', '/recipes?focus=poultry'],
    [
      'similarTo',
      '11111111-1111-4111-8111-111111111111',
      '/recipes?similarTo=11111111-1111-4111-8111-111111111111',
    ],
    [
      'open',
      '22222222-2222-4222-8222-222222222222',
      '/recipes?open=22222222-2222-4222-8222-222222222222',
    ],
    ['addToDay', '3', '/recipes?addToDay=3'],
    ['weekOffset', '1', '/recipes?weekOffset=1'],
    ['referenceWeekStartDate', '2026-05-04', '/recipes?referenceWeekStartDate=2026-05-04'],
  ])('forwards supported query param %s to /recipes', async (key, value, expectedDestination) => {
    await expect(
      LegacyBrowseRedirect({ searchParams: Promise.resolve({ [key]: value }) })
    ).rejects.toThrow(`NEXT_REDIRECT:${expectedDestination}`);

    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith(expectedDestination);
  });

  it('preserves all supported context params in canonical order while ignoring unsupported or non-string params', async () => {
    const incoming: Record<string, string | string[] | undefined> = {
      utm_source: 'share',
      referenceWeekStartDate: '2026-05-04',
      weekOffset: '0',
      addToDay: '2',
      open: 'recipe-123',
      similarTo: 'recipe-456',
      focus: 'quick pasta',
      discoverableOnly: 'false',
      gotoOnly: 'true',
      page: '3',
      tags: ['dinner', 'easy'],
      emptyParam: undefined,
    };

    const expected =
      '/recipes?gotoOnly=true&discoverableOnly=false&focus=quick+pasta&similarTo=recipe-456&open=recipe-123&addToDay=2&weekOffset=0&referenceWeekStartDate=2026-05-04';

    await expect(LegacyBrowseRedirect({ searchParams: Promise.resolve(incoming) })).rejects.toThrow(
      `NEXT_REDIRECT:${expected}`
    );

    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('omits query string entirely when only unsupported or array-valued params are present', async () => {
    await expect(
      LegacyBrowseRedirect({
        searchParams: Promise.resolve({
          foo: 'bar',
          gotoOnly: ['true', 'false'],
          open: undefined,
        }),
      })
    ).rejects.toThrow('NEXT_REDIRECT:/recipes');

    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith('/recipes');
  });
});
