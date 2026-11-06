import { describe, expect, it } from 'vitest';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { JsonSerializationWriter } from '@microsoft/kiota-serialization-json';
import { serializeSupperServingsSave } from './generated/models';

describe('generated serving request preserves sparse null semantics', () => {
  it('omits an unchanged default while serializing an explicit dated reset', () => {
    const writer = new JsonSerializationWriter();
    writer.writeObjectValue(
      undefined,
      {
        referenceWeekStartDate: DateOnly.parse('2026-10-12')!,
        weekOffset: 0,
        expectedVersion: 'captured',
        days: [{ date: DateOnly.parse('2026-10-14')!, servings: null }],
      },
      serializeSupperServingsSave
    );
    const body = JSON.parse(new TextDecoder().decode(writer.getSerializedContent()));
    expect(body).not.toHaveProperty('defaultServings');
    expect(body.days).toEqual([{ date: '2026-10-14', servings: null }]);
  });
  it('serializes explicit null when unsetting the household default', () => {
    const writer = new JsonSerializationWriter();
    writer.writeObjectValue(
      undefined,
      {
        referenceWeekStartDate: DateOnly.parse('2026-10-12')!,
        weekOffset: 0,
        expectedVersion: 'captured',
        defaultServings: null,
        days: [],
      },
      serializeSupperServingsSave
    );
    const body = JSON.parse(new TextDecoder().decode(writer.getSerializedContent()));
    expect(body).toHaveProperty('defaultServings', null);
    expect(body.days).toEqual([]);
  });
});
