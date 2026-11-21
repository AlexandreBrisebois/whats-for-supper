import { describe, expect, it } from 'vitest';
import { JsonSerializationWriter } from '@microsoft/kiota-serialization-json';
import { serializeReclassifyFoodCategoryRequest } from './generated/models';

describe('generated food category mutation wire', () => {
  it.each([null, 'category.opaque-current'])(
    'retains required expected revision %j explicitly',
    (revision) => {
      const writer = new JsonSerializationWriter();
      writer.writeObjectValue(
        undefined,
        { grocerySection: 'Produce', expectedCategoryRevision: revision },
        serializeReclassifyFoodCategoryRequest
      );
      const body = JSON.parse(new TextDecoder().decode(writer.getSerializedContent()));
      expect(body).toEqual({ grocerySection: 'Produce', expectedCategoryRevision: revision });
      expect(Object.hasOwn(body, 'expectedCategoryRevision')).toBe(true);
    }
  );
});

it('normalizes an explicit generated null revision while preserving a missing authority field', async () => {
  const { JsonParseNode } = await import('@microsoft/kiota-serialization-json');
  const { createGroceryLineItemDtoFromDiscriminatorValue } = await import('./generated/models');
  const { normalizeGroceryItems } = await import('./grocery-quantities');
  const present = new JsonParseNode({
    displayName: 'onion',
    categoryScope: 'food',
    categoryRevision: null,
  }).getObjectValue(createGroceryLineItemDtoFromDiscriminatorValue)!;
  const absent = new JsonParseNode({ displayName: 'onion', categoryScope: 'food' }).getObjectValue(
    createGroceryLineItemDtoFromDiscriminatorValue
  )!;
  expect(Object.hasOwn(present, 'categoryRevision')).toBe(true);
  expect(normalizeGroceryItems([present])![0].categoryRevision).toBeNull();
  expect(Object.hasOwn(normalizeGroceryItems([absent])![0], 'categoryRevision')).toBe(false);
});
