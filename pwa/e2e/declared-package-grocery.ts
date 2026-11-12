/** Disposable mock parity for explicitly declared package purchases only. */
import { createHash } from 'node:crypto';
import { declaredPackageSuffix, packageProjectedQuantity } from './cooking-step-projection';

const canonical = (value: any): string =>
  value != null && typeof value === 'object'
    ? Array.isArray(value)
      ? `[${value.map(canonical).join(',')}]`
      : `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
          .join(',')}}`
    : JSON.stringify(value);
function add(left: any, right: any) {
  if (!left) return right;
  if (!right) return left;
  const sum = (a: any, b: any) => {
    let n = BigInt(a.n) * BigInt(b.d) + BigInt(b.n) * BigInt(a.d);
    let d = BigInt(a.d) * BigInt(b.d),
      x = n,
      y = d;
    while (y) {
      const next = x % y;
      x = y;
      y = next;
    }
    n /= x;
    d /= x;
    if (n.toString().length > 38 || d.toString().length > 38)
      throw Error('Unresolved package quantity');
    return { n: String(n), d: String(d) };
  };
  return left.kind === 'scalar' && right.kind === 'scalar'
    ? { kind: 'scalar', value: sum(left.value, right.value) }
    : {
        kind: 'range',
        min: sum(left.value ?? left.min, right.value ?? right.min),
        max: sum(left.value ?? left.max, right.value ?? right.max),
      };
}
export function declaredPackageGroceryRows(
  rows: any[],
  originals: any[],
  targets: (number | null)[],
  basis: number | null
) {
  if (!originals.some((row) => row?.package)) return rows;
  const ordinary: any[] = [];
  const groups = new Map<
    string,
    { row: any; quantity: any; complete: boolean; bounded: boolean }
  >();
  rows.forEach((row, index) => {
    const original = originals[index];
    if (!original?.package) {
      ordinary.push(row);
      return;
    }
    const identity = JSON.stringify({
      fallback: row.normalizedKey,
      bucket: row.unitText ?? '',
      package: createHash('sha256').update(canonical(original.package)).digest('hex'),
    });
    let group = groups.get(identity);
    if (!group) {
      group = {
        row: {
          ...row,
          displayName: row.displayName + declaredPackageSuffix(original.package),
          demandIdentity: identity,
        },
        quantity: null,
        complete: true,
        bounded: true,
      };
      groups.set(identity, group);
    }
    for (const target of targets) {
      const quantity = packageProjectedQuantity(original, target, basis);
      if (!quantity) {
        group.complete = false;
        continue;
      }
      try {
        if (group.bounded) group.quantity = add(group.quantity, quantity);
      } catch {
        group.bounded = false;
        group.quantity = null;
        group.complete = false;
      }
    }
  });
  return [
    ...ordinary,
    ...[...groups.values()].map((group) => ({
      ...group.row,
      quantity: group.quantity,
      quantityComplete: group.complete && group.bounded,
    })),
  ].sort(
    (a, b) =>
      String(a.normalizedKey).localeCompare(String(b.normalizedKey)) ||
      String(a.unitText).localeCompare(String(b.unitText)) ||
      String(a.demandIdentity ?? '').localeCompare(String(b.demandIdentity ?? ''))
  );
}
