/**
 * Property-based tests for serverFetch URL construction.
 *
 * Feature: remove-backend-proxy
 * Property 1: serverFetch constructs URLs without transformation
 *
 * Validates: Requirements 4.1, 4.2, 4.3
 *
 * NOTE: These tests are expected to FAIL until task 5 removes the
 * `.replace(/^\/backend/, '')` call from server-client.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mock next/headers — not available outside the Next.js runtime
// ---------------------------------------------------------------------------
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
  }),
}));

// ---------------------------------------------------------------------------
// Mock the config module so we control API_INTERNAL_URL in tests
// ---------------------------------------------------------------------------
vi.mock('@/lib/constants/config', () => ({
  API_INTERNAL_URL: 'http://test-api:9001',
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are registered
// ---------------------------------------------------------------------------
const { serverFetch } = await import('./server-client');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TEST_API_INTERNAL_URL = 'http://test-api:9001';

/**
 * Set up a global fetch mock that captures the URL it was called with and
 * returns a minimal successful JSON response.
 */
function setupFetchMock(): { capturedUrl: () => string | undefined } {
  let lastUrl: string | undefined;

  global.fetch = vi.fn().mockImplementation((url: string) => {
    lastUrl = url;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ result: 'ok' }),
    } as Response);
  });

  return { capturedUrl: () => lastUrl };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('serverFetch — URL construction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   *
   * Property 1: serverFetch constructs URLs without transformation
   *
   * For any arbitrary non-empty endpoint string (including strings starting
   * with /backend, /api, query strings, empty path segments), the URL passed
   * to fetch MUST equal API_INTERNAL_URL + endpoint with NO transformation.
   */
  it('Property 1: constructs URL as API_INTERNAL_URL + endpoint with no transformation', async () => {
    const { capturedUrl } = setupFetchMock();

    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary non-empty strings that look like URL paths/endpoints.
        // We use fc.string() with a minimum length of 1 to ensure non-empty.
        // We also include strings starting with /backend, /api, query strings, etc.
        fc.oneof(
          // Generic non-empty strings
          fc.string({ minLength: 1 }),
          // Strings starting with /backend (the case the current code strips)
          fc.string({ minLength: 1 }).map((s) => `/backend${s}`),
          // Strings starting with /api
          fc.string({ minLength: 1 }).map((s) => `/api${s}`),
          // Strings with query parameters
          fc.string({ minLength: 1 }).map((s) => `/api/schedule?weekOffset=${s}`)
        ),
        async (endpoint) => {
          await serverFetch(endpoint);
          const url = capturedUrl();
          expect(url).toBe(`${TEST_API_INTERNAL_URL}${endpoint}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.3**
   *
   * Concrete example: serverFetch('/api/schedule?weekOffset=0') must request
   * API_INTERNAL_URL + '/api/schedule?weekOffset=0' exactly.
   */
  it('example: serverFetch("/api/schedule?weekOffset=0") requests the correct URL', async () => {
    const { capturedUrl } = setupFetchMock();

    await serverFetch('/api/schedule?weekOffset=0');

    expect(capturedUrl()).toBe(`${TEST_API_INTERNAL_URL}/api/schedule?weekOffset=0`);
  });

  /**
   * **Validates: Requirements 4.2**
   *
   * Concrete example: a /backend-prefixed endpoint must NOT be stripped.
   * The URL must include the full /backend prefix.
   */
  it('example: serverFetch("/backend/api/schedule") does NOT strip the /backend prefix', async () => {
    const { capturedUrl } = setupFetchMock();

    await serverFetch('/backend/api/schedule');

    expect(capturedUrl()).toBe(`${TEST_API_INTERNAL_URL}/backend/api/schedule`);
  });
});
