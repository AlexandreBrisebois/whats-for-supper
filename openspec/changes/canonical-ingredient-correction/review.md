# Shared dependency, conflict and adversarial design review

Spec-only review at `d51222ffbb7e3eb6d08fed394851a52de3f5522c`, `recipe-view-redesign`, 2026-11-07. No main-capability sync, archive, product changes, commits or production execution. Implementation checkboxes remain unchecked. The follow-up decision reconciliation was prepared from clean `recipe-view-redesign` at `482d44731ab44ec703f70e1252751fc0964bf7f2`. Alex subsequently approved the product rules recorded below; the initial source review remains historical evidence. A structurally valid OpenSpec draft is not implementation approval or tested product behavior.

## Current release scope

The [accepted delivery baseline](proposal.md) governs execution. URL/photo intake
and manual correction are the first increment; remaining intake channels follow.
Step relationship production (including post-edit optional AI reevaluation) is the
next missing end-to-end connection. Bilingual catalogue/merging and Similar UI are
deferred; selective repair is superseded. Current owner tasks distinguish existing
implementation from missing acceptance. The original review below is historical
rationale, not a report that every listed defect still exists.

## Ownership and dependency graph

| Review unit | Owns | Depends on / can release |
| --- | --- | --- |
| canonical-ingredient-correction | Exact original rows/basis/steps, contentRevision, protected publication, common DTO/editor and canonical projector input | Foundation; never a competing replacement schema |
| restore-dependable-grocery-interactions | Row/check identity, guarded check/bulk operations, reset comparison, no review acknowledgement, focus and category-control interaction | Reusable legacy demand identity can ship before full canonical migration; client fence and fresh-list/history-preservation upgrade required |
| bilingual-shopping-identity | Saved app food IDs/EN-FR labels, aliases, shopping grouping/units, category scope/provenance | Deferred release; canonical saved association and grocery row identity when resumed; not a portions prerequisite |
| scale-cooking-step-ingredients | Revision-bound uses, allocation/rendering, original step editing, coherent cooking refresh and prepared current-recipe reading | Canonical facts; mandatory for complete portions release, independent of dictionary coverage |
| migrate-canonical-recipe-model | In-place conversion, conditional fallback, old-writer fencing, fresh-list upgrade preserving history and complete current-format recovery | Inventory/conversion work can proceed now; activation requires final persisted contracts included in this release and preservation of every existing reference |

All proposed shapes live in [contracts.md](contracts.md). Every delta requirement is owned once across this set; this includes moving canonical draft cooking/grocery/recovery deltas into companions. Existing main specs remain implementation baselines until a separately approved apply/sync. No duplicate “recipe facts v2” capability is created.

Read projection chain: original canonical rows/basis + one content revision → existing context resolver → ingredient/step projection → Home/detail/Cook and ingredient demand-only grocery aggregation → saved food/fallback + compatible unit bucket → stable weekly row → row check. Step use is an allocation, never another supply. Recipe row ID, step ID, food ID, grocery row ID, extra occurrence ID and prepared occurrence ID are different keys.

## Source-grounded conflicts and disposition

| Existing owner/evidence | Conflict or unintended effect | Required disposition |
| --- | --- | --- |
| RecipeService.UpdateRecipe / SupperIngredientProjection.Read | String Save invalidates retained measured supply; old ingredient-only revision misses instruction races | Foundation: exact rows + content-wide guard; no positional transfer; source stays evidence |
| SupperIngredientProjection.IntentionallyUnquantified | Phrase whitelist can misclassify “Fresh basil leaves” | Foundation permits unknown amount/unit independently; no required phrase or automatic report |
| cooking / Explain original instruction amounts during scaling; old canonical Preserve original instructions | Explicitly mandates unchanged step quantities and blanket limitation note | Step delta replaces it with validated projection and selective quiet uncertainty |
| supper-servings / Scale each usable ingredient; Report incomplete scaling | Prohibits text scaling and retains grocery prior-unknown warning references | Step delta retains protection for unrelated text and removes stale warning cross-reference; foundation retains projection context owner |
| cooking / Apply a successful step edit locally | Submitted-array local install could mix new text with old binding/amount revision | Install returned coherent content, original draft and guard; no projected Save |
| cooking / Return from quality reporting | Applying report response recipe immediately can mix changed semantic content during active cooking | Apply report metadata; changed content enters explicit coherent refresh, preserve reporting trigger |
| GroceryRecomputeService and grocery-shopping shared display-name checks | Different bucket rows share a key | Grocery delta replaces name/bulk API assumptions, coordination and snapshots together |
| GroceryList.mutateExtra success callback | Unconditional Edit focus after checkbox mutation causes jumping | Checkbox/edit-specific focus contracts; preserve scroll on sort and future-extra disappearance |
| grocery-shopping prior_amount_unknown and source-disclosure requirements | Review copy/state can survive even if one string is removed | Remove marker generation, DTO/ack handling and both-locale UI; reconcile all adjacent source/subtotal requirements |
| IngredientNormalizer and categorization raw supply | Full description aliases can merge wrong foods or ignore corrections | Saved reviewed identity + fallback, no runtime AI; keep purchase qualifiers and human category priority |
| UnitNormalizer 240/15/5 ml culinary defaults, generic piece family | Regional and count-kind meanings currently collapse | No unproven standard migration; explicit units/count kinds, impact manifests and separate unresolved buckets |
| RecipeAgent file output → SyncRecipeProcessor | Existing reimport can replace raw instructions/basis before human guard | Stage file and DB publication; captured source/content revisions and protected fields are mandatory for preserved report-triggered repair |
| data-backup-and-recovery legacy arrays/version1/absent artifacts | Permanent old backup support contradicts chosen current-only model | Migration delta changes ordinary restore/sync preflight and all affected absent/history/serving/report/extra requirements; bounded one-time source converter is separate |
| Current-format merge | Format version does not prove newer content; opaque revisions not orderable | Ancestry/protection reconciliation; identical-token divergent bytes invalid; explicit exact replacement remains separate |
| Prepared reading | Frozen count can be confused with frozen recipe/basis | Current content at recorded count; preserve actual preparation/receipt/date and cooked-baseline contract; never claim historical recipe snapshot |
| Future CI defaults / uncommitted parity work | Name “CI” or all-suite selector does not itself prove production/real DB coverage | Depend on parity owner and explicit suite/live prerequisites below; no CI edits here |

Current report/repair evidence: `RecipeController` exposes POST/DELETE `/api/recipes/{id}/import-report`; `RecipeImportReportService.SubmitAsync` persists feedback first, reuses matching active attempts, blocks changed active feedback, avoids unchanged terminal relaunch and starts eligible URL/photo workflows only with nonblank content feedback and no Duplicate. Attempt-linked success/failure preserves reports. Demo AI/quota/recovery rules stay intact. The old proposed `/ingredient-repair` candidate workflow is absent from OpenAPI; its five tasks were unchecked. It is marked superseded/unimplemented in place, not archived or promoted. Retiring that proposal does not remove existing flags or repair triggers.

Current report locking is explicitly in-process; the new design cannot claim replica-wide safe deduplication from that fact. Before enabling multiple replicas, durable attempt/publication coordination must be designed and qualified separately. Preserve current single-instance boundary now.

## Proposed engineering choices and tradeoffs

- Rational string transport avoids JS precision loss and binary fraction drift; bounded input/intermediates prevent pathological arithmetic. Costs: tagged DTO migration, locale grammar and property fixtures. AmountText is validated notation, never a second numeric authority.
- Revision-bound spans fit existing plain-text editing; segments could be safer for rich editing but expand scope. UTF-16 boundary validation, expected substrings and exact revisions are required; stale spans stay readable and unscaled.
- Conservative fallback names and a curated identity seed avoid speculative bilingual merges. Costs: less aggregation and incomplete translation, acceptable with honest source labels. No upstream dataset has demonstrated corpus fit yet.
- Alex approved new split/merge rows starting unchecked rather than inheriting purchase intent. Continuing checked rows compare current requirement against a persisted checked-demand baseline, never the preceding recomputation; preserved overlaps/decreases do not advance it.
- Complete current-format manifests simplify recovery semantics but make prior backups intentionally unsupported. Preserve an independently verified old snapshot/executable pair for emergency rollback, not a hidden new-app legacy adapter.

## Approved product decisions

1. Explicit partial uses remain at their original absolute values after ingredient-total correction and still scale with portions. Relative language remains relative; proven whole uses follow corrected total. Inconsistent allocations get quiet review without blocking cooking. Example: total 200→250 g leaves explicit use 50 g original/75 g at factor 1.5.
2. A checked range resets only when current minimum exceeds the maximum of the requirement captured when the row was checked. Baseline 2–3 stays checked at 3–4 and unchecks at 4–5. Preserve the baseline while checked, so sequential overlapping updates cannot ratchet it forward and hide a cumulative increase. Redundant true/bulk/retry writes do not rebaseline; an actual unchecked→checked transition does.
3. Rows newly created by split or merge start unchecked. Unchanged continuing rows keep checks subject to the approved proven-increase rule; label/locale changes do not imply a new row.
4. Alex confirms no active grocery list during upgrade and says the next list will be new. New recipe-derived rows start unchecked with no inherited old-name checks/baselines. Preserve historical list/check data and extra occurrences/history; do not reinterpret ambiguous historical shared checks as individual acknowledgements. No elaborate active-check conversion or extra decision is required. If assessment unexpectedly finds an active list, stop/report rather than discard it.
5. If a disk reseed is necessary, compare disk/database by stable recipe ID and supported recipe facts before mutation. Alex reports no UI recipe edits and Dreaming synchronization. Verify that expected matching state; stop/report unexpected content or membership mismatches rather than pick a winner. No per-recipe UI-edit conflict-resolution workflow is required solely for hypothetical edits. Preserve household data/IDs, revision safeguards against actual concurrency and input copies.

## Remaining engineering and release gates

Dataset adoption still requires pinned licence text/version/hash, EN/FR exact-match/purchase corpus and governance review. CNF remains a pilot recommendation, not automatic adoption. Public schema/API/client/mock, real PostgreSQL/files/browser and current-format recovery acceptance remain required during separately approved implementation. Conditional fallback is not the default and cannot proceed past an unexpected mismatch without further assessment. The five newly settled product decisions are no longer approval holds.

## Future CI and default-selection requirements

Source observation includes concurrent parity changes, not just committed HEAD: `pwa/package.json:test:e2e:ci` now points at `production-browser.cjs`; `e2e-suites.cjs` now defines all as the four mocked suites and dynamically lists `*-live`. These edits are owned by `restore-local-ci-browser-parity` and are not yet independent verified defaults. Do not copy their implementation or restore old behavior. Parent research about d51222f is historical input where live work differs.

Future apply must:

- Use the parity owner's qualified production build/start path, owned resources and same effective configuration. `task test:e2e:ci -- <spec> --workers=4 --retries=0` is the current proposed focused path; confirm final parity semantics before execution. Development server, inherited BASE_URL or external image does not establish production artifact identity.
- Explicitly cover planning (groceries, servings, prepared and movement), recipes (editor, original/preview/quiet layout), tonight (Home/Cook and instruction recovery), and household (capture/report/recovery) where the slice crosses them. Final mocked qualification uses the four named suites via `task check:push:pwa SUITES='tonight planning recipes household'`; all must mean that exact mocked inventory, never silently include live suites. New browser files must be assigned to their capability inventory during their own future apply.
- Retain static contract + generated-client + stateful method-sensitive mock checks. Every changed DTO/status/SSE transition must agree across GET/PATCH/refresh/late replies. Mock browser passes do not prove PostgreSQL publication or migration.
- Require real isolated PostgreSQL via `task test:database -- --filter ...` for concurrency, guarded content, conversion/resume, report-triggered publication and recovery. Ordinary `task test:api` can skip opt-in PostgreSQL tests. Attribute/environment and actual selected/started/completed counts must demonstrate zero skips for required cases; --passWithNoTests and an empty filter are not evidence.
- Qualify selected real browser/API/DB cases explicitly with the existing `WFS_CALENDAR_LIVE=1` route and owned isolated resources after reviewing harness prerequisites. Merely inventorying a new `*-live.spec.ts` or passing mocked defaults does not run it. Add opt-in migration/recovery seams without enabling real providers or production services. A failure to provision is blocked, never skipped-as-pass.
- Keep deterministic fixed clock/deployment timezone, provider fixtures only at external boundaries, no real AI/translation calls, no production household services. Recompute must assert zero provider calls.
- Report first-attempt pass, retry pass, final failure, skipped, blocked and never-run stages separately. Store source/build/config/tool/platform and exact selected-case identity; hosted CI on the final candidate is distinct from native Mac validation. No cache or earlier waiver can stand in for new contract seams.

The earlier planning reconciliation ran documentation/OpenSpec checks only. Current delivery uses the selected slice and actual candidate-specific evidence; the historical paragraph grants no runtime or completion claim. Broader CI/default changes remain with the parity owner.

## Accepted delivery and release sequence

Reuse the qualified canonical/grocery foundation rather than reopening its completed
slices. The [grocery prerequisite review](grocery-prerequisite-review.md) explains the
historical extraction. Complete outstanding grocery/hosted acceptance on the integrated
candidate without treating local success as hosted success.

Workstream B delivers the ordinary whole-use producer and post-edit reevaluation
through workstream A's canonical publication boundary. A owns shared Save/publication
hooks and remaining intake channels; C proceeds with no-write inventory and bounded
conversion/recovery. Final recovery waits for the persisted baseline contracts, not
for deferred bilingual adoption. The coordinator assigns shared files and integrates
vertical slices before one combined gate. See [proposal](proposal.md) for ownership.

Frontend/backend/database deploy together, with planned downtime using the existing
demo/online-recovery coordination owners and migration's data/draft preservation
policy. Rehearse the process-restart hold, stale-tab refresh, recovery pair and
read-back before operator activation. Full portions completion requires supported
step behavior, prepared/context preservation and applicable real-seam/visual corpus
acceptance; no seeded-only proof or silent allocation-scope reduction.

## Legacy scenario mapping

The former `Change a legacy string` and `Remove or duplicate a legacy row` scenarios map to `Legacy format carries a current revision` and `Refresh an older editing tab` under the accepted no-legacy-write-adapter decision. Their positional adapter behavior is superseded for canonical writes by atomic 409 rejection and draft reconciliation, not marked implemented. Unconverted/review-material editing remains supported; positional identity transfer remains forbidden. Original names are retained here as historical acceptance references.
