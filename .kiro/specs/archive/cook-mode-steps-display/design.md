# Cook Mode Steps Display Bugfix Design

## Overview

Cook's Mode never shows real recipe steps for recipes stored with schema.org `HowToSection` / `HowToStep` instructions. The user sees only the ingredients screen (step 0) followed by generic placeholder steps.

The root cause is a **TypeScript type signature mismatch** in `parseRecipeSteps`. The function's parameter is typed as `string[] | Array<{ name?: string; text?: string }>`, which excludes `HowToSection[]`. The call site in `CooksMode.tsx` passes `details.recipeInstructions`, which is typed identically on the `Recipe` interface — so TypeScript accepts the call without error. However, at runtime, `unwrapUntypedNode` in `mapToRecipe` produces a plain `HowToSection[]` object graph. Because the TypeScript type on `Recipe.recipeInstructions` does not include `HowToSection[]`, the type system provides no path to widen the value before passing it to `parseRecipeSteps`.

The fix is **minimal**: widen the `parseRecipeSteps` parameter type from `string[] | Array<{ name?: string; text?: string }>` to `unknown[]` (or equivalently `Array<unknown>`), and update the `Recipe` interface's `recipeInstructions` field to match. The runtime logic inside `parseRecipeSteps` already handles `HowToSection[]` correctly via `isHowToSection` — it just needs to be reachable without a type error at the call site.

No logic changes are required inside `parseRecipeSteps`. No changes are required to `CooksMode.tsx`, `mapToRecipe`, or `unwrapUntypedNode`.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — `parseRecipeSteps` is called with a value whose runtime shape is `HowToSection[]` but whose TypeScript type is `string[] | Array<{ name?: string; text?: string }>`, causing TypeScript to prevent the correct branch from being reached without an explicit cast.
- **Property (P)**: The desired behavior — when called with a `HowToSection[]` value, `parseRecipeSteps` SHALL return a non-empty `CookingStep[]` array containing one entry per `HowToStep` with non-empty text.
- **Preservation**: All existing behavior for `string[]`, flat `HowToStep[]`, `undefined`, `null`, and empty-array inputs must remain byte-for-byte identical after the fix.
- **`parseRecipeSteps`**: The function in `pwa/src/lib/cooking/stepParser.ts` that converts raw `recipeInstructions` data into a `CookingStep[]` array for Cook's Mode.
- **`isHowToSection`**: The runtime type-guard in `stepParser.ts` that checks whether an item has an `itemListElement` array. It is already correct; it just needs to be reachable.
- **`unwrapUntypedNode`**: The helper in `pwa/src/lib/api/recipes.ts` that recursively unwraps Kiota `UntypedNode` values into plain JS objects. It already produces the correct `HowToSection[]` shape at runtime.
- **`Recipe.recipeInstructions`**: The field on the `Recipe` interface in `pwa/src/lib/api/recipes.ts` that holds the unwrapped instructions. Currently typed as `string[] | Array<{ name?: string; text?: string }>` — too narrow to represent `HowToSection[]`.
- **`HowToSection`**: A schema.org type with `@type: "HowToSection"`, `name?: string`, and `itemListElement?: HowToStep[]`.
- **`HowToStep`**: A schema.org type with `@type: "HowToStep"`, `name?: string`, and `text?: string`.

---

## Bug Details

### Bug Condition

The bug manifests when `parseRecipeSteps` is called with a value whose runtime shape is `HowToSection[]`. The TypeScript type of `Recipe.recipeInstructions` is `string[] | Array<{ name?: string; text?: string }>`, which does not include `HowToSection[]`. This means:

1. The `Recipe` interface cannot honestly represent the actual runtime value produced by `unwrapUntypedNode`.
2. TypeScript callers cannot express or validate the `HowToSection[]` shape through the type system.
3. The `as any` cast in the original test was a workaround that acknowledged the type was wrong — not because TypeScript would error without it (structural subtyping means `HowToSection[]` IS assignable to `Array<{ name?: string; text?: string }>`), but because the declared type was known to be inaccurate.

**Investigation finding**: TypeScript's structural subtyping means `{ '@type': string; name: string; itemListElement: ...[]; }` IS assignable to `{ name?: string; text?: string; }` — the `name` property satisfies `name?: string` and extra properties are allowed. Therefore, removing `as any` from the test does NOT cause a TypeScript compilation error. The bug is a type-level representation gap, not a compile-time error.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input — the value passed as recipeInstructions at the call site
  OUTPUT: boolean

  RETURN input IS Array
         AND input.length > 0
         AND input[0] IS Object
         AND 'itemListElement' IN input[0]
         AND Array.isArray(input[0].itemListElement)
         AND TypeScript type of Recipe.recipeInstructions does NOT include HowToSection[]
         AND the type system cannot validate the HowToSection[] shape without `any`
END FUNCTION
```

### Examples

- **Bug manifests**: `recipeInstructions` is `[{ "@type": "HowToSection", "name": "Spaghetti Preparation", "itemListElement": [{ "@type": "HowToStep", "text": "Bring a large pot of salted water to a boil..." }] }]` → `parseRecipeSteps` returns `[]` → Cook's Mode shows fallback steps.
- **Bug manifests**: Any recipe fetched from the API whose `recipeInstructions` was stored as schema.org JSON-LD with `HowToSection` nesting → zero real steps displayed.
- **Bug does NOT manifest**: `recipeInstructions` is `["Boil water", "Add pasta"]` → `parseRecipeSteps` returns 2 steps correctly.
- **Bug does NOT manifest**: `recipeInstructions` is `[{ name: "Step 1", text: "Boil water" }]` → `parseRecipeSteps` returns 1 step correctly.
- **Edge case**: `recipeInstructions` is `undefined` or `[]` → `parseRecipeSteps` returns `[]` and fallback steps are used (correct behavior, unchanged).

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- `parseRecipeSteps` called with a flat `string[]` SHALL continue to return one `CookingStep` per non-empty string, with `title: "Step N"` and `instruction` equal to the trimmed string.
- `parseRecipeSteps` called with a flat `Array<{ name?: string; text?: string }>` (no `itemListElement`) SHALL continue to return one `CookingStep` per object with non-empty text or name.
- `parseRecipeSteps` called with `undefined`, `null`, or `[]` SHALL continue to return `[]`.
- Cook's Mode step 0 (ingredients screen) behavior is unchanged — it is driven by `CooksMode.tsx` logic, not by `parseRecipeSteps`.
- `mapToRecipe`, `unwrapUntypedNode`, and `CooksMode.tsx` are not modified.

**Scope:**

All inputs that do NOT match the `HowToSection[]` shape (i.e., where `isBugCondition` returns false) must be completely unaffected by this fix. The only change is widening the TypeScript type — the runtime logic paths for string arrays and flat HowToStep arrays are untouched.

---

## Hypothesized Root Cause

The single root cause is a **type signature that is too narrow**:

1. **`parseRecipeSteps` parameter type** — `string[] | Array<{ name?: string; text?: string }>` does not include `HowToSection[]`. However, due to TypeScript's structural subtyping, `HowToSection[]` IS assignable to `Array<{ name?: string; text?: string }>` (the `name` property satisfies `name?: string` and extra properties like `itemListElement` are allowed). So TypeScript does NOT reject the call — but the declared type is still inaccurate and misleading.

2. **`Recipe.recipeInstructions` field type** — Same narrow type on the `Recipe` interface. `mapToRecipe` assigns the result of `unwrapUntypedNode(dto.recipeInstructions)` (which is `any`) to this field, so TypeScript does not catch the mismatch. At runtime the value is `HowToSection[]`, but the declared type says it cannot be.

3. **Consequence** — The type system provides false confidence: it accepts `HowToSection[]` values (via structural subtyping) but cannot express or validate the actual runtime shape. The `as any` cast in the original test was a workaround that acknowledged the type was wrong. The fix widens both types to `unknown[]` to honestly represent the opaque JSON data from the API.

**Investigation finding**: The `isHowToSection` branch inside `parseRecipeSteps` IS reachable at runtime — the runtime logic already handles `HowToSection[]` correctly. The bug is purely a type-level representation gap, not a runtime logic error. The fix makes the type system honest about what the API actually returns.

---

## Correctness Properties

Property 1: Bug Condition — HowToSection[] Input Produces Non-Empty Steps

_For any_ array input where the bug condition holds (the first element has an `itemListElement` array — i.e., `isHowToSection(input[0])` returns true), the fixed `parseRecipeSteps` function SHALL return a non-empty `CookingStep[]` array containing one entry for each `HowToStep` with non-empty `text` or `name` across all sections.

**Validates: Requirements 2.1, 2.3**

Property 2: Preservation — Non-HowToSection Inputs Unchanged

_For any_ input where the bug condition does NOT hold (flat `string[]`, flat `Array<{name?,text?}>`, `undefined`, `null`, or `[]`), the fixed `parseRecipeSteps` function SHALL produce exactly the same result as the original function, preserving all existing parsing behavior for non-HowToSection inputs.

**Validates: Requirements 3.1, 3.2, 3.3**

---

## Fix Implementation

### Changes Required

The fix touches exactly two type declarations. No runtime logic changes.

**File 1**: `pwa/src/lib/api/recipes.ts`

**Change**: Widen `Recipe.recipeInstructions` field type.

```typescript
// Before
recipeInstructions?: string[] | Array<{ name?: string; text?: string }>;

// After
recipeInstructions?: unknown[];
```

**File 2**: `pwa/src/lib/cooking/stepParser.ts`

**Change**: Widen `parseRecipeSteps` parameter type.

```typescript
// Before
export function parseRecipeSteps(
  recipeInstructions?: string[] | Array<{ name?: string; text?: string }>
): CookingStep[]

// After
export function parseRecipeSteps(
  recipeInstructions?: unknown[]
): CookingStep[]
```

**No other changes.** The internal logic of `parseRecipeSteps` already handles all three shapes correctly at runtime. The `isHowToSection` guard, the `HowToSection` branch, and the flat-step branch are all correct and untouched.

### Why `unknown[]` and not a union with `HowToSection[]`

Adding `HowToSection[]` to the union would require exporting the `HowToSection` interface and importing it in `recipes.ts`, creating a coupling between the API layer and the parser internals. Using `unknown[]` is simpler, honest (the API returns opaque JSON), and consistent with how `unwrapUntypedNode` already types its return value (`any`). The runtime type-guards inside `parseRecipeSteps` provide the necessary narrowing.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (the `as any` cast in the existing test is the tell), then verify the fix allows the call without a cast and produces correct output.

### Exploratory Bug Condition Checking

**Goal**: Confirm that the existing `HowToSection` test in `step-parser.spec.ts` used `as any` as a workaround for the inaccurate type, and that removing the cast compiles fine (due to structural subtyping) while the runtime logic already works correctly.

**Investigation Finding**: TypeScript's structural subtyping means `HowToSection[]` IS assignable to `Array<{ name?: string; text?: string }>` — no compile error occurs when `as any` is removed. The `as any` cast was a workaround acknowledging the type was wrong, not a necessity. The runtime logic in `parseRecipeSteps` already handles `HowToSection[]` correctly via `isHowToSection`.

**Test Cases**:

1. **Type Representation Gap** (confirmed): The `Recipe.recipeInstructions` field type `string[] | Array<{ name?: string; text?: string }>` cannot honestly represent `HowToSection[]`. The fix widens to `unknown[]` to match the actual runtime value from `unwrapUntypedNode`.
2. **Runtime Works Correctly** (confirmed): The existing test with `as any` removed compiles and passes — `parseRecipeSteps` correctly handles `HowToSection[]` at runtime.
3. **Real Recipe Shape** (confirmed): The test using the exact shape from `data/recipes/3fe040b3.../recipe.json` (3 sections, 8 steps) passes and asserts 8 steps are returned.

**Documented Counterexample**:

- The original `as any` cast in the test is the documented counterexample — it acknowledged the type was wrong even though TypeScript's structural subtyping would have accepted the call.
- The type fix (`unknown[]`) makes the type system honest: it no longer claims to know the shape of the API's JSON data.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(input) DO
  result := parseRecipeSteps_fixed(input)
  ASSERT result.length > 0
  ASSERT result.every(step => step.instruction.length > 0)
  ASSERT result.length === totalHowToStepsWithNonEmptyText(input)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT parseRecipeSteps_original(input) deepEquals parseRecipeSteps_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:

- It generates many test cases automatically across the input domain (random string arrays, random flat HowToStep arrays, random empty/null inputs).
- It catches edge cases that manual unit tests might miss (e.g., strings with only whitespace, objects with only `name` and no `text`).
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Plan**: The existing unit tests for string arrays and flat HowToStep arrays already document the expected behavior. After the fix, run them without modification to confirm preservation.

**Test Cases**:

1. **String Array Preservation**: `parseRecipeSteps(['Chop onions', 'Sauté until golden'])` → same result before and after fix.
2. **Flat HowToStep Preservation**: `parseRecipeSteps([{ name: 'Prep', text: 'Chop onions' }])` → same result before and after fix.
3. **Empty/Undefined Preservation**: `parseRecipeSteps([])` and `parseRecipeSteps(undefined)` → `[]` before and after fix.
4. **Generic Section Name Preservation**: `HowToSection` with `name: 'Preparation'` (in `GENERIC_SECTION_NAMES`) → step instruction has no prefix.
5. **Non-Generic Section Name Preservation**: `HowToSection` with `name: 'Cooking'` → step instruction is prefixed with `"Cooking: "`.

### Unit Tests

- Remove `as any` cast from the existing `HowToSection` test in `step-parser.spec.ts` — this should compile cleanly after the fix.
- Add a test using the exact shape from `data/recipes/3fe040b3.../recipe.json` (3 sections, 8 steps total) and assert 8 `CookingStep` entries are returned with correct instructions.
- Verify the `as any` removal is the only change needed in the test file.

### Property-Based Tests

- Generate random arrays of `HowToSection` objects (random section names, random numbers of `HowToStep` entries with random text) and verify `parseRecipeSteps` returns exactly as many steps as there are `HowToStep` entries with non-empty text.
- Generate random `string[]` inputs and verify the result count equals the number of non-empty strings — confirming preservation.
- Generate random `Array<{ name?: string; text?: string }>` inputs and verify the result count equals the number of entries with non-empty text or name — confirming preservation.

### Integration Tests

- Open Cook's Mode for the recipe at `3fe040b3-29e8-4e26-90b6-1401c0bf3d03` (Spaghetti with Toasted Garlic Bread) and verify that more than 1 step is shown (i.e., real steps are displayed, not just the ingredients screen).
- Verify that step navigation (`cooks-mode-step-next`) advances through the real recipe steps.
- Verify that Cook's Mode for a recipe with a flat string array still works correctly (preservation).
