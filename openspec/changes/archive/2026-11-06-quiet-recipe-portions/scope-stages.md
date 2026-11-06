# Stage boundaries and retained decisions

Alex approved splitting the oversized draft on 6 November 2026. This supersedes the combined proposal and its mixed UI-only tasks; it does not authorize implementation. The stopped writer's complete draft is preserved privately under `.task/spec-stage-split/before/`. Prior validation applies only to its original content; this split needs fresh validation.

| Stage | Planning change | Boundary | Dependency |
|---|---|---|---|
| 1, first review target | [quiet-recipe-portions](proposal.md) | Quiet detail and Home/Cook consistency using current projection contracts; no storage change | None |
| 2, separate substantial change | [canonical-ingredient-correction](../../canonical-ingredient-correction/proposal.md) | Canonical facts, deterministic conversion, manual Search/Edit/Save, all current reader/writer adapters and recoverability | Preserve stage 1 UI/consumer behavior; no stage 3 requirement |
| 3, deferred option | [selective-ingredient-repair](../../selective-ingredient-repair/proposal.md) | Explicit source-assisted candidates, validation, selected acceptance and resumable candidate recovery | Stage 2; activate only if remaining work warrants it |

## Decisions carried forward
- Unknown quantities are valid. Salt to taste, oil for frying and other source-confirmed qualitative ingredients are not defects solely because no number exists. Technical partial/unresolved projections do not establish actionable repair membership.
- Existing Search → ordinary recipe → Edit → Save remains the correction journey. The narrowed structured-editor proposal adds no repair flags, filter membership or dashboard; existing saved Reported/ReadyToReview feedback retains its lifecycle. No replacement normal-reading warning is introduced.
- Preserve current text/order, reliable original amounts, saved basis and human edits. Legacy authorship is unknown and protected. No positional quantity transfer, invented basis, midpoint, item-to-people conversion or automatic restoration of older amounts.
- One collection with optional trusted quantities is the stage 2 proposed architecture. Revision-guarded ingredient/basis writes deliberately require refreshed clients; all writers, full-fidelity export/recovery and consumers must converge before cutover. Stage 1 requires none of these changes.
- Exact backup/restore qualification belongs with storage change. Keep share 1.0 lower fidelity and privacy-scrubbed; no full-share v2, schema cleanup or historical ingredient snapshots are introduced.
- The progressive original-action extra tap and removal of generic detail uncertainty feedback remain deliberate stage 1 tradeoffs. Keep actual preparation facts, genuine errors, source inspection and grocery warnings.
- Automated source re-extraction and staged candidate acceptance move entirely to stage 3. Existing new-recipe capture/provider and category behavior continues in stage 2; it is not a new repair system.

## Supplied-data evidence and its limits
The supplied files/DB comparison found 198 recipes, 194 active-ready, 176 known serving bases and 18 unknown. Original-mode current-projector analysis accepted 1,524 numeric amounts, 841 unresolved lines and 21 intentional directions. A target-six view conceals 93 usable numeric facts where basis is unknown, so conversion must use original facts. These are structural adapter observations, not source-accuracy guarantees or a claim that all unknown lines need repair. The earlier DV 204/4/186-backfill hypothesis is superseded for the supplied production-derived context.

Remaining bases comprise 2 literal portion(s), 4 bare numbers, 3 serving ranges, 6 fixed item yields, 1 item range and 2 absent yields. Four have retained unit-bearing evidence for quick human confirmation; no automatic batch correction is justified. Only 9/18 have valid numeric metadata. Hypothetical positive bases give 3 completely scalable, 6 partial and 9 unresolved recipes; this exercise does not choose real bases. Retained workflow records do not justify rerunning old backfills.

Private original analysis/checklist and immutable-input manifests remain under `.task/quiet-portions-review/`; do not commit personal recipes/checklists. Supplied raw PostgreSQL context and production-derived recipe files remain unchanged. No live production access, current deployed parity or source-origin history is established by the snapshot. Newer preparation usage cannot be inferred from its older schema.

Production upgrade guidance moved to [stage 2 rollout](../../canonical-ingredient-correction/rollout.md); exact installed/target artifacts and topology remain operator inputs. Migration dry-run and API activation can write; independent backup and recovery rehearsal are required. DV reset is separately pending confirmation, with no reset/reseed performed.

## Requirement traceability from the combined draft

Stage 2 was separately narrowed on 2026-11-06 around the three-field structured editor. Search/quality rows marked excluded below remain historical traceability, not new repair-state implementation requirements. Ordinary current Search/report behavior remains unchanged.
The table maps every previous requirement to its current owner. Unchanged canonical main requirements remain authoritative where a proposed modification is no longer needed. Candidate-specific behavior is intentionally deferred, not dropped. Scenario semantics retained under renamed requirements are covered by their new owner's scenarios and ordered tasks.

| Previous capability / requirement | Current owner |
|---|---|
| cooking / Load recipe content for the cooking view | [canonical-ingredient-correction / cooking](../../canonical-ingredient-correction/specs/cooking/spec.md) |
| cooking / Carry the planned supper date into cooking ingredients | [canonical-ingredient-correction / cooking](../../canonical-ingredient-correction/specs/cooking/spec.md) |
| cooking / Keep cooking independent of ingredient repair publication | [canonical-ingredient-correction / cooking](../../canonical-ingredient-correction/specs/cooking/spec.md) — Keep cooking independent of ingredient correction publication |
| cooking / Preserve original instructions while projecting canonical ingredients | [canonical-ingredient-correction / cooking](../../canonical-ingredient-correction/specs/cooking/spec.md) |
| data-backup-and-recovery / Select recipes with persisted export payload | [canonical-ingredient-correction / data-backup-and-recovery](../../canonical-ingredient-correction/specs/data-backup-and-recovery/spec.md) |
| data-backup-and-recovery / Refresh metadata while retaining existing recipe content | [canonical-ingredient-correction / data-backup-and-recovery](../../canonical-ingredient-correction/specs/data-backup-and-recovery/spec.md) |
| data-backup-and-recovery / Reconstruct recipes from retained metadata and content | [canonical-ingredient-correction / data-backup-and-recovery](../../canonical-ingredient-correction/specs/data-backup-and-recovery/spec.md) |
| data-backup-and-recovery / Merge recipes without replacing unrelated stored state | [canonical-ingredient-correction / data-backup-and-recovery](../../canonical-ingredient-correction/specs/data-backup-and-recovery/spec.md) |
| data-backup-and-recovery / Read supported legacy recipe content | [canonical-ingredient-correction / data-backup-and-recovery](../../canonical-ingredient-correction/specs/data-backup-and-recovery/spec.md) |
| data-backup-and-recovery / Distinguish current recipe envelopes from legacy content | [canonical-ingredient-correction / data-backup-and-recovery](../../canonical-ingredient-correction/specs/data-backup-and-recovery/spec.md) |
| data-backup-and-recovery / Online independent exact recovery | [canonical-ingredient-correction / data-backup-and-recovery](../../canonical-ingredient-correction/specs/data-backup-and-recovery/spec.md) |
| data-backup-and-recovery / Preserve recipe servings without extending recipe info | [canonical-ingredient-correction / data-backup-and-recovery](../../canonical-ingredient-correction/specs/data-backup-and-recovery/spec.md) |
| data-backup-and-recovery / Preserve canonical repair state without replaying source work | [selective-ingredient-repair / ingredient-repair](../../selective-ingredient-repair/specs/ingredient-repair/spec.md) — Recover candidate relationships without launching source work |
| grocery-shopping / Derive grocery needs from recipe-bearing entries in the selected week | [canonical-ingredient-correction / grocery-shopping](../../canonical-ingredient-correction/specs/grocery-shopping/spec.md) |
| grocery-shopping / Prefer usable structured supply over ingredient text | [canonical-ingredient-correction / grocery-shopping](../../canonical-ingredient-correction/specs/grocery-shopping/spec.md) |
| grocery-shopping / Read supported structured quantity representations | [canonical-ingredient-correction / grocery-shopping](../../canonical-ingredient-correction/specs/grocery-shopping/spec.md) |
| grocery-shopping / Use ingredient text after invalid JSON syntax | [canonical-ingredient-correction / grocery-shopping](../../canonical-ingredient-correction/specs/grocery-shopping/spec.md) |
| grocery-shopping / Request category suggestions only for uncached structured names | [canonical-ingredient-correction / grocery-shopping](../../canonical-ingredient-correction/specs/grocery-shopping/spec.md) |
| grocery-shopping / Keep category-provider failure from blocking the processor completion path | [canonical-ingredient-correction / grocery-shopping](../../canonical-ingredient-correction/specs/grocery-shopping/spec.md) |
| grocery-shopping / Refresh derived groceries after canonical publication | [canonical-ingredient-correction / grocery-shopping](../../canonical-ingredient-correction/specs/grocery-shopping/spec.md) |
| grocery-shopping / Preserve grocery uncertainty independently of repair flags | [canonical-ingredient-correction / grocery-shopping](../../canonical-ingredient-correction/specs/grocery-shopping/spec.md) |
| recipe-capture / Background web acquisition and recipe extraction | [canonical-ingredient-correction / recipe-capture](../../canonical-ingredient-correction/specs/recipe-capture/spec.md) |
| recipe-capture / Multimodal OCR vision recipe extraction and semantic validation | [canonical-ingredient-correction / recipe-capture](../../canonical-ingredient-correction/specs/recipe-capture/spec.md) |
| recipe-capture / Generate recipe content from the submitted description | [canonical-ingredient-correction / recipe-capture](../../canonical-ingredient-correction/specs/recipe-capture/spec.md) |
| recipe-capture / Keep selective ingredient candidates separate from full capture publication | [selective-ingredient-repair / ingredient-repair](../../selective-ingredient-repair/specs/ingredient-repair/spec.md) — Generate ingredient candidates without live recipe publication |
| recipe-capture / Normalize supported ingredient inputs at capture publication | [canonical-ingredient-correction / recipe-capture](../../canonical-ingredient-correction/specs/recipe-capture/spec.md) |
| recipe-editing / Open initialized recipe-detail field drafts | [canonical-ingredient-correction / recipe-editing](../../canonical-ingredient-correction/specs/recipe-editing/spec.md) |
| recipe-editing / Edit ingredient rows in the detail draft | [canonical-ingredient-correction / recipe-editing](../../canonical-ingredient-correction/specs/recipe-editing/spec.md) |
| recipe-editing / Restrict local detail Save eligibility | [canonical-ingredient-correction / recipe-editing](../../canonical-ingredient-correction/specs/recipe-editing/spec.md) |
| recipe-editing / Submit normalized detail fields for the loaded recipe | [canonical-ingredient-correction / recipe-editing](../../canonical-ingredient-correction/specs/recipe-editing/spec.md) |
| recipe-editing / Apply supplied non-null recipe-detail update fields | [canonical-ingredient-correction / recipe-editing](../../canonical-ingredient-correction/specs/recipe-editing/spec.md) |
| recipe-editing / Display the submitted snapshot after successful detail Save | [canonical-ingredient-correction / recipe-editing](../../canonical-ingredient-correction/specs/recipe-editing/spec.md) |
| recipe-editing / Mark search-derived recipe state pending with supported updates | [canonical-ingredient-correction / recipe-editing](../../canonical-ingredient-correction/specs/recipe-editing/spec.md) |
| recipe-editing / Retain editing and offer another attempt after detail Save failure | [canonical-ingredient-correction / recipe-editing](../../canonical-ingredient-correction/specs/recipe-editing/spec.md) |
| recipe-editing / Guard ingredient and basis edits with the captured revision | [canonical-ingredient-correction / recipe-editing](../../canonical-ingredient-correction/specs/recipe-editing/spec.md) |
| recipe-editing / Adapt supported legacy ingredient edits conservatively | [canonical-ingredient-correction / recipe-editing](../../canonical-ingredient-correction/specs/recipe-editing/spec.md) |
| recipe-editing / Save explicit human corrections and candidate acceptance atomically | Stage 2 recipe-editing / Save explicit manual corrections atomically; stage 3 ingredient-repair / Accept corrections through revision-guarded Edit and Save |
| recipe-editing / Revalidate repair membership from the saved ingredient revision | [canonical-ingredient-correction / recipe-editing](../../canonical-ingredient-correction/specs/recipe-editing/spec.md) |
| recipe-editing / Distinguish failed saving from post-save delivery failure | [canonical-ingredient-correction / recipe-editing](../../canonical-ingredient-correction/specs/recipe-editing/spec.md) |
| recipe-ingredients / Own current ingredient facts in one ordered collection | [canonical-ingredient-correction / recipe-ingredients](../../canonical-ingredient-correction/specs/recipe-ingredients/spec.md) |
| recipe-ingredients / Validate quantities without treating unquantified content as a defect | [canonical-ingredient-correction / recipe-ingredients](../../canonical-ingredient-correction/specs/recipe-ingredients/spec.md) |
| recipe-ingredients / Preserve human intent and unknown legacy authorship | [canonical-ingredient-correction / recipe-ingredients](../../canonical-ingredient-correction/specs/recipe-ingredients/spec.md) |
| recipe-ingredients / Inspect and convert trustworthy original facts deterministically | [canonical-ingredient-correction / recipe-ingredients](../../canonical-ingredient-correction/specs/recipe-ingredients/spec.md) |
| recipe-ingredients / Guard conversion publication against changed input | [canonical-ingredient-correction / recipe-ingredients](../../canonical-ingredient-correction/specs/recipe-ingredients/spec.md) |
| recipe-ingredients / Select source repair only for evidenced gaps | [selective-ingredient-repair / ingredient-repair](../../selective-ingredient-repair/specs/ingredient-repair/spec.md) |
| recipe-ingredients / Generate ingredient candidates without live recipe publication | [selective-ingredient-repair / ingredient-repair](../../selective-ingredient-repair/specs/ingredient-repair/spec.md) |
| recipe-ingredients / Validate candidate evidence and membership before acceptance | [selective-ingredient-repair / ingredient-repair](../../selective-ingredient-repair/specs/ingredient-repair/spec.md) |
| recipe-ingredients / Accept corrections through revision-guarded Edit and Save | [selective-ingredient-repair / ingredient-repair](../../selective-ingredient-repair/specs/ingredient-repair/spec.md) |
| recipe-ingredients / Derive actionable correction facts from the current revision | [canonical-ingredient-correction / recipe-ingredients](../../canonical-ingredient-correction/specs/recipe-ingredients/spec.md) |
| recipe-ingredients / Resume and verify migration and repair by durable outcomes | Stage 2 recipe-ingredients / Resume and verify deterministic conversion by saved revision; stage 3 ingredient-repair / Resume selected repair without replaying publication |
| recipe-ingredients / Preserve compatibility until reconciled cutover and recovery | [canonical-ingredient-correction / recipe-ingredients](../../canonical-ingredient-correction/specs/recipe-ingredients/spec.md) |
| recipe-library / Preview two four or six portions without saving | [quiet-recipe-portions / recipe-library](specs/recipe-library/spec.md) |
| recipe-library / Expose original evidence without a duplicate serving list | [quiet-recipe-portions / recipe-library](specs/recipe-library/spec.md) |
| recipe-library / Display returned ingredient strings in detail | [canonical-ingredient-correction / recipe-library](../../canonical-ingredient-correction/specs/recipe-library/spec.md) |
| recipe-library / Return persisted servings in the recipe DTO | [canonical-ingredient-correction / recipe-library](../../canonical-ingredient-correction/specs/recipe-library/spec.md) |
| recipe-library / Correct or add servings through recipe editing | [canonical-ingredient-correction / recipe-library](../../canonical-ingredient-correction/specs/recipe-library/spec.md) |
| recipe-library / Read planned recipe quantities in captured date context | [main / recipe-library](../../../specs/recipe-library/spec.md) — Read planned recipe quantities in captured date context |
| recipe-library / Reveal portions explanation after a deliberate reading change | [quiet-recipe-portions / recipe-library](specs/recipe-library/spec.md) |
| recipe-quality / Keep ingredient repair facts separate from saved household feedback | Excluded from the narrowed editor increment; see [current stage 2 scope](../../canonical-ingredient-correction/proposal.md) |
| recipe-quality / Expose actionable current ingredient repair reasons | Excluded from the narrowed editor increment; see [current stage 2 scope](../../canonical-ingredient-correction/proposal.md) |
| recipe-quality / Resolve ingredient repairs through recipe Edit and Save | Excluded from the narrowed editor increment; see [current stage 2 scope](../../canonical-ingredient-correction/proposal.md) |
| recipe-quality / Clear only repair reasons resolved by the saved revision | Excluded from the narrowed editor increment; see [current stage 2 scope](../../canonical-ingredient-correction/proposal.md) |
| recipe-search / Expose supported shortcut and grouped controls | Excluded from the narrowed editor increment; see [current stage 2 scope](../../canonical-ingredient-correction/proposal.md) |
| recipe-search / Use report membership without a separate review route | Excluded from the narrowed editor increment; see [current stage 2 scope](../../canonical-ingredient-correction/proposal.md) |
| recipe-search / Return from Search detail to mounted results | Excluded from the narrowed editor increment; see [current stage 2 scope](../../canonical-ingredient-correction/proposal.md) |
| recipe-search / Filter actionable ingredient repair facts independently | Excluded from the narrowed editor increment; see [current stage 2 scope](../../canonical-ingredient-correction/proposal.md) |
| recipe-search / Refresh repair membership after confirmed canonical Save | Excluded from the narrowed editor increment; see [current stage 2 scope](../../canonical-ingredient-correction/proposal.md) |
| recipe-search / Scope repair search continuations to applied state | Excluded from the narrowed editor increment; see [current stage 2 scope](../../canonical-ingredient-correction/proposal.md) |
| recipe-sharing / Generate privacy-scrubbed portable export bundle | [canonical-ingredient-correction / recipe-sharing](../../canonical-ingredient-correction/specs/recipe-sharing/spec.md) |
| recipe-sharing / Accept and persist imported recipe bundle into library | [canonical-ingredient-correction / recipe-sharing](../../canonical-ingredient-correction/specs/recipe-sharing/spec.md) |
| supper-servings / Report incomplete scaling without invented quantities | [quiet-recipe-portions / supper-servings](specs/supper-servings/spec.md) |
| supper-servings / Keep previews independent of saved serving and preparation state | [quiet-recipe-portions / supper-servings](specs/supper-servings/spec.md) |
| supper-servings / Share one authoritative projection across consumers | [quiet-recipe-portions / supper-servings](specs/supper-servings/spec.md); [canonical-ingredient-correction / supper-servings](../../canonical-ingredient-correction/specs/supper-servings/spec.md) |
| supper-servings / Scale independently aligned ingredient amounts | [canonical-ingredient-correction / supper-servings](../../canonical-ingredient-correction/specs/supper-servings/spec.md) |
