# Requirements Document: Family Health Profiles

## Introduction

The app plans meals for a whole family. Family members may have pre-existing health conditions — high cholesterol, hypertension, diabetes, food allergies, intolerances, or dietary preferences — that make certain recipes unsuitable or less desirable for them. Today the app has no awareness of this.

This feature adds a health profile to each family member and uses it to decorate recipe cards and planner slots with warnings or exclusions. It does not block the user from planning any meal — it informs and warns without being paternalistic. The actual dietary classification of recipes (`dietary_profile`, `proteinSource`) was built in the `recipe-categorization` spec and is the data source this feature reads.

This is a **display and warning** feature. It does not call any LLM. It does not modify recipe data. It does not change plan assignment logic. All health-profile logic is deterministic rule matching.

**Dependency:** `recipe-categorization` spec must be complete. `recipes.dietary_profile` and `recipes.category` must be populated for warnings to appear.

---

## Glossary

- **HealthProfile**: A JSONB record stored on `family_members.health_profile`. Contains conditions, allergies, intolerances, and preferences for one family member.
- **Condition**: A named health state that the system knows how to map to dietary caution rules. Examples: `HighCholesterol`, `Hypertension`, `Diabetes`, `HeartDisease`.
- **Allergy**: A food that causes an immune response. The system treats allergens as hard exclusions — always surfaced as a warning.
- **Intolerance**: A food that causes discomfort but not an immune response (e.g. lactose, gluten). Surfaced as a soft warning.
- **Preference**: A voluntary dietary choice (e.g. vegetarian, vegan, halal, kosher). Surfaced as an informational note, not a warning.
- **RecipeWarning**: A structured object attached to a recipe card or planner slot explaining why a recipe may not be suitable for a specific family member.
- **WarningLevel**: `hard` (allergy — always shown prominently), `soft` (intolerance or condition caution — shown but dismissable), `info` (preference mismatch — subtle note).
- **ConditionRuleEngine**: The deterministic, code-only service that maps a `HealthProfile` + `RecipeDietaryProfile` to a list of `RecipeWarning` objects.

---

## Requirements

### Requirement 1: HealthProfile data model

**User Story:** As a family manager, I want to record each family member's health conditions, allergies, intolerances, and dietary preferences in one place, so the app can use this information to guide meal planning.

#### Acceptance Criteria

1. THE `family_members` table SHALL have a `health_profile` column of type `jsonb`, nullable, defaulting to `null`.
2. THE `HealthProfile` shape SHALL be:
   ```
   {
     conditions:    string[]   // e.g. ["HighCholesterol", "Hypertension"]
     allergies:     string[]   // e.g. ["Peanuts", "Shellfish", "TreeNuts"]
     intolerances:  string[]   // e.g. ["Lactose", "Gluten"]
     preferences:   string[]   // e.g. ["Vegetarian", "Halal"]
   }
   ```
3. ALL four arrays SHALL default to `[]` when not provided. A `null` `health_profile` is equivalent to all-empty arrays.
4. THE supported `conditions` values and their dietary implications SHALL be:
   | Condition | Caution signals on recipe |
   |---|---|
   | `HighCholesterol` | Warns when `proteinSource` is `RedMeat`; warns when `DairyAndEggs` is a primary grocery section |
   | `Hypertension` | Warns when recipe `sodiumContent` (from `raw_metadata.nutrition`) exceeds 600 mg per portion |
   | `Diabetes` | Warns when recipe `sugarContent` exceeds 15 g per portion OR `carbohydrateContent` exceeds 60 g per portion |
   | `HeartDisease` | Warns when `proteinSource` is `RedMeat`; same as `HighCholesterol` |
5. THE supported `allergies`, `intolerances`, and `preferences` SHALL be free-text strings. The system does NOT validate them against a closed set — the user enters what is relevant. The Phase 2 dietitian agent may normalise these.
6. THE `HealthProfile` SHALL NOT be sent to any LLM. All rule matching is deterministic code.

---

### Requirement 2: CRUD for family member health profiles

**User Story:** As a family manager, I want to set, update, and clear a health profile for each family member from the app, so I can keep it current as conditions change.

#### Acceptance Criteria

1. `PUT /api/family/{id}/health-profile` SHALL accept a `HealthProfileDto` body and upsert `family_members.health_profile`.
2. `GET /api/family/{id}` SHALL include the `healthProfile` field in the `FamilyMemberDto` response (nullable).
3. `DELETE /api/family/{id}/health-profile` SHALL set `family_members.health_profile = null`.
4. THE `PUT` endpoint SHALL validate that all four arrays are present (defaulting to `[]` if omitted) before writing.
5. `GET /api/family` (list all) SHALL include `healthProfile` on each member in the response.

---

### Requirement 3: Recipe warning computation

**User Story:** As a family manager, I want to see a warning on a recipe card when it may not be suitable for a specific family member, so I can make an informed choice before adding it to the plan.

#### Acceptance Criteria

1. A `ConditionRuleEngine` service SHALL accept a `HealthProfile` and a `RecipeDietaryProfile` (plus optional `nutrition` data from `raw_metadata`) and return a list of `RecipeWarning` objects.
2. THE `RecipeWarning` shape SHALL be:
   ```
   {
     familyMemberId: string (uuid)
     familyMemberName: string
     level:  "hard" | "soft" | "info"
     reason: string   // plain-language explanation, e.g. "High in saturated fat — caution for Alex's cholesterol."
     condition: string  // the condition/allergy/intolerance/preference that triggered this
   }
   ```
3. ALLERGY warnings SHALL have `level: "hard"`. The reason SHALL name the allergen explicitly.
4. INTOLERANCE and CONDITION warnings SHALL have `level: "soft"`.
5. PREFERENCE mismatches SHALL have `level: "info"`.
6. WHEN `dietary_profile` is null for a recipe, the engine SHALL return no warnings (cannot warn on unclassified data).
7. THE engine SHALL be a pure function — no DB access, no LLM calls.

---

### Requirement 4: Recipe card and discovery decoration

**User Story:** As a family member voting on recipes in the discovery stack, I want to see a health caution badge on a recipe card when it conflicts with my profile, so I can factor that in when voting.

#### Acceptance Criteria

1. `GET /api/discovery` SHALL return `warnings: RecipeWarning[]` on each recipe in the response, computed for the requesting family member's health profile.
2. WHEN a recipe has no warnings for the requesting member, `warnings` SHALL be an empty array (not null).
3. THE PWA discovery card SHALL display a caution badge when `warnings` contains at least one `hard` or `soft` warning.
4. TAPPING the badge SHALL show a tooltip or sheet listing all warnings for that recipe.
5. `info`-level warnings SHALL NOT show a badge — they MAY be surfaced in the detail view only.

---

### Requirement 5: Planner slot decoration

**User Story:** As a family manager reviewing the weekly plan, I want to see health warnings on planner slots, so I can proactively swap out unsuitable meals before cook day.

#### Acceptance Criteria

1. `GET /api/schedule` SHALL return `warnings: RecipeWarning[]` on each `ScheduleRecipeDto` that has a recipe assigned, computed for all family members who have a health profile.
2. WHEN multiple family members have conflicting profiles, all their warnings SHALL be included.
3. THE PWA planner day card SHALL display a caution indicator when the slot's recipe has any `hard` or `soft` warnings.
4. THE caution indicator SHALL NOT block any action — it is informational only.
5. WHEN the recipe in a slot has no warnings for any family member, no indicator is shown.

---

### Requirement 6: Backup and restore

**User Story:** As a user, I want health profiles to survive a database restore.

#### Acceptance Criteria

1. `ManagementService.BackupAsync()` SHALL write `health_profile` for each family member to the existing `family-members.json` backup (or a new `family-health-profiles.json` if separation is cleaner).
2. `ManagementService.RestoreAsync()` SHALL read and upsert `health_profile` back to `family_members.health_profile`.
3. WHEN a family member's backup entry has no `healthProfile` field, the restore SHALL leave `health_profile = null` without error.

---

## Risks and Questions

- **Allergy matching from ingredients**: The `ConditionRuleEngine` in Phase 1 matches `proteinSource` and nutrition values — not free-text ingredient names against allergy strings. Matching "Shellfish" against an ingredient list like `["shrimp", "prawns"]` requires NLP or a synonym dictionary. This is Phase 2 (dietitian agent). In Phase 1, the allergy warning surface is limited to what can be derived from `proteinSource` (e.g. Seafood = shellfish risk) and the user must still exercise their own judgment.
- **Nutrition data availability**: Hypertension and Diabetes rules read `sodiumContent` and `sugarContent` from `raw_metadata.nutrition`. Many recipes have null nutrition fields (see Parmentier example in recipe-categorization spec). When nutrition is null, those rules cannot fire — the engine silently skips them.
- **`ScheduleRecipeDto` shape change**: Adding `warnings` to `ScheduleRecipeDto` touches the existing schedule contract. See seam inventory in design.md.
- **Performance**: Computing warnings for all members on every `GET /api/schedule` requires loading all `health_profile` values and all `dietary_profile` values. With a typical family of 2–6 and 7 slots, this is ~42 rule evaluations — negligible. No caching needed.
