import type { GroceryScalar, GroceryRange } from '@/lib/api/generated/models';

const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));
const normalized = (n: bigint, d: bigint) => {
  if (n < 0n || d <= 0n) return null;
  const factor = gcd(n, d);
  n /= factor;
  d /= factor;
  return n.toString().length <= 38 && d.toString().length <= 38
    ? { n: n.toString(), d: d.toString() }
    : null;
};
const fractions: Record<string, string> = {
  '¼': '1/4',
  '½': '1/2',
  '¾': '3/4',
  '⅐': '1/7',
  '⅑': '1/9',
  '⅒': '1/10',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
};
function scalar(source: string) {
  const value = source
    .replace(/[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (glyph) => ' ' + fractions[glyph])
    .replace(/\s+/g, ' ')
    .trim();
  const fraction = /^(?:([0-9]+) )?([0-9]+)\/([0-9]+)$/.exec(value);
  if (fraction)
    return normalized(
      BigInt(fraction[1] ?? '0') * BigInt(fraction[3]) + BigInt(fraction[2]),
      BigInt(fraction[3])
    );
  if (!/^[0-9]+(?:[.,][0-9]+)?$/.test(value) || /^[1-9][0-9]*,[0-9]{3}$/.test(value)) return null;
  const parts = value.replace(',', '.').split('.');
  return normalized(BigInt(parts.join('')), 10n ** BigInt(parts[1]?.length ?? 0));
}
export function parseIngredientAmount(source: string): GroceryScalar | GroceryRange | null {
  if (source.length > 256) return null;
  const range = /^(.+?)\s*[-–]\s*(.+)$/.exec(source.trim());
  if (range) {
    const min = scalar(range[1]);
    const max = scalar(range[2]);
    return min && max && BigInt(min.n) * BigInt(max.d) <= BigInt(max.n) * BigInt(min.d)
      ? { kind: 'range', min, max }
      : null;
  }
  const value = scalar(source);
  return value ? { kind: 'scalar', value } : null;
}
