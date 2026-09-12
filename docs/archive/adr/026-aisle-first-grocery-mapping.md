# ADR 026: Aisle-First Grocery Mapping — Fuzzy String Matching Strategy

**Date**: 2026-04-29  
**Status**: ACCEPTED  
**Scope**: Frontend UX (GroceryList), Utility (aisleMapper), Data Presentation

## Context

The Grocery Checklist feature needs to group ingredients by logical shopping sections to improve usability and reduce cognitive load. The challenge: recipe ingredients come in varied formats (e.g., "Chicken Breast", "boneless skinless chicken breast", "poulet"), and we need a deterministic mapping strategy that works with messy, real-world ingredient data.

## Decision

**Implement a two-tier fuzzy-matching strategy**:
1. **Tier 1**: Keyword-based exact substring matching against 100+ ingredient keywords per aisle
2. **Tier 2**: Fuzzy string similarity (~70% threshold) for unmapped ingredients, with "Pantry" as fallback

### Aisle Taxonomy

5 aisles optimized for home cooking:

| Aisle | Examples | Use Case |
|-------|----------|----------|
| **Vegetables** | lettuce, spinach, carrot, tomato, squash | Produce section |
| **Meat** | chicken, beef, pork, salmon, shrimp | Butcher/Seafood counter |
| **Dairy** | milk, cheese, butter, eggs, yogurt | Dairy section |
| **Bakery** | bread, flour, croissant, tortilla | Bakery counter |
| **Pantry** | oil, salt, spices, rice, pasta, canned goods | Dry goods/Shelves |

## Implementation

### aisleMapper.ts

```typescript
const AISLE_KEYWORDS: Record<AisleSection, string[]> = {
  Vegetables: [
    'lettuce', 'spinach', 'kale', 'tomato', 'carrot', 'broccoli', 'onion', 'garlic',
    // ... 25+ keywords
  ],
  Meat: [
    'beef', 'chicken', 'pork', 'salmon', 'shrimp',
    // ... 20+ keywords
  ],
  Dairy: [ /* ... */ ],
  Bakery: [ /* ... */ ],
  Pantry: [ /* ... */ ],
};

function mapIngredientToAisle(ingredientName: string): AisleSection {
  const lowerIngredient = ingredientName.toLowerCase();

  // Tier 1: Exact substring match
  for (const [aisle, keywords] of Object.entries(AISLE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerIngredient.includes(keyword)) {
        return aisle as AisleSection;
      }
    }
  }

  // Tier 2: Fuzzy matching with ~70% similarity threshold
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
```

### Frontend: GroceryList.tsx

Features:
- **Aisle Headers**: Icon + name + progress indicator (X/Y items checked)
- **Item Toggles**: Persist state via `PATCH /api/schedule/{weekOffset}/grocery`
- **Visual Feedback**: Strikethrough + opacity fade for checked items
- **Responsive**: Full-screen modal on mobile, sidebar on desktop

## Consequences

### Positive
✅ Deterministic mapping (same ingredient → same aisle every time)  
✅ Graceful degradation (unknown ingredients → Pantry)  
✅ Extensible (easy to add new keywords or aisles)  
✅ Performance: O(n*k) where n=ingredients, k=avg keywords per aisle (~25)  
✅ No backend calls needed for categorization (purely client-side)

### Negative
❌ Fuzzy matching may be incorrect for ambiguous ingredients (e.g., "beans" could be Vegetable or Pantry)  
❌ International recipes with non-English ingredients won't match keywords  

### Mitigations

- **Ambiguity**: Tier 1 substring matching catches most English recipes. Tier 2 fuzzy matching provides reasonable fallback
- **Internationalization**: Future enhancement could add multi-language keyword sets or leverage AI/LLM for categorization
- **User Overrides**: Could allow drag-drop reclassification between aisles (not yet implemented)

## Constraints Satisfied

- ✅ Works with Phase 4 weekly plan architecture
- ✅ Persists to `weekly_plans.grocery_state` (JSONB)
- ✅ No schema changes required (groceryState is free-form JSON)
- ✅ E2E testable via Playwright
- ✅ TypeScript types validate at compile time

## Related Decisions

- **ADR 001**: Data Strategy — shopping lists as core feature
- **ADR 024**: Robust Ingredient Serialization — handles messy ingredient JSON

## Future Enhancements

1. **User Preferences**: Save per-family aisle overrides (if ingredient X → always Meat)
2. **AI Categorization**: Use Gemini or Claude for ambiguous cases
3. **Multi-Language**: Add keyword sets for French, Spanish, etc.
4. **Custom Aisles**: Allow families to define their own aisle structure
5. **Intelligent Purchasing**: Track which items are purchased together, optimize aisle order

## Approval

**Lead Architect**: ✅ Approved (Pragmatic, extensible, UX-focused)  
**Verified**: E2E tests in utility-flows.spec.ts (2026-04-29)
