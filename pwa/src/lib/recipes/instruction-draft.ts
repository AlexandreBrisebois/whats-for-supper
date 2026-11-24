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
export interface InstructionStepDraftRow {
  path: [number, number?];
  stepNumber: number;
  text: string;
}

export interface InstructionSectionDraft {
  sectionIndex: number;
  key: string;
  name: string;
  steps: InstructionStepDraftRow[];
}

export function instructionRows(content: unknown[], structured: boolean) {
  return content.flatMap((entry, outer) => {
    const section = object(entry);
    const steps = structured ? section.steps : section.itemListElement;
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

function isLegacySectioned(content: unknown[]): boolean {
  return content.length > 0 && Array.isArray(object(content[0]).itemListElement);
}

export function instructionSections(
  content: unknown[],
  structured: boolean
): InstructionSectionDraft[] {
  if (!content.length) return [];
  if (structured || isLegacySectioned(content)) {
    let stepNumber = 1;
    return content.map((entry, outer) => {
      const section = object(entry);
      const rawSteps = (structured ? section.steps : section.itemListElement) as unknown[];
      const steps = Array.isArray(rawSteps) ? rawSteps : [];
      const key =
        typeof section.id === 'string'
          ? section.id
          : typeof section.clientId === 'string'
            ? section.clientId
            : `section-${outer}`;
      return {
        sectionIndex: outer,
        key,
        name: typeof section.name === 'string' ? section.name : '',
        steps: steps.map((step, inner) => ({
          path: [outer, inner] as [number, number?],
          stepNumber: stepNumber++,
          text:
            typeof step === 'string' ? step : String(object(step).text ?? object(step).name ?? ''),
        })),
      };
    });
  }
  return [
    {
      sectionIndex: 0,
      key: 'section-0',
      name: '',
      steps: content.map((entry, outer) => {
        const step = object(entry);
        return {
          path: [outer] as [number, number?],
          stepNumber: outer + 1,
          text: typeof entry === 'string' ? entry : String(step.text ?? step.name ?? ''),
        };
      }),
    },
  ];
}

export function changeInstructionSectionName(
  content: unknown[],
  structured: boolean,
  sectionIndex: number,
  name: string
): unknown[] {
  if (structured || isLegacySectioned(content)) {
    return content.map((entry, index) =>
      index === sectionIndex ? { ...object(entry), name } : entry
    );
  }
  if (sectionIndex !== 0) return content;
  return [{ '@type': 'HowToSection', name, itemListElement: [...content] }];
}

export function addInstructionSection(content: unknown[], structured: boolean): unknown[] {
  if (structured) {
    return [
      ...content,
      {
        clientId: crypto.randomUUID(),
        name: null,
        steps: [{ clientId: crypto.randomUUID(), text: '' }],
      },
    ];
  }
  const nextSection = {
    '@type': 'HowToSection',
    name: null,
    itemListElement: [{ '@type': 'HowToStep', text: '' }],
  };
  if (!content.length) return [nextSection];
  if (isLegacySectioned(content)) return [...content, nextSection];
  return [{ '@type': 'HowToSection', name: null, itemListElement: [...content] }, nextSection];
}

export function removeInstructionSection(
  content: unknown[],
  structured: boolean,
  sectionIndex: number
): unknown[] {
  if (structured || isLegacySectioned(content)) {
    return content.filter((_, index) => index !== sectionIndex);
  }
  return sectionIndex === 0 ? [] : content;
}

export function changeInstruction(
  content: unknown[],
  structured: boolean,
  path: [number, number?],
  text: string | null
): unknown[] {
  const [outer, inner] = path;
  const field = structured ? 'steps' : 'itemListElement';
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
export function addInstruction(
  content: unknown[],
  structured: boolean,
  sectionIndex?: number
): unknown[] {
  if (!structured) {
    if (isLegacySectioned(content)) {
      const target = sectionIndex ?? content.length - 1;
      return content.map((entry, index) =>
        index === target
          ? {
              ...object(entry),
              itemListElement: [
                ...(object(entry).itemListElement as unknown[]),
                { '@type': 'HowToStep', text: '' },
              ],
            }
          : entry
      );
    }
    return [...content, typeof content[0] === 'string' ? '' : { '@type': 'HowToStep', text: '' }];
  }
  const step = { clientId: crypto.randomUUID(), text: '' };
  if (!content.length) return [{ clientId: crypto.randomUUID(), name: null, steps: [step] }];
  const target = sectionIndex ?? content.length - 1;
  return content.map((entry, index) =>
    index === target
      ? { ...object(entry), steps: [...(object(entry).steps as unknown[]), step] }
      : entry
  );
}
export function structuredInstructionInput(content: unknown[]) {
  return content.map((entry) => {
    const section = object(entry);
    const trimmed = typeof section.name === 'string' ? section.name.trim() : '';
    return {
      ...section,
      name: trimmed ? trimmed : null,
    };
  }) as UpdateRecipeDto['instructionSections'];
}
export function legacyInstructionInput(content: unknown[]): unknown[] {
  return content.map((entry) => {
    const section = object(entry);
    if (!Array.isArray(section.itemListElement)) return entry;
    const trimmed = typeof section.name === 'string' ? section.name.trim() : '';
    return {
      ...section,
      name: trimmed ? trimmed : null,
    };
  });
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
