# Scale ingredient uses in cooking steps

## Why

Ingredient-only scaling leaves step quantities contradictory. Step uses need explicit revision-bound associations to original recipe demand while cooking remains available when a mapping is uncertain.

## Outcome and Scope

Mandatory ingredient-use scaling, coherent ingredient/step projection and current-recipe reading at recorded prepared counts. No general formula language, prose-wide numeric replacement or new grocery demand. Explicit partial amounts remain original after total correction and still scale with portions; relative language stays relative, with quiet review for inconsistent allocations.

## What Changes

- **BREAKING:** adopt the applicable shared [contract](../canonical-ingredient-correction/contracts.md) with explicit compatibility/failure behavior.
- Preserve user decisions and existing safety boundaries in the shared [review](../canonical-ingredient-correction/review.md).
- Add adversarial acceptance from the shared [corpus](../canonical-ingredient-correction/acceptance-corpus.md); no product implementation in this session.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cooking`: project validated uses and preserve cooking context.
- `supper-servings`: include step uses in shared portions projection.
- `recipe-editing`: guard instruction edits in original basis.

## Impact

Depends on the canonical foundation and companion ownership map as specified in design.md. Future apply must synchronize OpenAPI, generated clients, consumers and stateful mocks where affected, and qualify actual persistence/workflow seams. Planning existence does not establish implementation readiness.
