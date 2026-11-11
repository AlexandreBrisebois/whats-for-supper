# Scale ingredient uses in cooking steps

> **Delivery baseline — 2026-11-10:** Baseline workstream B. Reuse the existing projection and Cook behavior; ordinary trusted binding production remains a required missing connection. The first whole-use tracer does not remove the other specified supported allocation forms. See the [release scope and agent coordination](../canonical-ingredient-correction/proposal.md#dependable-portions-delivery-baseline--accepted-2026-11-10).

## Why

Ingredient-only scaling leaves step quantities contradictory. Step uses need explicit revision-bound associations to original recipe demand while cooking remains available when a mapping is uncertain.

## Outcome and Scope

Mandatory ingredient-use scaling, coherent ingredient/step projection and current-recipe reading at recorded prepared counts. No general formula language, prose-wide numeric replacement or new grocery demand. Explicit partial amounts remain original after total correction and still scale with portions; relative language stays relative, with original readable wording for inconsistent allocations. Cook mode omits the routine step-uncertainty notice and duplicate header ingredients link; phone Edit/View Original actions return to the right while the view toggle stays left and tablet controls retain their lower-left layout.

## Implementation baseline and remaining delivery

The projection engine, original-step editor, coherent refresh, prepared-count consumers and Cook cleanup already exist. Existing unit, PostgreSQL and browser owners exercise whole, absolute, fraction, remainder, fixed and per-item behavior; their recorded results remain tied to their tested candidates. They are reusable implementation, not an instruction to build another engine.

The missing connection is ordinary trusted relationship production and maintenance through import and saved edits. Current conversion creates empty bindings and projection fixtures seed them. Group 0 in tasks.md owns that missing producer/validator and its real workflow acceptance. Groups 1–3 retain acceptance of supported behavior and identify only demonstrated gaps; group 4 and task 5.3 retain outstanding integration/release qualification. This change is not complete until ordinary URL/photo and manual-correction flows reach supported scaling without seeded relationships. Bilingual catalogue adoption and Similar-search UI are deferred from this release. Other intake expansion follows in later increments and is outside the first selected increment, not silently removed from the eventual requirements.

## What Changes

- Automatically maintain ingredient-to-step relationships during import and after saved ingredient or step edits, using the ordinary editor without special markup or mandatory manual linking. Reuse deterministic revalidation; allow a workflow AI task to propose replacements when necessary, subject to server evidence validation and stale-write protection. Uncertain text remains original and readable.
- **BREAKING:** adopt the applicable shared [contract](../canonical-ingredient-correction/contracts.md) with explicit compatibility/failure behavior.
- Preserve user decisions and existing safety boundaries in the shared [review](../canonical-ingredient-correction/review.md).
- Complete and reconcile adversarial acceptance from the shared [corpus](../canonical-ingredient-correction/acceptance-corpus.md); this consolidation changes planning artifacts only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cooking`: project validated uses and preserve cooking context.
- `supper-servings`: include step uses in shared portions projection.
- `recipe-editing`: guard instruction edits in original basis.

## Impact

Depends on the canonical foundation and companion ownership map as specified in design.md. Future apply must synchronize OpenAPI, generated clients, consumers and stateful mocks where affected, and qualify actual persistence/workflow seams. Planning existence does not establish implementation readiness.
