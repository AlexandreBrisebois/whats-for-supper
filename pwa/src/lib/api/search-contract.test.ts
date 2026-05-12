import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);

function readGenerated(relativePath: string): string {
  return readFileSync(resolve(currentDir, 'generated', relativePath), 'utf8');
}

function extractInterface(source: string, interfaceName: string): string {
  const match = source.match(
    new RegExp(`export interface ${interfaceName}[^\n]*\\{([\\s\\S]*?)\\n\\}`, 'm')
  );

  expect(match, `${interfaceName} should exist in generated models`).not.toBeNull();

  return match![1];
}

describe('generated search contract', () => {
  it('includes RecipeSearchRequestDto and RecipeSearchResponseDto schemas', () => {
    const modelsSource = readGenerated('models/index.ts');

    expect(modelsSource).toContain('export interface RecipeSearchRequestDto');
    expect(modelsSource).toContain('export interface RecipeSearchResponseDto');
  });

  it('includes RecipeSearchResultDto with id, name, imageUrl, reasons, and plannerFitNote', () => {
    const modelsSource = readGenerated('models/index.ts');
    const block = extractInterface(modelsSource, 'RecipeSearchResultDto');

    expect(block).toContain('id?: Guid | null;');
    expect(block).toContain('name?: string | null;');
    expect(block).toContain('imageUrl?: string | null;');
    expect(block).toContain('reasons?: RecipeSearchReasonDto[] | null;');
    expect(block).toContain('plannerFitNote?: string | null;');
  });

  it('includes RecipeSearchReasonDto with source and label', () => {
    const modelsSource = readGenerated('models/index.ts');
    const block = extractInterface(modelsSource, 'RecipeSearchReasonDto');

    expect(block).toContain('source?: RecipeSearchReasonDto_source | null;');
    expect(block).toContain('label?: string | null;');
  });

  it('includes RecipeSearchFiltersDto with all six boolean filters', () => {
    const modelsSource = readGenerated('models/index.ts');
    const block = extractInterface(modelsSource, 'RecipeSearchFiltersDto');

    expect(block).toContain('newRecipes?: boolean | null;');
    expect(block).toContain('neverCooked?: boolean | null;');
    expect(block).toContain('familyFavorite?: boolean | null;');
    expect(block).toContain('quickOnly?: boolean | null;');
    expect(block).toContain('notCookedInLongTime?: boolean | null;');
    expect(block).toContain('discoverableOnly?: boolean | null;');
  });

  it('includes inventory-fit in the RecipeSearchReasonDto source enum', () => {
    const modelsSource = readGenerated('models/index.ts');

    expect(modelsSource).toContain("InventoryFit: 'inventory-fit'");
    expect(modelsSource).not.toContain("PantryMatch: 'pantry-match'");
  });

  it('includes the /api/recipes/search request builder in the generated client', () => {
    const routePath = resolve(currentDir, 'generated', 'api/recipes/search/index.ts');

    expect(existsSync(routePath)).toBe(true);

    const routeSource = readFileSync(routePath, 'utf8');

    expect(routeSource).toContain('/api/recipes/search');
    expect(routeSource).toContain('type RecipeSearchRequestDto');
    expect(routeSource).toContain('type RecipeSearchResponseDto');
  });
});
