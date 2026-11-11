import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual as same } from 'node:util';
import { parseIngredientAmount } from '../src/lib/recipes/ingredient-amount';

const rule = 'explicit-fixed-portions-clause';
const units = new Set([
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
const ambiguous =
  /(?<![\p{L}\p{N}])(half|remaining|remainder|rest|reserve|reserved|except|unless|some|part|divided|each|per|alternatively|or|if|not|never|moitié|reste|restant|restante|réserver|réservez|sauf|chaque|par|ou|si|pas|jamais)(?![\p{L}\p{N}])/iu;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const owned = (binding: any) => binding.payload?.relationshipEvidence?.rule === rule;

/** Write-time mock companion; fixed dose is independent of ingredient demand. */
export function discoverFixedBindings(before: any, recipe: any) {
  const steps = (recipe.instructionSections ?? []).flatMap((section: any) => section.steps);
  const oldSteps = (before.instructionSections ?? []).flatMap((section: any) => section.steps);
  for (const step of steps) {
    // Existing independently owned proof is retained, including uncertain proof.
    const foreign = step.bindings.filter((binding: any) => !owned(binding));
    const candidates = recipe.ingredientLines.filter((row: any) => {
      if (
        row.amount?.kind !== 'scalar' ||
        BigInt(row.amount.value.n) <= 0n ||
        !['proportional', 'fixed'].includes(row.scaling) ||
        row.package ||
        !row.unit?.text ||
        !units.has(row.unit.text.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ')) ||
        !row.description?.trim() ||
        ambiguous.test(row.description) ||
        /[\r\n.;:!?]/.test(row.description) ||
        recipe.ingredientLines.filter(
          (other: any) =>
            other.id === row.id || other.description.toLowerCase() === row.description.toLowerCase()
        ).length !== 1 ||
        steps.filter((other: any) => other.id === step.id).length !== 1
      )
        return false;
      const mentions = new RegExp(
        `(?<![\\p{L}\\p{N}])${escape(row.description)}(?![\\p{L}\\p{N}])`,
        'giu'
      );
      return (
        steps.flatMap((other: any) => [...other.text.matchAll(mentions)]).length === 1 &&
        parseExplicitFixedClause(step.text, row) != null &&
        steps.every(
          (other: any) =>
            !ambiguous.test(other.text) ||
            independentPartial(other.text, row, recipe.ingredientLines)
        )
      );
    });
    if (candidates.length !== 1) {
      step.bindings = foreign;
      continue;
    }
    const row = candidates[0];
    // Replace only write-time producer proof whose old text is no longer current.
    const preserved = foreign.filter(
      (binding: any) =>
        !(
          binding.ingredientLineId === row.id &&
          [
            'explicit-whole-clause',
            'explicit-absolute-clause',
            'explicit-half-annotation-clause',
          ].includes(binding.payload?.relationshipEvidence?.rule) &&
          (binding.validatedTextRevision !== step.textRevision ||
            binding.span?.expectedText !== step.text.slice(binding.span?.start, binding.span?.end))
        )
    );
    if (preserved.length) {
      step.bindings = preserved;
      continue;
    }
    const match = parseExplicitFixedClause(step.text, row)!;
    const amount = parseIngredientAmount(match.groups!.amount.trim())!;
    const measurement = match.groups!.measurement;
    const start = match.indices!.groups!.measurement[0];
    const span = { start, end: start + measurement.length, expectedText: measurement };
    const oldRow = before.ingredientLines.find((old: any) => old.id === row.id);
    const oldStep = oldSteps.find(
      (old: any) =>
        old.id === step.id && old.text === step.text && old.textRevision === step.textRevision
    );
    const prior =
      oldRow &&
      ['description', 'unit', 'scaling', 'package', 'shopping'].every((key) =>
        same(oldRow[key], row[key])
      ) &&
      oldStep?.bindings.find(
        (binding: any) =>
          owned(binding) &&
          binding.role === 'fixed' &&
          binding.status === 'validated' &&
          binding.validatedContentRevision === before.contentRevision &&
          binding.validatedTextRevision === step.textRevision &&
          same(binding.span, span) &&
          same(binding.payload.amount, amount) &&
          same(binding.payload.unit, row.unit)
      );
    step.bindings = [
      {
        id: prior?.id ?? randomUUID(),
        ingredientLineId: row.id,
        stepId: step.id,
        validatedContentRevision: recipe.contentRevision,
        validatedTextRevision: step.textRevision,
        span,
        role: 'fixed',
        status: 'validated',
        payload: {
          amount,
          unit: structuredClone(row.unit),
          relationshipEvidence: {
            version: 1,
            rule,
            sourceRevision: recipe.sourceRevision ?? 'mock-source',
            originalAmount: amount,
          },
        },
      },
    ];
  }
}
export function parseExplicitFixedClause(text: string, row: any) {
  if (typeof row.unit?.text !== 'string') return null;
  if (/[\r\n]/.test(text)) return null;
  const measure = `(?<measurement>(?<amount>[0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞][0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.,–\\- \\t]*)[ \\t]+${escape(row.unit.text)})`;
  const noun = escape(row.description);
  const match =
    new RegExp(
      `^[ \\t]*(?:For[ \\t]+any[ \\t]+number[ \\t]+of[ \\t]+portions,[ \\t]+use[ \\t]+exactly[ \\t]+${measure}[ \\t]+(?:of[ \\t]+)?${noun})\\.?[ \\t]*$`,
      'idu'
    ).exec(text) ??
    new RegExp(
      `^[ \\t]*Quel[ \\t]+que[ \\t]+soit[ \\t]+le[ \\t]+nombre[ \\t]+de[ \\t]+portions,[ \\t]+utilisez[ \\t]+exactement[ \\t]+${measure}[ \\t]+(?:de[ \\t]+|d['’])${noun}\\.?[ \\t]*$`,
      'idu'
    ).exec(text);
  const amount = match && parseIngredientAmount(match.groups!.amount.trim());
  const value = amount && 'value' in amount ? amount.value : null;
  return amount?.kind === 'scalar' && value?.n && BigInt(value.n) > 0n ? match : null;
}

function independentPartial(text: string, selected: any, rows: any[]) {
  if (/[\r\n]/.test(text)) return false;
  return rows.some((row: any) => {
    if (
      row.id === selected.id ||
      !row.description?.trim() ||
      rows.filter((other: any) => other.description.toLowerCase() === row.description.toLowerCase())
        .length !== 1
    )
      return false;
    const noun = escape(row.description);
    const prefix = `(?:(?:Add|Use|Reserve)[ \\t]+(?:half[ \\t]+(?:of[ \\t]+)?(?:the[ \\t]+)?|some[ \\t]+(?:of[ \\t]+the[ \\t]+)?|the[ \\t]+remaining[ \\t]+)|(?:Ajouter|Ajoutez|Réserver|Réservez)[ \\t]+la moitié[ \\t]+(?:de la[ \\t]+|du[ \\t]+|des[ \\t]+|de l['’]))`;
    if (new RegExp(`^[ \\t]*${prefix}${noun}\\.?[ \\t]*$`, 'iu').test(text)) return true;
    const final = `(?:Finally,[ \\t]+(?:use|add)[ \\t]+all[ \\t]+the[ \\t]+remaining[ \\t]+${noun}|Enfin,[ \\t]+(?:utilisez|ajoutez)[ \\t]+tout[ \\t]+le[ \\t]+reste[ \\t]+(?:de[ \\t]+|d['’])${noun})`;
    if (new RegExp(`^[ \\t]*${final}\\.?[ \\t]*$`, 'iu').test(text)) return true;
    const half = `(?:(?:Add|Use|Cook|Boil|Mix)[ \\t]+half[ \\t]+(?:of[ \\t]+)?the[ \\t]+${noun}|(?:Ajouter|Ajoutez|Utiliser|Utilisez|Cuire|Faire cuire|Faites cuire|Mélanger|Mélangez)[ \\t]+la[ \\t]+moitié[ \\t]+(?:de la[ \\t]+|du[ \\t]+|des[ \\t]+|de l['’])${noun})`;
    const measure = `(?<amount>[0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞][0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.,–\\- \\t]*)${row.unit ? `[ \\t]+${escape(row.unit.text)}` : ''}`;
    const match = new RegExp(`^[ \\t]*${half}[ \\t]+\\(${measure}\\)\\.?[ \\t]*$`, 'iu').exec(text);
    return match != null && parseIngredientAmount(match.groups!.amount.trim()) != null;
  });
}
