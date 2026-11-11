import { parseExplicitFixedClause } from './cooking-fixed-producer';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual as same } from 'node:util';
import { parseIngredientAmount } from '../src/lib/recipes/ingredient-amount';

const knownUnits = new Set([
  'g',
  'gram',
  'grams',
  'gramme',
  'grammes',
  'kg',
  'kilogram',
  'kilograms',
  'kilogramme',
  'kilogrammes',
  'mg',
  'milligram',
  'milligrams',
  'milligramme',
  'milligrammes',
  'ml',
  'milliliter',
  'milliliters',
  'millilitre',
  'millilitres',
  'l',
  'liter',
  'liters',
  'litre',
  'litres',
  'cl',
  'dl',
  'cup',
  'cups',
  'tasse',
  'tasses',
  'tsp',
  'tsp.',
  'tsps',
  'teaspoon',
  'teaspoons',
  'c. à thé',
  'c à thé',
  'cuillère à thé',
  'cuillères à thé',
  'cuillerée à thé',
  'cuillerées à thé',
  'tbsp',
  'tbsp.',
  'tbsps',
  'tablespoon',
  'tablespoons',
  'c. à soupe',
  'c à soupe',
  'cuillère à soupe',
  'cuillères à soupe',
  'cuillerée à soupe',
  'cuillerées à soupe',
]);
const ambiguousSubject =
  /(?<![\p{L}\p{N}])(half|remaining|remainder|rest|reserve|reserved|except|unless|some|part|divided|each|per|alternatively|or|if|not|never|moitié|reste|restant|restante|réserver|réservez|sauf|chaque|par|ou|si|pas|jamais)(?![\p{L}\p{N}])/iu;
const finalRule = 'explicit-final-all-remaining-clause';
const absoluteRule = 'explicit-absolute-clause';
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const plainAbsolute = (binding: any) =>
  binding.role === 'absolute' &&
  binding.payload?.relationshipEvidence?.rule === absoluteRule &&
  !binding.payload?.allocationGroup;
const owned = (binding: any) =>
  binding.payload?.relationshipEvidence?.rule === finalRule ||
  (binding.payload?.relationshipEvidence?.rule === absoluteRule &&
    binding.payload?.allocationGroup);

function measuredClause(text: string, row: any, independent = false) {
  const noun = escape(row.description);
  const measure = `(?<measurement>(?<amount>[0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞][0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.,–\\- \\t]*)[ \\t]+${escape(row.unit?.text ?? '')})`;
  return [
    `(?:Add|Use|Cook|Boil|Mix)[ \t]+${independent ? '(?:all[ \\t]+)?' : ''}${measure}[ \t]+(?:of[ \t]+)?${noun}`,
    `(?:Ajouter|Ajoutez|Utiliser|Utilisez|Cuire|Faire cuire|Faites cuire|Mélanger|Mélangez)[ \t]+${independent ? '(?:(?:tous les|toutes les|la totalité des)[ \\t]+)?' : ''}${measure}[ \t]+(?:de[ \t]+|d['’])?${noun}`,
  ]
    .map((pattern) => new RegExp(`^[ \t]*${pattern}\\.?[ \t]*$`, 'iu').exec(text))
    .find(Boolean);
}
function finalClause(text: string, row: any) {
  const noun = escape(row.description);
  return new RegExp(
    `^[ \\t]*(?:Finally,[ \\t]+(?:use|add)[ \\t]+all[ \\t]+the[ \\t]+remaining[ \\t]+${noun}|Enfin,[ \\t]+(?:utilisez|ajoutez)[ \\t]+tout[ \\t]+le[ \\t]+reste[ \\t]+(?:de[ \\t]+|d['’])${noun})\\.?[ \\t]*$`,
    'iu'
  ).exec(text);
}
function independentStep(text: string, selected: any, rows: any[]) {
  if (
    /^[ \t]*Simmer[ \t]+[1-9][0-9]*[ \t]+minutes[ \t]+at[ \t]+[1-9][0-9]*[ \t]+°C\.[ \t]*$/iu.test(
      text
    )
  )
    return true;
  return rows.some((row: any) => {
    if (
      row.id === selected.id ||
      !row.description ||
      ambiguousSubject.test(row.description) ||
      rows.filter((other: any) => other.description.toLowerCase() === row.description.toLowerCase())
        .length !== 1
    )
      return false;
    const measured = measuredClause(text, row, true);
    if (measured && parseIngredientAmount(measured.groups!.amount.trim())) return true;
    if (finalClause(text, row) || parseExplicitFixedClause(text, row)) return true;
    const noun = escape(row.description);
    const annotation = `[0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞][0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.,–\\- \\t]*[ \\t]+${escape(row.unit?.text ?? '')}`;
    return new RegExp(
      `^[ \\t]*(?:(?:Add|Use|Cook|Boil|Mix)[ \\t]+half[ \\t]+(?:of[ \\t]+)?the[ \\t]+${noun}|(?:Ajouter|Ajoutez|Utiliser|Utilisez|Cuire|Faire cuire|Faites cuire|Mélanger|Mélangez)[ \\t]+la[ \\t]+moitié[ \\t]+(?:de la[ \\t]+|du[ \\t]+|des[ \\t]+|de l['’])${noun})[ \\t]+\\(${annotation}\\)\\.?[ \\t]*$`,
      'iu'
    ).test(text);
  });
}

/** Write-time companion for the bounded ordinary C05 Save scenario. */
export function discoverRemainderBindings(before: any, recipe: any) {
  const steps = (recipe.instructionSections ?? []).flatMap((section: any) => section.steps);
  const previous = (before.instructionSections ?? []).flatMap((section: any) => section.steps);
  for (const step of steps) step.bindings = step.bindings.filter((binding: any) => !owned(binding));
  for (const row of recipe.ingredientLines ?? []) {
    if (
      row.amount?.kind !== 'scalar' ||
      row.scaling !== 'proportional' ||
      row.package ||
      !row.unit?.text ||
      !knownUnits.has(row.unit.text.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ')) ||
      !row.description?.trim() ||
      ambiguousSubject.test(row.description) ||
      /[\r\n.;:!?]/.test(row.description) ||
      recipe.ingredientLines.filter(
        (other: any) =>
          other.id === row.id || other.description.toLowerCase() === row.description.toLowerCase()
      ).length !== 1
    )
      continue;
    const noun = escape(row.description);
    const mention = new RegExp(`(?<![\\p{L}\\p{N}])${noun}(?![\\p{L}\\p{N}])`, 'giu');
    const matches = steps.filter((step: any) => [...step.text.matchAll(mention)].length > 0);
    if (
      matches.length !== 2 ||
      matches.some(
        (step: any, index: number) =>
          [...step.text.matchAll(mention)].length !== 1 ||
          (step.bindings.length !== 0 &&
            !(index === 0 && step.bindings.length === 1 && plainAbsolute(step.bindings[0]))) ||
          steps.filter((other: any) => other.id === step.id).length !== 1
      )
    )
      continue;
    const [prior, final] = matches;
    const first = measuredClause(prior.text, row);
    const last = finalClause(final.text, row);
    if (!first || !last) continue;
    const amount = parseIngredientAmount(first.groups!.amount.trim());
    const value = amount && 'value' in amount ? amount.value : null;
    if (
      amount?.kind !== 'scalar' ||
      !value?.n ||
      !value.d ||
      value.n === '0' ||
      BigInt(row.amount.value.n) * BigInt(value.d) < BigInt(value.n) * BigInt(row.amount.value.d)
    )
      continue;
    if (
      steps.some(
        (step: any) =>
          step !== prior &&
          step !== final &&
          !independentStep(step.text, row, recipe.ingredientLines)
      )
    )
      continue;
    const oldRow = before.ingredientLines.find((other: any) => other.id === row.id);
    const unchanged = (step: any) =>
      previous.find(
        (old: any) =>
          old.id === step.id && old.text === step.text && old.textRevision === step.textRevision
      );
    const meaningSame =
      oldRow &&
      ['description', 'unit', 'scaling', 'package', 'shopping'].every((key) =>
        same(oldRow[key], row[key])
      );
    const oldPrior =
      meaningSame &&
      unchanged(prior)?.bindings.find(
        (binding: any) =>
          (owned(binding) || plainAbsolute(binding)) &&
          binding.role === 'absolute' &&
          binding.status === 'validated' &&
          binding.validatedContentRevision === before.contentRevision &&
          binding.validatedTextRevision === prior.textRevision &&
          same(binding.payload.amount, amount) &&
          same(binding.payload.unit, row.unit)
      );
    const priorId = oldPrior?.id ?? randomUUID();
    const oldFinal =
      oldPrior &&
      unchanged(final)?.bindings.find(
        (binding: any) => owned(binding) && binding.payload?.predecessors?.[0] === priorId
      );
    const finalId = oldFinal?.id ?? randomUUID();
    const group = {
      id: oldPrior?.payload.allocationGroup?.id ?? randomUUID(),
      exhaustive: true,
      bindingIds: [priorId, finalId],
    };
    const measurement = first.groups!.measurement;
    const remainder = /remaining|reste/iu.exec(final.text)!;
    const bind = (
      step: any,
      id: string,
      role: string,
      text: string,
      start: number,
      payload: any
    ) => ({
      id,
      ingredientLineId: row.id,
      stepId: step.id,
      role,
      status: 'validated',
      validatedContentRevision: recipe.contentRevision,
      validatedTextRevision: step.textRevision,
      span: { start, end: start + text.length, expectedText: text },
      payload: {
        relationshipEvidence: {
          version: 1,
          rule: role === 'remainder' ? finalRule : absoluteRule,
          sourceRevision: 'mock-source',
          originalAmount: amount,
        },
        allocationGroup: group,
        ...payload,
      },
    });
    prior.bindings = [
      bind(prior, priorId, 'absolute', measurement, prior.text.indexOf(measurement), {
        amount,
        unit: row.unit,
      }),
    ];
    final.bindings = [
      bind(final, finalId, 'remainder', remainder[0], remainder.index, {
        allocationGroupId: group.id,
        predecessors: [priorId],
      }),
    ];
  }
}
