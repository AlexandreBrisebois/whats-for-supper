export type AisleSection = 'Vegetables' | 'Meat' | 'Dairy' | 'Bakery' | 'Pantry';

const AISLE_KEYWORDS: Record<AisleSection, string[]> = {
  Vegetables: [
    'lettuce',
    'spinach',
    'kale',
    'tomato',
    'carrot',
    'broccoli',
    'onion',
    'garlic',
    'celery',
    'cucumber',
    'bell pepper',
    'zucchini',
    'squash',
    'radish',
    'parsnip',
    'potato',
    'sweet potato',
    'cabbage',
    'cauliflower',
    'leek',
    'chard',
    'arugula',
    'bean',
    'pea',
    'eggplant',
    'artichoke',
    'okra',
    'asparagus',
    'corn',
    'green bean',
  ],
  Meat: [
    'beef',
    'ground beef',
    'steak',
    'chuck',
    'brisket',
    'chicken',
    'breast',
    'thigh',
    'leg',
    'wing',
    'pork',
    'ham',
    'bacon',
    'sausage',
    'chop',
    'lamb',
    'mutton',
    'fish',
    'salmon',
    'cod',
    'tuna',
    'shrimp',
    'prawn',
    'turkey',
    'duck',
    'goose',
  ],
  Dairy: [
    'milk',
    'cream',
    'butter',
    'cheese',
    'yogurt',
    'sour cream',
    'cottage cheese',
    'mozzarella',
    'cheddar',
    'parmesan',
    'feta',
    'ricotta',
    'brie',
    'gouda',
    'egg',
    'eggs',
    'cream cheese',
  ],
  Bakery: [
    'bread',
    'flour',
    'baguette',
    'croissant',
    'pastry',
    'bagel',
    'roll',
    'bun',
    'tortilla',
    'pita',
    'naan',
    'focaccia',
    'sourdough',
    'rye',
  ],
  Pantry: [
    'oil',
    'olive oil',
    'salt',
    'pepper',
    'sugar',
    'spice',
    'paprika',
    'cumin',
    'cinnamon',
    'oregano',
    'basil',
    'thyme',
    'rosemary',
    'dill',
    'parsley',
    'rice',
    'pasta',
    'beans',
    'lentil',
    'chickpea',
    'canned',
    'sauce',
    'broth',
    'vinegar',
    'soy sauce',
    'sesame oil',
    'coconut oil',
    'baking',
    'powder',
    'soda',
  ],
};

function stringSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 1;
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;

  let matches = 0;
  for (const char of aLower) {
    if (bLower.includes(char)) matches++;
  }
  return matches / Math.max(aLower.length, bLower.length);
}

export function mapIngredientToAisle(ingredientName: string): AisleSection {
  const lowerIngredient = ingredientName.toLowerCase();

  // First, try exact or near-exact matches with keywords
  for (const [aisle, keywords] of Object.entries(AISLE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerIngredient.includes(keyword)) {
        return aisle as AisleSection;
      }
    }
  }

  // Fallback: use fuzzy matching to find best aisle
  let bestAisle: AisleSection = 'Pantry';
  let bestScore = 0;

  for (const [aisle, keywords] of Object.entries(AISLE_KEYWORDS)) {
    for (const keyword of keywords) {
      const score = stringSimilarity(lowerIngredient, keyword);
      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestAisle = aisle as AisleSection;
      }
    }
  }

  return bestAisle;
}

export function groupIngredientsByAisle(ingredients: string[]): Record<AisleSection, string[]> {
  const aisles: Record<AisleSection, string[]> = {
    Vegetables: [],
    Meat: [],
    Dairy: [],
    Bakery: [],
    Pantry: [],
  };

  for (const ingredient of ingredients) {
    const aisle = mapIngredientToAisle(ingredient);
    aisles[aisle].push(ingredient);
  }

  return aisles;
}
