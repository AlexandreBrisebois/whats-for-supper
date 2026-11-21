import { parseIngredientAmount } from '../src/lib/recipes/ingredient-amount';
/** Staged canonical PATCH validation for the stateful API mock; no publication or ID allocation. */
type ObjectValue = Record<string, any>;
const object = (value: unknown): value is ObjectValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const fields = (value: ObjectValue, allowed: string[], required: string[] = allowed) =>
  required.every((key) => Object.hasOwn(value, key)) &&
  Object.keys(value).every((key) => allowed.includes(key));
const uuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) &&
  !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value);
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));
function rational(value: unknown): value is { n: string; d: string } {
  return (
    object(value) &&
    fields(value, ['n', 'd']) &&
    typeof value.n === 'string' &&
    typeof value.d === 'string' &&
    /^(0|[1-9][0-9]{0,37})$/.test(value.n) &&
    /^[1-9][0-9]{0,37}$/.test(value.d) &&
    gcd(BigInt(value.n), BigInt(value.d)) === 1n
  );
}
function quantity(value: unknown): value is ObjectValue {
  if (!object(value)) return false;
  return value.kind === 'scalar'
    ? fields(value, ['kind', 'value']) && rational(value.value)
    : value.kind === 'range' &&
        fields(value, ['kind', 'min', 'max']) &&
        rational(value.min) &&
        rational(value.max) &&
        BigInt(value.min.n) * BigInt(value.max.d) <= BigInt(value.max.n) * BigInt(value.min.d);
}
function sameAmount(left: ObjectValue, right: ObjectValue | null) {
  if (!right || left.kind !== right.kind) return false;
  const same = (a: ObjectValue, b: ObjectValue) => a.n === b.n && a.d === b.d;
  return left.kind === 'scalar'
    ? same(left.value, right.value)
    : same(left.min, right.min) && same(left.max, right.max);
}
function unit(value: unknown) {
  return (
    value === null ||
    (object(value) &&
      fields(value, ['text', 'definitionId']) &&
      text(value.text) &&
      (value.definitionId === null || text(value.definitionId)))
  );
}
function facts(value: ObjectValue) {
  if (!text(value.description) || !['proportional', 'fixed'].includes(value.scaling)) return false;
  if (
    value.amount === null
      ? value.amountText !== null
      : !quantity(value.amount) ||
        !(
          value.amountText === null ||
          (typeof value.amountText === 'string' &&
            sameAmount(value.amount, parseIngredientAmount(value.amountText)))
        )
  )
    return false;
  if (!unit(value.unit)) return false;
  const shopping = value.shopping;
  if (
    !object(shopping) ||
    !fields(shopping, ['name', 'foodId', 'mappingRevision']) ||
    !text(shopping.name) ||
    !(
      (shopping.foodId === null && shopping.mappingRevision === null) ||
      (uuid(shopping.foodId) && text(shopping.mappingRevision))
    )
  )
    return false;
  const pack = value.package;
  return (
    pack === null ||
    (object(pack) &&
      fields(pack, ['countUnit', 'capacity', 'basis']) &&
      pack.countUnit !== null &&
      unit(pack.countUnit) &&
      ['net', 'drained', 'unspecified'].includes(pack.basis) &&
      object(pack.capacity) &&
      fields(pack.capacity, ['amount', 'unit']) &&
      quantity(pack.capacity.amount) &&
      pack.capacity.unit !== null &&
      unit(pack.capacity.unit))
  );
}
export function canonicalRecipePatchIsValid(input: ObjectValue): boolean {
  if (input.ingredients != null || input.recipeInstructions != null) return false;
  const saved = new Set<string>();
  const clients = new Set<string>();
  const identity = (value: ObjectValue) => {
    const hasId = Object.hasOwn(value, 'id');
    const hasClient = Object.hasOwn(value, 'clientId');
    if (hasId === hasClient) return false;
    if (hasId) {
      if (!uuid(value.id) || saved.has(value.id.toLowerCase())) return false;
      saved.add(value.id.toLowerCase());
    } else {
      if (!text(value.clientId) || value.clientId.length > 128 || clients.has(value.clientId))
        return false;
      clients.add(value.clientId);
    }
    return true;
  };
  if (Object.hasOwn(input, 'ingredientLines')) {
    if (
      !Array.isArray(input.ingredientLines) ||
      !input.ingredientLines.every(
        (line: unknown) =>
          object(line) &&
          fields(
            line,
            [
              'id',
              'clientId',
              'description',
              'amount',
              'amountText',
              'unit',
              'scaling',
              'package',
              'shopping',
            ],
            ['description', 'amount', 'amountText', 'unit', 'scaling', 'package', 'shopping']
          ) &&
          identity(line) &&
          facts(line)
      )
    )
      return false;
  }
  if (Object.hasOwn(input, 'instructionSections')) {
    if (
      !Array.isArray(input.instructionSections) ||
      !input.instructionSections.every(
        (section: unknown) =>
          object(section) &&
          fields(section, ['id', 'clientId', 'name', 'steps'], ['name', 'steps']) &&
          identity(section) &&
          (section.name === null || typeof section.name === 'string') &&
          Array.isArray(section.steps) &&
          section.steps.every(
            (step: unknown) =>
              object(step) &&
              fields(step, ['id', 'clientId', 'text'], ['text']) &&
              identity(step) &&
              typeof step.text === 'string'
          )
      )
    )
      return false;
  }
  return true;
}
