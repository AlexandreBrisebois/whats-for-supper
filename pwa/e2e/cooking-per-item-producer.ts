import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual as same } from 'node:util';
import { parseIngredientAmount } from '../src/lib/recipes/ingredient-amount';

const rule = 'explicit-per-item-clause';
const ambiguous =
  /(?<![\p{L}\p{N}])(half|remaining|remainder|rest|reserve|reserved|except|unless|some|part|divided|each|per|alternatively|or|if|not|never|moitié|reste|restant|restante|réserver|réservez|sauf|chaque|par|ou|si|pas|jamais)(?![\p{L}\p{N}])/iu;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stepsOf = (recipe: any): any[] =>
  (recipe.instructionSections ?? []).flatMap((section: any) => section.steps);
const owned = (binding: any) => binding.payload?.relationshipEvidence?.rule === rule;
const source = (recipe: any) => recipe.sourceRevision ?? 'mock-source';
const sameRow = (before: any, after: any) =>
  before &&
  after &&
  ['id', 'description', 'unit', 'scaling', 'package', 'shopping'].every((key) =>
    same(before[key], after[key])
  );
const named = (recipe: any, row: any) =>
  row.id &&
  row.description?.trim() &&
  !/[\r\n.;:!?]/.test(row.description) &&
  !ambiguous.test(row.description) &&
  recipe.ingredientLines.filter((other: any) => other.id === row.id).length === 1 &&
  recipe.ingredientLines.filter(
    (other: any) => other.description.toLowerCase() === row.description.toLowerCase()
  ).length === 1;

type Clause = {
  count: any;
  dose: any;
  unit: any;
  countAmount: any;
  doseAmount: any;
  countSpan: any;
  doseSpan: any;
};
function parse(text: string, count: any, dose: any): Clause | null {
  if (/[\r\n]/.test(text)) return null;
  const number = '[0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞][0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.,–\\- \\t]*';
  const countMeasurement = `(?<count>(?<countAmount>${number})[ \\t]+${escape(count.unit.text)})`;
  const doseMeasurement = `(?<dose>(?<doseAmount>${number})[ \\t]+(?<doseUnit>[\\p{L}][\\p{L}.]*(?:[ \\t]+[\\p{L}][\\p{L}.]*)*))`;
  const pattern =
    count.unit.text === 'pieces'
      ? `^[ \\t]*For[ \\t]+all[ \\t]+${countMeasurement}[ \\t]+of[ \\t]+${escape(count.description)},[ \\t]+use[ \\t]+exactly[ \\t]+${doseMeasurement}[ \\t]+of[ \\t]+${escape(dose.description)}[ \\t]+on[ \\t]+each[ \\t]+piece\\.?[ \\t]*$`
      : `^[ \\t]*Pour[ \\t]+tous[ \\t]+les[ \\t]+${countMeasurement}[ \\t]+de[ \\t]+${escape(count.description)},[ \\t]+utilisez[ \\t]+exactement[ \\t]+${doseMeasurement}[ \\t]+(?:de[ \\t]+|d['’])${escape(dose.description)}[ \\t]+sur[ \\t]+chaque[ \\t]+morceau\\.?[ \\t]*$`;
  const match = new RegExp(pattern, 'idu').exec(text);
  if (!match) return null;
  const countAmount = parseIngredientAmount(match.groups!.countAmount.trim());
  const doseAmount = parseIngredientAmount(match.groups!.doseAmount.trim());
  if (countAmount?.kind !== 'scalar' || doseAmount?.kind !== 'scalar') return null;
  const literalUnit = match.groups!.doseUnit;
  if (ambiguous.test(literalUnit)) return null;
  const unit =
    dose.unit?.text?.toLowerCase() === literalUnit.toLowerCase()
      ? dose.unit
      : { text: literalUnit, definitionId: null };
  const span = (name: string) => ({
    start: match.indices!.groups![name][0],
    end: match.indices!.groups![name][1],
    expectedText: match.groups![name],
  });
  return {
    count,
    dose,
    unit,
    countAmount,
    doseAmount,
    countSpan: span('count'),
    doseSpan: span('dose'),
  };
}
function candidates(recipe: any, text: string): Clause[] {
  const result: Clause[] = [];
  for (const count of recipe.ingredientLines.filter(
    (row: any) => named(recipe, row) && ['pieces', 'morceaux'].includes(row.unit?.text)
  ))
    for (const dose of recipe.ingredientLines.filter(
      (row: any) => row.id !== count.id && named(recipe, row)
    )) {
      const found = parse(text, count, dose);
      if (found) result.push(found);
    }
  return result;
}
function binding(
  recipe: any,
  step: any,
  clause: Clause,
  isCount: boolean,
  id: string,
  countId?: string
) {
  return {
    id,
    ingredientLineId: isCount ? clause.count.id : clause.dose.id,
    stepId: step.id,
    validatedContentRevision: recipe.contentRevision,
    validatedTextRevision: step.textRevision,
    span: isCount ? clause.countSpan : clause.doseSpan,
    role: isCount ? 'whole' : 'perItem',
    status: 'validated',
    payload: {
      relationshipEvidence: {
        version: 1,
        rule,
        sourceRevision: source(recipe),
        originalAmount: isCount ? clause.countAmount : clause.doseAmount,
      },
      ...(!isCount
        ? {
            dose: { amount: clause.doseAmount, unit: structuredClone(clause.unit) },
            countBindingId: countId,
          }
        : {}),
    },
  };
}
function existing(recipe: any, step: any, clause: Clause, isCount: boolean, countId?: string): any {
  const all = stepsOf(recipe).flatMap((step) => step.bindings);
  const matches = step.bindings.filter(
    (item: any) =>
      item.id &&
      all.filter((other) => other.id === item.id).length === 1 &&
      same(item, binding(recipe, step, clause, isCount, item.id, countId))
  );
  return matches.length === 1 ? matches[0] : null;
}
function carry(
  before: any,
  recipe: any,
  step: any,
  clause: Clause,
  isCount: boolean,
  countId?: string
): any {
  if (source(before) !== source(recipe)) return null;
  const oldSteps = stepsOf(before).filter((old) => old.id === step.id);
  if (
    oldSteps.length !== 1 ||
    oldSteps[0].text !== step.text ||
    oldSteps[0].textRevision !== step.textRevision
  )
    return null;
  const oldCount = before.ingredientLines.filter((row: any) => row.id === clause.count.id);
  const oldDose = before.ingredientLines.filter((row: any) => row.id === clause.dose.id);
  if (
    oldCount.length !== 1 ||
    !sameRow(oldCount[0], clause.count) ||
    (!isCount && (oldDose.length !== 1 || !sameRow(oldDose[0], clause.dose)))
  )
    return null;
  const prior = existing(before, oldSteps[0], clause, isCount, countId);
  const current = existing(recipe, step, clause, isCount, countId);
  return prior && current?.id === prior.id ? current : null;
}
function canonicalAmount(amount: any) {
  try {
    const scalar = (value: any) => `${value.n}/${value.d}`;
    const text =
      amount.kind === 'scalar'
        ? scalar(amount.value)
        : amount.kind === 'range'
          ? `${scalar(amount.min)}–${scalar(amount.max)}`
          : '';
    return same(parseIngredientAmount(text), amount);
  } catch {
    return false;
  }
}
function independentCount(before: any, recipe: any, step: any): any {
  if (!before || source(before) !== source(recipe)) return null;
  const steps = stepsOf(recipe),
    oldSteps = stepsOf(before).filter((old) => old.id === step.id);
  if (
    !step.id ||
    steps.filter((other) => other.id === step.id).length !== 1 ||
    oldSteps.length !== 1 ||
    oldSteps[0].text !== step.text ||
    oldSteps[0].textRevision !== step.textRevision
  )
    return null;
  if (
    step.bindings.length < 1 ||
    step.bindings.length > 2 ||
    step.bindings.some((item: any) => !owned(item)) ||
    step.bindings[0].role !== 'whole' ||
    (step.bindings.length === 2 && step.bindings[1].role !== 'perItem')
  )
    return null;
  const matches = oldSteps[0].bindings.flatMap((prior: any) => {
    const evidence = prior.payload?.relationshipEvidence;
    if (
      !owned(prior) ||
      prior.role !== 'whole' ||
      prior.status !== 'validated' ||
      !prior.id ||
      prior.stepId !== step.id ||
      prior.validatedContentRevision !== before.contentRevision ||
      prior.validatedTextRevision !== step.textRevision ||
      evidence.version !== 1 ||
      evidence.sourceRevision !== source(recipe) ||
      evidence.originalAmount?.kind !== 'scalar' ||
      !canonicalAmount(evidence.originalAmount)
    )
      return [];
    const oldRows = before.ingredientLines.filter((row: any) => row.id === prior.ingredientLineId);
    const rows = recipe.ingredientLines.filter((row: any) => row.id === prior.ingredientLineId);
    if (
      rows.length !== 1 ||
      oldRows.length !== 1 ||
      !named(recipe, rows[0]) ||
      !sameRow(oldRows[0], rows[0]) ||
      !canonicalAmount(rows[0].amount) ||
      !['pieces', 'morceaux'].includes(rows[0].unit?.text)
    )
      return [];
    const row = rows[0],
      french = row.unit.text === 'morceaux';
    const pattern = `^[ \\t]*${french ? 'Pour[ \\t]+tous[ \\t]+les' : 'For[ \\t]+all'}[ \\t]+(?<count>[0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/., \\t]+[ \\t]+${escape(row.unit.text)})[ \\t]+${french ? 'de' : 'of'}[ \\t]+${escape(row.description)},[ \\t]+${french ? 'utilisez[ \\t]+exactement' : 'use[ \\t]+exactly'}[ \\t]+`;
    const found = new RegExp(pattern, 'idu').exec(step.text);
    if (!found) return [];
    const span = {
      start: found.indices!.groups!.count[0],
      end: found.indices!.groups!.count[1],
      expectedText: found.groups!.count,
    };
    if (
      !same(span, prior.span) ||
      !same(
        parseIngredientAmount(span.expectedText.slice(0, -row.unit.text.length).trim()),
        evidence.originalAmount
      )
    )
      return [];
    const mentions = new RegExp(
      `(?<![\\p{L}\\p{N}])${escape(row.description)}(?![\\p{L}\\p{N}])`,
      'giu'
    );
    if (steps.flatMap((other) => [...other.text.matchAll(mentions)]).length !== 1) return [];
    const expected = { ...prior, payload: { relationshipEvidence: evidence } };
    const carried = { ...expected, validatedContentRevision: recipe.contentRevision };
    if (
      !same(prior, expected) ||
      stepsOf(before)
        .flatMap((old) => old.bindings)
        .filter((item) => item.id === prior.id).length !== 1 ||
      steps.flatMap((other) => other.bindings).filter((item) => item.id === prior.id).length !==
        1 ||
      step.bindings.filter((item: any) => same(item, carried)).length !== 1
    )
      return [];
    return [carried];
  });
  return matches.length === 1 ? matches[0] : null;
}

/** Write-time mock companion to the server-owned count/dose producer. */
export function discoverPerItemBindings(before: any, recipe: any) {
  const steps = stepsOf(recipe);
  for (const step of steps) {
    if (step.bindings.some((item: any) => !owned(item))) continue;
    const parsed = candidates(recipe, step.text);
    if (parsed.length === 0) {
      const count = independentCount(before, recipe, step);
      step.bindings = count ? [count] : [];
      continue;
    }
    if (
      parsed.length !== 1 ||
      !step.id ||
      steps.filter((other) => other.id === step.id).length !== 1
    ) {
      step.bindings = [];
      continue;
    }
    const supplied = step.bindings;
    if (
      supplied.length > 2 ||
      supplied.some((item: any) => !item.id) ||
      new Set(supplied.map((item: any) => item.id)).size !== supplied.length ||
      (supplied.length === 2 && (supplied[0].role !== 'whole' || supplied[1].role !== 'perItem'))
    ) {
      step.bindings = [];
      continue;
    }
    const clause = parsed[0];
    if (
      clause.count.package ||
      clause.dose.package ||
      !clause.count.amount ||
      !['proportional', 'fixed'].includes(clause.count.scaling)
    ) {
      step.bindings = [];
      continue;
    }
    if (
      [clause.count, clause.dose].some(
        (row) =>
          steps.flatMap((other) => [
            ...other.text.matchAll(
              new RegExp(`(?<![\\p{L}\\p{N}])${escape(row.description)}(?![\\p{L}\\p{N}])`, 'giu')
            ),
          ]).length !== 1
      )
    ) {
      step.bindings = [];
      continue;
    }
    let count = carry(before, recipe, step, clause, true);
    if (!count) {
      if (!same(clause.count.amount, clause.countAmount) || !same(clause.dose.unit, clause.unit)) {
        step.bindings = [];
        continue;
      }
      count =
        existing(recipe, step, clause, true) ?? binding(recipe, step, clause, true, randomUUID());
    }
    if (
      clause.count.amount.kind !== 'scalar' ||
      clause.count.scaling !== 'proportional' ||
      !same(clause.dose.unit, clause.unit) ||
      !['proportional', 'fixed'].includes(clause.dose.scaling)
    ) {
      step.bindings = [count];
      continue;
    }
    const dose =
      carry(before, recipe, step, clause, false, count.id) ??
      existing(recipe, step, clause, false, count.id) ??
      binding(recipe, step, clause, false, randomUUID(), count.id);
    step.bindings = [count, dose];
  }
}

export function isIndependentPerItemStep(recipe: any, selected: any, text: string, before?: any) {
  const parsed = candidates(recipe, text);
  if (
    parsed.length === 1 &&
    parsed[0].count.id !== selected.id &&
    parsed[0].dose.id !== selected.id
  )
    return true;
  const matches = stepsOf(recipe).filter((step) => step.text === text);
  if (matches.length !== 1) return false;
  const count = independentCount(before, recipe, matches[0]);
  if (
    !count ||
    count.ingredientLineId === selected.id ||
    new RegExp(`(?<![\\p{L}\\p{N}])${escape(selected.description)}(?![\\p{L}\\p{N}])`, 'iu').test(
      text
    )
  )
    return false;
  const oldRows = before.ingredientLines.filter((row: any) => row.id === selected.id);
  if (oldRows.length !== 1 || !sameRow(oldRows[0], selected)) return false;
  const mention = new RegExp(
    `(?<![\\p{L}\\p{N}])${escape(selected.description)}(?![\\p{L}\\p{N}])`,
    'iu'
  );
  const mentioning = stepsOf(recipe).filter((step) => mention.test(step.text));
  const knownRules = [
    'explicit-whole-clause',
    'explicit-absolute-clause',
    'explicit-half-annotation-clause',
    'explicit-fixed-portions-clause',
    'explicit-final-all-remaining-clause',
  ];
  const bindingKeys = [
    'id',
    'ingredientLineId',
    'stepId',
    'validatedContentRevision',
    'validatedTextRevision',
    'span',
    'role',
    'payload',
    'status',
  ];
  const payloadKeys = [
    'relationshipEvidence',
    'amount',
    'unit',
    'fraction',
    'annotationSpan',
    'allocationGroup',
    'allocationGroupId',
    'predecessors',
  ];
  return (
    mentioning.length > 0 &&
    mentioning.every((step) => {
      const old = stepsOf(before).filter((other) => other.id === step.id);
      if (
        old.length !== 1 ||
        old[0].text !== step.text ||
        old[0].textRevision !== step.textRevision
      )
        return false;
      return old[0].bindings.some(
        (proof: any) =>
          proof.status === 'validated' &&
          proof.id &&
          proof.ingredientLineId === selected.id &&
          proof.stepId === step.id &&
          proof.validatedContentRevision === before.contentRevision &&
          proof.validatedTextRevision === step.textRevision &&
          knownRules.includes(proof.payload?.relationshipEvidence?.rule) &&
          Object.keys(proof).every((key) => bindingKeys.includes(key)) &&
          Object.keys(proof.payload).every((key) => payloadKeys.includes(key)) &&
          step.bindings.filter((current: any) =>
            same(current, { ...proof, validatedContentRevision: recipe.contentRevision })
          ).length === 1
      );
    })
  );
}
