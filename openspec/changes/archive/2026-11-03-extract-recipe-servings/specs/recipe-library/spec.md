# Spec Delta

## ADDED Requirements

### Requirement: Persist servings for the extracted ingredient basis

The recipe database record SHALL retain nullable positive integer `servings`, meaning how many servings its stored ingredient quantities make. Successful extraction synchronization SHALL derive the count from its raw recipeYield, saving null when unresolved. The raw yield SHALL remain retained. Neither recipeYield nor servings SHALL be added to recipe.info. Ingredients SHALL NOT be scaled.

#### Scenario: Four-portion extraction
- **WHEN** a recipe with yield “4 portions” and 340 g pasta successfully synchronizes
- **THEN** the database stores servings 4 and the original yield, ingredients retain 340 g pasta, and no yield or serving-count field is added to recipe.info

#### Scenario: Replacement content has no resolved count
- **WHEN** successful re-extraction replaces a known recipe with content whose yield is ambiguous or absent
- **THEN** synchronization sets servings null rather than attaching the previous count to the replacement ingredients

#### Scenario: Retry synchronization
- **WHEN** the same extracted content is synchronized more than once
- **THEN** the resulting count and ingredients remain identical

### Requirement: Recover unambiguous existing serving yields

Legacy backfill SHALL fill null database servings from unambiguous stored serving-yield metadata without AI calls, file writes, ingredient changes or replacing known counts. Missing, malformed, fractional, range, alternative and non-serving yields SHALL leave the count unknown. Backfill SHALL be idempotent and SHALL NOT publish a count derived from content replaced concurrently.

#### Scenario: Three supplied recipes
- **WHEN** backfill processes the supplied chicken-thigh, zaatar-chicken and radiatore recipes with yields “2 portions”, “2 portions” and “4 portions”
- **THEN** their database counts become 2, 2 and 4 respectively, while ingredient quantities, raw metadata and recipe.info remain unchanged

#### Scenario: Unknown and known records
- **WHEN** backfill encounters null servings with yield “2 or 4 portions”, “2–4 servings”, “12 muffins”, or malformed metadata, and another record with known servings 4
- **THEN** unresolved counts remain null and the known count remains 4

#### Scenario: Concurrent replacement
- **WHEN** a recipe's metadata changes after backfill reads it but before backfill writes its derived count
- **THEN** the obsolete count is not written over the replacement state

#### Scenario: Interrupted backfill
- **WHEN** backfill is interrupted after some records are saved and later runs again
- **THEN** it safely fills remaining eligible null counts without changing already known counts or recipe content

### Requirement: Return persisted servings in the recipe DTO

Successful reads using the public recipe DTO SHALL expose nullable integer `servings` from the database record. Unknown counts SHALL return null without a default. Existing envelopes, access and eligibility rules SHALL continue to apply. Detail reads SHALL NOT call AI or mutate recipe storage.

#### Scenario: Known count in detail
- **WHEN** authorized GET /api/recipes/{id} retrieves a recipe with stored servings 4
- **THEN** HTTP 200 includes recipe.servings equal to 4 in its existing unwrapped recipe/updatedAt response

#### Scenario: Unknown count
- **WHEN** a successful recipe DTO read retrieves a recipe with null servings
- **THEN** its servings is null without defaulting to 2 or 4

### Requirement: Display localized servings in recipe detail

Loaded detail SHALL show a known positive serving count in a read-only badge immediately after the Ingredients title, as part of that heading's accessible name, with localized singular/plural wording. Null or absent counts SHALL omit it. The count SHALL NOT also appear beside Ready In. Existing loading, failure, close and stale-response behavior SHALL continue to apply.

#### Scenario: Four servings in each language
- **WHEN** successful detail retrieval returns servings 4
- **THEN** English detail shows “4 servings” immediately beside Ingredients and French detail shows “4 portions” immediately beside Ingrédients, each within the corresponding heading

#### Scenario: One serving
- **WHEN** successful detail retrieval returns servings 1
- **THEN** English detail shows “1 serving” and French detail shows “1 portion”

#### Scenario: Known recipe followed by unknown recipe
- **WHEN** detail changes from a recipe with servings 4 to one whose response has null or absent servings
- **THEN** the new detail shows no serving label and retains none from the previous recipe

### Requirement: Keep the ingredient serving badge readable and noninteractive

The serving badge SHALL remain readable without truncation or horizontal scrolling at 320 CSS px and at 200% text size. It SHALL follow the Ingredients title in reading order and wrap beneath it when needed. The badge SHALL remain noninteractive in viewing mode, without adding a focus stop or ingredient scaling; edit mode SHALL provide the separate labeled field specified below. Badge text SHALL meet 4.5:1 contrast against its rendered background.

#### Scenario: Narrow or enlarged bilingual heading
- **WHEN** detail is displayed at 320 CSS px or with 200% text size in English or French
- **THEN** the full Ingredients title and serving badge remain visible in reading order, wrapping within their section without overlapping content or causing horizontal scrolling

#### Scenario: Serving field in edit mode
- **WHEN** a recipe enters editing with known or missing servings
- **THEN** a keyboard-accessible labeled servings field is available alongside existing recipe editing, initialized with the saved count or blank respectively

#### Scenario: No ingredient quantities are rescaled
- **WHEN** the Ingredients heading shows a serving badge
- **THEN** the ingredient list retains its returned quantities and the badge provides no scaling action

### Requirement: Correct or add servings through recipe editing

Recipe editing SHALL let authorized users correct known servings or add a missing count through the existing Save/Cancel flow. A supplied count SHALL be a positive whole integer within the database integer range. Saving SHALL persist the count independently of raw yield, without changing ingredient quantities or adding yield/count fields to recipe.info. Omitting the count SHALL preserve its saved value, including null.

#### Scenario: Correct a known count
- **WHEN** a user changes servings from 4 to 3 and successfully saves the recipe
- **THEN** subsequent detail reads and reopening show 3, even if raw recipeYield still says “4 portions”, with original ingredient quantities and raw metadata retained

#### Scenario: Add a missing count
- **WHEN** a user edits a recipe with null servings, enters 2 and successfully saves
- **THEN** subsequent detail reads show 2 and the viewing heading shows the localized two-serving badge

#### Scenario: Omitted count preserves stored state
- **WHEN** a recipe update omits servings, including an older client's request or an untouched blank field for an unknown count
- **THEN** the existing count or null remains unchanged

#### Scenario: Invalid count
- **WHEN** a user supplies zero, a negative, fractional, out-of-range or nonnumeric count
- **THEN** editing presents an associated localized validation error and prevents saving that input, and direct API requests with invalid supplied counts are rejected without changing the recipe

#### Scenario: Cancel or failed save
- **WHEN** the user cancels a changed servings draft or saving fails
- **THEN** Cancel discards the draft, while failure retains it for correction or retry and does not present the new count as successfully saved

### Requirement: Make servings editing accessible in both languages

The editor SHALL use a visible localized label (“Servings” in English, “Portions” in French), an associated validation message and normal keyboard operation. Its field, error and existing Save/Cancel controls SHALL remain usable at 320 CSS px and 200% text size, in both sheet layouts. Switching recipe identity SHALL reset the servings draft to that recipe's state.

#### Scenario: Bilingual validation and responsive editing
- **WHEN** a user edits servings in English or French at 320 CSS px or 200% text size
- **THEN** the complete label, field, associated error and Save/Cancel controls remain reachable without overlap, truncation or horizontal scrolling

#### Scenario: Change recipe while editing
- **WHEN** detail moves to another recipe after a servings draft was entered
- **THEN** the previous recipe's draft or validation error is not shown for the new recipe
