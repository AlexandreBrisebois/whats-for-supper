# Specification preparation evidence — 2026-11-07

Spec-only checkout: branch `recipe-view-redesign`, HEAD `d51222ffbb7e3eb6d08fed394851a52de3f5522c`. Initial status matched concurrent parity/harness and repository-instruction edits. No branch switch, reset, clean, commit, push, archive, main-capability sync, product/OpenAPI/CI edits or production operations were performed. No app suites, browser build/server, PostgreSQL/container or provider execution was run. The complete task scope is the planning files listed below; excluded concurrent work remains outside the verification claim.

Source inspection: RecipeService/SupperIngredientProjection, GroceryRecomputeService/check contracts, GroceryList focus callback, RecipeImportReportService/controller, RecipeAgent/SyncRecipeProcessor publication and UnitNormalizer. Existing capability requirements/scenarios and old draft deltas informed replacements. Entire Brain brief completed but reported an older indexed commit; code inspection query failed because current graph store was unavailable. Direct current-source inspection was used for that query; no index/config/memory changes. Primary dataset research and limitations are in the bilingual sources artifact.

Executed planning checks before final verification:

- `openspec validate <name> --type change --strict --no-interactive`: passed for canonical-ingredient-correction, restore-dependable-grocery-interactions, bilingual-shopping-identity, scale-cooking-step-ingredients, migrate-canonical-recipe-model and selective-ingredient-repair. The first selective validation warned about its status banner above Purpose; moved the nonnormative status into Purpose and reran successfully.
- Cross-change delta requirement ownership scan: zero duplicate capability/requirement owners across the five linked units. All implementation checkboxes remain unchecked.
- `task verify:plan -- <explicit changed planning paths>`: selected documentation and scoped spec checks; no app/runtime test selection. Preview establishes selection only, not acceptance.
- Adversarial source/spec review corrected current-format all-record preflight versus skip-invalid partial publication, preserved row continuity across unprovable unit changes, replaced report-response content mixing with coherent refresh and removed adjacent prior-unknown warning requirements. Final contract review also made list-version increments on every committed check explicit, preventing a stale bulk map from erasing an intervening single-row check; opaque recipe tokens are never lexically ordered.

Historical holds at this initial draft, superseded by [approved-decision reconciliation](decision-review-evidence.md): allocation correction after total edit; proposed range/structural continuity contract; actual one-time ambiguous-check transition; dataset licence/corpus adoption; disk/live precedence only if fallback is needed. No claim of complete implementation readiness. Runtime TDD/behavior acceptance is not-applicable to this document-only session and remains required during later apply. Full portions release requires mandatory step scaling.

First final harness attempt: documentation and content-identity checks passed, but all six `spec:check` invocations failed their tool-version precondition (required OpenSpec 1.16.1, default installed 1.16.0). Record: `.task/agent-finish/runs/107c2dad0d064ae2807a4f1b6b6c1a34.json`. This is a tooling failure, not an artifact-validation failure. An existing read-only 1.16.1 CLI was then found at `/tmp/wfs-browser-parity-tools/node_modules/.bin/openspec`; the next verification uses it through invocation-local PATH, with no installation or shared-file changes.

Final document/harness verification will run after this evidence file is written using exactly the reviewed path set; cite its invocation-specific record in the session outcome. Its result describes documentation/OpenSpec only, not product behavior or hosted CI parity. Full-repository spec gate is deferred while unrelated concurrent work remains active; scoped changes are validated independently.

## Exact changed paths

- `openspec/changes/bilingual-shopping-identity/.openspec.yaml`
- `openspec/changes/bilingual-shopping-identity/design.md`
- `openspec/changes/bilingual-shopping-identity/proposal.md`
- `openspec/changes/bilingual-shopping-identity/sources.md`
- `openspec/changes/bilingual-shopping-identity/specs/grocery-shopping/spec.md`
- `openspec/changes/bilingual-shopping-identity/tasks.md`
- `openspec/changes/canonical-ingredient-correction/acceptance-corpus.md`
- `openspec/changes/canonical-ingredient-correction/contracts.md`
- `openspec/changes/canonical-ingredient-correction/design.md`
- `openspec/changes/canonical-ingredient-correction/evidence.md`
- `openspec/changes/canonical-ingredient-correction/proposal.md`
- `openspec/changes/canonical-ingredient-correction/review.md`
- `openspec/changes/canonical-ingredient-correction/rollout.md`
- `openspec/changes/canonical-ingredient-correction/specs/cooking/spec.md`
- `openspec/changes/canonical-ingredient-correction/specs/data-backup-and-recovery/spec.md`
- `openspec/changes/canonical-ingredient-correction/specs/grocery-shopping/spec.md`
- `openspec/changes/canonical-ingredient-correction/specs/recipe-capture/spec.md`
- `openspec/changes/canonical-ingredient-correction/specs/recipe-editing/spec.md`
- `openspec/changes/canonical-ingredient-correction/specs/recipe-ingredients/spec.md`
- `openspec/changes/canonical-ingredient-correction/specs/recipe-library/spec.md`
- `openspec/changes/canonical-ingredient-correction/specs/recipe-sharing/spec.md`
- `openspec/changes/canonical-ingredient-correction/specs/supper-servings/spec.md`
- `openspec/changes/canonical-ingredient-correction/tasks.md`
- `openspec/changes/migrate-canonical-recipe-model/.openspec.yaml`
- `openspec/changes/migrate-canonical-recipe-model/design.md`
- `openspec/changes/migrate-canonical-recipe-model/proposal.md`
- `openspec/changes/migrate-canonical-recipe-model/specs/data-backup-and-recovery/spec.md`
- `openspec/changes/migrate-canonical-recipe-model/specs/grocery-shopping/spec.md`
- `openspec/changes/migrate-canonical-recipe-model/tasks.md`
- `openspec/changes/restore-dependable-grocery-interactions/.openspec.yaml`
- `openspec/changes/restore-dependable-grocery-interactions/design.md`
- `openspec/changes/restore-dependable-grocery-interactions/proposal.md`
- `openspec/changes/restore-dependable-grocery-interactions/specs/grocery-shopping/spec.md`
- `openspec/changes/restore-dependable-grocery-interactions/tasks.md`
- `openspec/changes/scale-cooking-step-ingredients/.openspec.yaml`
- `openspec/changes/scale-cooking-step-ingredients/design.md`
- `openspec/changes/scale-cooking-step-ingredients/proposal.md`
- `openspec/changes/scale-cooking-step-ingredients/specs/cooking/spec.md`
- `openspec/changes/scale-cooking-step-ingredients/specs/recipe-editing/spec.md`
- `openspec/changes/scale-cooking-step-ingredients/specs/supper-servings/spec.md`
- `openspec/changes/scale-cooking-step-ingredients/tasks.md`
- `openspec/changes/selective-ingredient-repair/design.md`
- `openspec/changes/selective-ingredient-repair/proposal.md`
- `openspec/changes/selective-ingredient-repair/specs/ingredient-repair/spec.md`
- `openspec/changes/selective-ingredient-repair/tasks.md`
