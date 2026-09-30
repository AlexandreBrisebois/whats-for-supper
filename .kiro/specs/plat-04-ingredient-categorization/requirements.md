# Ingredient Categorization — Requirements

**Kind:** Current-capability feature specification

**Derivation:** Behavior-first, accelerated cadence

**Source:** `PLAT-04` in [`docs/feature-inventory.md`](../../../docs/feature-inventory.md), verified against current non-archived source, contract, and tests

**Status:** Baseline proposal for future change control; this specification does not authorize implementation

## Outcome

Normalized recipe ingredients map to stable grocery aisles, retain explicit household corrections, and can be safely categorized or recategorized in background work.

## Scope

### In scope

- ingredient and unit normalization
- aisle/category persistence and lookup
- manual category correction API
- background categorize/recategorize behavior

### Non-goals

- nutritional classification
- merging distinct grocery line items solely because text is similar
- silently replacing an explicit manual correction with AI output

## Verified current baseline

- `IngredientNormalizer` and `UnitNormalizer` provide shared normalization rules.
- `IngredientCategoryService` owns category lookups/corrections; `PATCH /api/ingredients/{normalizedKey}/category` is the API seam.
- `CategorizeIngredientsProcessor` and the `recategorize-ingredients` workflow populate categories.
- `AisleMapper` and grocery services consume category state for list presentation.

The baseline records current ownership; it is evidence to review, not a requirement
that every implementation detail remain unchanged.

## Requirements

### PLAT-04-R1 — Stable key

Equivalent supported ingredient spellings shall resolve to a deterministic normalized key without discarding the original display text.

### PLAT-04-R2 — Category vocabulary

Persisted category values shall use the approved grocery-section vocabulary and ordering consumed by grocery presentation.

### PLAT-04-R3 — Manual authority

A validated manual category correction shall apply to subsequent grocery recomputation and shall not be silently overwritten by automated categorization.

### PLAT-04-R4 — Background classification

Missing eligible categories may be generated in bounded background work; invalid or failed model output shall not create arbitrary sections.

### PLAT-04-R5 — Recomputation

Category changes shall be reflected in affected grocery lists through authoritative recomputation or refresh.

### PLAT-04-R6 — Safety

Categorization shall remain a shopping organization aid and shall not be presented as nutritional, allergy, or dietetic advice.

## Preserved behavior

- Existing household meal workflows remain usable when this capability is degraded,
  except where the capability is the explicit security or persistence prerequisite.
- Changes preserve household/member boundaries and do not broaden collection of
  recipe, identity, or secret data.
- OpenAPI remains authoritative for any affected API operation.

## Acceptance scenarios

1. The primary success path satisfies every `PLAT-04-R*` requirement with the
   selected household/member context.
2. Missing, stale, invalid, or unavailable dependencies produce the specified safe
   fallback or explicit failure rather than false success.
3. A second device, late response, retry, or identity change cannot silently replace
   newer authoritative state.
4. The affected behavior is operable with its required non-pointer alternative and
   exposes meaningful state to assistive technology where a UI exists.
5. Contract, persistence, and workflow changes are proven at their actual seams,
   not inferred from a static or mocked check alone.

## Decisions retained by this baseline

- Current public behavior is the starting compatibility boundary, not immutable
  architecture.
- Household data remains self-hosted and the least-privilege/least-data behavior is
  preferred.
- Background work must report accepted, completed, and failed states distinctly.

## Open questions before a future change

1. Which requirement is being changed, and what current behavior must remain
   backward compatible during rollout?
2. Does the change alter OpenAPI, persistence, deployment configuration, event
   delivery, or another feature spec? If so, approve those handshakes first.
3. What production or real-device evidence is required beyond repository automation
   for the selected change?
