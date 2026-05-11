import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);

function readGenerated(relativePath: string): string {
  return readFileSync(resolve(currentDir, 'generated', relativePath), 'utf8');
}

describe('generated inventory-captures contract', () => {
  it('includes InventoryCaptureResponse schema in generated models', () => {
    const modelsSource = readGenerated('models/index.ts');
    expect(modelsSource).toContain('export interface InventoryCaptureResponse');
  });

  it('includes InventoryCaptureResponse with snapshotId, inferredIngredients, confidence', () => {
    const modelsSource = readGenerated('models/index.ts');
    const match = modelsSource.match(
      /export interface InventoryCaptureResponse[^\n]*\{([\s\S]*?)\n\}/m
    );
    expect(match, 'InventoryCaptureResponse should exist in generated models').not.toBeNull();
    const block = match![1];
    expect(block).toContain('snapshotId');
    expect(block).toContain('inferredIngredients');
    expect(block).toContain('confidence');
  });

  it('includes the /api/inventory-captures request builder in the generated client', () => {
    const routePath = resolve(currentDir, 'generated', 'api/inventoryCaptures/index.ts');
    expect(existsSync(routePath)).toBe(true);
  });

  it('includes the /api/inventory-captures/{id} GET builder in the generated client', () => {
    const itemPath = resolve(currentDir, 'generated', 'api/inventoryCaptures/item/index.ts');
    expect(existsSync(itemPath)).toBe(true);
  });

  it('includes PhotoSearchResponse with intent, query, ingredients, confidence, and pantrySnapshotId', () => {
    const modelsSource = readGenerated('models/index.ts');
    const match = modelsSource.match(/export interface PhotoSearchResponse[^\n]*\{([\s\S]*?)\n\}/m);
    expect(match, 'PhotoSearchResponse should exist in generated models').not.toBeNull();
    const block = match![1];
    expect(block).toContain('intent');
    expect(block).toContain('query');
    expect(block).toContain('inferredIngredients');
    expect(block).toContain('confidence');
    expect(block).toContain('pantrySnapshotId');
  });

  it('includes the /api/photo-search request builder in the generated client', () => {
    const routePath = resolve(currentDir, 'generated', 'api/photoSearch/index.ts');
    expect(existsSync(routePath)).toBe(true);
  });
});
