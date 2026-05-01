export interface CookingStep {
  index: number;
  title: string;
  instruction: string;
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
]);

function isHowToSection(item: unknown): item is HowToSection {
  return (
    typeof item === 'object' &&
    item !== null &&
    'itemListElement' in item &&
    Array.isArray((item as HowToSection).itemListElement)
  );
}

export function parseRecipeSteps(
  recipeInstructions?: string[] | Array<{ name?: string; text?: string }>
): CookingStep[] {
  if (!recipeInstructions) return [];

  try {
    if (!Array.isArray(recipeInstructions) || recipeInstructions.length === 0) {
      return [];
    }

    const firstItem = recipeInstructions[0];

    // ── Branch 1: string array ["Step 1...", "Step 2..."] ───────────────────
    if (typeof firstItem === 'string') {
      return recipeInstructions
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((instruction, idx) => ({
          index: idx + 1,
          title: `Step ${idx + 1}`,
          instruction: instruction.trim(),
        }));
    }

    if (typeof firstItem !== 'object' || firstItem === null) return [];

    // ── Branch 2: HowToSection array [{@type:"HowToSection", itemListElement:[...]}]
    if (isHowToSection(firstItem)) {
      const steps: CookingStep[] = [];
      let globalIndex = 1;

      for (const section of recipeInstructions as HowToSection[]) {
        if (!isHowToSection(section)) continue;

        const sectionName = section.name?.trim() ?? '';
        const isGeneric = GENERIC_SECTION_NAMES.has(sectionName.toLowerCase());

        for (const step of section.itemListElement ?? []) {
          const text = step.text?.trim() || step.name?.trim() || '';
          if (!text) continue;

          // Prefix with section name only when it adds context
          const instruction = !isGeneric && sectionName ? `${sectionName}: ${text}` : text;

          steps.push({
            index: globalIndex++,
            title: step.name?.trim() || `Step ${globalIndex - 1}`,
            instruction,
          });
        }
      }

      return steps;
    }

    // ── Branch 3: flat HowToStep array [{name:"...", text:"..."}] ───────────
    return (recipeInstructions as HowToStep[])
      .filter((item): item is HowToStep => typeof item === 'object' && item !== null)
      .map((step, idx) => {
        const text = step.text?.trim() || step.name?.trim() || '';
        return {
          index: idx + 1,
          title: step.name?.trim() || `Step ${idx + 1}`,
          instruction: text,
        };
      })
      .filter((step) => step.instruction.length > 0);
  } catch (error) {
    console.error('Error parsing recipe steps:', error);
  }

  return [];
}
