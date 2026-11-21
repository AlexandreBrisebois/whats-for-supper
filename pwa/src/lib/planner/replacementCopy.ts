import { tWithVars } from '@/locales';
import { formatSupperPlanDate } from './nonCooking';
import type { OriginalDisposition } from './replacementSession';

export function describeOriginalDisposition(original: OriginalDisposition) {
  if (original.action === 'drop')
    return tWithVars(
      'planning.replacement.removed',
      '{{recipe}} was removed from {{date}}. The recipe remains in your library.',
      {
        recipe: original.recipeName,
        date: formatSupperPlanDate(original.sourceDate),
      }
    );
  if (!original.destinationDate) return '';
  return tWithVars(
    original.spillover ? 'planning.replacement.spillover' : 'planning.replacement.moved',
    original.spillover
      ? 'The following week was full. {{recipe}} moved to {{date}}.'
      : '{{recipe}} moved to {{date}}.',
    { recipe: original.recipeName, date: formatSupperPlanDate(original.destinationDate) }
  );
}
