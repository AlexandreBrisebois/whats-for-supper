import { describe, expect, it } from 'vitest';
import { JsonParseNode, JsonSerializationWriter } from '@microsoft/kiota-serialization-json';
import {
  createRecipeDtoFromDiscriminatorValue,
  serializeRecipeDto,
  serializeUpdateRecipeDto,
  type UpdateRecipeDto,
  type RecipeDto,
  RecipeIngredientProvenance_originObject,
  RecipeIngredientProvenance_protectedFieldsObject,
} from './generated/models';

const amount = {
  kind: 'range',
  min: { n: '9007199254740993', d: '7' },
  max: { n: '9007199254740994', d: '7' },
};

function serialize<T>(
  value: T,
  serializer: Parameters<JsonSerializationWriter['writeObjectValue']>[2]
) {
  const writer = new JsonSerializationWriter();
  writer.writeObjectValue(undefined, value as never, serializer);
  return JSON.parse(new TextDecoder().decode(writer.getSerializedContent()));
}

describe('canonical generated wire shapes', () => {
  it('retains unknown authorship and protected original notation through generated reads and writes', () => {
    expect(Object.values(RecipeIngredientProvenance_originObject)).toContain('unknown');
    expect(Object.values(RecipeIngredientProvenance_protectedFieldsObject)).toContain('amountText');
    const provenance = {
      origin: 'unknown',
      sourceRef: 'retained-source-ref',
      protectedFields: ['amount', 'amountText'],
    };
    const recipe = new JsonParseNode({
      ingredientLines: [{ provenance }],
    }).getObjectValue<RecipeDto>(createRecipeDtoFromDiscriminatorValue)!;
    expect(serialize(recipe, serializeRecipeDto).ingredientLines[0].provenance).toEqual(provenance);
  });
  it('keeps schema version numeric through generated detail read/write', () => {
    const recipe = new JsonParseNode({
      contentSchemaVersion: 2,
      contentRevision: 'opaque',
    }).getObjectValue<RecipeDto>(createRecipeDtoFromDiscriminatorValue)!;
    expect(recipe.contentSchemaVersion).toBe(2);
    expect(serialize(recipe, serializeRecipeDto).contentSchemaVersion).toBe(2);
  });

  it.each([{ kind: 'scalar', value: { n: '1', d: '3' } }, amount, null])(
    'keeps exact operands, explicit nullable fields and request-local create identity: %j',
    (exact) => {
      const input: UpdateRecipeDto = {
        expectedContentRevision: 'captured',
        ingredientLines: [
          {
            clientId: 'draft-row',
            description: 'pasta',
            amount: exact,
            amountText: null,
            unit: null,
            scaling: 'proportional',
            packageEscaped: null,
            shopping: { name: 'pasta', foodId: null, mappingRevision: null },
          },
        ],
        instructionSections: [],
      };
      expect(serialize(input, serializeUpdateRecipeDto)).toEqual({
        expectedContentRevision: 'captured',
        ingredientLines: [
          {
            clientId: 'draft-row',
            description: 'pasta',
            amount: exact,
            amountText: null,
            unit: null,
            scaling: 'proportional',
            package: null,
            shopping: { name: 'pasta', foodId: null, mappingRevision: null },
          },
        ],
        instructionSections: [],
      });
    }
  );
});

it('retains scalar operands after a generated detail read followed by an untouched-row save', () => {
  const exact = { kind: 'scalar', value: { n: '100', d: '1' } };
  const recipe = new JsonParseNode({
    ingredientLines: [
      {
        id: '550e8400-e29b-41d4-a716-446655440212',
        description: 'sauce',
        amount: exact,
        amountText: '100',
        unit: { text: 'ml', definitionId: null },
        scaling: 'proportional',
        package: null,
        shopping: { name: 'sauce', foodId: null, mappingRevision: null },
      },
    ],
  }).getObjectValue<RecipeDto>(createRecipeDtoFromDiscriminatorValue)!;
  const row = recipe.ingredientLines![0];
  expect(
    serialize(
      {
        ingredientLines: [
          {
            id: row.id,
            description: row.description,
            amount: row.amount,
            amountText: row.amountText,
            unit: row.unit,
            scaling: row.scaling,
            packageEscaped: row.packageEscaped,
            shopping: row.shopping,
          },
        ],
      },
      serializeUpdateRecipeDto
    ).ingredientLines[0].amount
  ).toEqual(exact);
});
