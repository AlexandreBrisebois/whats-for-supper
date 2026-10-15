/**
 * Property-based and unit tests for getImageUrl.
 *
 * Feature: remove-backend-proxy & direct-api-calls
 *
 * Validates:
 * - Requirements 5.1, 5.2, 5.3: No /backend prepend, relative /api/ paths preserved when base URL is unset/empty
 * - Configured API origin: Prepends NEXT_PUBLIC_API_BASE_URL when present (cross-origin direct access)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { getImageUrl } from './imageUtils';

describe('Feature: remove-backend-proxy & image URL resolution', () => {
  let originalApiBaseUrl: string | undefined;

  beforeEach(() => {
    originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  afterEach(() => {
    if (originalApiBaseUrl !== undefined) {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    } else {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    }
  });

  describe('Property 2: getImageUrl returns /api/ paths unchanged when base URL is unset or empty', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    });

    /**
     * **Validates: Requirements 5.1, 5.2, 5.3**
     *
     * For any string with an `/api/` prefix, `getImageUrl` MUST return that
     * string unchanged when NEXT_PUBLIC_API_BASE_URL is unset — no `/backend` prepend
     * or any other transformation.
     */
    it('returns any /api/ path unchanged', () => {
      fc.assert(
        fc.property(
          fc.string().map((suffix) => `/api/${suffix}`),
          (path) => {
            expect(getImageUrl(path)).toBe(path);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 5.3**
     *
     * Concrete example: getImageUrl('/api/recipes/123/original/0') must return
     * '/api/recipes/123/original/0' exactly.
     */
    it('example: getImageUrl("/api/recipes/123/original/0") returns the path unchanged', () => {
      expect(getImageUrl('/api/recipes/123/original/0')).toBe('/api/recipes/123/original/0');
    });

    /**
     * **Validates: Requirements 5.2**
     *
     * Concrete example: the result must NOT start with /backend for any /api/ path.
     */
    it('example: getImageUrl does not prepend /backend to /api/ paths', () => {
      const result = getImageUrl('/api/recipes/abc/original/1');
      expect(result.startsWith('/backend')).toBe(false);
    });

    it('returns /api/ paths unchanged when NEXT_PUBLIC_API_BASE_URL is an empty string', () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = '';
      expect(getImageUrl('/api/recipes/123/original/0')).toBe('/api/recipes/123/original/0');
    });
  });

  describe('getImageUrl with configured NEXT_PUBLIC_API_BASE_URL', () => {
    const testBaseUrl = 'http://127.0.0.1:5001';

    beforeEach(() => {
      process.env.NEXT_PUBLIC_API_BASE_URL = testBaseUrl;
    });

    it('prepends configured base URL to /api/ paths', () => {
      expect(getImageUrl('/api/recipes/123/original/0')).toBe(
        'http://127.0.0.1:5001/api/recipes/123/original/0'
      );
    });

    it('property: prepends configured base URL to any /api/ path', () => {
      fc.assert(
        fc.property(
          fc.string().map((suffix) => `/api/${suffix}`),
          (path) => {
            expect(getImageUrl(path)).toBe(`${testBaseUrl}${path}`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('normalizes trailing slash in NEXT_PUBLIC_API_BASE_URL without creating double slashes', () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:5001/';
      expect(getImageUrl('/api/recipes/123/original/0')).toBe(
        'http://127.0.0.1:5001/api/recipes/123/original/0'
      );
    });

    it('does not prepend /backend when base URL is configured', () => {
      const result = getImageUrl('/api/recipes/abc/original/1');
      expect(result.startsWith('/backend')).toBe(false);
    });
  });

  describe('non-API paths and edge cases', () => {
    it('returns empty string for null, undefined, or empty path', () => {
      expect(getImageUrl('')).toBe('');
      expect(getImageUrl(null)).toBe('');
      expect(getImageUrl(undefined)).toBe('');
    });

    it('returns absolute http and https URLs unchanged regardless of base URL', () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:5001';
      expect(getImageUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
      expect(getImageUrl('http://example.com/photo.jpg')).toBe('http://example.com/photo.jpg');
    });

    it('returns non-API relative paths unchanged regardless of base URL', () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:5001';
      expect(getImageUrl('/placeholder-recipe.jpg')).toBe('/placeholder-recipe.jpg');
    });
  });
});
