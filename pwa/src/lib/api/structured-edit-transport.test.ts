import { afterEach, expect, it, vi } from 'vitest';
vi.mock('./demo-session', () => ({
  demoFetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
}));
vi.mock('@/store/familyStore', () => ({
  useFamilyStore: {
    getState: () => ({ selectedFamilyMemberId: '09000000-0000-4000-8000-000000000001' }),
  },
}));
vi.mock('@/store/plannerStore', () => ({
  usePlannerStore: {
    getState: () => ({ localMoveSeq: 0, confirmedMoveSeq: 0, sseConnectionId: null }),
  },
}));
import { updateRecipe } from './recipes';
import type { RecipeIngredientLineInput } from './generated/models';

const id = '09000000-0000-4000-8000-000000000002';
const scalar = (n: string, d = '1') => ({ kind: 'scalar' as const, value: { n, d } });
const range = { kind: 'range' as const, min: { n: '1', d: '3' }, max: { n: '5', d: '2' } };

// Inspect raw request tokens: JSON.parse alone silently discards duplicate names.
function duplicateProperties(raw: string) {
  const tokens = raw.match(
    /"(?:\\.|[^"\\])*"|[{}\[\]:,]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g
  )!;
  const duplicates: string[] = [];
  let index = 0;
  function read(path: string) {
    const token = tokens[index++];
    if (token === '{') {
      const names = new Set<string>();
      while (tokens[index] !== '}') {
        const key = JSON.parse(tokens[index++]) as string;
        if (names.has(key)) duplicates.push(path + '.' + key);
        names.add(key);
        expect(tokens[index++]).toBe(':');
        read(path + '.' + key);
        if (tokens[index] !== ',') break;
        index++;
      }
      expect(tokens[index++]).toBe('}');
    } else if (token === '[') {
      let row = 0;
      while (tokens[index] !== ']') {
        read(path + '[' + row++ + ']');
        if (tokens[index] !== ',') break;
        index++;
      }
      expect(tokens[index++]).toBe(']');
    }
  }
  read('$');
  expect(index).toBe(tokens.length);
  return duplicates;
}
async function wire(lines: RecipeIngredientLineInput[] | null | undefined) {
  let raw = '';
  let request!: Request;
  const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    request = new Request(
      typeof input === 'string' ? new URL(input, 'http://localhost') : input,
      init
    );
    raw = await request.text();
    return new Response(JSON.stringify({ recipe: { id, name: 'Pasta', ingredients: [] } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', transport);
  await updateRecipe(id, {
    expectedContentRevision: 'captured',
    ingredientLines: lines,
    notes: 'Keep the ordinary wrapper.',
  });
  expect(transport).toHaveBeenCalledTimes(1);
  expect(request.method).toBe('PATCH');
  expect(new URL(request.url).pathname).toBe('/api/recipes/' + id);
  expect(request.headers.get('X-Family-Member-Id')).toBe('09000000-0000-4000-8000-000000000001');
  expect(duplicateProperties(raw)).toEqual([]);
  return JSON.parse(raw);
}
afterEach(() => vi.unstubAllGlobals());

it.each([
  scalar('250'),
  scalar('1', '3'),
  scalar('0'),
  scalar('99999999999999999999999999999999999999', '99999999999999999999999999999999999998'),
  range,
  null,
])('serializes exact amount %j once through the generated transport', async (amount) => {
  const line = {
    id,
    description: 'pasta',
    amount,
    amountText: null,
    unit: { text: 'g', definitionId: null },
    scaling: 'fixed' as const,
    packageEscaped: null,
    shopping: { name: 'Private pasta', foodId: null, mappingRevision: null },
  };
  const body = await wire([line]);
  expect(body.ingredientLines).toEqual([{ ...line, package: null, packageEscaped: undefined }]);
  expect(body.expectedContentRevision).toBe('captured');
  expect(body.notes).toBe('Keep the ordinary wrapper.');
});
it.each([scalar('400'), range])(
  'serializes declared package capacity %j once using its escaped wire name',
  async (amount) => {
    const line = {
      clientId: 'new-line',
      description: 'beans',
      amount: scalar('2'),
      scaling: 'proportional' as const,
      packageEscaped: {
        countUnit: { text: 'cans', definitionId: null },
        capacity: { amount, unit: { text: 'g', definitionId: null } },
        basis: 'net' as const,
      },
      shopping: { name: 'beans', foodId: null, mappingRevision: null },
    };
    const body = await wire([line]);
    expect(body.ingredientLines[0]).toEqual({
      ...line,
      package: line.packageEscaped,
      packageEscaped: undefined,
    });
    expect(body.ingredientLines[0]).not.toHaveProperty('id');
    expect(body.ingredientLines[0]).not.toHaveProperty('packageEscaped');
  }
);
it('preserves omitted canonical input and explicit null without inventing an empty array', async () => {
  expect(await wire(undefined)).not.toHaveProperty('ingredientLines');
  expect((await wire(null)).ingredientLines).toBeNull();
});

it('retains explicit stable mapping and unit identities without serializing Kiota model bookkeeping', async () => {
  const mapped = {
    id,
    description: 'onion',
    amount: scalar('1'),
    unit: { text: 'g', definitionId: 'metric:g' },
    shopping: { name: 'Onion', foodId: id, mappingRevision: 'captured-dictionary' },
  };
  const body = await wire([mapped]);
  expect(body.ingredientLines).toEqual([mapped]);
  expect(body.ingredientLines[0]).not.toHaveProperty('additionalData');
});
