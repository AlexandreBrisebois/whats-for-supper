import type { IngredientProjectionLine } from '@/lib/api/generated/models';

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    const r = a % b;
    a = b;
    b = r;
  }
  return a;
}

function reduceScalarToken(token: string): string {
  const match = token.match(/^(?:(\d+) )?(\d+)\/(\d+)$/);
  if (!match) return token;
  const whole = match[1] ? BigInt(match[1]) : 0n;
  const numerator = BigInt(match[2]);
  const denominator = BigInt(match[3]);
  if (denominator === 0n) return token;
  let n = whole * denominator + numerator;
  let d = denominator;
  const divisor = gcd(n, d);
  n /= divisor;
  d /= divisor;
  const q = n / d;
  const r = n % d;
  if (r === 0n) return String(q);
  if (q === 0n) return `${r}/${d}`;
  return `${q} ${r}/${d}`;
}

function reduceLeadingFractionText(displayText: string): string {
  return displayText.replace(
    /^((?:\d+ )?\d+\/\d+|\d+)(?:–((?:\d+ )?\d+\/\d+|\d+))?(?= |$)/,
    (_, min: string, max?: string) =>
      max !== undefined
        ? `${reduceScalarToken(min)}–${reduceScalarToken(max)}`
        : reduceScalarToken(min)
  );
}

export function ingredientProjectionText(line: IngredientProjectionLine): string {
  if (line.displayText != null) return reduceLeadingFractionText(line.displayText);
  return line.status === 'scaled' && line.quantity != null
    ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(line.quantity)} ${line.unitText ? `${line.unitText} ` : ''}${line.name ?? ''}`
    : (line.originalText ?? '');
}
