# Requirements Document

## Introduction

The grocery list in "What's For Supper" currently groups ingredients into five hardcoded sections (Vegetables, Meat, Dairy, Bakery, Pantry) using a static keyword lookup in `pwa/src/lib/grocery/aisleMapper.ts`. The matching logic is brittle: it misses many common ingredients, has no coverage for Frozen, Seafood, Deli, Beverages, or Produce sub-categories, and falls back to "Pantry" for anything it doesn't recognise.

This feature replaces the static keyword mapper with an intelligent, extensible categorization engine that correctly assigns every ingredient from the weekly meal plan to the most appropriate grocery store section, and presents those sections in a logical shopping order in the UI.

---

## Glossary

- **Aisle_Mapper**: The client-side module (`pwa/src/lib/grocery/aisleMapper.ts`) responsible for assigning each ingredient string to a `GrocerySection`.
- **Grocery_List**: The UI panel rendered when the user selects the "Grocery list" tab in the Planner page.
- **GrocerySection**: A named grouping that corresponds to a physical section of a grocery store (e.g., Produce, Meat & Seafood, Dairy & Eggs, Frozen, Bakery, Pantry, Beverages, Deli).
- **Ingredient_String**: A raw text string extracted from a recipe's `recipeIngredient` array, typically in the format `"[Quantity] [Unit] [Ingredient]"` (e.g., `"250 ml tomato sauce"`, `"2 chicken breasts"`).
- **Canonical_Name**: The ingredient portion of an Ingredient_String after quantity and unit tokens have been stripped (e.g., `"tomato sauce"`, `"chicken breasts"`).
- **Categorization_Engine**: The logic within the Aisle_Mapper that maps a Canonical_Name to a GrocerySection.
- **Section_Order**: The fixed display sequence of GrocerySections in the Grocery_List UI, designed to match a logical store traversal path.
- **Uncategorized**: The fallback GrocerySection for ingredients the Categorization_Engine cannot confidently assign.
- **Normalized_Key**: The canonical string produced by the normalization pipeline from a raw ingredient name. The pipeline applies Unicode NFD decomposition, strips combining diacritical marks (so "é" → "e", "œ" → "oe", "ç" → "c"), lowercases the result, and collapses multiple whitespace characters to a single space with leading/trailing whitespace trimmed. No translation between languages is performed. The Normalized_Key is used as the unique key in the `ingredient_categories` index and as the server-side aggregation key for the Grocery_List. **Normalization is computed exclusively on the API server** — the client never normalizes strings and never sees Normalized_Keys. Examples: "Bœuf haché" → "boeuf hache", "bœuf haché maigre" → "boeuf hache maigre", "ground beef" → "ground beef".
- **GroceryLineItem**: A single line item in the pre-computed grocery list. Shape: `{ displayName: string, normalizedKey: string, section: GrocerySection, quantity: number | null, unitText: string | null, recipeIds: string[] }`. `displayName` is the original name from the first matching supply entry; `normalizedKey` is the aggregation key; `recipeIds` lists every recipe in the week plan that contributed to this line item.
- **Grocery_Items**: A pre-computed, flat array of `GroceryLineItem` objects stored in the `grocery_items` jsonb column of the `weekly_plans` table. This structure is computed server-side whenever the week plan's recipe assignments change, and is returned as-is to the client for rendering — the client performs no normalization, aggregation, or index lookup at load time.
- **Grocery_State**: A `Record<string, boolean>` stored in the `grocery_state` jsonb column of the `weekly_plans` table, keyed by the `displayName` of each line item. Tracks checked/unchecked state per item. Unchanged by this feature.

---

## Requirements

### Requirement 1: Expanded Grocery Section Taxonomy

**User Story:** As a shopper, I want ingredients grouped into all the major sections of a real grocery store, so that I can shop efficiently without backtracking.

#### Acceptance Criteria

1. THE Aisle_Mapper SHALL support the following GrocerySections: `Produce`, `Meat & Seafood`, `Dairy & Eggs`, `Frozen`, `Bakery`, `Pantry`, `Beverages`, `Deli`, `Uncategorized`.
2. THE Grocery_List SHALL display GrocerySections in the following Section_Order: Produce → Deli → Bakery → Meat → Seafood → Dairy & Eggs → Frozen → Pantry → Beverages → Uncategorized.
3. WHEN a GrocerySection contains zero items for the current week, THE Grocery_List SHALL omit that section from the display entirely.
4. THE Aisle_Mapper SHALL assign every Ingredient_String to exactly one GrocerySection.

---

### Requirement 2: Ingredient Name Extraction

**User Story:** As a shopper, I want the system to correctly identify the ingredient name within a recipe string, so that "2 cups all-purpose flour" is categorized as flour, not as a number.

#### Acceptance Criteria

1. WHEN an Ingredient_String contains a leading quantity token (integer, decimal, or fraction such as `1/2`), THE Aisle_Mapper SHALL strip that token before categorization.
2. WHEN an Ingredient_String contains a unit token immediately following the quantity (e.g., `ml`, `g`, `kg`, `cup`, `tbsp`, `tsp`, `oz`, `lb`, `litre`, `liter`, `piece`, `slice`, `clove`, `bunch`, `can`, `package`, `pinch`), THE Aisle_Mapper SHALL strip that token before categorization.
3. AFTER stripping quantity and unit tokens, THE Aisle_Mapper SHALL use the remaining text as the Canonical_Name for section matching.
4. THE Aisle_Mapper SHALL derive the Canonical_Name from the Normalized_Key of the remaining text after stripping quantity and unit tokens, so that all subsequent section matching operates on a normalized, accent-free, lowercase string.
5. FOR ALL Ingredient_Strings of the form `"[quantity] [unit] [name]"`, parsing then extracting the Canonical_Name then re-prepending the original quantity and unit SHALL produce a string equivalent to the original Ingredient_String (round-trip property).

---

### Requirement 3: Ingredient Normalization

**User Story:** As a shopper, I want accent variants and capitalisation differences of the same ingredient to be treated as one item, so that "Bœuf haché" and "boeuf haché" are aggregated together on my grocery list rather than appearing as two separate lines.

#### Acceptance Criteria

1. THE API_Server SHALL compute a Normalized_Key from a raw ingredient name by applying the following pipeline in order: (a) Unicode NFD decomposition, (b) removal of all combining diacritical marks (Unicode category Mn), (c) lowercasing, (d) collapsing consecutive whitespace characters to a single space and trimming leading/trailing whitespace.
2. THE API_Server SHALL NOT perform any translation between languages during normalization — "ground beef" and "boeuf hache" SHALL remain distinct Normalized_Keys.
3. THE Grocery_List SHALL display each supply item using the original `supply[].name` from the recipe, never the Normalized_Key.
4. WHEN two supply items from the same week plan have the same Normalized_Key AND the same unitText, THE API_Server SHALL sum their quantities and store them as a single line item in Grocery_Items, using the original name from the first occurrence.
5. WHEN two supply items have the same Normalized_Key but different unitText values, THE API_Server SHALL store them as separate line items in Grocery_Items.
6. WHEN two supply items have different Normalized_Keys, THE API_Server SHALL always store them as separate line items in Grocery_Items regardless of visual similarity.
7. THE Categorization_Engine SHALL normalize a supply item's name to its Normalized_Key before querying the `ingredient_categories` index, so that accent variants do not produce duplicate LLM categorization calls.
8. THE `ingredient_categories` index SHALL use the Normalized_Key as its primary/unique key.
9. FOR ALL strings that differ only in case, accents, or diacritical marks, `normalize(a) === normalize(b)` (accent-insensitive equivalence property).
10. FOR ALL string pairs where one is a strict extension of the other after normalization (e.g. "boeuf hache" vs "boeuf hache maigre"), `normalize(a) !== normalize(b)` (specificity preservation property).
11. FOR ALL supply item pairs with the same Normalized_Key and the same unitText, the aggregated quantity stored in Grocery_Items SHALL equal the arithmetic sum of the individual quantities (quantity aggregation property).

---

### Requirement 4: Keyword-Based Categorization with Precedence

**User Story:** As a shopper, I want common ingredients to be placed in the right section automatically, so that I don't have to manually sort my list.

#### Acceptance Criteria

1. WHEN the Canonical_Name contains a keyword from the `Produce` keyword set (including but not limited to: lettuce, spinach, kale, tomato, carrot, broccoli, onion, garlic, celery, cucumber, bell pepper, zucchini, potato, sweet potato, cabbage, cauliflower, leek, asparagus, corn, mushroom, apple, banana, orange, lemon, lime, berry, strawberry, blueberry, grape, peach, pear, mango, avocado, herb, cilantro, parsley, basil, mint, dill, thyme, rosemary, chive, ginger, jalapeño, pepper), THE Aisle_Mapper SHALL assign the ingredient to `Produce`.
2. WHEN the Canonical_Name contains a keyword from the `Meat & Seafood` keyword set (including but not limited to: beef, ground beef, steak, chuck, brisket, chicken, breast, thigh, leg, wing, pork, ham, bacon, sausage, lamb, mutton, fish, salmon, cod, tuna, tilapia, halibut, shrimp, prawn, scallop, crab, lobster, turkey, duck, veal, venison), THE Aisle_Mapper SHALL assign the ingredient to `Meat & Seafood`.
3. WHEN the Canonical_Name contains a keyword from the `Dairy & Eggs` keyword set (including but not limited to: milk, cream, butter, cheese, yogurt, sour cream, cottage cheese, mozzarella, cheddar, parmesan, feta, ricotta, brie, gouda, egg, cream cheese, half-and-half, whipping cream, kefir), THE Aisle_Mapper SHALL assign the ingredient to `Dairy & Eggs`.
4. WHEN the Canonical_Name contains a keyword from the `Frozen` keyword set (including but not limited to: frozen, ice cream, gelato, sorbet, frozen peas, frozen corn, frozen berries, frozen pizza, edamame), THE Aisle_Mapper SHALL assign the ingredient to `Frozen`.
5. WHEN the Canonical_Name contains a keyword from the `Bakery` keyword set (including but not limited to: bread, baguette, croissant, pastry, bagel, roll, bun, tortilla, pita, naan, focaccia, sourdough, rye bread, brioche, muffin, scone), THE Aisle_Mapper SHALL assign the ingredient to `Bakery`.
6. WHEN the Canonical_Name contains a keyword from the `Beverages` keyword set (including but not limited to: juice, wine, beer, broth, stock, coffee, tea, soda, sparkling water, coconut milk, almond milk, oat milk, cider), THE Aisle_Mapper SHALL assign the ingredient to `Beverages`.
7. WHEN the Canonical_Name contains a keyword from the `Deli` keyword set (including but not limited to: deli, salami, pepperoni, prosciutto, mortadella, pastrami, smoked salmon, hummus, prepared salad, rotisserie), THE Aisle_Mapper SHALL assign the ingredient to `Deli`.
8. WHEN the Canonical_Name does not match any keyword in the sets above, THE Aisle_Mapper SHALL assign the ingredient to `Pantry`.
9. WHEN the Canonical_Name (derived from the Normalized_Key) matches keywords from more than one GrocerySection, THE Aisle_Mapper SHALL assign the ingredient to the section whose keyword produces the longest substring match within the Canonical_Name.
10. WHEN no keyword match produces a confidence score above the minimum threshold, THE Aisle_Mapper SHALL assign the ingredient to `Uncategorized` rather than defaulting silently to `Pantry`.

---

### Requirement 5: Section Completion State in the Grocery List UI

**User Story:** As a shopper, I want a completed grocery section to be visually distinct, so that I can see at a glance which sections I've finished without scanning every item.

> **Note:** The existing UI structure in `GroceryList.tsx` is preserved as-is — section cards with emoji icons, checked/total item count, completion percentage badge, strikethrough on checked items, glassmorphism header/footer, and Framer Motion animations are all existing behaviour and are not changed by this requirement.

#### Acceptance Criteria

1. WHEN all items in a GrocerySection are checked, THE Grocery_List SHALL visually indicate that the section header is complete (e.g., the header background shifts to sage green, or a checkmark replaces the percentage badge).

---

### Requirement 5b: Server-Side Pre-Computation of Grocery Items

**User Story:** As a shopper, I want the grocery list to load instantly, so that I never wait for client-side processing when I open the grocery tab.

#### Acceptance Criteria

1. THE `weekly_plans` table SHALL have a `grocery_items` jsonb column that stores the pre-built, pre-aggregated, pre-categorized grocery list for that week as an array of `GroceryLineItem` objects.
2. WHEN a recipe is assigned to a day in a week plan, THE API_Server SHALL recompute and persist `grocery_items` for that week plan.
3. WHEN a recipe is removed from a day in a week plan, THE API_Server SHALL recompute and persist `grocery_items` for that week plan.
4. WHEN a recipe's `raw_metadata` changes (re-import) and that recipe appears in one or more week plans, THE API_Server SHALL recompute and persist `grocery_items` for each affected week plan.
5. WHEN recomputing `grocery_items`, THE API_Server SHALL execute the following steps in order: (a) collect all `supply[]` entries from `raw_metadata` of every recipe assigned to the week plan; (b) normalize each supply item's name to its Normalized_Key; (c) look up the Normalized_Key in `ingredient_categories` to obtain the GrocerySection, falling back to Aisle_Mapper keyword matching if no entry is found; (d) group by Normalized_Key + unitText, summing quantities for matching pairs and keeping separate line items for mismatched units; (e) store the resulting array as `grocery_items` on the `weekly_plans` row.
6. THE GET /api/schedule endpoint response SHALL include `groceryItems` populated from the pre-computed `grocery_items` column.
7. WHEN the client receives the GET /api/schedule response, THE Grocery_List SHALL render `groceryItems` directly — performing no normalization, aggregation, or index lookup at load time.
8. THE `grocery_state` column (a `Record<string, boolean>` keyed by `displayName`) SHALL remain unchanged in shape and semantics; recomputing `grocery_items` SHALL NOT alter `grocery_state`.
9. FOR ALL week plans, the `grocery_items` array SHALL be consistent with the current set of recipes assigned to that week — recomputing from the same recipe set SHALL always produce the same array (recomputation invariant).

---

### Requirement 6: Categorization Correctness and Testability

**User Story:** As a developer, I want the categorization logic to be fully unit-tested with property-based tests, so that regressions are caught automatically when the keyword sets are extended.

#### Acceptance Criteria

1. THE Aisle_Mapper SHALL export a pure function `mapIngredientToSection(name: string): GrocerySection` that accepts an ingredient name and returns a GrocerySection with no side effects. This is the sole client-side categorization function and is used as a keyword fallback for items not found in the `ingredient_categories` index.
2. FOR ALL Ingredient_Strings, `mapIngredientToSection` SHALL return a value that is a member of the defined `GrocerySection` union type (closed-set property).
3. FOR ALL Ingredient_Strings, calling `mapIngredientToSection` twice with the same input SHALL return the same GrocerySection (idempotence property).
4. FOR ALL week plans, the Grocery_Items payload returned by the API SHALL contain every supply item from every recipe in the plan exactly once — no items lost and no items duplicated (server-side partition property).
5. WHEN the API_Server recomputes Grocery_Items, the result SHALL be identical for the same set of recipes regardless of the order in which those recipes were added to the plan (determinism property).

---

### Requirement 7: Backward Compatibility and Migration

**User Story:** As a developer, I want the new categorization engine to replace the old one without breaking existing grocery state persistence or SSE sync, so that no user data is lost during the upgrade.

#### Acceptance Criteria

1. THE Aisle_Mapper SHALL preserve the existing `groceryState` key format — a `Record<string, boolean>` keyed by the raw Ingredient_String — so that persisted check states remain valid after the upgrade. The Normalized_Key is used internally for aggregation and index lookup but SHALL NOT replace the raw Ingredient_String as the `groceryState` persistence key.
2. WHEN the Grocery_List is rendered with a `groceryState` that was persisted under the old five-section taxonomy, THE Grocery_List SHALL correctly restore the checked/unchecked state for each ingredient regardless of which GrocerySection it is now assigned to.
3. THE Aisle_Mapper SHALL NOT change the shape of the `groceryState` object passed to `updateGroceryState` or broadcast via the `grocery_updated` SSE event.
4. WHEN the new GrocerySections are introduced, THE Grocery_List SHALL update the `AISLE_ORDER` and `AISLE_ICONS` constants to reflect the new taxonomy without requiring any API or database schema changes.
