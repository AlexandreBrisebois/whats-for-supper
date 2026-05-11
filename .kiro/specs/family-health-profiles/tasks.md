# Tasks: Family Health Profiles

Each task is a vertical slice. Before starting any task, read design.md § Seam inventory.

**Dependency:** The `recipe-categorization` and `cnf-data-ingestion` specs must be complete before warning display work. Tasks 1–2 are independent; Task 3 may be built with fake provider ingredient matches before the provider implementation is complete.

**Before marking any task done:**
- `task agent:drift` — zero drift confirmed
- `task agent:test:impact` — targeted tests pass
- `task review` — full suite passes

---

## Task 1 — Database column + C# model + new records

**What:** Add `health_profile` column to `family_members`, add the new C# records and DTOs, and update `FamilyMember` and `FamilyMemberDto`. No logic yet.

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Models/HealthProfileTests.cs`:
1. JSON round-trip: `HealthProfile` with all four arrays populated serializes and deserializes correctly
2. JSON round-trip: `RecipeWarning` serializes and deserializes correctly
3. `HealthProfileDto` with missing arrays defaults to empty lists, not null

**Step 2 — Schema:**

In `api/database/schema.sql`, add:
```sql
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS
    health_profile jsonb DEFAULT NULL;
```

**Step 3 — C#:**

Create `api/src/RecipeApi/Models/HealthProfile.cs` — shape in design.md.
Create `api/src/RecipeApi/Models/RecipeWarning.cs` — shape in design.md.
Create `api/src/RecipeApi/Dto/HealthProfileDto.cs` — shape in design.md.
Create `api/src/RecipeApi/Dto/RecipeWarningDto.cs` — shape in design.md.

In `api/src/RecipeApi/Models/FamilyMember.cs`, add:
```csharp
[Column("health_profile", TypeName = "jsonb")]
public string? HealthProfile { get; set; } = null;
```

In `api/src/RecipeApi/Dto/FamilyMemberDto.cs`, add:
```csharp
[JsonPropertyName("healthProfile")]
public HealthProfileDto? HealthProfile { get; set; } = null;
```

**Do NOT touch** `FamilyService`, `FamilyController`, or any other file.

**Definition of done:** Schema applies. Round-trip tests pass. No other tests break.

- [ ] Task 1 complete

---

## Task 2 — OpenAPI contract + client regeneration

**What:** Add new schemas and routes to `specs/openapi.yaml`. Regenerate TypeScript client.

**Step 1 — Contract changes:**

Add `HealthProfileDto` and `RecipeWarningDto` schemas — shapes in design.md § OpenAPI Contract Delta.

Add nullable `healthProfile` to `FamilyMemberDto` schema.
Add nullable `warnings` array to `ScheduleRecipeDto` schema.
Add nullable `warnings` array to `RecipeDto` schema.
Add `PUT /api/family/{id}/health-profile` and `DELETE /api/family/{id}/health-profile` routes.

**Step 2 — Check `ScheduleRecipeDto` call sites before touching the C# record:**

```bash
grep -rn "new ScheduleRecipeDto(" api/src --include="*.cs"
```

Add `Warnings` as the last optional parameter in `ScheduleRecipeDto` only after confirming no call site will break.

**Step 3:**

```bash
task gen:client
task agent:drift
```

**Definition of done:** Drift passes. TypeScript client includes `healthProfile` on `FamilyMemberDto` and `warnings` on `ScheduleRecipeDto` and `RecipeDto`.

- [ ] Task 2 complete

---

## Task 3 — `ConditionRuleEngine`

**What:** The core logic of this feature. A pure, static function — no DB, no LLM.

**Read before starting:** design.md § `ConditionRuleEngine` for every rule, the `NutritionInfo` record shape, the provider ingredient match shape, and the allergy synonym/fallback mapping tables.

**Dependency:** Task 1 must be complete (types exist).

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Services/ConditionRuleEngineTests.cs`:

1. **Null profile:** `profile = null` → returns empty list
2. **HighCholesterol + RedMeat:** `conditions: ["HighCholesterol"]`, `proteinSource: "RedMeat"` → one `soft` warning
3. **HighCholesterol + Poultry:** no warning
4. **HighCholesterol + high saturated fat:** `nutrition.SaturatedFatG: 5.0` (above `FopThresholds.SaturatedFatG = 4.0`) → one `soft` warning
5. **HighCholesterol + saturated fat at threshold:** `nutrition.SaturatedFatG: 4.0` → warning (≥ threshold fires)
6. **Hypertension + high sodium:** `conditions: ["Hypertension"]`, `nutrition.SodiumMg: 400` (above `FopThresholds.SodiumMg = 345`) → one `soft` warning
7. **Hypertension + sodium below threshold:** `nutrition.SodiumMg: 300` → no warning
8. **Hypertension + null sodium:** `nutrition = null` → no warning (cannot evaluate)
9. **Diabetes + high sugar:** `conditions: ["Diabetes"]`, `nutrition.SugarG: 20` (above `FopThresholds.SugarsG = 15`) → one `soft` warning
10. **Diabetes + high carbs:** `nutrition.CarbohydrateG: 70` → one `soft` warning
11. **Allergy "Shellfish" + provider match "shrimp":** `allergies: ["Shellfish"]`, provider ingredient match `"shrimp"` → one `hard` reminder whose reason contains `"Check ingredients for Shellfish"` and `"possible match"`
12. **Allergy "Peanuts":** unrecognised/unmatched allergen → no warning, no exception, and no allergy-safe claim
13. **Intolerance "Lactose" + Dairy:** `intolerances: ["Lactose"]`, `proteinSource: "Dairy"` → one `soft` warning
14. **Intolerance "Gluten" + WholeGrains primary:** `primaryFoodGroup: "WholeGrains"` → one `soft` warning
15. **Preference "Vegetarian" + Poultry:** `preferences: ["Vegetarian"]`, `proteinSource: "Poultry"` → one `info` warning
16. **Preference "Halal":** unrecognised preference → no warning, no exception
17. **Multiple conditions:** `["HighCholesterol","Hypertension"]` with matching recipe → two warnings returned
18. **Empty health profile arrays:** all arrays empty → empty list returned
19. **Warnings are non-blocking:** warning output contains member-specific review metadata only and does not expose any planning-block flag
20. **`FopThresholds` constants match regulation:** assert `SaturatedFatG == 4.0`, `SugarsG == 15.0`, `SodiumMg == 345.0` — protects against accidental edits

**Step 2 — Implementation:**

Create `api/src/RecipeApi/Services/FopThresholds.cs` (static class with the three constants and source URL comment).
Create `api/src/RecipeApi/Services/ConditionRuleEngine.cs` — shape in design.md. Use `FopThresholds` constants throughout.

**Definition of done:** All 20 tests pass. `task review` passes.

- [ ] Task 3 complete

---

## Task 4 — CRUD endpoints for health profiles

**What:** Wire up `FamilyService` methods and `FamilyController` routes for upsert and delete.

**Dependency:** Tasks 1 and 2 must be complete. `recipe-categorization` spec NOT required for this task.

**Step 1 — Write tests first:**

Add integration tests:

1. `PUT /api/family/{id}/health-profile` with valid body → `200 OK`, `family_members.health_profile` written
2. `GET /api/family/{id}` after upsert → `healthProfile` field present in response with correct values
3. `GET /api/family` (list) → all members include `healthProfile` (null for those without one)
4. `DELETE /api/family/{id}/health-profile` → `204 NoContent`, `health_profile = null` in DB
5. `PUT /api/family/{nonexistent-id}/health-profile` → `404 Not Found`
6. `PUT` with missing arrays in body → all defaulted to `[]`, not null (validated in written profile)

**Step 2 — `FamilyService`:**

Add `UpsertHealthProfileAsync` and `ClearHealthProfileAsync` — shapes in design.md.

Update `GetAllFamilyMembers` and any single-member load to include deserialization of `health_profile` into `HealthProfileDto` when building the response DTO.

**Step 3 — `FamilyController`:**

Add the two new endpoints — shapes in design.md.

**Definition of done:** All 6 integration tests pass. `task agent:drift` passes. `task review` passes.

- [ ] Task 4 complete

---

## Task 5 — Discovery warnings

**What:** Compute and attach health warnings to each recipe returned by `GET /api/discovery`.

**Dependency:** Tasks 3 and 4 must be complete. `recipe-categorization` spec must be complete (`dietary_profile` populated on recipes).

**Read before starting:**
- `api/src/RecipeApi/Services/DiscoveryService.cs` — `GetRecipesForDiscoveryAsync` return path
- design.md § Modified service: `DiscoveryService` — where to inject `ConditionRuleEngine.Evaluate`

**Step 1 — Write tests first:**

Integration tests:

1. Family member with `HighCholesterol` + discovery returns a recipe with `proteinSource: "RedMeat"` → `warnings` array contains one `soft` warning with correct `familyMemberId`
2. Family member with no health profile + red meat recipe → `warnings` is empty array
3. Family member with `Allergy: ["Shellfish"]` + provider ingredient match `"shrimp"` → `warnings` contains one `hard` reminder with "check ingredients" / "possible match" copy
4. Recipe with null `dietary_profile` → `warnings` is empty array
5. `warnings` field is always present on each recipe (never null)
6. Allergy warning does not change discovery ordering, voting eligibility, or add any blocking flag

**Step 2 — Implementation:**

Extend `GetRecipesForDiscoveryAsync` per design.md. Use `ConditionRuleEngine.Evaluate`. Map `RecipeWarning` → `RecipeWarningDto` when attaching to `RecipeDto`.

Parse `NutritionInfo` from `recipe.RawMetadata` null-safely. If `RawMetadata` is null or `nutrition` is absent, pass `null` to the engine.

**Definition of done:** All 6 tests pass. `task agent:drift` passes.

- [ ] Task 5 complete

---

## Task 6 — Schedule slot warnings

**What:** Compute and attach health warnings to each `ScheduleRecipeDto` in `GET /api/schedule`.

**Dependency:** Task 5 must be complete. `ScheduleRecipeDto` already has `Warnings` param (Task 2).

**Seam warning:** `ScheduleRecipeDto` is a positional record. `Warnings` was added as the last parameter in Task 2. Confirm this before touching `ScheduleService` — any mismatch breaks silently.

**Read before starting:**
- `api/src/RecipeApi/Services/ScheduleService.cs` — where `ScheduleRecipeDto` is constructed
- design.md § Modified service: `ScheduleService` — loading strategy (one member query, not per slot)

**Step 1 — Write tests first:**

Integration tests:

1. Week with one slot containing a red-meat recipe + one family member with `HighCholesterol` → `GET /api/schedule` slot has `warnings` with one soft warning
2. Week with assigned recipes + no family members have health profiles → `warnings` is empty array on all slots (no extra DB query made — assert via log or query count)
3. Empty slot (no recipe assigned) → `warnings` is null (slot has no recipe to evaluate)
4. Two family members, both with conflicting conditions for the same recipe → both warnings present in the slot's `warnings` array
5. Allergy warning names the affected family member and does not block the meal from staying planned

**Step 2 — Implementation:**

Extend `GetScheduleAsync` per design.md. Load members with health profiles once. Compute warnings per slot per member. Collect into `List<RecipeWarningDto>`.

**Check all `new ScheduleRecipeDto(...)` call sites** before modifying the service — the new `Warnings` param must be passed correctly at each construction site.

```bash
grep -rn "new ScheduleRecipeDto(" api/src --include="*.cs"
```

**Definition of done:** All 4 tests pass. No regression on existing schedule tests. `task agent:drift` passes.

- [ ] Task 6 complete

---

## Task 7 — Backup and restore for health profiles

**What:** Extend `ManagementService` to persist `health_profile` through backup/restore.

**Read before starting:**
- `api/src/RecipeApi/Services/ManagementService.cs` — find the family member backup section in `BackupAsync` and the corresponding restore section

**Step 1 — Write tests first:**

Add to `ManagementServiceTests.cs`:

1. Backup: family member with non-null `health_profile` → backup JSON contains `healthProfile`
2. Backup: family member with null `health_profile` → backup JSON contains null or omits field, no error
3. Restore: backup JSON with `healthProfile` present → `family_members.health_profile` written after restore
4. Restore: backup JSON without `healthProfile` field → `health_profile` stays null, no error

**Step 2 — Implementation:**

Extend `BackupAsync` and `RestoreAsync` — see design.md § Modified service: `ManagementService`.

**Definition of done:** All 4 tests pass. `task test:api` passes.

- [ ] Task 7 complete

---

## Task 8 — PWA health profile management UI

**What:** Add UI to set, update, and clear a family member's health profile. This is the settings surface, not the planner.

**Dependency:** Task 2 must be complete (TypeScript client has `HealthProfileDto`).

**Step 1 — Write tests first:**

1. Profile form renders correct fields (conditions, allergies, intolerances, preferences as text inputs or tag lists)
2. Submitting the form calls `PUT /api/family/{id}/health-profile` with the correct body
3. Clear button calls `DELETE /api/family/{id}/health-profile`
4. Form pre-populates with existing profile data when `healthProfile` is non-null

**Step 2 — Implementation:**

Add health profile management to the existing family member settings screen (wherever family members are managed in the PWA). Keep it simple — tag/chip inputs per category or comma-separated text fields are acceptable for Phase 1.

**Definition of done:** All 4 tests pass. `task test:unit` passes.

- [ ] Task 8 complete

---

## Task 9 — PWA warning display on discovery cards and planner slots

**What:** Display health warning badges on recipe cards in discovery and on planner day slots.

**Dependency:** Task 8 must be complete. Tasks 5 and 6 must be complete (server returns warnings).

**Step 1 — Write tests first:**

1. Discovery card with `warnings: [{level: "hard", ...}]` → caution badge visible
2. Discovery card with `warnings: [{level: "soft", ...}]` → caution badge visible
3. Discovery card with `warnings: [{level: "info", ...}]` → NO badge (info-only)
4. Discovery card with `warnings: []` → no badge
5. Tapping badge on discovery card → tooltip/sheet shows warning reason and family member name
6. Planner day slot with `warnings` containing `hard` or `soft` → caution indicator visible
7. Planner day slot with empty `warnings` → no indicator

**Step 2 — Implementation:**

Add `WarningBadge` component. Wire into discovery card and planner day card. Display-only — no blocking behavior.

**Definition of done:** All 7 tests pass. `task test:unit` passes. `task review` passes.

- [ ] Task 9 complete

---

## Notes / Decisions

- **2026-05-06**: Spec authored. Phase 1 allergy matching is limited to `proteinSource` — free-text ingredient-level matching deferred to Phase 2 dietitian agent. Unrecognised allergens are silently skipped (no error, no warning). Halal/Kosher preferences cannot be evaluated from `dietary_profile` alone — silently skipped in Phase 1.
- **2026-05-06**: `ScheduleRecipeDto` is a positional record — `Warnings` added as last parameter. All task steps include a grep guard for call sites.
- **2026-05-06**: Warning computation is at read time, not write time. No caching needed at family scale (≤6 members × 7 slots = 42 rule evaluations per schedule load).
