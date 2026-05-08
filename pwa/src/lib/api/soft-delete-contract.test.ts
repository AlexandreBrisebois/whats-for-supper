import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);

function readGenerated(relativePath: string): string {
  return readFileSync(resolve(currentDir, 'generated', relativePath), 'utf8');
}

describe('generated soft-delete contract snapshots', () => {
  it('RecipeDto includes deletedAt field', () => {
    const models = readGenerated('models/index.ts');
    const match = models.match(/export interface RecipeDto[^\n]*\{([\s\S]*?)\n\}/m);
    expect(match, 'RecipeDto should exist in generated models').not.toBeNull();
    expect(match![1]).toContain('deletedAt');
  });

  it('RecipeTrashListResponse schema exists in generated models', () => {
    const models = readGenerated('models/index.ts');
    expect(models).toContain('export interface RecipeTrashListResponse');
  });

  it('RecipeTrashListResponse contains items array', () => {
    const models = readGenerated('models/index.ts');
    const match = models.match(/export interface RecipeTrashListResponse[^\n]*\{([\s\S]*?)\n\}/m);
    expect(match, 'RecipeTrashListResponse should exist in generated models').not.toBeNull();
    expect(match![1]).toContain('items');
  });

  it('RecipeTrashItemDto schema exists in generated models', () => {
    const models = readGenerated('models/index.ts');
    expect(models).toContain('export interface RecipeTrashItemDto');
  });

  it('RecipeTrashItemDto contains id, name, imageUrl, deletedAt, deletedBy', () => {
    const models = readGenerated('models/index.ts');
    const match = models.match(/export interface RecipeTrashItemDto[^\n]*\{([\s\S]*?)\n\}/m);
    expect(match, 'RecipeTrashItemDto should exist in generated models').not.toBeNull();
    const block = match![1];
    expect(block).toContain('id');
    expect(block).toContain('name');
    expect(block).toContain('imageUrl');
    expect(block).toContain('deletedAt');
    expect(block).toContain('deletedBy');
  });

  it('GET /api/recipes/trash route builder exists in generated client', () => {
    const trashPath = resolve(currentDir, 'generated', 'api/recipes/trash/index.ts');
    expect(existsSync(trashPath)).toBe(true);
  });

  it('POST /api/recipes/{id}/restore route builder exists in generated client', () => {
    const restorePath = resolve(currentDir, 'generated', 'api/recipes/item/restore/index.ts');
    expect(existsSync(restorePath)).toBe(true);
  });
});
