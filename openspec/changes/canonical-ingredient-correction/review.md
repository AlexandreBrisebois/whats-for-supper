# Shared dependency, conflict and adversarial design review

Spec-only review at `d51222ffbb7e3eb6d08fed394851a52de3f5522c`, `recipe-view-redesign`, 2026-11-07. No main-capability sync, archive, product changes, commits or production execution. Implementation checkboxes remain unchecked. This replaces earlier assertions that no behavioral choices remained. A structurally valid OpenSpec draft is not approved design or tested product behavior.

## Ownership and dependency graph

| Review unit | Owns | Depends on / can release |
| --- | --- | --- |
| canonical-ingredient-correction | Exact original rows/basis/steps, contentRevision, protected publication, common DTO/editor and canonical projector input | Foundation; never a competing replacement schema |
| restore-dependable-grocery-interactions | Row/check identity, guarded check/bulk operations, reset comparison, no review acknowledgement, focus and category-control interaction | Reusable legacy demand identity can ship before full canonical migration; client/check transition required |
| bilingual-shopping-identity | Saved app food IDs/EN-FR labels, aliases, shopping grouping/units, category scope/provenance | Canonical saved association and grocery row identity; no dictionary-completeness dependency for step scaling |
| scale-cooking-step-ingredients | Revision-bound uses, allocation/rendering, original step editing, coherent cooking refresh and prepared current-recipe reading | Canonical facts; mandatory for complete portions release, independent of dictionary coverage |
| migrate-canonical-recipe-model | In-place conversion, conditional fallback, old-writer fencing, one-time checks and complete current-format recovery | Design begins now; activation requires final persisted contracts of all owners |

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
- New split/merge rows default unchecked rather than invent independent historical purchase intent. This is a proposed structural rule distinct from proven continuing-row increase policy; review before approval.
- Complete current-format manifests simplify recovery semantics but make prior backups intentionally unsupported. Preserve an independently verified old snapshot/executable pair for emergency rollback, not a hidden new-app legacy adapter.

## Consequential choices and approval holds

1. Next product question: after ingredient total 200→250 g, should explicit 50 g step use stay 50 g original (recommended), or be deliberately redistributed? Preserve explicit fractions and update only proven whole uses under the recommendation. Contradictions invalidate dependent numeric rendering. The affected reconciliation implementation is blocked until settled.
2. Approve grocery engineering comparison/continuity contract: exact complete range proof new.min>old.max; unprovable continuing changes preserve checks; new structural split/merge IDs start unchecked. The already accepted proven-increase-only scalar policy is not reopened.
3. At idle-shopping cutover, recommend preserving proven one-to-one old checks and clearing only ambiguous name→multiple-row checks once, with manifest evidence. This does not reconstruct independent historical intent. Final transition task waits for actual affected-set assessment and approval.
4. Dataset adoption requires licence text/version/hash, EN/FR exact-match/purchase corpus and governance review. Recommend CNF pilot, not automatic adoption. This is an engineering qualification gate, not a request to reconfirm import-time AI permission.
5. Only if recipe-only disk fallback becomes necessary: decide disk/live precedence for the concrete divergent set. No default disk-wins decision, and no fallback execution task finalized now.

These holds do not prevent preparing coherent drafts, nonproduction acceptance plans or independent grocery fixes. They prevent describing the complete set as implementation-ready. Tasks explicitly identify unfinalized dependent work rather than silently bake in these choices.

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

This planning session only runs document/OpenSpec checks with explicit paths, avoiding shared browser ports, builds, database containers and concurrent app tests. Future broader CI/default changes need their own authorized tooling scope after parity results settle.

## Recommended review and release sequence

Review shared schema/revisions and holds first; approve bounded units separately from implementation. Dependable grocery interactions can apply/release first using reusable row IDs after check/client gates. Then land canonical facts and guarded capture through the real stack, bilingual saved identity and mandatory step uses in dependency order (the latter two can be independent after the foundation). Rehearse complete in-place migration, client fencing and current-format recovery before activation. Release the full portions outcome only after step scaling, current prepared reading and required integration/visual corpus pass. Production cutover is a separate operator approval with exact candidate and verified recovery packet.
