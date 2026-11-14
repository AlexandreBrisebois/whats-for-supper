/** Conservative disposable mock companion. No read-time discovery of ingredient uses. */
import { isDeepStrictEqual as same } from 'node:util';
function valid(recipe: any, step: any, binding: any) {
  const span = binding?.span;
  const boundary = (n: number) =>
    Number.isInteger(n) &&
    n >= 0 &&
    n <= step.text.length &&
    !(
      n > 0 &&
      n < step.text.length &&
      /[\uD800-\uDBFF]/.test(step.text[n - 1]) &&
      /[\uDC00-\uDFFF]/.test(step.text[n])
    );
  return (
    binding?.status === 'validated' &&
    binding.id &&
    binding.stepId === step.id &&
    binding.validatedContentRevision === recipe.contentRevision &&
    binding.validatedTextRevision === step.textRevision &&
    binding.payload != null &&
    typeof binding.payload === 'object' &&
    !Array.isArray(binding.payload) &&
    ['whole', 'absolute', 'fraction', 'remainder', 'perItem', 'fixed'].includes(binding.role) &&
    (binding.role !== 'fixed' || fixedValid(recipe, binding)) &&
    annotationValid(step, binding) &&
    span &&
    span.end > span.start &&
    boundary(span.start) &&
    boundary(span.end) &&
    step.text.slice(span.start, span.end) === span.expectedText &&
    recipe.ingredientLines?.filter((row: any) => row.id === binding.ingredientLineId).length ===
      1 &&
    step.bindings.filter((use: any) => use.id === binding.id).length === 1 &&
    !step.bindings.some(
      (other: any) =>
        other.id !== binding.id &&
        [other.span, ...(other.role === 'fraction' ? [other.payload?.annotationSpan] : [])].some(
          (otherSpan: any) => otherSpan && span.start < otherSpan.end && otherSpan.start < span.end
        )
    )
  );
}
function annotationValid(step: any, binding: any) {
  if (binding.role !== 'fraction' || !Object.hasOwn(binding.payload, 'annotationSpan')) return true;
  const span = binding.payload.annotationSpan;
  const boundary = (n: number) =>
    Number.isInteger(n) &&
    n >= 0 &&
    n <= step.text.length &&
    !(
      n > 0 &&
      n < step.text.length &&
      /[\uD800-\uDBFF]/.test(step.text[n - 1]) &&
      /[\uDC00-\uDFFF]/.test(step.text[n])
    );
  if (
    !span ||
    span.end <= span.start ||
    !boundary(span.start) ||
    !boundary(span.end) ||
    step.text.slice(span.start, span.end) !== span.expectedText
  )
    return false;
  const overlaps = (other: any) => other && span.start < other.end && other.start < span.end;
  if (!binding.span || overlaps(binding.span)) return false;
  return (
    !step.bindings.some(
      (other: any) =>
        other.id !== binding.id &&
        (overlaps(other.span) ||
          (other.role === 'fraction' && overlaps(other.payload?.annotationSpan)))
    ) &&
    !step.bindings.some(
      (other: any) =>
        other.id !== binding.id &&
        other.role === 'fraction' &&
        other.payload?.annotationSpan &&
        binding.span.start < other.payload.annotationSpan.end &&
        other.payload.annotationSpan.start < binding.span.end
    )
  );
}
// Fixed is a use policy, never a reason to freeze an ingredient row or demand.
function fixedValid(recipe: any, binding: any) {
  const payload = binding.payload;
  const row = recipe.ingredientLines?.find((row: any) => row.id === binding.ingredientLineId);
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(binding.id) &&
    binding.id !== '00000000-0000-0000-0000-000000000000' &&
    recipe.instructionSections
      .flatMap((section: any) => section.steps)
      .flatMap((step: any) => step.bindings)
      .filter((use: any) => use?.id === binding.id).length === 1 &&
    payload?.allocationGroup === undefined &&
    payload?.allocationGroupId === undefined &&
    Object.hasOwn(payload, 'unit') &&
    same(payload.unit, row?.unit) &&
    fractionAmount({ amount: payload.amount }, { payload: { fraction: { n: '1', d: '1' } } }) !=
      null
  );
}
function countProof(recipe: any, dose: any): { step: any; use: any; row: any } | null {
  if (typeof dose.payload?.countBindingId !== 'string') return null;
  const matches = (recipe.instructionSections ?? []).flatMap((section: any) =>
    section.steps.flatMap((step: any) =>
      step.bindings
        .filter((use: any) => use.id === dose.payload.countBindingId)
        .map((use: any) => ({ step, use }))
    )
  );
  if (matches.length !== 1) return null;
  const { step, use } = matches[0];
  if (
    use.role !== 'whole' ||
    use.ingredientLineId === dose.ingredientLineId ||
    !valid(recipe, step, use) ||
    use.payload.allocationGroup !== undefined
  )
    return null;
  const row = recipe.ingredientLines.find((x: any) => x.id === use.ingredientLineId);
  return row?.scaling === 'proportional' &&
    row.amount?.kind === 'scalar' &&
    rational(row.amount.value)
    ? { step, use, row }
    : null;
}
function perItemValid(recipe: any, binding: any) {
  const dose = binding.payload?.dose;
  const row = recipe.ingredientLines.find((row: any) => row.id === binding.ingredientLineId);
  return (
    recipe.instructionSections
      .flatMap((section: any) => section.steps)
      .flatMap((step: any) => step.bindings)
      .filter((use: any) => use?.id === binding.id).length === 1 &&
    dose?.amount?.kind === 'scalar' &&
    rational(dose.amount.value) != null &&
    dose.unit != null &&
    same(dose.unit, row?.unit) &&
    countProof(recipe, binding) != null &&
    binding.payload.allocationGroup === undefined
  );
}
function countCanCarry(before: any, after: any, binding: any) {
  if (binding.role !== 'perItem') return true;
  const proof = countProof(before, binding);
  if (!proof || !perItemValid(before, binding)) return false;
  const step = after.instructionSections
    .flatMap((section: any) => section.steps)
    .find((step: any) => step.id === proof.step.id);
  const row = after.ingredientLines.find((row: any) => row.id === proof.row.id);
  return (
    step &&
    row &&
    step.text === proof.step.text &&
    step.textRevision === proof.step.textRevision &&
    ['description', 'unit', 'scaling', 'package', 'shopping'].every((key) =>
      same(proof.row[key], row[key])
    ) &&
    row.amount?.kind === 'scalar' &&
    rational(row.amount.value) != null &&
    step.bindings.filter((use: any) => same(use, proof.use)).length === 1
  );
}
function rational(q: any): { n: bigint; d: bigint } | null {
  if (!q || ![q.n, q.d].every((x) => typeof x === 'string' && /^(0|[1-9][0-9]{0,37})$/.test(x)))
    return null;
  const n = BigInt(q.n),
    d = BigInt(q.d);
  if (d === 0n) return null;
  let a = n,
    b = d;
  while (b) {
    const r = a % b;
    a = b;
    b = r;
  }
  return a === 1n ? { n, d } : null;
}
function fractionAmount(row: any, binding: any) {
  const f = rational(binding.payload?.fraction);
  if (!f || f.n > f.d || !['scalar', 'range'].includes(row?.amount?.kind)) return null;
  const multiply = (q: any) => {
    const value = rational(q);
    if (!value) return null;
    let n = value.n * f.n,
      d = value.d * f.d,
      a = n,
      b = d;
    while (b) {
      const r = a % b;
      a = b;
      b = r;
    }
    n /= a;
    d /= a;
    return n.toString().length <= 38 && d.toString().length <= 38
      ? { n: String(n), d: String(d) }
      : null;
  };
  if (row.amount.kind === 'scalar') {
    const value = multiply(row.amount.value);
    return value ? { kind: 'scalar', value } : null;
  }
  const min = multiply(row.amount.min),
    max = multiply(row.amount.max);
  if (!min || !max || BigInt(min.n) * BigInt(max.d) > BigInt(max.n) * BigInt(min.d)) return null;
  return { kind: 'range', min, max };
}
function originalUse(row: any, binding: any) {
  return binding.role === 'whole'
    ? row.amount
    : binding.role === 'fraction'
      ? fractionAmount(row, binding)
      : binding.payload.amount;
}
function normalized(n: bigint, d: bigint) {
  if (n < 0n || d <= 0n) return null;
  let a = n,
    b = d;
  while (b) {
    const r = a % b;
    a = b;
    b = r;
  }
  n /= a;
  d /= a;
  return n.toString().length <= 38 && d.toString().length <= 38
    ? { n: String(n), d: String(d) }
    : null;
}
function addScalar(a: any, b: any) {
  const x = rational(a),
    y = rational(b);
  return x && y ? normalized(x.n * y.d + y.n * x.d, x.d * y.d) : null;
}
function remainingAmount(row: any, fractions: any, absolutes: any) {
  const f = rational(fractions),
    a = rational(absolutes);
  if (!f || !a || f.n > f.d) return null;
  const subtract = (raw: any) => {
    const q = rational(raw);
    return q ? normalized(q.n * (f.d - f.n) * a.d - a.n * q.d * f.d, q.d * f.d * a.d) : null;
  };
  if (row.amount?.kind === 'scalar') {
    const value = subtract(row.amount.value);
    return value ? { kind: 'scalar', value } : null;
  }
  if (row.amount?.kind !== 'range') return null;
  const min = subtract(row.amount.min),
    max = subtract(row.amount.max);
  return min && max && BigInt(min.n) * BigInt(max.d) <= BigInt(max.n) * BigInt(min.d)
    ? { kind: 'range', min, max }
    : null;
}
// An explicit group is a closed proof, never inferred from matching row IDs.
function groupAmounts(recipe: any, binding: any): Map<string, any> | null {
  const proof = binding.payload?.allocationGroup;
  if (
    !proof?.id ||
    proof.exhaustive !== true ||
    !Array.isArray(proof.bindingIds) ||
    !proof.bindingIds.length ||
    new Set(proof.bindingIds).size !== proof.bindingIds.length
  )
    return null;
  const all = (recipe.instructionSections ?? []).flatMap((section: any) =>
    section.steps.flatMap((step: any) => step.bindings.map((use: any) => ({ step, use })))
  );
  const members = all.filter(({ use }: any) => use.payload?.allocationGroup?.id === proof.id);
  if (
    !same(
      members.map(({ use }: any) => use.id),
      proof.bindingIds
    ) ||
    !proof.bindingIds.includes(binding.id)
  )
    return null;
  const row = recipe.ingredientLines.find((row: any) => row.id === binding.ingredientLineId);
  if (!row || !fractionAmount(row, { payload: { fraction: { n: '1', d: '1' } } })) return null;
  let fractions: any = { n: '0', d: '1' },
    absolutes: any = { n: '0', d: '1' },
    sum: any = { n: '0', d: '1' };
  const amounts = new Map<string, any>();
  for (let index = 0; index < proof.bindingIds.length; index++) {
    const id = proof.bindingIds[index],
      matches = all.filter(({ use }: any) => use.id === id);
    if (matches.length !== 1) return null;
    const { step, use } = matches[0];
    if (
      ['perItem', 'fixed'].includes(use.role) ||
      !same(use.payload?.allocationGroup, proof) ||
      !valid(recipe, step, use) ||
      use.ingredientLineId !== binding.ingredientLineId ||
      (use.role === 'whole' && members.length !== 1)
    )
      return null;
    if (use.role === 'remainder') {
      if (
        !index ||
        index !== proof.bindingIds.length - 1 ||
        use.payload.allocationGroupId !== proof.id ||
        !same(use.payload.predecessors, proof.bindingIds.slice(0, index))
      )
        return null;
      const amount = remainingAmount(row, fractions, absolutes);
      if (!amount) return null;
      amounts.set(id, amount);
      return amounts;
    }
    const amount = originalUse(row, use);
    if (!amount || (use.role === 'absolute' && !same(use.payload.unit, row.unit))) return null;
    if (use.role === 'fraction') fractions = addScalar(fractions, use.payload.fraction);
    else {
      if (amount.kind !== 'scalar') return null;
      absolutes = addScalar(absolutes, amount.value);
    }
    if (!fractions || !absolutes) return null;
    if (row.amount.kind === 'scalar') {
      sum = addScalar(sum, amount.value);
      if (!sum) return null;
    }
    amounts.set(id, amount);
  }
  return row.amount.kind === 'scalar' && same(sum, row.amount.value) ? amounts : null;
}
function validGroup(recipe: any, binding: any) {
  return binding.payload?.allocationGroup === undefined
    ? binding.role !== 'remainder'
    : groupAmounts(recipe, binding) != null;
}
export function carryCookingBindings(before: any, after: any) {
  const captured = structuredClone(after);
  for (const step of captured.instructionSections.flatMap((section: any) => section.steps))
    step.bindings =
      before.instructionSections
        .flatMap((section: any) => section.steps)
        .find((old: any) => old.id === step.id)?.bindings ?? [];
  for (const section of after.instructionSections ?? [])
    for (const step of section.steps) {
      const old = before.instructionSections
        ?.flatMap((section: any) => section.steps)
        .find((item: any) => item.id === step.id);
      step.bindings = (old?.bindings ?? []).map((binding: any) => {
        const a = before.ingredientLines.find((row: any) => row.id === binding.ingredientLineId);
        const b = after.ingredientLines.find((row: any) => row.id === binding.ingredientLineId);
        return old.text === step.text &&
          old.textRevision === step.textRevision &&
          valid(before, old, binding) &&
          (binding.role !== 'fraction' || fractionAmount(a, binding) != null) &&
          validGroup(before, binding) &&
          countCanCarry(before, captured, binding) &&
          a &&
          b &&
          ['description', 'unit', 'scaling', 'package', 'shopping'].every((key) =>
            same(a[key], b[key])
          )
          ? { ...binding, validatedContentRevision: after.contentRevision }
          : binding;
      });
    }
}
function amountText(amount: any, numerator: number, denominator: number) {
  const scalar = (q: any) => {
    let n = BigInt(q.n) * BigInt(numerator),
      d = BigInt(q.d) * BigInt(denominator);
    let a = n,
      b = d;
    while (b) {
      const next = a % b;
      a = b;
      b = next;
    }
    n /= a;
    d /= a;
    if (n.toString().length > 38 || d.toString().length > 38) throw new Error('Unresolved amount');
    return d === 1n ? String(n) : `${n}/${d}`;
  };
  return amount.kind === 'scalar'
    ? scalar(amount.value)
    : `${scalar(amount.min)}–${scalar(amount.max)}`;
}
// Exact terminating decimal for an existing annotation only; other role formatting stays unchanged.
function annotationAmountText(text: string) {
  if (!/^\d+\/\d+$/.test(text)) return text;
  const [n, d] = text.split('/').map(BigInt);
  let remainder = n % d,
    digits = '';
  while (remainder !== 0n && digits.length < 256) {
    remainder *= 10n;
    digits += String(remainder / d);
    remainder %= d;
  }
  return remainder === 0n ? `${n / d}.${digits}` : text;
}
export function declaredPackageSuffix(pack: any) {
  return pack
    ? ` (${amountText(pack.capacity.amount, 1, 1)} ${pack.capacity.unit.text} / ${pack.countUnit.text}; ${pack.basis})`
    : '';
}
export function canonicalIngredientText(row: any, count?: string | null) {
  return (
    [
      count === undefined
        ? (row.amountText ?? (row.amount ? amountText(row.amount, 1, 1) : null))
        : count,
      row.unit?.text,
      row.description,
    ]
      .filter((value) => value != null)
      .join(' ') + (row.description ? declaredPackageSuffix(row.package) : '')
  );
}
export function packageProjectedQuantity(row: any, target: number | null, basis: number | null) {
  if (!row.amount || (target != null && row.scaling !== 'fixed' && !(basis! > 0))) return null;
  try {
    const text = amountText(
      row.amount,
      target == null || row.scaling === 'fixed' ? 1 : target,
      target == null || row.scaling === 'fixed' ? 1 : basis!
    );
    const rational = (value: string) => {
      const [n, d = '1'] = value.split('/');
      return { n, d };
    };
    const range = text.split('–');
    return range.length === 1
      ? { kind: 'scalar', value: rational(text) }
      : { kind: 'range', min: rational(range[0]), max: rational(range[1]) };
  } catch {
    return null;
  }
}
export function canonicalIngredientLines(
  recipe: any,
  target: number | null
): Array<{
  originalText: string;
  displayText?: string | null;
  name: string;
  unitText: string | null;
  quantity: number | null;
  status: string;
  issues: string[];
}> {
  return recipe.ingredientLines.map((row: any, index: number) => {
    const exact = packageProjectedQuantity(row, target, recipe.servings);
    const projectionIssues =
      row.amount != null && exact == null
        ? [
            target != null && row.scaling !== 'fixed' && !(recipe.servings > 0)
              ? 'missing_basis'
              : 'unreliable_amount',
          ]
        : [];
    return {
      originalText: row.package ? canonicalIngredientText(row) : recipe.ingredients[index],
      ...(row.package
        ? {
            displayText: exact
              ? canonicalIngredientText(row, amountText(exact, 1, 1))
              : canonicalIngredientText(row),
          }
        : target != null && exact != null
          ? {
              displayText: [amountText(exact, 1, 1), row.unit?.text, row.shopping.name]
                .filter((value) => value != null)
                .join(' '),
            }
          : {}),
      name: row.shopping.name,
      unitText: row.unit?.text ?? null,
      quantity: exact?.kind === 'scalar' ? Number(exact.value!.n) / Number(exact.value!.d) : null,
      status: projectionIssues.length
        ? 'unresolved'
        : row.amount == null
          ? 'unquantified'
          : target == null
            ? 'original'
            : 'scaled',
      issues: projectionIssues,
    };
  });
}
export function cookingProjection(recipe: any, target: number | null) {
  if (recipe.contentSchemaVersion !== 2) return null;
  let validatedUses = 0,
    uncertainUses = 0;
  const sections = (recipe.instructionSections ?? []).map((section: any) => ({
    sectionId: section.id,
    name: section.name,
    steps: section.steps.map((step: any) => {
      let text = step.text;
      const replacements: any[] = [];
      for (const binding of step.bindings ?? []) {
        if (!valid(recipe, step, binding) || !validGroup(recipe, binding)) {
          uncertainUses++;
          continue;
        }
        const row = recipe.ingredientLines.find((row: any) => row.id === binding.ingredientLineId);
        if (binding.role === 'perItem') {
          try {
            if (!perItemValid(recipe, binding) || (target != null && !(recipe.servings > 0)))
              throw new Error('Unresolved count');
            amountText(
              countProof(recipe, binding)!.row.amount,
              target == null ? 1 : target,
              target == null ? 1 : recipe.servings
            );
            validatedUses++;
          } catch {
            uncertainUses++;
          }
          continue;
        }
        if (binding.role === 'fixed') {
          validatedUses++;
          continue;
        }
        const amount =
          binding.role === 'remainder'
            ? groupAmounts(recipe, binding)?.get(binding.id)
            : originalUse(row, binding);
        if (
          !amount ||
          (binding.role === 'absolute' && !same(binding.payload.unit, row.unit)) ||
          (target != null && row.scaling !== 'fixed' && !(recipe.servings > 0))
        ) {
          uncertainUses++;
          continue;
        }
        try {
          const fixed = target == null || row.scaling === 'fixed';
          const replacement = [
            binding.role === 'fraction' && binding.payload.annotationSpan
              ? annotationAmountText(
                  amountText(amount, fixed ? 1 : target!, fixed ? 1 : recipe.servings)
                )
              : amountText(amount, fixed ? 1 : target!, fixed ? 1 : recipe.servings),
            row.unit?.text,
          ]
            .filter(Boolean)
            .join(' ');
          if (binding.role !== 'fraction' || binding.payload.annotationSpan)
            replacements.push({
              ...(binding.role === 'fraction' ? binding.payload.annotationSpan : binding.span),
              replacement:
                binding.role === 'remainder'
                  ? `${binding.span.expectedText} (${replacement})`
                  : replacement,
            });
          validatedUses++;
        } catch {
          uncertainUses++;
        }
      }
      for (const span of replacements.sort((a, b) => b.start - a.start))
        text = text.slice(0, span.start) + span.replacement + text.slice(span.end);
      return { stepId: step.id, textRevision: step.textRevision, originalText: step.text, text };
    }),
  }));
  return { sections, validatedUses, uncertainUses };
}
