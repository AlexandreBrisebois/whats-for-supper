/**
 * Property-based tests for getImageUrl.
 *
 * Feature: remove-backend-proxy
 * Property 2: getImageUrl returns /api/ paths unchanged
 *
 * Validates: Requirements 5.1, 5.2, 5.3
 *
 * NOTE: These tests are expected to FAIL until task 6 simplifies
 * `getImageUrl` by replacing the `/backend${path}` branch with `return path`.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getImageUrl } from './imageUtils';

describe('Feature: remove-backend-proxy', () => {
  describe('Property 2: getImageUrl returns /api/ paths unchanged', () => {
    /**
     * **Validates: Requirements 5.1, 5.2, 5.3**
     *
     * For any string with an `/api/` prefix, `getImageUrl` MUST return that
     * string unchanged — no `/backend` prepend or any other transformation.
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
  });
});
