import { MOCK_IDS } from './mock-ids';
import { type RecipeDto, type ScheduleRecipeDto } from '../src/lib/api/generated/models/index';

/**
 * Realistic recipe data extracted from /data/recipes.
 * These are used to make E2E tests more robust against real-world data structures.
 */

export const REALISTIC_RECIPES: Record<string, RecipeDto> = {
  [MOCK_IDS.RECIPE_CARBONARA]: {
    id: MOCK_IDS.RECIPE_CARBONARA,
    name: 'Burgers de porc et mozzarella avec poivrons rôtis et salade de carottes miel-Dijon',
    description: 'A delicious pork burger with roasted peppers and a honey-mustard carrot salad.',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
    totalTime: 'PT40M',
    difficulty: 'Medium',
    category: 'Burgers',
    rating: 4.5,
    isVegetarian: false,
    isHealthyChoice: true,
    ingredients: [
      '250g Porc haché',
      '100g Carottes en juliennes',
      '120g Bébé laitue',
      '30ml Mayonnaise',
      '45ml Vinaigrette sucrée-salée miel-Dijon',
      '1 Poivron rôti',
      '30g Mozzarella râpée',
      '2 Pains gourmet',
      '10g Épices Ail et origan',
    ],
    recipeInstructions: [
      {
        name: '1. Préparer les galettes',
        text: 'Dans un bol moyen, mélanger le porc et les épices; S-P. Former 2 galettes.',
      },
      {
        name: '2. Cuire les galettes',
        text: "Dans une grande poêle, chauffer un filet d'huile à feu moyen-vif. Ajouter les galettes and cook 4-6 min per side.",
      },
    ] as any,
    createdAt: new Date('2026-05-01T12:00:00Z'),
  },
  [MOCK_IDS.RECIPE_CHICKEN]: {
    id: MOCK_IDS.RECIPE_CHICKEN,
    name: 'Grilled Thai Coconut Chicken Skewers',
    description: 'Tender chicken marinated in coconut milk and Thai spices.',
    imageUrl: 'https://images.unsplash.com/photo-1524338198850-8a2ff63aaceb',
    totalTime: 'PT27M',
    difficulty: 'Easy',
    category: 'Asian',
    rating: 4.8,
    isVegetarian: false,
    isHealthyChoice: true,
    ingredients: [
      '1½ lbs chicken thighs',
      '1 cup coconut milk',
      '2 tbsp soy sauce',
      '2 tbsp fish sauce',
      '2 tbsp brown sugar',
      '1 tbsp lime juice',
      '1 tbsp grated ginger',
      '3 cloves garlic',
      '1 tbsp red curry paste',
    ],
    recipeInstructions: [
      {
        name: 'Instructions',
        text: 'Mix marinade, coat chicken, thread onto skewers and grill.',
      },
    ] as any,
    createdAt: new Date('2026-05-01T12:00:00Z'),
  },
};

/**
 * Transforms a full RecipeDto into a ScheduleRecipeDto for use in planner mocks.
 */
export const toScheduleRecipe = (recipe: RecipeDto): ScheduleRecipeDto => ({
  id: recipe.id,
  name: recipe.name,
  image: recipe.imageUrl,
  voteCount: 0,
  ingredients: recipe.ingredients,
  description: recipe.description,
});

export const REALISTIC_SCHEDULE_RECIPES = Object.fromEntries(
  Object.entries(REALISTIC_RECIPES).map(([id, recipe]) => [id, toScheduleRecipe(recipe)])
);
