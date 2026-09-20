import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));

function readOpenApiSpec(): string {
  return readFileSync(resolve(currentDir, '../../../../specs/openapi.yaml'), 'utf8');
}

describe('filter discovery contract', () => {
  it('defines a materialized-only filter vocabulary response and safe no-state fallback', () => {
    const spec = readOpenApiSpec();

    expect(spec).toContain('  /api/recipes/search/filters:');
    expect(spec).toContain('operationId: getRecipeSearchFilters');
    expect(spec).toContain(
      "schema: { $ref: '#/components/schemas/RecipeSearchFilterDiscoveryDto' }"
    );
    expect(spec).toContain('RecipeSearchFilterDiscoveryDto:');
    expect(spec).toContain('required: [generatedAt, main, mealTypes, cuisines]');
    expect(spec).toContain("generatedAt: { type: [string, 'null'], format: date-time");
    expect(spec).toContain('promoted: { type: array, items: { type: string } }');
    expect(spec).toContain('all: { type: array, items: { type: string } }');
    expect(spec).toContain('generatedAt: null');
    expect(spec).toContain('promoted: []');
    expect(spec).toContain('all: []');
  });

  it('keeps Main semantic and ordered while fixed Meal Types stay closed', () => {
    const spec = readOpenApiSpec();

    expect(spec).toContain('RecipeSearchMainDefinitionDto:');
    expect(spec).toContain('required: [id, concept, label]');
    expect(spec).toContain('concept: { type: string }');
    expect(spec).toContain("label: { type: [string, 'null']");
    expect(spec).toContain('enum: [Supper, Lunch, Breakfast, Dessert]');
    expect(spec).toContain('concept-only requests are ranked searches');
    expect(spec).toContain('lexical fallback uses the non-blank selected concepts');
  });
});
