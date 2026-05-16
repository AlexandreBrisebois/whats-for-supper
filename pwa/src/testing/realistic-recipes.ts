import { MOCK_IDS } from './mock-ids';
import { type RecipeDto, type ScheduleRecipeDto } from '../lib/api/generated/models/index';
import { type UntypedNode } from '@microsoft/kiota-abstractions';

/**
 * Realistic recipe data extracted from /data/recipes.
 * These are used to make tests more robust against real-world data structures.
 */

export const REALISTIC_RECIPES: Record<string, RecipeDto> = {
  [MOCK_IDS.RECIPE_CARBONARA]: {
    id: MOCK_IDS.RECIPE_CARBONARA,
    name: 'Burgers de porc et mozzarella avec poivrons rôtis et salade de carottes miel-Dijon',
    description: 'A delicious pork burger with roasted peppers and a honey-mustard carrot salad.',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
    totalTime: 'PT40M',
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
    ] as unknown as UntypedNode,
    createdAt: new Date('2026-05-01T12:00:00Z'),
  },
  [MOCK_IDS.RECIPE_CHICKEN]: {
    id: MOCK_IDS.RECIPE_CHICKEN,
    name: 'Grilled Thai Coconut Chicken Skewers',
    description: 'Tender chicken marinated in coconut milk and Thai spices.',
    imageUrl: 'https://images.unsplash.com/photo-1524338198850-8a2ff63aaceb',
    totalTime: 'PT27M',
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
    ] as unknown as UntypedNode,
    createdAt: new Date('2026-05-01T12:00:00Z'),
  },
  [MOCK_IDS.RECIPE_SPAGHETTI]: {
    id: MOCK_IDS.RECIPE_SPAGHETTI,
    name: 'Spaghetti with Toasted Garlic Bread',
    description: 'Classic spaghetti with marinara sauce served alongside toasted garlic bread.',
    imageUrl: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb',
    totalTime: 'PT30M',
    category: 'Italian',
    rating: 4.7,
    isVegetarian: true,
    isHealthyChoice: false,
    ingredients: [
      '400 g spaghetti',
      '500 ml marinara sauce',
      '1 loaf Italian bread or baguette',
      '60 g butter, softened',
      '4 cloves garlic, minced',
      '1 tsp dried oregano',
      '2 tbsp olive oil',
      'Salt and pepper to taste',
      'Grated parmesan cheese for serving',
    ],
    recipeInstructions: [
      {
        '@type': 'HowToSection',
        name: 'Spaghetti Preparation',
        itemListElement: [
          {
            '@type': 'HowToStep',
            text: 'Bring a large pot of salted water to a boil and cook the spaghetti according to package instructions until al dente.',
          },
          {
            '@type': 'HowToStep',
            text: 'While the pasta cooks, warm the marinara sauce in a large skillet over medium heat.',
          },
          {
            '@type': 'HowToStep',
            text: 'Drain the spaghetti and toss it directly into the skillet with the sauce until well coated.',
          },
        ],
      },
      {
        '@type': 'HowToSection',
        name: 'Garlic Bread Preparation',
        itemListElement: [
          {
            '@type': 'HowToStep',
            text: 'Preheat your oven to 200°C (400°F).',
          },
          {
            '@type': 'HowToStep',
            text: 'In a small bowl, mix the softened butter with minced garlic and dried oregano.',
          },
          {
            '@type': 'HowToStep',
            text: 'Slice the bread into thick rounds or lengthwise, and spread the garlic butter generously over the cut sides.',
          },
          {
            '@type': 'HowToStep',
            text: 'Place the bread on a baking sheet and toast in the oven for 5 to 8 minutes until the edges are golden brown and crispy.',
          },
        ],
      },
      {
        '@type': 'HowToSection',
        name: 'Serving',
        itemListElement: [
          {
            '@type': 'HowToStep',
            text: 'Serve the hot spaghetti in bowls topped with parmesan cheese, with the warm garlic bread on the side.',
          },
        ],
      },
    ] as unknown as UntypedNode,
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
