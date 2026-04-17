export interface DiscoveryRecipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  prepTime: string;
  difficulty: string;
  category: string;
}

export const DISCOVERY_RECIPES: DiscoveryRecipe[] = [
  {
    id: '1',
    title: 'Tuscan Sun Pasta',
    description:
      'A harmonious blend of sun-dried tomatoes, wilted spinach, and rustic parmesan over linguine.',
    imageUrl:
      'https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=800&q=80',
    prepTime: '20 Min',
    difficulty: 'Easy',
    category: 'Gourmet Discovery',
  },
  {
    id: '2',
    title: 'Cedar Plank Salmon',
    description:
      'Wild-caught salmon infused with aromatic wood smoke, fresh lemon zest, and rosemary.',
    imageUrl:
      'https://images.unsplash.com/photo-1485921325833-c519f76c4927?auto=format&fit=crop&w=800&q=80',
    prepTime: '25 Min',
    difficulty: 'Medium',
    category: 'Coastal Kitchen',
  },
  {
    id: '3',
    title: 'Earth & Soul Bowl',
    description:
      'Roasted sweet potato, black quinoa, and massaged kale dressed in a creamy liquid-gold tahini.',
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    prepTime: '15 Min',
    difficulty: 'Easy',
    category: 'Organic Vitality',
  },
  {
    id: '4',
    title: 'Heirloom Tomato Tart',
    description:
      'Flaky artisanal pastry topped with garden-fresh heirlooms, goat cheese, and balsamic reduction.',
    imageUrl:
      'https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=800&q=80',
    prepTime: '35 Min',
    difficulty: 'Medium',
    category: 'Artisanal Bakery',
  },
  {
    id: '5',
    title: 'Provencal Roast Chicken',
    description:
      'Succulent organic chicken roasted with lavender, thyme, and seasonal baby vegetables.',
    imageUrl:
      'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80',
    prepTime: '60 Min',
    difficulty: 'Medium',
    category: 'Family Traditions',
  },
  {
    id: '6',
    title: 'Wild Mushroom Risotto',
    description:
      'Creamy Arborio rice slowly folded with foraged mushrooms, truffle oil, and aged Pecorino.',
    imageUrl:
      'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=800&q=80',
    prepTime: '40 Min',
    difficulty: 'Hard',
    category: "Chef's Signature",
  },
];
