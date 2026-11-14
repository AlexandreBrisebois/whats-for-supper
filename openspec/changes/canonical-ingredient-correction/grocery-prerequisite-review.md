# Grocery prerequisite extraction review — 2026-11-07

This is an implementation boundary review, not completion, cutover approval or a
change to the accepted behavior. The parent reconciled the approved implementation
sequence: extract the smallest coherent canonical identity/guarded-publication
foundation before closing grocery acceptance, then resume the remaining canonical,
step/bilingual and migration/recovery work. All existing task boxes remain open.

## Dependency and boundaries

The legacy recipe stores ingredient strings and retained extraction supplies, not
saved ingredient-row identities. `GroceryDemandEvidence.Members` describes observed
occurrence/recipe/name membership. It can reject a split/merge, but cannot prove
that a saved ingredient continued after an incompatible-unit edit. Promoting it to
positive lineage would violate contracts.md and corpus C13/C14/C29/C31.

The extracted path must include server-issued saved row UUIDs and request-local
create clientIds, one content revision for ingredient/basis/instruction/shopping
facts, guarded atomic edits, explicit conservative legacy conversion, protected
staged source publication, authoritative reads/results, generated clients and
stateful mocks, projection and exact recovery. GET remains provider-free and
write-free. Existing rows are converted by a guarded explicit write, never by
reading them or matching changed strings by index/name. Until this complete path
is qualified, the conservative grocery continuation fence remains in place.

The recovery activation requirement in specs/recipe-ingredients/spec.md remains
binding: exact current-format round-trip and staged client gates must pass before
canonical writes activate. Implementing prerequisite recovery support does not
complete the migration companion, rehearse existing-data activation or authorize
production/hosted execution. Step allocation/rendering and dictionary adoption
remain with their companions. No second canonical recipe format is introduced.

## Source review and integration risk

`RecipeService.UpdateRecipe` currently applies legacy arrays/basis/instructions
without a content guard. `SyncRecipeProcessor` can replace raw metadata, basis and
ingredients from recipe.json. `RecipeAgent` publishes the live file before sync.
These paths must be fenced/replaced together before saved identity is trustworthy;
adding an ID column alone is insufficient. Recovery/export must retain the same
revisions, evidence, explicit nulls and protected fields. Conversion must defer if
it cannot preserve current wording and trustworthy exact facts together.

The shared exact scalar/range representation already exists as `GroceryQuantity`,
with bounded rational-string operations in `LegacyGroceryQuantity`. Reuse its
approved wire semantics and arithmetic rather than introduce a competing numeric
authority. First verify malformed persisted operands and incomplete baselines:
the current validator reparses rational strings through the human grammar, which
uses Unicode digit classes before invariant BigInteger parsing. That boundary can
throw instead of yielding honest unknown comparison. A focused regression will
establish the actual outcome before any correction.

The protected parity ownership list includes RecipeDetailSheet.tsx and its
refinement test. Those are essential eventual editor integration overlaps; this
session does not modify or take ownership of them. No protected path is changed.

## Precision proof boundary

Equal trusted original-input fingerprints prove unchanged operands despite an
arithmetic/representation refinement. A different or missing fingerprint does not
prove that newly observed 1/3 and previously acknowledged 0.33 describe the same
historical demand. Source revisions alone are opaque and are not proof of semantic
equivalence. The approved contracts do not establish that missing history. Do not
guess a fraction, label every changed source representation-only, or suppress real
human amount/portion increases. Future positive refinement cases need an explicit
trusted association with the acknowledged original operands; otherwise record the
case as unproven, preserve evidence and report it rather than claim acceptance.

## Verification plan

1. Intended-red exact validation and real PostgreSQL corrupt/incomplete-baseline
   journeys; preserve checks and stored baseline without fabricating acknowledgement
   or crashing. Valid current demand and unrelated-row true increases remain active.
2. Canonical conversion/edit/publication red/green through API/PostgreSQL/files:
   stable duplicate/reordered rows, exact fractions/ranges, null/empty, unknown
   basis, concurrent/stale/missing guards, no partial fields, no read writes,
   delayed repair and protected human clears, replay/cancellation and recovery.
3. Generated-client/stateful mock and editor draft acceptance, then real isolated
   browser/API/PostgreSQL correction and incompatible-unit continuation with saved
   row+occurrence lineage, split/merge rejection and active_legacy_list fences.
4. Return to grocery changed-evidence/incomplete-baseline/focus/live acceptance;
   rerun affected checks on each candidate. Existing-data migrate.sh, whole-diff
   review, prepare/verify, four production suites and hosted same-candidate gates
   remain required. Hosted CI remains prohibited in this session; no archive or
   task checkoff follows partial evidence.

This extraction trades a larger prerequisite than a bare identity field for an
honest continuity proof. It preserves the approved full sequence and all existing
acceptance; no dependent companion becomes complete from this prerequisite.
