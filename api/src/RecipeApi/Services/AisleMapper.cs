using System;
using System.Collections.Generic;

namespace RecipeApi.Services;

public enum GrocerySection
{
    Produce,
    Meat,
    Seafood,
    DairyAndEggs,
    Frozen,
    Bakery,
    Pantry,
    Beverages,
    Deli,
    Grocery
}

/// <summary>
/// Maps a canonical ingredient name to a <see cref="GrocerySection"/> using
/// longest-match keyword lookup. Falls back to <see cref="GrocerySection.Grocery"/>
/// when no keyword matches.
/// </summary>
public class AisleMapper
{
    // Section priority order used to break ties when two keywords produce the same match length.
    private static readonly GrocerySection[] SectionPriority =
    [
        GrocerySection.Produce,
        GrocerySection.Meat,
        GrocerySection.Seafood,
        GrocerySection.DairyAndEggs,
        GrocerySection.Frozen,
        GrocerySection.Bakery,
        GrocerySection.Beverages,
        GrocerySection.Deli,
        GrocerySection.Pantry,
    ];

    // Keyword sets per section (English + French).
    // Broth/stock are intentionally in Beverages, not Pantry.
    private static readonly Dictionary<GrocerySection, string[]> Keywords = new()
    {
        [GrocerySection.Produce] =
        [
            // English
            "bell pepper", "sweet potato", "blueberry", "strawberry", "cauliflower",
            "asparagus", "cucumber", "zucchini", "broccoli", "mushroom", "avocado",
            "jalapeño", "rosemary", "cilantro", "parsley", "cabbage", "spinach",
            "lettuce", "tomato", "carrot", "potato", "banana", "orange", "celery",
            "onion", "garlic", "lemon", "mango", "berry", "grape", "peach", "thyme",
            "basil", "chive", "apple", "leek", "corn", "lime", "kale", "pear",
            "herb", "dill", "mint", "ginger", "pepper",
            // French
            "poivron", "patate douce", "myrtille", "fraise", "chou-fleur",
            "asperge", "concombre", "courgette", "brocoli", "champignon", "avocat",
            "jalapeño", "romarin", "coriandre", "persil", "chou", "épinard",
            "laitue", "tomate", "carotte", "pomme de terre", "banane", "orange",
            "céleri", "oignon", "ail", "citron", "mangue", "baie", "raisin",
            "pêche", "thym", "basilic", "ciboulette", "pomme", "poireau", "maïs",
            "citron vert", "chou frisé", "poire", "herbe", "aneth", "menthe",
            "gingembre", "poivre",
        ],

        [GrocerySection.Meat] =
        [
            // English
            "ground beef",
            "beef", "steak", "chuck", "brisket", "chicken", "breast", "thigh",
            "wing", "pork", "ham", "bacon", "sausage", "lamb", "mutton",
            "turkey", "duck", "veal", "venison", "leg",
            // French
            "boeuf haché",
            "boeuf", "steak", "paleron", "poitrine", "poulet", "blanc", "cuisse",
            "aile", "porc", "jambon", "lardons", "saucisse", "agneau", "mouton",
            "dinde", "canard", "veau", "chevreuil",
        ],

        [GrocerySection.Seafood] =
        [
            // English
            "smoked salmon",
            "fish", "salmon", "cod", "tuna", "tilapia", "halibut", "shrimp",
            "prawn", "scallop", "crab", "lobster",
            // French
            "saumon fumé",
            "poisson", "saumon", "cabillaud", "thon", "tilapia", "flétan",
            "crevette", "pétoncle", "crabe", "homard",
        ],

        [GrocerySection.DairyAndEggs] =
        [
            // English
            "cream cheese", "cottage cheese", "sour cream", "half-and-half",
            "whipping cream", "mozzarella", "parmesan", "cheddar", "ricotta",
            "gouda", "feta", "brie", "kefir", "yogurt", "butter", "cheese",
            "cream", "milk", "egg",
            // French
            "fromage à la crème", "fromage cottage", "crème sure", "demi-crème",
            "crème fouettée", "mozzarella", "parmesan", "cheddar", "ricotta",
            "gouda", "feta", "brie", "kéfir", "yaourt", "beurre", "fromage",
            "crème", "lait", "oeuf",
        ],

        [GrocerySection.Frozen] =
        [
            // English
            "frozen peas", "frozen corn", "frozen berries", "frozen pizza",
            "ice cream", "gelato", "sorbet", "edamame", "frozen",
            // French
            "petits pois surgelés", "maïs surgelé", "baies surgelées",
            "pizza surgelée", "crème glacée", "gelato", "sorbet", "edamame",
            "surgelé", "surgele",
        ],

        [GrocerySection.Bakery] =
        [
            // English
            "rye bread", "sourdough", "focaccia", "baguette", "croissant",
            "brioche", "tortilla", "pastry", "bagel", "bread", "scone",
            "muffin", "naan", "pita", "roll", "bun",
            // French
            "pain de seigle", "pain au levain", "focaccia", "baguette",
            "croissant", "brioche", "tortilla", "viennoiserie", "bagel",
            "pain", "scone", "muffin", "naan", "pita",
        ],

        [GrocerySection.Beverages] =
        [
            // English — broth/stock intentionally here, not Pantry
            "sparkling water", "coconut milk", "almond milk", "oat milk",
            "broth", "stock", "juice", "cider", "coffee", "wine", "beer",
            "soda", "tea",
            // French
            "eau gazeuse", "lait de coco", "lait d'amande", "lait d'avoine",
            "bouillon", "fond", "jus", "cidre", "café", "vin", "bière",
            "soda", "thé",
        ],

        [GrocerySection.Deli] =
        [
            // English
            "smoked salmon", "prepared salad", "prosciutto", "mortadella",
            "pastrami", "pepperoni", "rotisserie", "salami", "hummus", "deli",
            // French
            "saumon fumé", "salade préparée", "prosciutto", "mortadelle",
            "pastrami", "pepperoni", "poulet rôti", "salami", "houmous",
            "charcuterie",
        ],

        [GrocerySection.Pantry] =
        [
            // English
            "vinegar", "baking", "pasta", "sauce", "flour", "sugar", "spice",
            "rice", "salt", "oil",
            // French
            "vinaigre", "levure", "pâtes", "sauce", "farine", "sucre",
            "épice", "riz", "sel", "huile",
        ],
    };

    /// <summary>
    /// Maps a canonical ingredient name to a <see cref="GrocerySection"/> using
    /// longest-match keyword lookup. Returns <see cref="GrocerySection.Grocery"/>
    /// when no keyword matches.
    /// </summary>
    public GrocerySection MapToSection(string canonicalName)
    {
        if (string.IsNullOrWhiteSpace(canonicalName))
            return GrocerySection.Grocery;

        var normalized = canonicalName.ToLowerInvariant();

        int bestLength = 0;
        GrocerySection bestSection = GrocerySection.Grocery;

        // Iterate in priority order so ties are broken by section priority.
        foreach (var section in SectionPriority)
        {
            if (!Keywords.TryGetValue(section, out var keywords))
                continue;

            foreach (var keyword in keywords)
            {
                if (normalized.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                {
                    if (keyword.Length > bestLength)
                    {
                        bestLength = keyword.Length;
                        bestSection = section;
                    }
                }
            }
        }

        return bestSection;
    }
}
