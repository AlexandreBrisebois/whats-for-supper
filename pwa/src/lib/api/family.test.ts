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

import {
  createFamilyMember,
  getCurrentFamilyMember,
  getFamilyMembers,
  updateFamilyMemberPreferences,
} from './family';

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
            contrastMode: null,
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
      contrastMode: null,
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

  it('documents contrastMode as nullable standard|high in OpenAPI across family schemas', () => {
    const spec = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../../../specs/openapi.yaml'),
      'utf8'
    );
    const matches = spec.match(
      /contrastMode:\s*\n\s*type:\s*\[string,\s*'null'\]\s*\n\s*enum:\s*\[standard,\s*high\]/g
    );
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(6);
  });

  it('maps contrastMode across family list, current member, and preferences update', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: MOCK_IDS.MEMBER_TEST,
                name: 'Alex',
                browseViewMode: 'list',
                cookingViewMode: 'all-steps',
                preferredLanguage: 'fr',
                contrastMode: 'high',
                createdAt: '2026-10-15T12:00:00Z',
                updatedAt: '2026-10-15T12:00:00Z',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: MOCK_IDS.MEMBER_TEST,
              name: 'Alex',
              browseViewMode: 'list',
              cookingViewMode: null,
              preferredLanguage: null,
              contrastMode: 'standard',
              createdAt: '2026-10-15T12:00:00Z',
              updatedAt: '2026-10-15T12:00:00Z',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: MOCK_IDS.MEMBER_TEST,
              name: 'Alex',
              browseViewMode: 'list',
              cookingViewMode: null,
              preferredLanguage: null,
              contrastMode: 'high',
              createdAt: '2026-10-15T12:00:00Z',
              updatedAt: '2026-10-15T12:00:00Z',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    await expect(getFamilyMembers()).resolves.toEqual([
      {
        id: MOCK_IDS.MEMBER_TEST,
        name: 'Alex',
        browseViewMode: 'list',
        cookingViewMode: 'all-steps',
        preferredLanguage: 'fr',
        contrastMode: 'high',
      },
    ]);

    await expect(getCurrentFamilyMember()).resolves.toEqual({
      id: MOCK_IDS.MEMBER_TEST,
      name: 'Alex',
      browseViewMode: 'list',
      cookingViewMode: null,
      preferredLanguage: '',
      contrastMode: 'standard',
    });

    await expect(
      updateFamilyMemberPreferences(MOCK_IDS.MEMBER_TEST, { contrastMode: 'high' } as any)
    ).resolves.toEqual({
      id: MOCK_IDS.MEMBER_TEST,
      name: 'Alex',
      browseViewMode: 'list',
      cookingViewMode: null,
      preferredLanguage: '',
      contrastMode: 'high',
    });

    const [url, request] = fetchMock.mock.calls[2];
    expect(String(url)).toBe(`https://family.test/api/family/${MOCK_IDS.MEMBER_TEST}/preferences`);
    expect(request.method).toBe('PUT');
    expect(JSON.parse(new TextDecoder().decode(request.body))).toEqual({ contrastMode: 'high' });
  });
});
