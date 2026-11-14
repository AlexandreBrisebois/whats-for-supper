import type { Recipe } from '@/lib/api/recipes';
import type { UpdateRecipeDto } from '@/lib/api/generated/models';

type RecordValue = Record<string, unknown>;
const object = (value: unknown): RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as RecordValue)
    : {};

// Editor content is always original. Retain legacy section/step metadata; canonical
// input contains identities/text only, never caller-authored binding proofs.
export function originalInstructions(recipe: Recipe): unknown[] {
  return recipe.contentSchemaVersion === 2
    ? (recipe.instructionSections ?? []).map((section) => ({
        id: section.id,
        name: section.name ?? null,
        steps: (section.steps ?? []).map((step) => ({ id: step.id, text: step.text ?? '' })),
      }))
    : structuredClone(recipe.recipeInstructions ?? []);
}
export function instructionRows(content: unknown[], canonical: boolean) {
  return content.flatMap((entry, outer) => {
    const section = object(entry);
    const steps = canonical ? section.steps : section.itemListElement;
    if (Array.isArray(steps))
      return steps.map((step, inner) => ({
        path: [outer, inner] as [number, number?],
        text: String(object(step).text ?? object(step).name ?? ''),
      }));
    return [
      {
        path: [outer] as [number, number?],
        text: typeof entry === 'string' ? entry : String(section.text ?? section.name ?? ''),
      },
    ];
  });
}
export function changeInstruction(
  content: unknown[],
  canonical: boolean,
  path: [number, number?],
  text: string | null
): unknown[] {
  const [outer, inner] = path;
  const field = canonical ? 'steps' : 'itemListElement';
  const update = (value: unknown) =>
    typeof value === 'string' ? text : { ...object(value), text };
  return content.flatMap((entry, index) => {
    if (index !== outer) return [entry];
    if (inner === undefined) return text === null ? [] : [update(entry)];
    const section = object(entry);
    return [
      {
        ...section,
        [field]: (section[field] as unknown[]).flatMap((step, index) =>
          index !== inner ? [step] : text === null ? [] : [update(step)]
        ),
      },
    ];
  });
}
export function addInstruction(content: unknown[], canonical: boolean): unknown[] {
  if (!canonical) {
    if (content.length && Array.isArray(object(content[0]).itemListElement))
      return content.map((entry, index) =>
        index === content.length - 1
          ? {
              ...object(entry),
              itemListElement: [
                ...(object(entry).itemListElement as unknown[]),
                { '@type': 'HowToStep', text: '' },
              ],
            }
          : entry
      );
    return [...content, typeof content[0] === 'string' ? '' : { '@type': 'HowToStep', text: '' }];
  }
  const step = { clientId: crypto.randomUUID(), text: '' };
  if (!content.length) return [{ clientId: crypto.randomUUID(), name: null, steps: [step] }];
  return content.map((entry, index) =>
    index === content.length - 1
      ? { ...object(entry), steps: [...(object(entry).steps as unknown[]), step] }
      : entry
  );
}
export function canonicalInstructionInput(content: unknown[]) {
  return content as UpdateRecipeDto['instructionSections'];
}

export function restoreDeletedInstructionIds(content: unknown[], current: unknown[]): unknown[] {
  const sections = new Set(current.map((section) => object(section).id));
  const steps = new Set(
    current.flatMap((section) =>
      ((object(section).steps as unknown[]) ?? []).map((step) => object(step).id)
    )
  );
  return content.map((entry) => {
    const section = object(entry);
    const { id, ...rest } = section;
    return {
      ...rest,
      ...(typeof id === 'string' && sections.has(id)
        ? { id }
        : {
            clientId: typeof section.clientId === 'string' ? section.clientId : crypto.randomUUID(),
          }),
      steps: ((section.steps as unknown[]) ?? []).map((entry) => {
        const step = object(entry);
        const { id, ...rest } = step;
        return {
          ...rest,
          ...(typeof id === 'string' && steps.has(id)
            ? { id }
            : {
                clientId: typeof step.clientId === 'string' ? step.clientId : crypto.randomUUID(),
              }),
        };
      }),
    };
  });
}
