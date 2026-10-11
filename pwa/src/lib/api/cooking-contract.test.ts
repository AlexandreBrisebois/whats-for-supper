import { describe, expect, it } from 'vitest';
import { JsonSerializationWriter } from '@microsoft/kiota-serialization-json';
import { serializeValidationDto } from './generated/models';

describe('recipe cooking request contract', () => {
  it('sends the cooked recipe ID alongside its status', () => {
    const writer = new JsonSerializationWriter();
    const recipeId = '550e8400-e29b-41d4-a716-446655440102';
    writer.writeObjectValue(undefined, { status: 2, recipeId }, serializeValidationDto);
    const body = JSON.parse(new TextDecoder().decode(writer.getSerializedContent()));
    expect(body).toEqual({ status: 2, recipeId });
  });
});
