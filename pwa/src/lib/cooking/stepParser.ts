export interface CookingStep {
  index: number;
  title: string;
  instruction: string;
}

interface HowToStep {
  name?: string;
  text?: string;
  url?: string;
}

type RecipeInstructions = string[] | HowToStep[] | string;

export function parseRecipeSteps(
  recipeInstructions?: string[] | Array<{ name?: string; text?: string }>
): CookingStep[] {
  if (!recipeInstructions) return [];

  const steps: CookingStep[] = [];

  try {
    if (!Array.isArray(recipeInstructions) || recipeInstructions.length === 0) {
      return [];
    }

    const firstItem = recipeInstructions[0];

    // Handle string array format: ["Step 1...", "Step 2..."]
    if (typeof firstItem === 'string') {
      return recipeInstructions
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((instruction, idx) => ({
          index: idx + 1,
          title: `Step ${idx + 1}`,
          instruction: instruction.trim(),
        }));
    }

    // Handle HowToStep objects: [{name: "...", text: "..."}, ...]
    if (typeof firstItem === 'object' && firstItem !== null) {
      return (recipeInstructions as HowToStep[])
        .filter((item): item is HowToStep => typeof item === 'object' && item !== null)
        .map((step, idx) => {
          const text = step.text || step.name || '';
          return {
            index: idx + 1,
            title: step.name || `Step ${idx + 1}`,
            instruction: text,
          };
        })
        .filter((step) => step.instruction.trim().length > 0);
    }
  } catch (error) {
    console.error('Error parsing recipe steps:', error);
  }

  return [];
}
