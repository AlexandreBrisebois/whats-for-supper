import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));

function readGeneratedModels(): string {
  return readFileSync(resolve(currentDir, 'generated/models/index.ts'), 'utf8');
}

function readOpenApiSpec(): string {
  return readFileSync(resolve(currentDir, '../../../../specs/openapi.yaml'), 'utf8');
}

function interfaceBlock(source: string, name: string): string {
  const match = source.match(
    new RegExp(`export interface ${name}[^\\n]*\\{([\\s\\S]*?)\\n\\}`, 'm')
  );
  expect(match, `${name} should exist in generated models`).not.toBeNull();
  return match![1];
}

describe('recipe import report contract', () => {
  it('preserves healthyOnly through OpenAPI generation', () => {
    const spec = readOpenApiSpec();
    const schema = spec.match(/RecipeSearchFiltersDto:\n([\s\S]*?)\n\n    RecipeSearchReasonDto:/m);
    expect(schema, 'RecipeSearchFiltersDto should exist in OpenAPI').not.toBeNull();
    expect(schema![1]).toContain('healthyOnly:');

    const generated = interfaceBlock(readGeneratedModels(), 'RecipeSearchFiltersDto');
    expect(generated).toContain('healthyOnly?: boolean | null;');
  });

  it('generates the public report types and recipe detail projection', () => {
    const generated = readGeneratedModels();
    expect(generated).toContain('export const RecipeImportIssueReasonObject = {');
    expect(generated).toContain("Ingredients: 'ingredients'");
    expect(generated).toContain("Steps: 'steps'");
    expect(generated).toContain("Duplicate: 'duplicate'");
    expect(interfaceBlock(generated, 'RecipeImportIssueRequest')).toContain(
      'reasons?: RecipeImportIssueReason[] | null;'
    );
    expect(interfaceBlock(generated, 'RecipeImportIssueDto')).toContain(
      'status?: RecipeImportIssueStatus | null;'
    );
    expect(interfaceBlock(generated, 'RecipeDto')).toContain(
      'importIssue?: RecipeImportIssueDto | null;'
    );
  });
});
