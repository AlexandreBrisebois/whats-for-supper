import type { GroceryScalar } from '@/lib/api/generated/models';
import { MOCK_IDS } from './mock-ids';

const identities = Object.entries(MOCK_IDS)
  .filter(([name]) => name.startsWith('GROCERY_ROW_'))
  .map(([, id]) => id);
const allocated = new Map<string, string>();

/** Fixture labels locate explicitly seeded controls; these are not server lineage rules. */
export function fixtureGroceryId(label: string) {
  if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(label)) return label;
  const key = label.toLowerCase().replace(/\s+/g, '_');
  let id = allocated.get(key);
  if (!id) {
    id = identities[allocated.size];
    if (!id) throw new Error('Add another declared MOCK_IDS grocery row for this fixture.');
    allocated.set(key, id);
  }
  return id;
}

export function fixtureGroceryChecks(values: Record<string, boolean>) {
  return Object.fromEntries(
    Object.entries(values).map(([label, checked]) => [fixtureGroceryId(label), checked])
  );
}

/** Exact decimal test operands, never a guessed fraction from runtime recipe data. */
export function scalarQuantity(value: number): GroceryScalar {
  const text = String(value);
  if (!/^\d+(?:\.\d+)?$/.test(text))
    throw new Error('Use an explicit rational fixture for exceptional values.');
  const [whole, fraction = ''] = text.split('.');
  let n = BigInt(whole + fraction);
  let d = 10n ** BigInt(fraction.length);
  let a = n,
    b = d;
  while (b) [a, b] = [b, a % b];
  n /= a;
  d /= a;
  return { kind: 'scalar', value: { n: String(n), d: String(d) } };
}
