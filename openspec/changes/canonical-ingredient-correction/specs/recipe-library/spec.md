## MODIFIED Requirements

### Requirement: Display returned ingredient strings in detail

Original reading SHALL show rendered canonical current descriptions and optional quantities in order, including its compatible returned string projection, with no invented rows when absent. Dated/preview reading SHALL use the shared projection of those same line identities with original access. Reads SHALL NOT change stored ingredients; legacy parsing belongs to the supported boundary adapter, not independent screen logic.

#### Scenario: Read returned ingredients
- **WHEN** original detail returns Pasta followed by Sauce
- **THEN** Ingredients lists Pasta followed by Sauce

#### Scenario: No ingredients are returned
- **WHEN** successful detail has no ingredient strings
- **THEN** Ingredients remains present without invented rows

#### Scenario: Home and its dated cooking view
- **WHEN** Home Tonight and Cook are opened for the same captured planned occurrence
- **THEN** their ingredient facts and target count agree rather than one independently showing raw unscaled strings
- **AND** explicit original review and undated Quick Find retain original context from the same current ingredient owner

### Requirement: Return persisted servings in the recipe DTO

Public recipe reads SHALL expose the saved nullable integer servings plus canonical original description/amount/unit rows and ingredient revision through their documented response contract; compatible ingredients strings are derived. Unknown count remains null. Existing envelopes/access/eligibility apply, and reads SHALL NOT call AI or mutate ingredient storage.

#### Scenario: Known count in detail
- **WHEN** authorized GET /api/recipes/{id} retrieves a recipe with stored servings 4
- **THEN** HTTP 200 includes recipe.servings equal to 4 in its existing unwrapped recipe/updatedAt response

#### Scenario: Unknown count
- **WHEN** a successful recipe DTO read retrieves a recipe with null servings
- **THEN** its servings is null without defaulting to 2 or 4

### Requirement: Correct or add servings through recipe editing

Authorized recipe editing SHALL correct/add a positive whole basis within database integer range using the captured ingredient revision and existing Save/Cancel recovery. Saving preserves raw yield and original ingredient quantities and adds no basis/count field to recipe.info. Omitted count preserves its current value, including null. Stale/unversioned basis writes at canonical cutover SHALL conflict without partial updates.

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

#### Scenario: Preserve a newer basis or ingredient edit
- **WHEN** the loaded ingredient revision is stale or required revision is absent when basis is submitted
- **THEN** the server rejects the update as a refresh/conflict, preserves current state and the client retains the draft rather than declaring success
