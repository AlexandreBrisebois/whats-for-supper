import { beforeEach, describe, expect, it, vi } from 'vitest';
import { builders } from '@/testing/builders';
import { MOCK_IDS } from '@/testing/mock-ids';

const { fetchResponse } = vi.hoisted(() => ({ fetchResponse: vi.fn() }));
vi.mock('./api-client', async () => {
  const { FetchRequestAdapter, HttpClient } = await import('@microsoft/kiota-http-fetchlibrary');
  const { createApiClient } = await import('./generated/apiClient');
  const requestAdapter = new FetchRequestAdapter(
    { authenticateRequest: async () => {} },
    undefined,
    undefined,
    new HttpClient(fetchResponse)
  );
  requestAdapter.baseUrl = 'http://localhost';
  return { requestAdapter, apiClient: createApiClient(requestAdapter) };
});
import { saveRecipeImportIssue } from './recipes';

const draft = { reasons: ['duplicate' as const], note: null };
function response() {
  return {
    updatedAt: new Date().toISOString(),
    recipe: builders.recipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      importIssue: {
        reasons: ['duplicate'],
        note: null,
        status: 'reported',
        isReimporting: false,
        reimportFailureMessage: null,
        reimportFailureImportId: null,
      },
    }),
    reimportStarted: false,
    reimportLaunchFailed: false,
    importId: null,
  };
}
async function save(raw: unknown) {
  // Real generated request construction, installed adapter and generated decoder.
  fetchResponse.mockResolvedValue(
    new Response(JSON.stringify(raw), { headers: { 'Content-Type': 'application/json' } })
  );
  return saveRecipeImportIssue(MOCK_IDS.RECIPE_LASAGNA, draft);
}

describe('Save result validity before generated response normalization', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(['reported', 'readyToReview'] as const)(
    'recognizes manual and unchanged %s feedback',
    async (status) => {
      const raw = response();
      raw.recipe.importIssue!.status = status;
      const result = await save(raw);
      expect(result).toMatchObject({
        issueResult: 'saved_manual',
        reimportStarted: false,
        importId: null,
      });
      expect(fetchResponse).toHaveBeenCalledTimes(1);
      expect(JSON.parse(new TextDecoder().decode(fetchResponse.mock.calls[0][1].body))).toEqual(
        draft
      );
    }
  );
  it('recognizes new or reused processing acknowledgement without carrying its identity in classification', async () => {
    const raw = { ...response(), reimportStarted: true, importId: MOCK_IDS.RECIPE_CHICKEN };
    raw.recipe.importIssue!.isReimporting = true;
    expect(await save(raw)).toMatchObject({
      issueResult: 'processing_acknowledged',
      importId: MOCK_IDS.RECIPE_CHICKEN,
    });
  });
  it('recognizes explicit saved launch failure', async () => {
    expect(await save({ ...response(), reimportLaunchFailed: true })).toMatchObject({
      issueResult: 'saved_launch_failed',
    });
  });
  it.each([
    ['numeric import identity', { importId: 42 }],
    ['object import identity', { importId: { private: 'invalid' } }],
    ['missing started', { reimportStarted: undefined }],
    ['missing launch failed', { reimportLaunchFailed: undefined }],
    ['string started', { reimportStarted: 'false' }],
    ['null launch failed', { reimportLaunchFailed: null }],
    ['missing import identity field', { importId: undefined }],
    [
      'both flags true',
      { reimportStarted: true, reimportLaunchFailed: true, importId: MOCK_IDS.RECIPE_CHICKEN },
    ],
    ['started without identity', { reimportStarted: true }],
    ['identity without start', { importId: MOCK_IDS.RECIPE_CHICKEN }],
    ['missing update clock', { updatedAt: undefined }],
  ])(
    'keeps %s unconfirmed while preserving existing return normalization',
    async (_label, fields) => {
      const result = await save({ ...response(), ...fields });
      expect(result).toMatchObject({ issueResult: 'unconfirmed' });
      expect(result.recipe.id).toBe(MOCK_IDS.RECIPE_LASAGNA);
    }
  );
  it.each(['1', '2026-02-30T00:00:00Z', '2026-10-31', '2026-10-31T24:00:00Z'])(
    'rejects invalid raw response clocks %s without changing product decoding',
    async (clock) => {
      const raw = response();
      for (const fields of [
        { ...raw, updatedAt: clock },
        { ...raw, recipe: { ...raw.recipe, createdAt: clock } },
      ]) {
        const result = await save(fields);
        expect(result.issueResult).toBe('unconfirmed');
        expect(result.recipe.id).toBe(MOCK_IDS.RECIPE_LASAGNA);
      }
    }
  );
  it.each(['2024-02-29T12:34:56.1234567Z', '2026-10-31T12:34:56+05:30'])(
    'retains valid response clocks %s',
    async (clock) => {
      const raw = response();
      expect(
        (await save({ ...raw, updatedAt: clock, recipe: { ...raw.recipe, createdAt: clock } }))
          .issueResult
      ).toBe('saved_manual');
    }
  );
  it.each([
    { name: { private: 'invalid' } },
    { imageUrl: 42 },
    { importIssue: { ...response().recipe.importIssue, reasons: ['duplicate', 'privateUnknown'] } },
    { importIssue: { ...response().recipe.importIssue, note: { private: 'invalid' } } },
    { importIssue: { ...response().recipe.importIssue, reimportFailureMessage: 42 } },
    { importIssue: { ...response().recipe.importIssue, reasons: ['duplicate', 'duplicate'] } },
    { id: MOCK_IDS.RECIPE_CHICKEN },
    { id: '' },
    { isReady: undefined },
    { sourceType: 'private-unknown' },
    { createdAt: 'not-a-clock' },
    { canReimport: undefined },
    { imageCount: -1 },
    { importIssue: null },
    { importIssue: { status: 'private-unknown', reasons: ['duplicate'] } },
  ])('does not infer persistence from unusable authoritative detail %j', async (fields) => {
    const raw = response();
    expect(await save({ ...raw, recipe: { ...raw.recipe, ...fields } })).toMatchObject({
      issueResult: 'unconfirmed',
    });
  });
  it('preserves the existing missing-recipe error', async () => {
    await expect(save({ ...response(), recipe: undefined })).rejects.toThrow('Recipe not found');
  });
  it('preserves generated-client rejection without business retry', async () => {
    fetchResponse.mockRejectedValue(new Error('lost acknowledgement'));
    await expect(saveRecipeImportIssue(MOCK_IDS.RECIPE_LASAGNA, draft)).rejects.toThrow(
      'lost acknowledgement'
    );
    expect(fetchResponse).toHaveBeenCalledTimes(1);
  });
});
