import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_IDS } from '@/testing/mock-ids';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

// Substitute HTTP only: exercise the real generated client, JSON codec and family adapter.
vi.mock('./api-client', async () => {
  const { FetchRequestAdapter, HttpClient } = await import('@microsoft/kiota-http-fetchlibrary');
  const { createApiClient } = await import('./generated/apiClient');
  const adapter = new FetchRequestAdapter(
    { authenticateRequest: async () => {} },
    undefined,
    undefined,
    new HttpClient(fetchMock)
  );
  adapter.baseUrl = 'https://family.test';
  return { apiClient: createApiClient(adapter) };
});

import { createFamilyMember } from './family';

beforeEach(() => fetchMock.mockReset());

describe('family creation contract and client', () => {
  it('documents POST creation as 201 while retaining GET 200', () => {
    const spec = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../../../specs/openapi.yaml'),
      'utf8'
    );
    const family = spec.split('  /api/family:\n')[1].split('\n  /api/family/me:')[0];
    const [get, post] = family.split('\n    post:\n');
    expect(get).toContain("'200':");
    expect(post).toContain("'201':");
    expect(post).toContain("'409':");
    expect(post).toContain('summary: Create a family member');
    expect(post).not.toContain("'200':");
  });

  it('deserializes a real 201 envelope through the generated client and adapter', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: MOCK_IDS.MEMBER_TEST,
            name: 'aLeX',
            browseViewMode: 'stack',
            cookingViewMode: null,
            preferredLanguage: null,
            createdAt: '2026-10-15T12:00:00Z',
            updatedAt: '2026-10-15T12:00:00Z',
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await expect(createFamilyMember({ name: 'aLeX' })).resolves.toEqual({
      id: MOCK_IDS.MEMBER_TEST,
      name: 'aLeX',
      browseViewMode: 'stack',
      cookingViewMode: null,
      preferredLanguage: '',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://family.test/api/family');
    expect(request.method).toBe('POST');
    expect(JSON.parse(new TextDecoder().decode(request.body))).toEqual({ name: 'aLeX' });
  });

  it('propagates 409 conflict error when creating a duplicate member', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 409,
          message: 'A family member with this name already exists.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await expect(createFamilyMember({ name: 'Alex' })).rejects.toThrow();
  });
});
