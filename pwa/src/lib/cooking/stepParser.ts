export interface CookingStep {
  index: number;
  title: string;
  instruction: string;
  sourcePath?: [number, number?];
  editableInstruction?: string;
}

interface HowToStep {
  '@type'?: string;
  name?: string;
  text?: string;
  url?: string;
}

interface HowToSection {
  '@type'?: string;
  name?: string;
  itemListElement?: HowToStep[];
}

// Generic section names that don't add value as a step title prefix
const GENERIC_SECTION_NAMES = new Set([
  'preparation',
  'instructions',
  'steps',
  'directions',
  'method',
  'préparation',
  'instructions',
  'étapes',
  'directions',
]);

function isHowToSection(item: unknown): item is HowToSection {
  return (
    typeof item === 'object' &&
    item !== null &&
    'itemListElement' in item &&
    Array.isArray((item as HowToSection).itemListElement)
  );
}

export function parseRecipeSteps(recipeInstructions?: unknown): CookingStep[] {
  if (!recipeInstructions) return [];

  try {
    const instructions = Array.isArray(recipeInstructions) ? recipeInstructions : [];

    if (instructions.length === 0) return [];

    const firstItem = instructions[0];

    // ── Branch 1: string array ["Step 1...", "Step 2..."] ───────────────────
    if (typeof firstItem === 'string') {
      const steps: CookingStep[] = [];
      instructions.forEach((value, sourceIndex) => {
        if (typeof value !== 'string' || !value.trim()) return;
        const index = steps.length + 1;
        steps.push({
          index,
          title: `Step ${index}`,
          instruction: value.trim(),
          editableInstruction: value.trim(),
          sourcePath: [sourceIndex],
        });
      });
      return steps;
    }

    if (typeof firstItem !== 'object' || firstItem === null) return [];

    // ── Branch 2: HowToSection array [{@type:"HowToSection", itemListElement:[...]}]
    if (isHowToSection(firstItem)) {
      const steps: CookingStep[] = [];
      let globalIndex = 1;

      for (const [sectionIndex, section] of (instructions as HowToSection[]).entries()) {
        if (!isHowToSection(section)) continue;

        const sectionName = section.name?.trim() ?? '';
        const isGeneric = GENERIC_SECTION_NAMES.has(sectionName.toLowerCase());

        for (const [stepIndex, step] of (section.itemListElement ?? []).entries()) {
          const text = step.text?.trim() || step.name?.trim() || '';
          if (!text) continue;

          // Prefix with section name only when it adds context
          const instruction = !isGeneric && sectionName ? `${sectionName}: ${text}` : text;

          steps.push({
            index: globalIndex++,
            title: step.name?.trim() || `Step ${globalIndex - 1}`,
            instruction,
            editableInstruction: text,
            sourcePath: [sectionIndex, stepIndex] as [number, number],
          });
        }
      }

      return steps;
    }

    // ── Branch 3: flat HowToStep array [{name:"...", text:"..."}] ───────────
    const flatSteps: CookingStep[] = [];
    (instructions as HowToStep[]).forEach((step, sourceIndex) => {
      if (typeof step !== 'object' || step === null) return;
      const text = step.text?.trim() || step.name?.trim() || '';
      if (!text) return;
      const index = flatSteps.length + 1;
      flatSteps.push({
        index,
        title: step.name?.trim() || `Step ${index}`,
        instruction: text,
        editableInstruction: text,
        sourcePath: [sourceIndex],
      });
    });
    return flatSteps;
  } catch (error) {
    console.error('Error parsing recipe steps:', error);
  }

  return [];
}
