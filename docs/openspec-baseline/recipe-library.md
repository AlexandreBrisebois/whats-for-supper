# Recipe library baseline plan

## Current checkpoint and scope

Promoted baseline: **55/122 requirements/scenarios** at A84 (2026-10-16).
This covers recorded slices, not the entire capability.
Coverage audit (2026-10-16, BSL-recipe-library-028): **partial capability coverage**;
all seven library deltas are promoted as text, but unextracted operations and
unsupported claims remain. Runtime qualification remains not-run/deferred A34.
Next recommendation: separately select the library-summary read slice (G02);
resolve F01–F04 claim boundaries before treating them as supported guarantees.
No drafting, promotion, archival, implementation or successor is authorized here.
Slice headings and next-step recommendations retained
below are historical; later promotion records supersede earlier draft labels.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

Accepted baseline: [main recipe-library specification](../../openspec/specs/recipe-library/spec.md).

## Capability map and starting points

| Capability / purpose | Candidate scope and rules to recheck | Source starting point | Existing test starting point | Dependencies / initial confidence |
| --- | --- | --- | --- | --- |
| Recipe library: maintain reusable household recipes | Ready/deleted visibility, metadata/ingredients/instructions, ratings/notes, originals/heroes, discoverability, trash/restore/PIN purge, vegetarian recipe fact | [RecipeService](../../api/src/RecipeApi/Services/RecipeService.cs), [detail UI](../../pwa/src/components/recipes/RecipeDetailSheet.tsx), [purge](../../api/src/RecipeApi/Services/RecipePurgeService.cs) | [soft-delete tests](../../api/src/RecipeApi.Tests/Integration/RecipeSoftDeleteIntegrationTests.cs), [detail tests](../../pwa/src/components/recipes/RecipeDetailSheet.test.tsx) | Identity, assets, planning references, indexing / high; cross-store failures medium |

Shared owners and evidence policy live in [workflow.md](workflow.md). Recheck
these source/test starting points before using them as current evidence.

## Recorded decisions for this capability

Shared A01–A05/A07/A09–A12/A34 decisions are in workflow.md. The records below
retain their original scope; completed stages do not authorize successors.

| ID | Decision | State / authority |
| --- | --- | --- |
| A27 | Draft only the member-creation proposal, ADDED household-identity delta, design/tasks and plan/evidence; require 201 OpenAPI alignment and future name uniqueness | User 2026-10-15: “OpenAPI must document 201 as is implemented”; “Name Uniqueness MUST be inforced in the new specs so it gets fixed in future work”; “I authorize the member-creation draft”. Explicit desired-behavior exception to pure baseline extraction. Planning only; no current contract/application/client/SQL/test edits, acceptance, promotion or archival. |
| A28 | Trim names and ignore casing for creation uniqueness; reject duplicates with 409 Conflict | User 2026-10-15 selected “Yes, trim and ignore casing (Recommended)” then “409 Conflict (Recommended)” in separate focused questions. Covers draft behavior and future-work planning only; no implementation or data-remediation authorization. |
| A30 | Apply only member-creation task 2.1 and stop after verification before uniqueness enforcement | User 2026-10-15 explicitly selected task 2.1. Authorizes its 201 contract alignment, generated-client reconciliation, mocks and required tests/verification. No tasks 2.2–2.4, uniqueness/409 implementation, unrelated fixes, archival, commits or staging. |
| A35 | Audit remaining household-identity requirements; proceed to recipe-library only if none remain | User 2026-10-15: “was there anything left under household-identity ? if not then proceed with recipe-library”. BSL-017 finds rename, API removal and Profile switching coverage outstanding. Conditional library progression not activated; recommend rename discovery next. No drafting/application/runtime/lifecycle authority inferred. |
| A37 | Propose only the bounded household-identity member-renaming baseline | User “propose”, 2026-10-15, immediately after the BSL-018 bounded-draft recommendation. Authorizes CLI scaffolding/proposal/ADDED delta/extraction design/tasks and plan. U23/U24 remain non-normative under A12; preserve requested BSL-015 status sentence. Stop at validated draft; no application work, runtime qualification, acceptance, promotion or archival. |
| A40 | Confirm the limited removal-draft boundary and non-normative U25/U26 treatment | User “yes”, 2026-10-15, to “Should the next draft use that limited boundary, keeping U25/U26 non-normative?” Settles successful authorized API deletion and later list absence as draft candidates; FK effects, undocumented errors and browser cleanup remain evidence/limitations. Covers this plan update, not spec generation, application changes, runtime qualification, promotion or archival. |
| A45 | Confirm the Profile-switching boundary and draft only that baseline | User “confirm boundary, proceed to draft”, 2026-10-15, after BSL-024 recommendation. Settles U27/U28 as non-normative and authorizes CLI-scaffolded proposal, four ADDED requirements/eight scenarios, extraction design/tasks and plan. Preserve shared owners and BSL-015 sentence/caveat; stop at validated draft for review. No application/test/contract/client/SQL edits, runtime/database work, acceptance, promotion, archival or successor extraction. |
| A46 | Promote only the Profile-switching delta | User “promote it”, 2026-10-15, immediately after the validated A45 draft. Authorizes exact four-requirement/eight-scenario main-spec append and plan/task status updates. No separate acceptance statement, archival, application/runtime/database work or successor extraction authorized. |
| A47 | Discover/review only ordinary-household recipe-library list visibility and update evidence/plan | User session instruction, 2026-10-15. Trace actual connected caller through generated contract/API/query/store/visible result; inspect assertions and meaningful eligibility, empty/loading/failure paths. Plan/evidence only. No specs, application/test/contract/client/SQL changes, mutations, database access, services, successor capability or lifecycle actions. Stop at findings and one focused drafting recommendation. |
| A48 | Confirm the library boundary and draft only its ordinary-household list-visibility baseline | User “confirmed, proceed to draft”, 2026-10-15, after A47 findings/recommendation. Confirms U29–U31 non-normative treatment and authorizes CLI-scaffolded proposal, nine ADDED requirements/18 scenarios, extraction design/tasks and plan mapping. Preserve shared owners and BSL-015 historical sentence/caveat. Stop at validated draft for review; no application/test/contract/client/SQL changes, services/runtime/database work, acceptance, promotion, archival or successor capability. |
| A49 | Promote only the reviewed recipe-library list-visibility delta | User “promote”, 2026-10-15, immediately after the validated A48 draft. Authorizes creating main recipe-library with the exact Purpose and nine requirements/18 scenarios and updating plan/task status. No separate acceptance statement, archival, application/runtime/database work or successor extraction authorized. |
| A50 | Discover and draft only ordinary-household recipe-library detail reading | User pasted session instruction, 2026-10-15: authorizes read-only connected discovery, CLI scaffolding, proposal, recipe-library ADDED delta, extraction design/tasks and plan updates once supported boundary is established. Stop at validated draft for review. Preserve shared owners/history and withhold unsupported claims; no application/test/contract/client/SQL edits, data mutations/access, services, runtime qualification, acceptance, promotion, archival or successor extraction. |
| A51 | Approve and promote only the recipe-library detail-reading delta | User “I approve, move to propotion”, 2026-10-15, immediately after validated A50 draft. Approves reviewed seven additions/13 scenarios and authorizes exact main-spec append plus plan/task follow-up updates. Preserve original Purpose/list requirements and non-normative evidence. No archival, successor extraction, application changes or runtime/database qualification. |
| A52 | Discover and draft only ordinary-household recipe-library detail editing | User pasted session instruction, 2026-10-15: authorizes connected loaded detail → Edit → supported fields → Save or Cancel → visible result, CLI proposal/delta/extraction design/tasks and plan after source support is established. Keep discrepancies non-normative and all prior evidence/limits; stop with validated draft for review. No application/test/contract/client/SQL edits, mutations, DB access, services, acceptance, promotion, archival or successor extraction. |
| A53 | Promote only the reviewed recipe-library detail-editing delta | User “promote it”, 2026-10-15, immediately after the validated A52 draft. Authorizes exact nine-requirement/17-scenario append to main recipe-library and plan/task follow-up. No separate acceptance statement, archival, successor extraction, application changes or runtime/database qualification authorized. |
| A54 | Discover and draft only ordinary-household recipe-library ratings and notes | User pasted session instruction, 2026-10-15: authorizes loaded library detail → rating/notes controls → supported submission/persistence → visible result; CLI scaffolding, proposal, ADDED delta, extraction design/tasks and plan updates after source support. Preserve prior evidence/history, keep discrepancies non-normative, stop at validated draft for review. No application/test/contract/client/SQL edits, mutations, database access, services, acceptance, promotion, archival or successor extraction. |
| A55 | Promote reviewed ratings/notes delta and provide the next-spec prompt | User “promote this spec, then produce the prompt for me to generate the next spec”, 2026-10-15. Authorizes exact six-requirement/15-scenario main append and plan/task follow-up, plus a next-session prompt. Preserve original Purpose/prior requirements and delta/evidence. No archival, successor extraction execution, application changes or runtime/database qualification. |
| A56 | Discover and draft only ordinary-household loaded-library-detail discoverability controls | User attached session instruction, 2026-10-15: authorizes connected discovery, CLI scaffolding, bounded proposal/recipe-library ADDED delta/extraction design/tasks and plan updates once source-supported boundary is established. Preserve all prior evidence/history, keep discrepancies non-normative and stop at validated draft for review. No application/test/contract/client/SQL edits, mutations, database access, services, acceptance, promotion, archival or successor extraction. |
| A57 | Promote only the reviewed loaded-detail discoverability delta | User “promote”, 2026-10-15, immediately following the validated A56 draft. Authorizes exact six-requirement/13-scenario main recipe-library append and plan/task follow-up. Preserve original Purpose, prior main bytes, full delta/evidence/history and all eight active changes. No separate acceptance statement, archival, successor extraction, application changes or runtime/database qualification inferred. |
| A58 | Discover and draft only ordinary-household loaded-detail View Original | User session instruction, 2026-10-15: authorizes connected loaded detail → View Original availability/activation → source URL or photo viewer → navigation/dismissal/result; CLI scaffolding, proposal, ADDED delta, extraction design/tasks and plan updates after source support. Preserve prior evidence/history, keep discrepancies non-normative, stop at validated draft for review. No application/test/contract/client/SQL edits, mutations, database access, services, acceptance, promotion, archival or successor extraction. |
| A59 | Promote only the reviewed loaded-detail View Original delta | User “promote”, 2026-10-15, immediately following the validated A58 draft. Authorizes exact seven-requirement/18-scenario main recipe-library append and plan/task follow-up. Preserve original Purpose, prior main bytes, full delta/evidence/history and all nine active changes. No separate acceptance statement, archival, successor extraction, application changes or runtime/database qualification inferred. |
| A60 | Discover and draft only ordinary-household recipe deletion (Move to Bin / soft-delete), Recycle Bin listing, recipe restore, and PIN-protected permanent purge | User session instruction, 2026-10-15: authorizes connected loaded detail → Move to Bin / browse header Recycle Bin → trash listing → restore or PIN purge; CLI scaffolding, proposal, ADDED delta, extraction design/tasks and plan updates after source support. Preserve prior evidence/history, keep discrepancies non-normative, stop at validated draft for review. No application/test/contract/client/SQL edits, mutations, database access, services, acceptance, promotion, archival or successor extraction. |
| A61 | Promote only the reviewed recipe deletion, Recycle Bin, restore, and PIN purge delta | User “promote”, 2026-10-15, immediately following the validated A60 draft. Authorizes exact 11-requirement/28-scenario main recipe-library append and plan/task follow-up. Preserve original Purpose, prior main bytes, full delta/evidence/history and all ten active changes. No separate acceptance statement, archival, successor extraction, application changes or runtime/database qualification inferred. |

## Discrepancies and qualifications

These are implementation-supported/static findings, not runtime guarantees.
Cross-capability entries are included where the selected evidence depends on them.

| ID | Finding / risk | Evidence and required extraction treatment | Status / withheld claim |
| --- | --- | --- | --- |
| U13 | Existing-member recovery has contract and qualification limits | BSL-household-identity-001: `/api/family/me` implements 404 absent from OpenAPI; browser mock supplies success without identity; UI does not await all selection writes. Withhold universal persistence/recovery guarantees; no fixes authorized. | Open; rechecked 2026-10-15 |
| U14 | Cookie authentication is incompletely represented in OpenAPI security metadata | BSL-household-identity-004: API accepts `h_access`; root security declares only raw header/Bearer alternatives, stream prose mentions cookie. No contract edit or blanket parity claim authorized. | Open; discovered 2026-10-15 |
| U15 | API rejection and cookie/configuration recovery lack a universal flow | BSL-household-identity-003–005: browser adapter adds no shared credential header/cross-origin credentials override; serverFetch throws, Home logs; no central 401 re-login/clearAuth caller found. Secret agreement, cookie domain/Secure deletion, origin delivery and interrupted retries unobserved. Withhold universal recovery/transport guarantees. | Open; discovered 2026-10-15 |
| U19 | Creation operation and validation contract diverge (historical; BSL-014 supersedes current status) | BSL-010/012/013 historically recorded 201 alignment under A30; BSL-014 confirms current OpenAPI 201/409 and matching controller branches. Current generated-client parity/live qualification is not-run. OpenAPI length/400 and generated optional/null-name gaps remain non-normative; no complete validation-parity claim. No contract/client/application edits in drafting. | 201/409 present in current source (BSL-014); current runtime/parity not-run; other validation gaps open |
| U20 | Creation failure clears input; Settings omits request error | BSL-009/011: store catches and returns null, form then clears name; onboarding shows store alert but Settings does not render it. Cancel unmounts local state without aborting request. Withhold retained-input and universal retry/error-feedback claims. | Open; retained non-normatively in A27/A28 draft, no fix authorized |
| U21 | Creation and identity handoff are separate; repeated creation is unguarded | BSL-009–012: save precedes append/cookies; callback and later selection promises are unawaited. No rollback, idempotency key or busy guard. A27/A28 explicitly require trimmed case-insensitive uniqueness/409; BSL-014 now traces enforcement in dirty source, without current runtime qualification. Uniqueness does not imply atomic handoff, exactly-once delivery or universal recovery; those limits remain non-normative. | Uniqueness/409 intent settled A27/A28; enforcement now source-supported (BSL-014), runtime unqualified; handoff/retry gaps open |
| U22 | Member-creation lifecycle/completion record diverges from plan and evidence | BSL-014/015: archive exists and tasks 2.1–2.4 are checked; A30 records task 2.1 only and no member-creation archive authority. Existing finish record has database-behavior blocked, excludes service/controller/SQL and archive tasks, and does not evaluate task acceptance. No later authorization established here. BSL-015 confirms 7/21 delta/main equality, stale task-specific hashes, and three broken archive links; user requires quoted limitation in future spec. Preserve artifacts pending later authorization provenance and required qualification. | Deferred under A34; user reports later authorization, original instruction/reference pending; no new archival or verified implementation acceptance; independent requirements discovery may proceed |
| U23 | Rename contract and persistence limits differ | BSL-018: PUT documents only 200, while service/middleware support blank 400/missing 404. DTO/contract omit length bounds; SQL varchar(100) and current unique-name index affect rename without creation-style duplicate translation. No own-name authorization comparison. | Non-normative in A37 draft; validation/duplicate/authorization guarantees withheld; no repairs or database qualification |
| U24 | Rename edit completion obscures failure and pending keyboard paths remain active | BSL-018: store catches failure and resolves; editor closes, Settings omits store error. Input/Enter/Escape remain active while Save/Cancel disable; no guard/cancellation/idempotency. | Non-normative in A37 draft; universal error recovery, retained input, pending lock and atomic cancellation guarantees withheld |
| U25 | Removal errors/security metadata and referenced-member effects exceed the settled API contract | BSL-020: DELETE documents only 204 and member-header security; actual shared-access gate, missing-ID 404 and generic provider 500 differ. EF/SQL declare cascades/nulling, including a SQL-only maintenance requester FK and unconstrained deleted_by. InMemory tests cover unreferenced success/missing UUID only; installed schema unqualified. | Extraction treatment settled A40: non-normative under A12; behavior/qualification gaps remain. No repairs; DB qualification deferred A34, not an extraction gate |
| U26 | Removal helper is disconnected and cleanup/recovery is partial | BSL-021: no UI caller; exact-ID cleanup after API save can fail with stale local state, domain deletion unqualified. Direct API leaves cookies/stores; validator needs nonempty list and does not await clearing. Mock DELETE does not mutate list and mock me returns synthetic success. | Extraction treatment settled A40: non-normative; behavior/qualification gaps remain. Withhold connected deletion journey/atomic or universal recovery guarantees |
| U27 | Profile selection completion and failure/pending paths are not coordinated | BSL-024: Profile does not await selection before completion/Home push; store awaits server cookie, attempts readable fallback, then sets ID. No selection busy flag, caught rejection, rollback, post-selection cancellation or success/error UI. Menu dismissal only precedes selection. | Extraction treatment confirmed A45: non-normative under A12; underlying gaps remain. Withhold atomic handoff, pending lock, retained/rolled-back state and universal recovery guarantees; no repairs |
| U28 | Profile list freshness, recovery and switching qualification are limited | BSL-024: hasLoaded can reuse prior/error list; opening/selection makes no fresh member lookup. Profile omits list-error/empty feedback. Existing gate/recovery limits U13/U26 apply. Tests stub menu or preseed identity; none asserts real Profile option switching. | Extraction treatment confirmed A45: non-normative under A12; underlying gaps remain. No fresh server eligibility, new-identity Home arrival, durable/cross-tab/device synchronization or runtime-qualified switching claim |
| U29 | List readiness prose/summary descriptions and badge mocks exceed local enforcement | BSL-recipe-library-001: list trusts stored IsReady, not name/image/synthesis formula; summary schema omits readiness; mocked importIssue is not populated by list MapToDto. Uppercase explore controller/service branch differs; connected caller uses lowercase. Withhold derivation/enrichment/case-equivalence claims; no repairs. | Extraction treatment confirmed A48: non-normative under A12; underlying discrepancies remain |
| U30 | Empty and failure/recovery paths differ by mode/request stage | BSL-recipe-library-002: All empty array uses EndCard; Discovery empty has no explicit feedback. Initial summary/list failure shows Retry; append failure only sets unused flag, retaining cards. No focused loading/error/retry unit assertions; browser empty assertions use mocked stack mode. | Extraction treatment confirmed A48: non-normative gaps; supported initial feedback drafted, universal recovery withheld |
| U31 | List paging/freshness and stale-request handling are limited | BSL-recipe-library-002: separate summary/count/page reads, cached All total, offset paging without final ID tie-breaker; relevance key lacks generation and errors/finally lack relevance guard. Fixed mocked pages/custom events do not prove complete fresh pagination or synchronization. | Extraction treatment confirmed A48: non-normative; fresh/complete/stable/concurrent paging guarantees withheld, no repairs or runtime qualification |
| U32 | Detail predicates and missing-record response differ from list assumptions | BSL-recipe-library-004: FindAsync uses no readiness/discoverability/attribution predicate; fresh query has global non-deleted filter but tracked entities can bypass another filtered lookup. Missing record throws middleware 404 while GET documents only 200. | Non-normative under A12/A50; no universal deleted exclusion, not-ready rejection or error-contract repair; DB qualification deferred A34 |
| U33 | Detail failure/recovery and replacement-state limits | BSL-recipe-library-005: new-sheet failure logs then null recipe keeps loading text, no error/Retry; malformed envelope throws; replacement-ID failure can expose old recipe, cleanup ignores late state but does not abort transport. | Non-normative under A12/A50; pending feedback/close only drafted, universal recovery/freshness/synchronization/cancellation guarantees withheld |
| U34 | Detail content/asset completeness and assertions are limited | BSL-recipe-library-004/005: metadata optional, instructions mapped but not inline; raw metadata need not match array contract, ingredients may be legacy raw text, hero URL is a reference only. Stubbed/mocked tests do not qualify persistence/content completeness/image delivery. | Non-normative under A12/A50; no cooking-mode extraction, missing-content synthesis, full-content or delivery guarantee; no repairs |
| U35 | Draft normalization/defaults differ from stored facts | BSL-008 steps 2–7/9: blank cuisine becomes null and server ignores it, though successful local snapshot hides the badge; draft meals default category/Supper and are submitted even untouched. Local name/nonempty-meal eligibility exceeds DTO validation; empty API meal array stores empty and sets Category only. | Non-normative limitations; no durable cuisine-clear, synchronized category or universal server validation claims; no repairs |
| U36 | PATCH response and mock shapes diverge from contract | BSL-008 step 9/BSL-009: OpenAPI/generated PatchResponse expects data object; actual RecipeDetailResponseDto is unwrapped by filter exemption. Adapter ignores it. Browser routes/common mocks return stateless success and miss persistence/refetch. Missing-record 404 undocumented. | Non-normative; no envelope/reconciliation guarantee, contract/client/mock repair or runtime qualification |
| U37 | Save completion/failure/pending boundaries do not provide transactional or fresh-state guarantees | BSL-008 steps 8–10: commit before caught index trigger and uncaught recipe.info write; Save success uses captured snapshot, no refetch/list callback; inputs/dismissal remain available pending. Tests omit focused reject/retry/normalization/discard/pending assertions. | Non-normative; no rollback, atomic refresh, cancellation, idempotency, concurrency, library freshness/sync or index/event completion claims; retain supported feedback only |
| U38 | Notes timer compares against the original loaded snapshot rather than the last submitted value | BSL-recipe-library-012 steps 4–5: later original text can suppress a restoring PATCH; unstarted timers clear on dependencies/unmount without flush. Saved-removal timer lacks unmount cleanup. | Non-normative under A12/A54; no every-edit durability, flush-on-close, dispatched transport cancellation or lossless reopening guarantee; no repairs |
| U39 | Rating is optimistic and Saved marks dispatch; failure/overlap recovery is absent | BSL-012 steps 3–5/10: no await before Saved, notes void request, rating promise discarded by click; no save-error UI/catch/rollback/automatic retry/pending guard. Multiple requests can overlap; local recipe snapshot does not reconcile. | Non-normative under A12/A54; no confirmed Saved, automatic recovery, safe retry, request ordering, idempotency, freshness/library synchronization guarantee |
| U40 | Rating/notes contract/error and actual assertion boundaries remain limited | BSL-012 steps 6–9 and BSL-013: supported range agrees, but PATCH 400/404 undocumented; response-envelope U36 persists. Browser notes test is Search/stateless; range unit tests are direct; no focused rating/clear/storage/null/timer/error/close assertion. DB save precedes file failure possibility. | Non-normative; no disputed HTTP/envelope, atomicity or runtime-qualified persistence claim; source-supported successful storage remains extractable A10/A34 |
| U41 | Detail discoverability optimism/pending/restoration is local; close/overlap recovery remains limited | BSL-recipe-library-016 steps 4/8/9: disabled button but no handler reentry guard, catch !next/finally, no visible error/automatic retry/abort/generation guard, no setRecipe/GET/library callback. Reopening uses existing GET. | Non-normative limits under A12/A56; supported same-detail/no-intervening-change display/restoration is drafted, without storage rollback, safe retry, freshness, sync or request-order guarantee |
| U42 | Discoverability DB update is not propagated by the connected recipe.info writer | BSL-016 steps 6–7: flag SaveChangesAsync, caught index attempt, then uncaught file read/write with all metadata arguments null; ImageService does not assign RecipeInfo.IsDiscoverable. Controller/DTO broad disk-sync comments overstate this path. | Non-normative discrepancy; no repair, file parity, atomicity, persistence rollback or index/event completion requirement |
| U43 | Discoverability PATCH assertions and contract/error coverage are limited | BSL-017: stateless Search browser asserts any boolean/body plus open sheet; component visibility/shared-card label assertions only, no inspected flag-storage/recovery qualification. U36 envelope mismatch/undocumented 404 persists; auth-disabled InMemory/store/orchestrator substitutions. | Non-normative; source-supported subset extractable A10/A34; no disputed HTTP/envelope or runtime-qualified persistence claims |
| U44 | Absent source URL fallback in URL-type recipes opens photo viewer with zero images | BSL-recipe-library-020 step 4: when `sourceType === 'url'` but `sourceUrl` is null or empty, activation falls back to `setShowOriginals(true)`. For typical URL imports with zero original images, the viewer mounts with `imageCount: 0`, displaying counter `1 / 0`, requesting `/api/recipes/{id}/original/undefined`, and navigation modulo produces `NaN`. | Non-normative edge-case limitation; withhold zero-image recovery or fallback URL guarantees |
| U45 | External URL navigation does not guarantee external page loading or popup permission | BSL-recipe-library-020 step 4: `window.open(recipe.sourceUrl, '_blank', 'noopener,noreferrer')` requests browser navigation to an external context without changing current application page state or validating URL reachability. Popup blockers or browser restrictions may prevent opening. | Non-normative limitation; supported browsing-context request only drafted, external success withheld |
| U46 | Original photo asset serving uses anonymous access and native image failure handling | BSL-recipe-library-020 steps 7–8: GET `/api/recipes/{id}/original/{index}` is marked `[AllowAnonymous]` with no OpenAPI security requirement. The photo viewer uses native `<img>` without custom loading spinners or error banners; 404 responses or failed transfers rely strictly on native browser image rendering. | Non-normative discrepancy; no custom image error feedback or retry UI extracted |
| U47 | Original photo viewer test assertions omit gesture, keyboard, zoom and navigation paths | BSL-recipe-library-021: component and browser tests assert button visibility, label and viewer opening against mocked fixtures only. Photo ordering, chevrons, keyboard shortcuts, wrapping, pager dots, zoom toggling, touch pinch clamping, and drag panning are not asserted. | Non-normative; source-supported subset extractable under A10, runtime/cross-device gesture qualification deferred under A34 |
| U48 | Move to Bin activates immediately without confirmation; deletion failure is logged without user-facing feedback | BSL-recipe-library-024 steps 1/4: ActionGearMenu triggers onMoveToBin directly without a confirmation prompt or dialog. If deleteRecipe fails (e.g. 409 Conflict due to active planner assignment, or network error), the error is logged to console.error and no user-facing toast or error banner is displayed; the detail sheet remains open with the recipe unchanged. | Non-normative limitations under A12/A60; supported immediate dispatch and sheet retention drafted, user error notifications and confirmation safeguards withheld |
| U49 | Soft-deleted recipes are excluded by global query filter; delete/restore/purge omit real-time SSE broadcasts | BSL-recipe-library-024 steps 3/5/7: RecipeDbContext configures HasQueryFilter(e => e.DeletedAt == null), excluding deleted recipes from GET /api/recipes, search, and detail reads (returning 404). Neither soft-delete, restore, nor purge triggers an SSE event broadcast. Multi-client synchronization relies on manual or route-driven query refreshes. | Non-normative; supported filter and re-search behaviors drafted, real-time multi-device sync guarantees withheld |
| U50 | RecycleBinSheet lacks dedicated unit tests and relies on mocked container and E2E coverage | BSL-recipe-library-025: there is no RecycleBinSheet.test.tsx in the repository. Component coverage relies on browse-all-stack/page.test.tsx (which mocks RecycleBinSheet with a stub div) and Playwright E2E tests (search-hardening.spec.ts and browse-all-stack.spec.ts). | Non-normative testing gap; source-supported implementation extracted under A10, runtime qualification deferred under A34 |
| U51 | Permanent purge collapses distinct API error responses into a single generic UI message | BSL-recipe-library-024 step 9: when purgeRecipe fails with non-2xx status (403 invalid PIN, 503 PIN not configured, 409 not in trash, 404 not found), RecycleBinSheet displays a single generic error message ("Incorrect PIN or permanent delete is not available.") without distinguishing the underlying cause. | Non-normative UI limitation; supported error display drafted, distinct error recovery withheld |
| U52 | Calendar event cleanup is asymmetric between soft-deletion and permanent purge | BSL-recipe-library-024 steps 2/9: SoftDeleteRecipe checks only future/today calendar events (Date >= today) and rejects with 409 Conflict if found, leaving past events untouched. In contrast, PurgeAsync cascades and removes all calendar events (both past and future), votes, search documents, and filesystem directory assets unconditionally. | Non-normative asymmetry; exact behavioral boundaries drafted without repair |

## Slice evidence and lifecycle records

## Promoted slice — recipe-library ordinary-household list visibility

A34 changes the work sequence: continue brownfield requirements discovery while
implementation and real-database qualification wait for a later explicitly selected
session. A10's accepted source-evidence standard applies; a database instance is
not required to inspect implementation/test assertions or produce an authorized
requirements draft with runtime limits clearly recorded.

A35 originally queued this after the remaining identity slices. A46 promoted the
last identified identity slice; A47 selected discovery only. A48 confirms its
bounded drafting recommendation and authorized the draft. A49 separately promotes
only that reviewed delta; the change remains active.

A47 discovery scope (now drafted under A48): ordinary-household recipe-library list visibility,
covering ready/non-deleted eligibility and the connected list's observable outcome.
Start at the actual connected caller and `RecipeService.GetRecipesList`, follow
its approved contract/client and persistence query, and inspect the assertions and
substitutions in the relevant tests. Keep search ranking, capture processing,
recipe editing, restore/purge and deployment variants outside this slice. These
were discovery targets under A47. The two evidence entries below preserve that
review; A48 and BSL-recipe-library-003 record the separately authorized draft.
No uninspected capability or placeholder spec is created.

Member-creation BSL-014–016/U19–U22 remain available as historical evidence and
unresolved limits. Deferral neither accepts checked implementation tasks nor
reopens/moves the archive. The user's report of earlier authorization is retained;
its original reference can be reconciled later without blocking this independent
slice. The required future-spec status sentence in BSL-015 is preserved as a dated
historical limitation, with any later status change explained alongside it.

### BSL-recipe-library-001 — connected library list, eligibility and returned items

**Authority / identity:** A47, discovery/review and plan edits only. Branch
`moving-to-openspec`, HEAD `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`.
Initial Git status includes staged API/SQL/contract/client/identity work, staged
and unstaged plan/main-identity edits, three untracked active identity changes,
and the staged deletion of background-task-navigation. Preserve all of them.
`api/database/schema.sql`, `specs/openapi.yaml` and `pwa/e2e/mock-api.ts` are dirty
inputs, not this session's edits or newly qualified implementation. Current files,
including those inputs, were inspected. Reuse BSL-001–005 identity evidence and
A04 ownership; no repeated access-policy extraction or lifecycle reconsideration.

**Name / purpose / actor:** Recipe library lets a person using the ordinary
household app browse reusable recipes. “List” here is the grid of named recipe
buttons in the Browse Library overlay, not Search results, a notifications queue,
or the discovery voting surface.

**Ordered connected trace:**

1. `pwa/src/components/home/HomeCommandCenter.tsx` renders
   `BrowseLibraryTrigger` from `HomeSections.tsx`: “Browse your library” links via
   `pwa/src/lib/constants/routes.ts` to `/browse-all-stack`. The Search page's
   empty-result “Browse Library” link reaches the same route. Its normal results
   instead use `searchRecipes`/POST search; no search policy is extracted here.
2. `pwa/src/app/(app)/browse-all-stack/page.tsx` (`BrowseAllStackPage`) offers
   “Show recipe cards” and “Show recipe list”. A loaded selected member's list
   preference can choose the initial list view; otherwise stack is the fallback.
   Member-preference resolution/persistence belongs to **member preferences**;
   record only the locally selected presentation and page size. No preference
   policy draft or mutation executed. `(app)/layout.tsx` recognizes this overlay
   and labels `/recipes` as Search, corroborating the surface distinction.
3. There is no intervening list hook or `getRecipes` adapter call here:
   `fetchLibraryData` calls the generated `apiClient` directly. First it awaits
   GET `/api/recipes/library-summary`, then GET `/api/recipes` with
   `order=explore`, `page=1`, `limit=12` in list mode (`20` in stack), and
   `discoverableOnly=false` initially. The All/Discovery control refetches page 1
   with the boolean flipped; view changes also refetch page 1. No ID/name/URL,
   member, rating, category or review filter is sent by this list journey.
4. `pwa/src/lib/api/api-client.ts` configures Kiota's FetchRequestAdapter and
   relative/configured base URL. Its provider adds selected-member ID (cookie
   fallback) and optional SSE/move headers. Existing **household-identity** main
   requirements “Gate protected page entry with household access”, “Apply member
   context after household access”, “Authenticate protected API requests
   independently” and identity resolution/recovery own access/context. List has
   no member binder, per-member eligibility query or `AddedBy` restriction. This
   is the configured household database's eligible collection, not a claim of
   tenant isolation or personal recipe ownership. Existing U13–U15 still apply.
5. `pwa/src/lib/api/generated/api/recipes/index.ts` GET request metadata targets
   `/api/recipes` and deserializes `RecipeListResponse`; `specs/openapi.yaml`
   GET operation documents ready/non-soft-deleted records, explore order,
   optional discoverable filtering, page/limit and unwrapped 200 response.
   `generated/models/index.ts` maps `recipes`, `pagination` and `updatedAt` to
   DTOs. Generated error metadata maps 400; no blanket recovery guarantee follows.
6. `api/src/RecipeApi/Controllers/RecipeController.cs` `List` passes arguments to
   `RecipeService.GetRecipesList`, returning `Ok` with `SkipWrapping`. The query
   in `api/src/RecipeApi/Services/RecipeService.cs` requires
   **`DeletedAt == null && IsReady`**. `RecipeDbContext` also has a non-deleted
   global Recipe query filter. `discoverableOnly == true` adds `IsDiscoverable`;
   false does not mean only non-discoverable. No image/name/synthesis check is
   recalculated here. These are stored facts; readiness production is outside
   capture-processing scope, and no installed database state is qualified.
7. Persistence is EF `db.Recipes`, mapped by `Models/Recipe.cs` and
   `Data/RecipeDbContext.cs` to `recipes` (`is_ready`, `deleted_at`,
   `is_discoverable`, `last_cooked_date`, `created_at`). `api/database/schema.sql`
   declares readiness false/non-null and nullable deletion time. `AddedBy` is
   nullable attribution, not a list filter. No persistence write occurs on GET.
8. Count is taken after eligibility/filtering; page is at least 1 and limit is
   clamped to 1–100. Connected lowercase explore orders never-cooked first,
   then oldest `LastCookedDate`, then descending `CreatedAt`. Skip/Take returns
   one offset page. Equal sort keys have no final ID tie-breaker. Default newest
   order and exact duplicate-check filters exist but are not connected requests
   from this list and are not additional extraction slices.
9. `MapToDto` returns persisted ID/name/time/flags and derived hero URL plus
   other DTO facts. `Dto/RecipeListResponseDto.cs` returns `updatedAt`, `recipes`
   and `pagination` (page/limit/filtered total); `updatedAt` is response-time UTC,
   not a freshness/synchronization token. The page casts returned records to
   `RecipeDto[]`, calls `browseStackStore.setRecipes`, and renders every loaded
   record via `recipes.map` in `browse-list-grid`: named button, hero URL and
   formatted time. No client readiness/deletion refilter or `mapToRecipe` adapter
   runs here. A card requests the detail sheet; detail behavior is outside scope.
   `libraryStore.ts` is a notification queue, not this list's record store.

**Agreement / discrepancies:** Server predicate and the contract's ready/non-deleted
headline agree. Contract/generated prose additionally describes name plus images
or synthesis; this method trusts `IsReady` and does not enforce that derivation.
Do not draft the descriptive formula as a list invariant (U29). Summary schema
prose describes non-deleted totals without readiness, while `GetLibrarySummary`
also requires `IsReady`. Record this adjacent dependency mismatch; no repair.
The controller accepts explore case-insensitively but service branching is exact
lowercase; the connected generated request sends lowercase. Uppercase equivalence
is excluded, not accepted as another ordering promise. `MapToDto` does not populate
`ImportIssue` in this list path, although the page supports a badge and a unit mock
supplies one. No badge-enrichment requirement is supported by that mock (U29).

**Shared ownership / main comparison:** CLI main inventory contains only
household-identity (36 requirements/92 scenarios); no library main requirement
exists to duplicate. A04 gives library ownership of readiness/deletion/provenance
and persisted facts, identity ownership of access/member context, and member
preferences ownership of browse preference. This slice consumes those boundaries;
it does not extract provenance derivation, preference rules, capture processing,
search ranking, editing, restore/purge or demo/preview/deployment behavior.

**Disposition / confidence:** Candidate source-supported baseline, medium overall.
High confidence in the static predicate and connected lowercase request/render
path, reduced by substituted tests and U29–U31. No runtime-verified claim.
No requirement/scenario mapping yet: no draft authorized or generated.

### BSL-recipe-library-002 — paging, pending, empty and failure/recovery limits

**Connected outcomes:** Initial load and All/Discovery or view-mode reload show
“Loading your library…” with a spinner, suppressing list cards while pending.
A successful first response replaces the store and resets current index. In All
mode a successful empty returned array (not `total == 0`) shows `EndCard isEmpty`
with “Your Library is Empty” and “Add New Recipe” linking to `/capture`. This
names the eligible visible collection, not proof that the DB contains no pending
or deleted recipes. The similarly named `BrowseAllEmptyState.tsx` is not used
by this page. Discovery-mode empty results do not meet `isEmpty` and have no
explicit empty-result message in this render path (U30).

For All mode, `effectiveTotal` prefers the separately obtained summary total;
Discovery uses the list's pagination total. Summary is awaited before first-page
fetch and is not fetched on append. `hasMorePages` uses `page * pageSize < total`.
List scroll within 600px of the bottom, IntersectionObserver with the list root
and 600px margin, or the connected custom load-more event can request the next
page. Pending/in-flight/no-more guards apply. Successful append preserves prior
records, adding only previously unseen nonempty IDs in response order via
`browseStackStore.appendRecipes`. Initial replacement does not deduplicate.
Unmount resets this transient store. This is observed implementation structure,
not proof all pages are reachable, totals are fresh or concurrent updates cannot
skip/duplicate records. Summary/count/page reads are separate with no common
snapshot. Same page/filter/view requests share the relevance key; there is no
unique request generation, and catch/finally do not check relevance (U31).

If summary or initial recipe fetching throws, the page shows “Failed to load
recipes.” and Retry. Retry invokes page 1 for the current All/Discovery mode,
including summary again; while pending loading is shown, and a successful result
replaces the list. A summary failure prevents the list request. This local retry
control is source-supported; no promise of successful authentication recovery,
automatic retry or service availability. Append failure leaves loaded cards and
page/total state, sets `prefetchFailed` and ends the spinner; that flag is not
rendered or used to block paging. Another qualifying trigger may request the same
next page, but there is no visible list append-error/Retry control (U30). No new
synchronization, persistence, cross-tab/device or universal recovery claim.

**Actual assertions / substitutions inspected (not executed):**

| Test input | Assertions and limits |
| --- | --- |
| `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs` | `GetRecipes_Excludes_NotReady_Recipes` directly seeds ready, unnamed pending-photo and named not-ready URL rows, then asserts ready ID present and both pending IDs absent. Explore exclusion test seeds active/deleted-ready rows and asserts inclusion/absence. Never-cooked/oldest-cooked tests assert seeded relative positions; they do not assert equal-key stability or every page. Paginated-list/default-order tests assert 200/envelope keys, not complete data or default ordering. Duplicate-filter tests are separate callers, not this UI's policy. |
| `api/src/RecipeApi.Tests/Integration/RecipeSoftDeleteIntegrationTests.cs` | `Delete_Removes_Recipe_From_Active_Library` seeds ready, issues DELETE, then asserts list 200 and UUID absent from response text; it does not assert DELETE status in that test. Inspected only; no deletion executed this session. |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | These test classes call default `CreateAsync`: TestServer, EF InMemory, InMemory recipe store and mocked orchestrator; auth omitted by default. Seeded eligibility is not real readiness processing, PostgreSQL query/schema qualification or household access verification. |
| `pwa/src/app/(app)/browse-all-stack/page.test.tsx` | Mocks generated API, router and motion; preloads family state. Mount asserts summary call and explore/page 1/20; loaded list preference asserts grid, no stack and limit 12. List append asserts five cards from overlapping mock pages. A 100-item test manually fires custom events and asserts first/last/length plus nine calls. Scroll test defines synthetic element dimensions and asserts page 2/3 requests, final ID and no-more flag. Fixtures omit `isReady`/`deletedAt`, return limit 20 even for list-12 requests, and include a non-GUID ID. These demonstrate consuming supplied records, not server eligibility or contract-valid integration. No focused initial loading/rejected-summary/rejected-list/retry/empty/append-failure assertion in this file. |
| `pwa/src/store/browseStackStore.test.ts` | Real store tests assert replacement/empty, append, duplicate-ID suppression and reset to initial state. Isolated store assertions do not prove pagination completeness or server policy. |
| `pwa/e2e/browse-all-stack.spec.ts`, `fixtures.ts` | Home trigger asserts overlay; list mode asserts restored grid, switch/re-entry grid and 12 then 13 cards after scroll. Setup supplies access/member cookies and localStorage family state, intercepts family/preferences/summary/list; list route slices fixed arrays and does not itself enforce readiness/deletion or discoverable filtering. Empty tests assert empty marker, capture navigation and no end marker in default stack mode, not a live empty DB or list-mode failure. Fixed time/common mocks/unhandled API blocking; no backend persistence exercised. |
| `pwa/e2e/browse-stack.spec.ts` | Mocked Home entry/card/detail/exit and toggle text plus visible card; changing “All” to “Discovery” does not prove filtered membership. No search-ranking or editing assertion reused as library eligibility evidence. |

**Check/evidence status:** Read-only store/root/change/spec discovery passed:
no stores; nearest root `/Users/alex/Code/whats-for-supper`, three active promoted
identity changes, only household-identity main. Source/assertion review is
implementation-supported under A10. API/browser/PostgreSQL/runtime checks are
**not-run** under A34 and explicit session scope, not newly blocked. Behavior TDD,
application verification/client regeneration and lifecycle actions are
**not-applicable** to this plan-only edit. Final strict/documentation/content and
index/preservation outcomes are recorded in the session response/current harness.

**Discovery recommendation — confirmed and drafted under A48:** Confirm a future bounded
recipe-library draft covering the connected entry/list control, ready/non-deleted
server visibility, All/Discovery list filtering, connected explore order and page
shape, display/append of successfully returned items, loading, All-mode empty
feedback and initial-load Retry. Reference household-identity's existing access
requirements and member-preference ownership; keep U29–U31 non-normative under
A12. Withhold readiness derivation, badge enrichment, fresh/complete/stable paging,
Discovery-empty feedback, append-error controls and universal recovery promises.
Drafting, acceptance, promotion and archival remain separately authorized actions.
Any future authorized spec must retain BSL-015's exact historical sentence with
its dated caveat; A34 qualification deferral is not an A10 extraction blocker.

**Inspected content identity:** 33 inputs listed below; SHA-256 of sorted
`path + space + file SHA-256 + newline` entries:
`97085b7ddecce1a829f44c66319fc08802a1c0c9cdb8e732a5c8c76f28456cff`. This is source review identity,
not tested runtime identity. Per-file digests support the next bounded recheck.

| Input | SHA-256 |
| --- | --- |
| `api/database/schema.sql` | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs` | `903493f2d741b315edf8ca44a83c5083500f70c9d30117c89db979ca805ff385` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Integration/RecipeSoftDeleteIntegrationTests.cs` | `8e1ff689f91286891f542b75ca0ba789e88764c984b0cef583e9d32628fb7513` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/src/RecipeApi/Dto/PaginationDto.cs` | `6097e087868a86326ecc81e38b73ccf176ff711dfd6ba0606ec3fb0009a718b2` |
| `api/src/RecipeApi/Dto/RecipeDto.cs` | `45f2c035b157b448dfa6d4ba399262492585b795fa60704e147a758c76d9eb1d` |
| `api/src/RecipeApi/Dto/RecipeListResponseDto.cs` | `12133f1a77a9a77d5387da2cc7f932d89b7aa157db7295f8a7379c59cff38ab1` |
| `api/src/RecipeApi/Models/Recipe.cs` | `810b9ddb9bdcacdb894d713680952f5a32c89256070366dff99b3c16f82bbe82` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `openspec/specs/household-identity/spec.md` | `bbf4dc2eaf241f573307cba356b3b9cacce340b31d6249520af02b140b54479b` |
| `pwa/e2e/browse-all-stack.spec.ts` | `d2e018bbd27f2324dfed9f9e4e654e5deaf06f266f56dbcb64a5a4a883bab90a` |
| `pwa/e2e/browse-stack.spec.ts` | `981326df9fd24dc06b1a4640d005c32564b34de1932b2d40a80ba0ffb6e7aca6` |
| `pwa/e2e/fixtures.ts` | `402b5a1b872f625dc1425f46afdede2c9378dcc473088159774a8455b5d188e2` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/src/app/(app)/browse-all-stack/page.test.tsx` | `145ba87c200a3392d01368b0c8f6c45e2745f38b7ff120805cbf9e0b17f4abeb` |
| `pwa/src/app/(app)/browse-all-stack/page.tsx` | `2beaa3dd23a1817db55c037a27fbe92f881444d4285726af1b034a15d8ece947` |
| `pwa/src/app/(app)/layout.tsx` | `4daa1c42696fc0ed77b1e458199844dac241ee87116e2e14f218057dc59bb5e9` |
| `pwa/src/app/(app)/recipes/page.tsx` | `18b9605e8078e8ee46674a0e781836886697ce18e9166c0591aeac6c8fe78bb4` |
| `pwa/src/components/home/HomeCommandCenter.tsx` | `73a338ce995647406f9b7f01c8a3800ab9a6f8c8fc0e00b3fb3ecb7ad8627217` |
| `pwa/src/components/home/HomeSections.tsx` | `f0ea6f4849e5a8387cd498dae984058f30475943a99b617894403cc17a2dab79` |
| `pwa/src/components/recipes/BrowseAllEmptyState.tsx` | `122f58ee27d8708d7af956c65ea42a1a3f267315ac485cf9591441db8aaa29ec` |
| `pwa/src/components/recipes/EndCard.tsx` | `9d080f0f781a3ce5941d4c820f05748630cd05865d6e91e490fd5429860eb9e2` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/generated/api/recipes/index.ts` | `71e1444413322c5b58634b06ff4979b69305c061a3ec64c46e2a38480c4ea29c` |
| `pwa/src/lib/api/generated/models/index.ts` | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `pwa/src/lib/constants/routes.ts` | `790d2da3e039578fd7d291dead52213bfd2282b17517f973029bafac37f34d70` |
| `pwa/src/store/browseStackStore.test.ts` | `17d117441f93ff3f514acf6759d590abb14bbe25b9cc1d0ca77ab6eab6944d52` |
| `pwa/src/store/browseStackStore.ts` | `be7161fbf1069abf6e634697e95dd907880f4584d83e4dac45c94018e835aa12` |
| `pwa/src/store/libraryStore.ts` | `21763b997c1ed09faf5b666ed4ea81f3c8f9f9a8ff366150db5fd8a6563df1b0` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |

### BSL-recipe-library-003 — authorized draft and scenario mapping

**Authority:** A48: user “confirmed, proceed to draft”, 2026-10-15, following the
A47 recommendation. Confirms the bounded library draft and U29–U31 non-normative
treatment; authorizes proposal/delta/design/extraction tasks and this plan only.
No acceptance, main-spec promotion, archival, application work or runtime checks.

**Reused evidence / identity:** Same branch/HEAD and dirty-input context as
BSL-recipe-library-001/002. Rechecked all 33 per-file SHA-256 values unchanged,
including dirty SQL/contract/common mocks and main identity. Reuse that connected
source/assertion trace without rescanning other capabilities. Local CLI context
and list resolve nearest repository root, with household-identity as the only main
spec (36 requirements/92 scenarios). CLI scaffold created
`baseline-recipe-library-list-visibility`; no init or reconfiguration.

**Artifacts / status:**

| Artifact | Status |
| --- | --- |
| [Proposal](../../openspec/changes/baseline-recipe-library-list-visibility/proposal.md) | Draft; new recipe-library owner, current list slice only |
| [Delta](../../openspec/changes/baseline-recipe-library-list-visibility/specs/recipe-library/spec.md) | Nine ADDED requirements/18 scenarios; explicit Purpose; strict selected validation passed; not accepted/promoted |
| [Design](../../openspec/changes/baseline-recipe-library-list-visibility/design.md) | Extraction decisions for summary/query/DTO/paging/feedback boundaries; no implementation design change |
| [Tasks](../../openspec/changes/baseline-recipe-library-list-visibility/tasks.md) | Extraction and documentation validation only; no application tasks; final checks in session response/harness |
| `.openspec.yaml` | CLI-generated spec-driven metadata, preserved |
| Main recipe-library | Absent; no promotion |
| Main household-identity / prior changes | Unchanged 36/92; rename/removal/switching remain promoted and active, no archival |

**Requirement/scenario mapping:** Each row names every scenario in its requirement.
Source assertions and current execution results remain separate.

| Added requirement / scenarios | Source evidence | Actual assertion coverage / limits |
| --- | --- | --- |
| Open the household library and offer list presentation — Open from Home; Select list presentation | BSL-001 HomeCommandCenter/BrowseLibraryTrigger/routes → page list control; existing household-identity requirements own gates/context | Browser Home-trigger overlay assertion; unit/browser list-control grid assertions with API/identity substitutions; request conditioned on switching presentation and summary success |
| Return only eligible household library recipes — Ready active recipes are eligible in All mode; Not-ready records are excluded; Deleted records are excluded; Discovery mode narrows eligible records | BSL-001 GetRecipesList stored IsReady/DeletedAt predicate, optional IsDiscoverable and lack of AddedBy restriction | API tests seed ready/pending/deleted and assert IDs; auth-free InMemory fixture. Attribution/discoverable/total consequences source-supported; toggle text/card mocks alone do not prove filtering |
| Return an explore-ordered library page — Explore ordering; Page response and count; Page bounds are normalized | BSL-001 query OrderBy/ThenBy, Count/Skip/Take, page/limit clamps, MapToDto/unwrapped DTO and generated deserializer | API relative never/old/recent cooked positions and envelope-key assertions; equal-key creation order, page-2 count/content and clamp behavior source-supported without focused inspected assertions; no snapshot/stability promise |
| Request list pages for the selected library filter — Load the All list; Change to Discovery | BSL-001 page summary-first fetch, lowercase Explore, page 1, list size 12, discoverable boolean and filter effect | Unit list-size/mount requests and browser view/filter assertions; intercepted route does not itself enforce discoverable eligibility |
| Display successfully returned library items — Display a returned page | BSL-001 generated DTO → setRecipes → grid buttons/name/hero/time → detail request | Unit grid/card counts and browser rendered list counts; detail assertions are for stack, not a full list-detail qualification. Source supports list button request only; no image-delivery or detail-content guarantee |
| Request and append additional library list pages — Scroll requests the next page; Append overlapping results | BSL-002 scroll threshold/pending guards/next-page call → appendRecipes nonempty-ID deduplication | Unit synthetic scroll/page requests, overlapping-page five-card assertion and store dedup; mocked browser 12→13 items. Fixed-page/manual-event 100-item assertion is not complete production pagination |
| Show pending library-load feedback — First-page load is pending | BSL-002 initial-loading set before summary/list and conditional loading renderer | Source-supported; no focused initial pending unit assertion inspected; not a runtime observation |
| Show an empty All-mode library result — No All-mode items are returned | BSL-002 empty-array/All predicate → EndCard empty variant and capture link | Browser empty marker/CTA/no-end-marker assertions with default stack mode and mocked empty data; list-mode branch is shared source support, no empty database proof |
| Offer retry after initial library-load failure — Initial load fails; Retry succeeds | BSL-002 catch/loadError → Retry → repeated summary/page 1 → pending/success rendering | Source-supported; no focused rejected-summary/list/retry assertion inspected. Excludes append failures and universal auth/service recovery |

**Confirmed exclusions:** U29–U31 stay outside normative requirements: readiness
formula, summary prose drift, uppercase-explore equivalence, mocked issue-badge
enrichment, Discovery-empty or append-error feedback, fresh/complete/stable paging,
stale-response immunity and synchronization. No new preference/access policy.
The delta carries BSL-015's exact required sentence as a dated non-normative
historical note with the user's reported later authorization/reference caveat.
No historical identity limitations or lifecycle decisions are reopened.

**Checks / handoff:** Selected strict validation passed. Final all-strict,
six-path documentation/content and preservation results belong to this session's
response/current harness record; checks do not establish runtime behavior or
human acceptance. Browser/API/live/PostgreSQL checks remain **not-run** under A34.
Behavior TDD/application tests/client generation are **not-applicable** to these
artifact edits. Stop for human draft review; no successor extraction.

### Recipe-library list-visibility main-spec promotion — 2026-10-15

**Authority:** A49 user “promote”, immediately after the validated A48 draft.
Direct authority to promote its nine additions/18 scenarios and update plan/task
status. No separate acceptance statement or implementation qualification inferred.
No archival, application/runtime/database work or successor extraction authorized.

**Applied:** Installed `openspec-sync-specs` workflow, using the current status
JSON's sole delta path and resolved `planningHome.root`. The root remains local
`/Users/alex/Code/whats-for-supper`. Current specs instructions were obtained before
writing. Created [main recipe-library](../../openspec/specs/recipe-library/spec.md)
with the delta's exact Purpose and all nine complete requirement blocks/18
scenarios under `## Requirements`, without delta-operation headers or placeholders.
The delta, its evidence preamble and BSL-015 historical sentence/caveat are unchanged;
its “draft” status text records its original creation state, superseded here.

**Preserved:** All 33 evidence-input hashes unchanged before promotion, including
main household-identity (36/92). BSL-recipe-library-001–003 mapping and confirmed
U29–U31 exclusions remain authoritative. No shared identity/member-preference
policy duplicated or redefined. BSL-018–025/U23–U28 and all historical creation
limitations remain intact. The library change and three promoted identity changes
remain active; none archived. The index, unrelated edits/deletions and deleted
background-task-navigation spec remain preserved.

**Artifact status:** Main recipe-library now promoted at nine requirements/18
scenarios. Proposal/design/delta/metadata remain unchanged; extraction tasks remain
4/4 complete with a promotion follow-up only. No application implementation or
runtime-qualified status follows from these documentation checkmarks.

**Checks:** Main recipe-library strict validation passed; all-main-spec strict
validation passed 2/2. Final all-item strict and three-path documentation/content,
Purpose/requirement equality and preservation outcomes/content identity are in
this session's response/current harness. Browser/API/live/PostgreSQL checks remain
**not-run** under A34. Application tests/behavior TDD/client regeneration remain
**not-applicable**. No services, mutations or database requests.

**Next:** Separately select the next bounded requirements discovery; this promotion
does not authorize successor extraction, archival or deferred qualification.

## Promoted slice — recipe-library ordinary-household detail reading

| Field | Selected scope / result |
| --- | --- |
| Authority | A50, current user session: discover and draft only loaded library recipe → detail control → retrieve same recipe → returned persisted content → close; stop for review |
| Identity | `moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus existing dirty inputs; all staging, deletions and unrelated edits preserved |
| OpenSpec | CLI list/context resolved nearest root `/Users/alex/Code/whats-for-supper`, repo-local `openspec/`, schema spec-driven, no store pointer/default redirection; no init/reconfiguration |
| Existing owners | Main library nine requirements/18 scenarios; main identity 36/92; approved A04 library facts/eligibility, identity access/context and member-preference ownership reused |
| Draft | `baseline-recipe-library-detail-reading`, seven additions/13 scenarios; proposal, delta, extraction design/tasks; review only |
| Evidence | BSL-recipe-library-004–006; implementation-supported A10, medium confidence overall; runtime not-run A34 |
| Boundaries | No editing, ratings/notes submission, reporting/re-import, sharing, originals, hero generation, cooking mode, planning, search ranking, capture, restore/purge, preferences or deployment variants |

### BSL-recipe-library-004 — connected detail retrieval and returned facts

**Reused inputs:** All 33 per-file SHA-256 entries in BSL-recipe-library-002
were recomputed and match (0 changed). Reuse BSL-recipe-library-001–003 for
entry/list/shared access and U29–U31 without rescanning their unrelated paths.
Inspect newly relevant detail source and assertions below. Existing dirty
schema/OpenAPI/mock inputs are evidence, not newly qualified implementation.

**Ordered connected trace:**

1. `pwa/src/app/(app)/browse-all-stack/page.tsx` maps loaded list records into
   `browse-list-recipe-card` buttons whose onClick invokes
   `handleCardTap(recipe.id!)`. The stack front-card onTap reaches the same
   handler. It stores `detailRecipeId`; a truthy ID mounts `RecipeDetailSheet`
   with that ID and `plannerDayLabel=null`. Existing main library “Display
   successfully returned library items” owns button activation, not detail data.
2. `pwa/src/components/recipes/RecipeDetailSheet.tsx` initializes local recipe
   to null and loading true. Its recipeId effect calls `getRecipe(recipeId)`;
   no hook/store supplies list data as the detail response. Local `setRecipe`
   receives the mapped returned record. The read also calls `loadGoTo` for an
   adjacent family-setting control; it is not the recipe's content source and
   no preference/planning/GOTO capability is extracted. No mutation was executed.
3. `pwa/src/lib/api/recipes.ts` `getRecipe` calls
   `apiClient.api.recipes.byId(id).get()`, rejects absent `result.recipe`, and
   runs `mapToRecipe`. `api-client.ts` provides the configured/relative base and
   existing member/header context. Generated
   `pwa/src/lib/api/generated/api/recipes/item/index.ts` GET metadata selects
   `RecipeDetailResponse` with the ID URI template; generated models deserialize
   `recipe`, `updatedAt` and the nullable/optional RecipeDto properties.
4. `specs/openapi.yaml` GET `/api/recipes/{id}` has UUID path ID, inherited
   household security and only a documented 200 RecipeDetailResponse with
   required `recipe` and `updatedAt`. No detail readiness predicate is documented.
   Household-identity's “Gate protected page entry with household access”,
   “Apply member context after household access” and “Authenticate protected API
   requests independently”, plus existing resolution/recovery, remain owners.
   Detail has no member binder/attribution comparison; do not invent personal
   ownership or tenant isolation from the active-member header.
5. `api/src/RecipeApi/Controllers/RecipeController.cs` `Detail(Guid id)` has
   HttpGet `{id:guid}` and SkipWrapping, calls
   `RecipeService.GetRecipeDetail(id)` and returns Ok. That service calls
   `db.Recipes.FindAsync(id)` then reads the recipe import report with
   AsNoTracking/SingleOrDefaultAsync and maps it into ImportIssue. This adjacent
   report query is a dependency that can fail the whole read, not another
   extracted reporting capability. The GET contains no save call.
6. **Detail predicates:** no IsReady, IsDiscoverable or AddedBy restriction is
   present in GetRecipeDetail. `RecipeDbContext` has Recipe's global
   `DeletedAt == null` filter; ordinary untracked database lookup uses that filter.
   FindAsync can instead return an already tracked entity without a filtered
   lookup. `Program.cs` registers scoped RecipeDbContext with Npgsql; no database
   execution/tracking case was qualified here. A newly unavailable record throws
   KeyNotFoundException, and `Middleware/ErrorHandlingMiddleware.cs` maps it to
   JSON 404. List eligibility `DeletedAt == null && IsReady` is **not** copied
   into a detail requirement. Undocumented 404 and tracked-state caveat are U32;
   no universal deleted exclusion or not-ready rejection assertion is drafted.
7. `Models/Recipe.cs`, `Data/RecipeDbContext.cs` and existing
   `api/database/schema.sql` identify stored name/description/total_time,
   cuisine_type/meal_types, ingredients JSONB, raw_metadata JSONB, readiness and
   deletion time. `RecipeService.MapToDto` passes scalar/array facts;
   `DeserializeIngredients` returns string arrays, empty for null/whitespace,
   names/raw text for legacy objects, and raw-text fallbacks for malformed data.
   These strings are not proof of canonical quantities or complete ingredients.
   `ExtractRecipeInstructions` reads raw_metadata.recipeInstructions, returning
   null on absent/malformed metadata; it does not enforce the contract's array
   shape, so arbitrary stored shapes can diverge (U34). No SQL/data repair.
8. `Dto/RecipeDetailResponseDto.cs` returns response-time UTC UpdatedAt and a
   RecipeDto, unwrapped. `Dto/RecipeDto.cs` includes nullable stored text and
   ingredients/instructions. Hero `/api/recipes/{id}/hero` and numeric photo
   indices are derived references; sourceType derives from source URL/image count,
   canReimport derives from source presence, vegetarian defaults false. No asset
   read occurs in MapToDto. Those derived values are not persisted recipe content
   or evidence of image delivery. Adapter defaults absent strings to empty,
   ingredients to [], cuisine/mealTypes to null and unwraps instruction nodes.
   It discards updatedAt rather than using it as a freshness token.

**Ownership/main comparison:** None of the nine main library requirements covers
GET-by-ID response or detail presentation/loading/dismissal. Each of the seven
additions below fills only that gap; R1 consumes the already-owned activation.
No main requirement or Purpose is rewritten. Approved household identity and
member-preference policy are referenced, not duplicated. BSL-018–025/U23–U28,
member-creation history and U29–U31 remain unchanged.

### BSL-recipe-library-005 — visible detail, pending, failure and close assertions

**Actual presentation:** RecipeDetailSheet's read branch displays h2 recipe.name,
a paragraph only for truthy description, cuisine badge only for truthy cuisine,
and badges from `(recipe.mealTypes ?? []).filter(Boolean)`. `resolveMealTypes`
with category/Supper fallback populates editing drafts only; no read default.
READY IN uses `lib/duration.ts` formatRecipeTime: PT30M → 30 MINS; missing/zero or
unparsed duration gives empty time, not an invented duration. Hero img uses
`getImageUrl(recipe.imageUrl) || '/placeholder-recipe.jpg'` with recipe name alt;
`lib/imageUtils.ts` prefixes configured base for API paths. Nonempty failing URL
has no onError fallback; no successful delivery is inferred. Ingredients heading
always renders with one li per returned string in array order; missing list gives
no rows, not special empty copy. Nullable name maps to empty text; no guaranteed
nonblank/complete recipe or placeholder name. No servings, nutrition, separate
prep/cook time, category/vegetarian/created-at/attribution reading display is
supported by this sheet. Notes/rating widgets exist but submission is excluded.

**Instructions boundary:** recipeInstructions is returned/mapped but never rendered
in the sheet's read branch. STEPS sets showCooksMode and mounts CooksMode with
ID/name/image; this is the excluded cooking-mode boundary, not inline detail
instructions. No instructions-display requirement is drafted. U34 also retains
raw-metadata/array-shape and legacy ingredients completeness limitations.

**Pending/failure/recovery:** new sheet's `isLoading || !recipe` branch shows
Loading recipe...; Close header/backdrop remain outside that branch. Success
sets local recipe, then loading false. Catch logs only; finally clears loading,
but null recipe means a first-load missing/failed/malformed-envelope response
continues showing loading text. No detail-specific error UI or Retry. Closing
and reopening mounts a new sheet/effect and attempts another read; this is not
a universal successful recovery guarantee. A recipeId change on an existing
mounted component does not clear prior recipe; a failed replacement can show old
content after finally. The connected library normally unmounts on close, but no
general stale-response/freshness guarantee is extracted (U33).

**Close:** header `action-close-sheet` and backdrop button call onClose without
awaiting GET. Library `handleDetailSheetClose` clears the ID and unmounts the
sheet; it does not alter loaded recipes, view, index or filter. Effect cleanup
sets isActive false to ignore late state updates; it does not cancel HTTP.
No Escape handler, focus/scroll restoration or history navigation promise is
established. No new notes/rating/edit action is invoked in this read-only trace.

**Inspected assertion coverage (not executed):**

- `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs`
  `GetRecipeDetail_Returns_Recipe`: POST fixture creation with test upload,
  assert Accepted, then GET and assert 200, top-level recipe and matching ID.
  No assertion on updatedAt, name/description/metadata/ingredients/instructions,
  not-ready eligibility, missing/deleted record or assets. Creation itself does
  not establish an explicit not-ready assertion for detail.
- `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs`:
  CreateAsync disables household auth; substitutes InMemory EF, storage,
  embeddings/chat and workflow orchestration (mock creates workflow rows).
  No real PostgreSQL, household auth or processing/image-delivery qualification.
- `api/src/RecipeApi.Tests/Services/RecipeServiceTests.cs`: ingredient-resilience
  cases seed/read **list** endpoint fixtures and assert empty/string ingredient
  representations (and update cases inspect saved ingredient JSON). Shared
  DeserializeIngredients evidence only; not a detail response/render assertion.
- `pwa/src/app/(app)/browse-all-stack/page.test.tsx` detail tests: stub
  RecipeDetailSheet with data-recipe-id and Close. Invoke captured **stack** onTap,
  assert stand-in mounts; advance to recipe 2, assert its ID, close and assert
  same stack card and recipesGet count 1. Does not exercise real detail GET,
  component/loading/content, backdrop or list-mode close.
- `pwa/src/components/recipes/RecipeDetailSheet.test.tsx`: mock entire recipes
  adapter; Italian/Supper/Lunch fixture, Pasta/Sauce and PT30M. “shows cuisine
  and meal-type badges cluster above description in view mode” actually asserts
  badge visibility only, not position, description or exact labels. “renders
  COOK entry points...” asserts STEPS control; no instruction text assertion.
  Localization stub returns fallback templates without interpolation; imageUtils
  returns supplied path; family/settings are mocked. No focused detail pending,
  load rejection, absent fields, ingredient-row order or Close assertions here.
- `pwa/src/lib/api/recipes.test.ts` sets up byIdGet mock but inspected tests
  import create/search/bundle helpers, not getRecipe. No getRecipe round-trip or
  default-normalization assertion; bundle instruction tests are outside scope.
- `pwa/e2e/browse-all-stack.spec.ts` detail tests use setupBrowseAllStack plus
  GET route returning fixed `{recipe: RECIPE_1}` (omits contract-required
  updatedAt). Assert sheet container appears, then Close removes it and stack
  card/depth remain. Container mounts before GET resolves, so visibility alone
  does not prove loaded detail. Uses stack mode, not list-mode read completeness.
- `pwa/e2e/recipes.spec.ts` “opens and closes ... without losing the search
  results” asserts shared sheet name Homemade Lasagna and READY IN 45 MINS,
  STEPS control and close/result visibility. Entry is Search, outside the selected
  library journey; shared presentation evidence only. Common
  `pwa/e2e/mock-api.ts` routes detail to fixed builders.recipe by requested ID,
  not persisted database state, and cannot prove record existence/deletion,
  freshness, synchronization, instruction completeness or asset delivery.
  Reuse BSL-recipe-library-002's already-inspected fixtures/mocks isolation limits.

All above are implementation-supported/source-inspected evidence under A10,
not newly passed runtime checks. Browser/API/PostgreSQL tests are **not-run**
under A34 and session scope; behavior TDD/application testing/client generation
are **not-applicable** to these documentation edits, not blocked.

### BSL-recipe-library-006 — authorized draft, mapping and artifact status

**Authority:** A50 is this session's pasted instruction explicitly authorizing
CLI scaffolding and bounded proposal/delta/extraction design/tasks/plan once the
source-supported boundary is established. A12 already withholds disputed claims;
no dependent normative assertion requires a new intent decision. U32–U34 record
limitations for review without repair. The draft is not accepted/promoted/archived.

| Added requirement | Scenario | Source support / actual assertion coverage |
| --- | --- | --- |
| Retrieve the selected library recipe for detail reading | Request detail by the activated recipe ID | BSL-004 steps 1–3: handleCardTap → ID prop/effect → getRecipe/byId GET; page unit asserts recipe-2 ID only through a stub, no real GET assertion |
| Return persisted recipe detail for an available record | Return the retrieved record | BSL-004 steps 4–8: OpenAPI/Detail/GetRecipeDetail/MapToDto/EF/DTO; controller test asserts 200/top-level recipe/matching ID only; other fields/updatedAt/real DB not asserted |
| Display returned recipe text and image reference | Show returned name and description | BSL-005 read branch + adapter defaults; Search browser asserts shared name only; no focused read-description assertion |
| Display returned recipe text and image reference | Omit absent description | BSL-005 truthy paragraph/empty default; source-only, no focused assertion |
| Display returned recipe text and image reference | Select the detail image reference | BSL-005 img/getImageUrl/fallback; source-only for reference selection, no delivery assertion |
| Display available recipe metadata in detail | Show cuisine and meal types | BSL-005 read badge branch; component test asserts Italian fixture's cuisine/Supper/Lunch badge visibility with mocked getRecipe |
| Display available recipe metadata in detail | Omit absent metadata badges | BSL-005 conditional cuisine/filter(Boolean)/no read fallback; source-only, no focused absence assertion |
| Display available recipe metadata in detail | Format available time | BSL-005 formatRecipeTime/read label; Search browser asserts shared 45 MINS fixture, not PT30M or absent value; those cases source-only |
| Display returned ingredient strings in detail | Read returned ingredients | BSL-004 DeserializeIngredients/mapToRecipe + BSL-005 array map; Pasta/Sauce are component fixture only, no read-row/order assertion |
| Display returned ingredient strings in detail | No ingredients are returned | BSL-005 heading/empty map; source-only for sheet; service list-null case asserts shared empty DTO representation only |
| Show pending recipe-detail feedback | Detail retrieval is pending | BSL-005 loading branch with Close outside; source-only, no focused pending assertion |
| Dismiss recipe detail back to the loaded library | Close loaded detail | BSL-005 header/backdrop/parent unmount; page unit stubs sheet and verifies retained stack ID/list-call count; library browser tests assert container removal/card/depth with mocked GET, not completion; backdrop/list view source-only |
| Dismiss recipe detail back to the loaded library | Close pending detail | BSL-005 unconditional Close/parent unmount/isActive cleanup; source-only, no focused pending-close assertion |

BSL-004/005 in this mapping abbreviate BSL-recipe-library-004/005. Every assertion
reference is inspected source, not a runtime pass or proof of persistence.

| Artifact | State |
| --- | --- |
| [Proposal](../../openspec/changes/baseline-recipe-library-detail-reading/proposal.md) | Draft, existing recipe-library owner only |
| [Delta](../../openspec/changes/baseline-recipe-library-detail-reading/specs/recipe-library/spec.md) | Seven ADDED requirements/13 scenarios; no Purpose rewrite or MODIFIED/REMOVED operations |
| [Design](../../openspec/changes/baseline-recipe-library-detail-reading/design.md) | Extraction decisions and representation/error/ownership boundaries; no implementation change |
| [Tasks](../../openspec/changes/baseline-recipe-library-detail-reading/tasks.md) | Documentation extraction/validation only; no application tasks or lifecycle approval |
| Main specs / other changes | Library nine/18 and identity 36/92 unchanged; list visibility, switching, rename and removal active; no archival |

**Checks:** Selected strict OpenSpec validation **passed**; all-item strict
validation **passed 7/7** (five active changes/two main specs). Six-path
`task verify --` documentation, spec:check and content checks **passed**;
66 unrelated changed paths excluded without verification claims. Mapping/counts
and preservation comparisons **passed**: 1,423 prior tracked/untracked paths,
only the authorized plan changed, staged diff bytes unchanged, deleted navigation
spec absent, prior library evidence/U23–U31 and main specs unchanged. Final
post-checklist-edit results/content identity are in this session response/current
harness. **Failed: none; blocked: none.** Browser/API/PostgreSQL runtime
qualification **not-run** A34; behavior TDD/application suites/client regeneration
**not-applicable** to documentation. Stop at review; no successor work.

**Additional detail-input manifest:** Reuse the unchanged 33-input list manifest;
these 11 additional current-file digests record the targeted new reads. They are
source identity, not runtime qualification. Final preservation compares all
pre-existing tracked/untracked paths and exact staged diff bytes.

| Input | SHA-256 |
| --- | --- |
| `pwa/src/components/recipes/RecipeDetailSheet.tsx` | `bbc1bba8f16f3fa305775d072cb1c3850af34a24bd3979e2228b63984ca1a19c` |
| `pwa/src/components/recipes/RecipeDetailSheet.test.tsx` | `21727367dee891c473635cc2eafde324b0f6863e0dd4db1a7e82203d5e650da0` |
| `pwa/src/lib/api/generated/api/recipes/item/index.ts` | `687fbde658edd62de7455ec634b1d36e8c8b67ee508c689b2ae9de9f8ff4ba2d` |
| `pwa/src/lib/api/recipes.test.ts` | `02b75d719bddca5b88e9cc9760d183fd8e8defd316b0d04cdabf1006bf45ebe4` |
| `pwa/src/lib/duration.ts` | `f3205470722ee9b39409d8e285d00dd90e91e8ebd537f8efc991d8d13567677f` |
| `pwa/src/lib/imageUtils.ts` | `a51d124d0fae2a99257186e607597825299737ca77717813aac3ce72821d46be` |
| `api/src/RecipeApi/Dto/RecipeDetailResponseDto.cs` | `a7a0e1c3190cf711feea3a618716d54fb5b1bcd4f19349c32ec813c13771d342` |
| `api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs` | `b5849eb709ca2bc85efa3051d3a953ca955ef8704848327ad88d0297299d949b` |
| `api/src/RecipeApi.Tests/Services/RecipeServiceTests.cs` | `0019a5854fcf0468783607ff9bbe7d9c58ccc4abd3e48658f2ee3e1c54a50e27` |
| `pwa/e2e/recipes.spec.ts` | `b41683a89d6b1704ecf0a447fdf6493f60314b45b62b3f60143ec190e9eaaa51` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |

### BSL-recipe-library-007 — approved detail-reading main-spec promotion

**Authority:** A51, user “I approve, move to propotion”, 2026-10-15,
immediately after the validated A50 detail-reading draft. Approval and promotion
cover only that reviewed delta. No application work, runtime qualification,
archival or successor extraction is inferred.

**Reconciliation / identity:** Same branch/HEAD, nearest repository-local
OpenSpec root and spec-driven schema. Read current delta/main/tasks and specs
instructions before writing. Recomputed all 44 source/test/evidence-manifest
hashes from BSL-recipe-library-002/006: unchanged. Evidence stays
implementation-supported under A10 with runtime qualification deferred A34.

**Applied:** Appended the seven ADDED requirement blocks/13 scenarios verbatim
to [main recipe-library](../../openspec/specs/recipe-library/spec.md), preserving
its complete preceding bytes, including Purpose and nine list requirements/18
scenarios. Main now has 16 requirements/31 scenarios. Delta, proposal, design,
BSL-recipe-library-001–006 mappings, historical BSL-015 sentence/caveat,
BSL-018–025/U23–U34 and member-creation history remain unchanged. Household
identity remains 36/92. Non-normative detail readiness/deletion, missing-record,
failure/recovery, instructions/content and image-delivery limits are not promoted
into new normative assertions.

**Artifact status:** Detail-reading delta is approved and promoted under A51;
its unchanged evidence preamble records the historical draft state under A50.
The extraction tasks' follow-up records this later authorization. All five
changes (detail reading, list visibility, switching, rename and removal) remain
active; nothing archived. No existing requirement or Purpose rewritten.

**Checks:** Main strict validation **passed**, all-main-spec strict **passed 2/2**,
all-item strict **passed 7/7**. Three-path documentation/spec/content and exact
append/preservation checks **passed**; only main library, task follow-up and plan
changed among 1,428 pre-existing paths, with staged diff bytes unchanged. Final
post-record-edit content identity/results are in this session response/current
harness. **Failed: none; blocked: none.** Browser/API/PostgreSQL checks remain
**not-run** A34; application suites, behavior TDD and client generation
**not-applicable** to this documentation promotion.

## Promoted slice — recipe-library ordinary-household detail editing

**Current lifecycle:** A53 promotes the exact reviewed nine/17 delta. The A52 draft-state tables and evidence below record extraction-time status; BSL-recipe-library-011 records the current promotion.

| Field | Scope / status |
| --- | --- |
| Authority | A52: current pasted request explicitly permits discovery, CLI scaffolding and bounded drafting, then stop for review |
| Identity | `moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus pre-existing staged/unstaged/untracked inputs; before-image hashes and staged binary diff captured privately |
| Root | Read-only `openspec list --json`, `context --json`, spec inventory/show resolved nearest repository root `/Users/alex/Code/whats-for-supper`; schema spec-driven, no store redirection or initialization/reconfiguration |
| Main/owners | Recipe-library 16/31 and household-identity 36/92 unchanged; A04 facts/read ownership and identity access/member requirements reused |
| Draft | `baseline-recipe-library-detail-editing`: proposal, nine additions/17 scenarios, extraction design/tasks; validated draft for review only |
| Evidence | BSL-recipe-library-008–010; source-inspected, implementation-supported under A10, medium confidence; runtime not-run A34 |
| Exclusions | Ratings/notes submission, reporting/re-import, sharing, originals, hero generation, cooking mode/instruction editing, planning, ranking, capture, deletion/restore/purge, preference policy and demo/preview/deployment variants |

### BSL-recipe-library-008 — connected detail editor and update semantics

**Reused evidence:** Recomputed all 44 per-file identities in BSL-recipe-library-002/006: 44 unchanged, zero changed. Reuse BSL-recipe-library-001–007 for list/detail entry, facts, mapping and shared ownership; no rescan of unrelated capabilities. Existing dirty OpenAPI/SQL/mock inputs remain evidence, not newly qualified implementation. Additional inspected identities follow BSL-010.

**Ordered trace and representations:**

1. `pwa/src/app/(app)/browse-all-stack/page.tsx` `handleCardTap`/`detailRecipeId` and mounted `RecipeDetailSheet` preserve the selected loaded recipe ID. `handleDetailSheetClose` clears it. No field-update callback or list refresh is passed. Existing main owns card activation and GET-backed reading; this slice starts after that GET succeeds.
2. `pwa/src/components/recipes/RecipeDetailSheet.tsx:58–81,103–166,223–290,578–590` provides nine meal options, `resolveMealTypes`, loaded local recipe, drafts and Settings/Edit. `ActionGearMenu.tsx` toggles Settings, offers Edit only with onEdit, calls it and closes the menu. Parent calls `resetDrafts(recipe)` then enters editing. Draft name copies mapped name; description/cuisine use empty text for absence; ingredients use []; nonempty mealTypes are filtered for truthy values, otherwise trimmed recognized category, otherwise Supper. These defaults are draft state, not inferred stored facts. Read badges do not use that fallback.
3. Sheet `688–751,799–856,941–969` exposes name/cuisine inputs, description textarea, editable ingredient rows plus Add/remove, and toggled meal-type buttons. Name.trim empty or no selected meals disables Save; there is no form-submit/Enter path. No local required description/cuisine/ingredient count, length or duplicate validation. Fields are controlled text state; Save and Cancel are buttons. Time/instructions/images/source/provenance/readiness/deletion/attribution are not edited by this field-save handler; nearby hero controls and other update handlers are excluded.
4. `handleSaveRecipeFields` captures `nextRecipe` by spreading loaded recipe and replacing all five drafts. It trims name/description/each ingredient, drops blank rows in order, trims cuisine to string or null, and uses draft mealTypes. It sets Saving and clears editError, then calls updateRecipe with loaded recipe.id and all five fields even if unchanged. Blank description is empty string; all-blank ingredients become []; blank cuisine is null. `handleCancelEdit` resets drafts from loaded recipe, clears error and exits editing. Before submission no field PATCH occurs; reopening repeats reset. Cancel is disabled pending, so it is not an in-flight abort/rollback. Closing unmounts; reopening the connected sheet performs its existing GET, not guaranteed recovery.
5. `pwa/src/lib/api/recipes.ts:577–609` forwards optional fields into generated `api.recipes.byId(id).patch` and returns Promise<void>, ignoring its response. Generated `api/recipes/item/index.ts` PATCH uses the ID URI template, UpdateRecipeDto serializer and generated PatchResponse. Generated models `serializeUpdateRecipeDto` writes strings/ingredients and non-null meal arrays. `generated/apiClient.ts` registers JsonSerializationWriterFactory; inspected installed JSON writer emits null for null, omits undefined strings and writes [] as an empty array. This is source review of serializer behavior, not an executed HTTP capture for clearing/omission.
6. `specs/openapi.yaml:496–524,1725–1750` declares optional nullable fields, meal-item enum and 200 data object for PATCH with UUID path ID. `api/src/RecipeApi/Dto/UpdateRecipeDto.cs` uses nullable strings/List<string>/string[], without field validation attributes. `RecipeController.Update` forwards ID/DTO to `RecipeService.UpdateRecipe`; no member binding or attribution comparison is introduced. Reuse household-identity “Gate protected page entry with household access”, “Apply member context after household access”, “Authenticate protected API requests independently” and existing resolution/recovery. Do not interpret OpenAPI member security as personal ownership enforcement.
7. `RecipeService.cs:354–465` FindAsync by ID uses the same global deletion-filter/tracked-entity qualification caveat as U32. Non-null fields replace values verbatim; no server trim/nonblank name/nonempty meal/enum validation is present for this slice. Null or omitted DTO fields do not clear stored values. Empty strings replace strings, [] replaces ingredients or meals; empty meals also set Category=Supper, without synthesizing a meal array. Nonempty meal update does not synchronize Category. Schema/EF store name/description/cuisine text, ingredient JSONB and meal text[]; UpdatedAt is assigned before SaveChangesAsync. Main recipe ID and other unsupplied facts are not reassigned here. Not a real PostgreSQL persistence qualification.
8. Any supplied relevant field marks search indexing/embedding pending, even unchanged values. New sidecar or existing pending/reset-fingerprint changes are saved with the recipe. After SaveChangesAsync the service attempts `index-recipe-search` with recipeId and source fingerprint; trigger exceptions are caught/logged. It then awaits `ImageService.UpdateRecipeInfo` without that catch. That method reads or creates recipe.info and writes supplied name/description (and excluded other supported arguments); ingredients/cuisine/meal types are not arguments. File failure may reject after DB save, so atomic database/file save or rollback cannot be inferred. IsReady/DeletedAt are not assigned and this update contains no explicit event publish; no broader downstream/indexing/event-completion capability is extracted.
9. Server maps the updated entity and returns RecipeDetailResponseDto/UpdatedAt. `Infrastructure/SuccessWrappingFilter.cs` exempts ResponseDto types, so actual PATCH bypasses data wrapping despite OpenAPI/generated PatchResponse data shape (U36). Client ignores response; successful await applies the captured nextRecipe, cleans draftIngredients and exits editing. No GET, response reconciliation, library-store update or parent callback occurs here. Existing main owns resulting detail text/badges/ingredient presentation; the new requirement owns when its local source changes. Blank cuisine therefore hides locally on success but retains a prior stored cuisine (U35).
10. Pending only disables Save/Cancel and changes Save label to Saving. Inputs, meal toggles, ingredient controls, Close and backdrop remain active. Edits made while pending are not merged into the captured submission on success. Catch logs and shows “Could not save changes. Try again.”, retaining current draft/edit state; finally ends Saving. Locally eligible retry clears error and sends a fresh snapshot; failure does not prove no commit. No abort, cancellation token, concurrency/version precondition, safe retry/idempotency or stale-response guard is established for Save (U37).

**Main/shared-owner comparison:** All 16 main library requirements were read, including scenarios. None owns field editing/partial PATCH, Cancel, save feedback or local completion. Each of the nine additions below fills those gaps only; read requirements remain intact. Household-identity 36/92 and A04 ownership remain consumers, with no identity/member-creation or preference policy rewrite.

### BSL-recipe-library-009 — actual assertion coverage and substitutions

Inspected assertions, not executed tests:

- **C1 — RecipeDetailSheet.test.tsx**, “shows only edit actions ... cancel”: opens Settings/Edit; asserts Save/Cancel visible, adjacent view controls hidden; Cancel restores those controls. It changes no draft and asserts neither no-PATCH nor reset/reopen. “shows cuisine input ... pill board” asserts input and Supper/Lunch visibility, not position, initialization values or all options. “disables save when no meal types ...” clicks both fixture choices and asserts disabled Save. “sends cuisineType and mealTypes ...” resolves mocked updateRecipe(undefined), edits Greek/deselects Lunch and asserts adapter call ID and objectContaining Greek/['Supper']; no actual PATCH, other fields, return rendering, DB or response assertion. Entire recipes adapter is mocked; fixture Pasta/Sauce, Italian/Supper/Lunch and family/localization/image helpers are substitutions. No focused pending/rejection/retry, whitespace, null clearing, blank-name, Add/remove, draft-discard or default-resolution assertions were found here.
- **B1 — pwa/e2e/recipes.spec.ts**, “edits recipe card fields from a single edit mode”: entry is Search `/recipes`, not library. Overrides `**/api/recipes/*`; GET fixed MOCK_DETAIL_RECIPE omits required updatedAt, PATCH captures body and returns mocked `{recipe: {...fixture,...body}}`. Edits name/description/one ingredient; poll asserts those three payload fields; then asserts local title/ingredient text. Does not assert cuisine/meals, trimming, ID targeting, response use, refetch, reopening or persistence. Handler is stateless; subsequent GET returns old fixture. Shared editor evidence only, not connected-library or real backend qualification.
- **A1 — RecipeServiceTests.cs:161–207**, `PatchRecipe_WithEditableCardFields_PersistsFieldsAndQueuesSearchIndexWorkflow`: seeds old name/description/ingredient; PATCH asserts 200, then reads another DI scope and asserts new name/description/deserialized ingredient array, exactly one workflow and matching recipeId/nonblank fingerprint. No response fields, timestamp, sidecar state, disk, later GET or PostgreSQL assertions.
- **A2 — same file:210–245**, multiple editable fields: PATCH name/description/ingredients plus excluded notes; asserts 200 and one workflow only. This is evidence for a single trigger on supplied fields, not an extraction of notes or index completion.
- **A3 — same file:248–283**, cuisine/meals: seeds Category Lunch; PATCH Italian/Supper/Lunch; asserts 200 and EF cuisine/meal values in another scope. No Category synchronization, blank/null or response assertion.
- **A4 — same file:287–320**, empty meals: PATCH []; asserts 200 and Category Supper only. It does not assert stored empty MealTypes. That storage assertion is supported by service assignment, not this test's name.
- **F1 — TestWebApplicationFactory.cs** CreateAsync disables household authentication; defaults use InMemory EF and InMemoryRecipeStore. Orchestrator mock writes workflow/task rows in another scope; real index/embedding work is not executed. API tests inspect substituted database state, not PostgreSQL/disk/auth/event qualification. Existing BSL-005 controller GET identity assertion and fixture limitations remain unchanged.
- **M1 — pwa/e2e/mock-api.ts:691–727** common PATCH returns a fixed recipe/updatedAt without applying request or storing data; GET returns builders.recipe by ID. `pwa/src/lib/api/recipes.test.ts` declares byIdPatch but contains no updateRecipe assertions. Page unit detail is stubbed, as recorded BSL-005; no connected-library real editor Save assertion. Mock successful responses cannot establish durable persistence or freshness.

Runtime unit/browser/API/PostgreSQL checks **not-run** under A34 and explicit session boundary. Application TDD, client generation, service launch, live parity and database qualification are **not-applicable** to documentation-only changes, not newly blocked. Confidence is medium: connected source path strong, failure/normalization/default edges largely source-only.

### BSL-recipe-library-010 — draft mapping, artifacts and review handoff

A52 authorizes the CLI-scaffolded bounded proposal/delta/design/tasks/plan. No consequential intent choice is needed for supported assertions; U35–U37 retain disputed/unsupported guarantees outside normative text under A12 and this request. Reuse prior evidence and keep U29–U34, BSL-018–025/U23–U28 and historical member-creation evidence intact. Delta contains BSL-015's exact requested historical sentence plus its dated caveat.

Every row maps both its owning requirement and exact scenario. Step references below mean BSL-008 steps; C/B/A/F/M references mean BSL-009 inspected assertions, never runtime passes.

| Added requirement | Scenario | Source support / actual assertion coverage |
| --- | --- | --- |
| Open initialized recipe-detail field drafts | Edit loaded detail | Steps 1–3: library ID/loaded recipe/ActionGearMenu/resetDrafts/inputs; C1 visibility only; initialization values source-only |
| Open initialized recipe-detail field drafts | Initialize meal-type choices | Step 2 resolveMealTypes/MEAL_TYPE_OPTIONS; C1 shows two fixture pills, does not assert default/filter/category/all choices |
| Edit ingredient rows in the detail draft | Change and add ingredients | Steps 3–4 handlers/row UI; B1 asserts changed ingredient payload/local text; Add/empty row source-only |
| Edit ingredient rows in the detail draft | Remove an ingredient | Step 3 remove filter by index/UI; source-only, no focused remove/order assertion |
| Restrict local detail Save eligibility | Name is blank | Step 3 Save disabled expression; source-only, no blank-name assertion |
| Restrict local detail Save eligibility | No meal type is selected | Step 3 Save expression/toggle; C1 explicitly asserts disabled after deselecting Supper/Lunch |
| Submit normalized detail fields for the loaded recipe | Submit edited fields | Steps 4–6 capture/adapter/byId/serializer/contract; C1 asserts loaded ID/Greek/Supper adapter fields; B1 asserts three actual mocked PATCH body fields; trimming/all-five/real backend source-only |
| Submit normalized detail fields for the loaded recipe | Submit blank optional drafts | Steps 4–5 trim/filter/null/serializer; source-only; fixtures/success mocks do not assert this |
| Apply supplied non-null recipe-detail update fields | Store supplied detail fields | Steps 6–9 DTO/FindAsync/assignments/EF Save/MapToDto; A1 name/description/ingredients and A3 cuisine/meals in InMemory; timestamp/response/real DB source-only; F1 applies |
| Apply supplied non-null recipe-detail update fields | Preserve omitted or null values | Step 7 non-null guards; source-only, no focused preservation/null-cuisine assertions |
| Apply supplied non-null recipe-detail update fields | Replace with empty values | Step 7 assignment/JSON serialization/empty-meal Category; A4 asserts only Category Supper, remaining empty-storage assertions source-only |
| Show pending detail-save feedback | Save is pending | Step 10 isSavingRecipe/disabled labels; source-only, no focused pending assertion |
| Discard unsubmitted recipe-detail drafts with Cancel | Cancel before submission | Step 4 resetDrafts/handleCancelEdit; C1 restores view controls only; no-PATCH/changed-draft discard source-only |
| Discard unsubmitted recipe-detail drafts with Cancel | Reopen after Cancel | Steps 2/4 reset on Edit; source-only, no reopen/reset assertion |
| Display the submitted snapshot after successful detail Save | Save resolves successfully | Step 9 local nextRecipe and existing read owner; B1 asserts local name/ingredient after mocked success only, not response reconciliation/GET/DB |
| Retain editing and offer another attempt after detail Save failure | Save rejects | Step 10 catch/finally/editError; source-only, no focused reject/retention/control assertion |
| Retain editing and offer another attempt after detail Save failure | Retry after failure | Steps 4/10 fresh capture/clear error; source-only, no retry assertion; no idempotency inferred |

| Artifact | State |
| --- | --- |
| [Proposal](../../openspec/changes/baseline-recipe-library-detail-editing/proposal.md) | Draft, existing owner only |
| [Delta](../../openspec/changes/baseline-recipe-library-detail-editing/specs/recipe-library/spec.md) | Nine ADDED requirements/17 scenarios; no Purpose/MODIFIED/REMOVED operations |
| [Design](../../openspec/changes/baseline-recipe-library-detail-editing/design.md) | Extraction boundaries/representations/risks; no application design change |
| [Tasks](../../openspec/changes/baseline-recipe-library-detail-editing/tasks.md) | Documentation extraction and validation only; completion does not mean acceptance |
| Main specs / prior artifacts | Library 16/31; identity 36/92; all five prior active changes unchanged and active; archives unchanged |
| Review | Stop with validated draft; no acceptance, promotion, archival or successor extraction |

**Checks:** selected strict validation passed. Final applicable all-item strict, six-path documentation/content/mapping and full before-image/index preservation outcomes are reported in the final response/current harness. No runtime result is attached to these source identities. Runtime **not-run** A34; application TDD/client generation/live parity/database qualification **not-applicable** to documentation. No application mutations or services executed.

**Additional inspected inputs:** Reuse unchanged 44-input manifests. These additional source/dependency hashes support future targeted rechecks, not runtime qualification.

| Input | SHA-256 |
| --- | --- |
| `api/src/RecipeApi/Dto/UpdateRecipeDto.cs` | `580894849abf965a787e9124a8de1ee1ffea5800e60a081f543e28aac4a8a1ab` |
| `pwa/src/components/recipes/ActionGearMenu.tsx` | `d0c0c5ee92658de43cfb9fddc40b4d69030a02c348396e9044d1c77e218b8e75` |
| `api/src/RecipeApi/Services/ImageService.cs` | `c73bb4f976bd6355ec9aa6c18937bed12d4dc14ff7efe718a84351cb4f1abc2d` |
| `api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs` | `6fa3cd08587220fc4e18803f6ba020e494b81211cf99c53ec10de23ddd46f11d` |
| `pwa/src/lib/api/generated/apiClient.ts` | `092579e3714bf5c34eb2e425997a9e73349abc85c9fba37f5fb546b667d866f9` |
| `pwa/node_modules/@microsoft/kiota-serialization-json/dist/es/src/jsonSerializationWriter.js` | `48b9388859f3a017fd3d0eb1637b32bc644fc02bb5d5016ea539aa3449844fb3` |

### BSL-recipe-library-011 — detail-editing main-spec promotion

**Authority:** A53, user “promote it”, 2026-10-15, immediately following the validated A52 draft. This directly authorizes promotion of that reviewed delta and documentation status updates; no separate acceptance statement, archival, successor extraction or application work is inferred.

**Result:** Appended the exact nine requirement blocks/17 scenarios from [detail-editing delta](../../openspec/changes/baseline-recipe-library-detail-editing/specs/recipe-library/spec.md) to [main recipe-library](../../openspec/specs/recipe-library/spec.md). Main now has 25 requirements/48 scenarios. All earlier main bytes, including its Purpose and 16 prior requirements/31 scenarios, are retained as an exact prefix. Only ADDED content was appended; no delta operation header or non-normative preamble copied into main.

**Preservation:** Full delta, proposal/design/metadata and historical BSL-015 sentence/caveat unchanged. BSL-recipe-library-001–010 mappings, U29–U37, BSL-018–025/U23–U28 and member-creation history remain intact. Household-identity remains 36/92. All six changes remain active and archives/deleted navigation spec are preserved. Rechecked all 50 source/dependency digests in the library manifests: unchanged. Source support remains implementation-supported under A10, with runtime/database qualification deferred A34; promotion supplies no new runtime evidence.

**Checks / handoff:** Final main/specs/all strict validation, exact-append/delta equality and three-path documentation/content/full preservation checks are reported in the final response/current harness. Runtime browser/API/PostgreSQL **not-run** A34; application suites, TDD, client generation and live/database behavior checks **not-applicable** to documentation promotion. Changed only main recipe-library, this plan and detail-editing task follow-up; staging and unrelated dirty work retained. No application mutations/services executed.

**Next:** Separately select bounded discovery or lifecycle work; this promotion does not authorize archival, successor extraction or deferred qualification.

## Promoted slice — recipe-library ordinary-household ratings and notes

**Current lifecycle:** A55 promotes the exact reviewed six/15 delta. A54 draft-state tables and evidence below record extraction-time status; BSL-recipe-library-015 records current promotion.

| Field | Selected scope / status |
| --- | --- |
| Authority | A54: current pasted session request authorizes connected discovery, CLI scaffolding and this bounded draft, then stop for review |
| Identity | `moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus pre-existing staged/unstaged/untracked inputs; full before-image hashes and staged binary diff captured privately |
| Root/schema | Read-only list/context/spec inventory/store discovery resolves nearest root `/Users/alex/Code/whats-for-supper`; no registered stores; existing spec-driven schema; no initialization/reconfiguration |
| Boundary | Successfully loaded library detail → rating choice or Notes input → supported PATCH/persistence → local visible state; no adjacent field editing or discovery-vote policy |
| Main/owners | Recipe-library 25/48 and household-identity 36/92 unchanged; reuse library fact/read/update and identity access/member owners |
| Draft | `baseline-recipe-library-ratings-notes`: six additions/15 scenarios, proposal and extraction design/tasks; review pending, not accepted/promoted/archived |
| Confidence | Implementation-supported under A10, medium overall: connected trace strong; direct assertion coverage sparse; no runtime qualification A34 |

### BSL-recipe-library-012 — connected ratings/notes path and persisted facts

**Reuse:** Recomputed all 50 per-file digests in BSL-recipe-library-002/006/010: 50 unchanged, zero changed. Reuse BSL-recipe-library-001–011 and U29–U37 for entry, detail retrieval, existing partial-update side effects and test substitutions; no rescan of unrelated capabilities. New targeted inputs appear below. Dirty contract/schema/mock content remains evidence, not newly qualified implementation.

**Business purpose:** record a shared assessment and free-text household notes on a reusable recipe, directly in loaded detail. The rating is the recipe's persisted 0–3 fact, not a member's discovery vote or a computed household consensus.

**Ordered trace / representations:**

1. **Connected entry:** `pwa/src/app/(app)/browse-all-stack/page.tsx:469–475,828–838` stores the tapped recipe ID and mounts `RecipeDetailSheet`; close sets that ID to null and unmounts it. The caller passes no rating/notes completion callback or library refresh. Existing retrieval and dismissal requirements retain ownership; this slice starts only after detail loading succeeds.
2. **Returned facts and initialization:** `pwa/src/lib/api/recipes.ts:150–161,231–235` getRecipe maps the detail recipe: rating uses returned value or 0; notes uses returned value or null. `RecipeDetailSheet.tsx:103–116,137–166` starts with notes empty/rating 0, then initializes from the fetched recipe using notes ?? '' and rating ?? 0. `:53–57,868–931` offers the Notes textarea and three labeled, aria-pressed buttons: Dislike 1, Like 2, Love 3. Rating 0 selects none; there is no Unknown button. A missing/null notes value becomes empty input. No rating/notes Edit/Save mode is required; these controls remain in the sheet alongside its field editor.
3. **Rating action:** sheet `:199–205,897–931` compares current local rating to the chosen value, substitutes 0 when equal, sets rating immediately and awaits updateRecipe(recipe.id,{rating:newValue}). The click wrapper discards the handler promise. No pending guard, request serialization, catch, rollback, save-error message or automatic retry is present. Choice buttons remain usable, so a later click can dispatch while an earlier request is pending. Local pressed state is optimistic, not proof of persistence.
4. **Notes text and timing:** sheet `:183–197,883–890` controls the textarea with notes/onChange. If recipe is absent, or notes equals recipe.notes ?? '', no timer is scheduled. Otherwise an 800 ms timer calls void updateRecipe(recipe.id,{notes}). Text is neither trimmed nor normalized to null: spaces remain spaces; clearing nonempty loaded notes submits ''. No blur/Enter/dedicated Save trigger appears. Cleanup clears that unstarted timer on notes/recipe dependency changes and unmount. Repeated edits before dispatch replace the timer; dispatched requests are not cancelled or serialized.
5. **Baseline and feedback limits:** notes submission never advances recipe.notes. Returning to the original loaded text after a different text was dispatched can skip the restoring PATCH (U38), including empty-original cases. At dispatch, setNotesSaved(true) runs without awaiting PATCH; an existing savedTimerRef timeout is cleared and a 2000 ms timeout hides Saved. The label is therefore local dispatch feedback; an edit does not immediately hide a prior label. That removal timer has no unmount cleanup. No notes-request catch, rollback, displayed error or automatic retry exists (U39). A later differing edit can schedule another request; unchanged notes do not automatically retry. There is no flush-on-close. Close cleanup covers only unstarted submission; no dispatched-transport cancellation or settled final-state guarantee follows.
6. **Request/omission boundary:** `recipes.ts:577–609` awaits generated `api.recipes.byId(id).patch` and returns void without reading its result. It constructs optional properties from updates; for either rating-only or notes-only calls the others are undefined. `generated/api/recipes/item/index.ts` supplies the ID PATCH route/serializer. `generated/models/index.ts:5965–5990` writes notes as string and rating as number. The installed Kiota JSON writer `:19–52` skips undefined strings/numbers while retaining empty text and numeric 0; null remains null. This is inspected serializer source, not an executed network capture for every edge. OpenAPI `UpdateRecipeDto` permits optional nullable notes and rating, range 0–3.
7. **API/validation/ownership:** `RecipeController.cs:150–160` forwards ID/DTO to UpdateRecipe, without member-specific rating/notes binding. `UpdateRecipeDto.cs` uses string? Notes/int? Rating. `RecipeService.cs:354–375` finds the recipe, validates non-null rating through `ValidationService.cs:42–46` (reject <0 or >3), casts to RecipeRating and assigns non-null notes exactly. Recipe enum/columns in `Models/Recipe.cs:8–33`, EF short conversion/check in `Data/RecipeDbContext.cs:62–66` and SQL recipes rating smallint NOT NULL/range check plus notes text agree on recipe-level storage. AddedBy is separate attribution, not a key for personal notes/ratings. SQL declarations are not installed-database qualification.
8. **Successful partial persistence:** service `:354–434` leaves null/omitted rating/notes unchanged; '' and whitespace notes replace stored text, and 0 replaces a prior rating. Other content guards are untouched by rating-only/notes-only requests, retaining name/description/ingredients/cuisine/meals/instructions/discoverability, attribution, readiness and deletion state. UpdatedAt is assigned. Non-null notes or supplied rating count as search-relevant even when the value equals storage, setting/creating a pending sidecar before SaveChangesAsync. Reuse existing partial-update owner rather than duplicate its five-field/timestamp rule. A successful subsequent existing detail read maps rating/notes from the recipe (`MapToDto:707–708`); no local feedback establishes that read.
9. **Direct side effects/response:** service `:436–465` tries the index workflow after save and catches/logs trigger errors, then awaits ImageService.UpdateRecipeInfo with supplied notes/rating. `ImageService.cs:68–86` reads existing metadata or creates it, changes only non-null supplied metadata fields and writes it. `Infrastructure/LocalRecipeStore.cs:31–45` serializes recipe.info to disk; `Models/RecipeInfo.cs` carries notes/rating. These writes are not one proven atomic operation; file failure can follow database commit. The inspected method has no direct event publication; downstream event/index completion is not established or extracted. Returned RecipeDetailResponseDto maps the recipe, but adapter ignores it. U36's documented data object versus actual unwrapped DTO persists; missing-record 404 and validation 400 are absent from PATCH responses (U40).
10. **Completion/reopening:** rating and notes success handlers neither setRecipe nor apply returned fields, request another GET or invoke onClose/library update. With the sheet mounted and no later edits, it retains local selection/text and stays open. Reopening mounts the existing GET-backed detail path; it is not evidence that pending updates finished or that latest-write ordering/freshness is guaranteed. Library cards/summary are not explicitly refreshed. No inferred transport abort, rollback, atomicity, idempotency, concurrency ordering, freshness or synchronization requirement.

**Shared-owner comparison:** Main recipe-library's retrieval and persisted-detail requirements omit rating/notes from their enumerated facts; its partial-update requirement covers name/description/ingredients/cuisine/meals, leaving this narrower addition missing. The six new headers do not duplicate any existing requirement. Reuse those named owners and household-identity “Gate protected page entry with household access”, “Apply member context after household access” and “Authenticate protected API requests independently”; no new access/header/tenant rule. A04 keeps discovery vote identity/totals/consensus separately owned; this extraction follows only Recipe.Rating/Notes.

### BSL-recipe-library-013 — actual assertions and substitutions

Source inspected, tests **not executed**:

- **B1 — `pwa/e2e/recipes.spec.ts:345–386`:** notes test enters Search `/recipes`, not library, opens its shared detail sheet, fills “kids loved it”, polls captured PATCH body with toMatchObject({notes:'kids loved it'}) and asserts the sheet remains visible. Custom wildcard GET always returns fixed MOCK_DETAIL_RECIPE; PATCH returns merged fixture/body without storing it, and omits required updatedAt. No assertion for initial notes/rating, exact delay, whitespace, empty clearing, omitted keys, selected recipe ID, Saved, rejection, retries, pending controls, another GET, closing/reopening or real persistence. Its fixture rating 3/nonempty notes is not an assertion. This is shared-component request/display evidence, not connected-library or database qualification.
- **C1 — `RecipeDetailSheet.test.tsx`:** whole recipes adapter mocked; fixture rating 2 and notes null. Inspected assertions exercise other actions/field editing, not rating/notes input, selected state or autosave. Its fake timers exercise import polling, not notes debounce/Saved cleanup. No focused rating toggle/clearing, timing, success/failure or overlap assertion is established by these fixtures/test names.
- **V1 — `Services/ValidationServiceTests.cs:34–54`:** direct ValidateRating calls assert ArgumentException at -1/4/100 and no exception at 0/1/2/3. This supports range assertions only, not PATCH status, persisted values or UI meanings. Create invalid-rating controller test concerns multipart creation, not this PATCH, and adds no coverage here.
- **A1 — `RecipeServiceTests.cs:210–245`:** PATCH includes notes “Keep this one” along with name/description/ingredients; assertions check 200 and one index-workflow instance only. No stored notes/rating, empty/null/omission, metadata-file, response or subsequent GET assertion. Other established A1/A3 field tests in BSL-009 cover different fields; they do not prove notes/rating storage.
- **I1 — `Integration/RecipeUpdateIntegrationTests.cs`:** only instructions update tested; asserts DB JSON and recipe.info instruction array plus one index trigger/no recipe_ready trigger. Neither notes nor rating is updated/asserted. Do not transfer those side-effect assertions to this slice. BSL-009 factory substitutions apply: auth disabled, default InMemory EF and InMemoryRecipeStore, orchestrator mocked (writes workflow rows without executing index/embedding work). No PostgreSQL/disk/auth/event qualification.
- **M1 — adapter/common mock/library tests:** `recipes.test.ts` has no updateRecipe assertions; share/export notes/rating assertions (including an unrelated rating 5 fixture) are outside this path and do not establish supported PATCH ratings. Common `pwa/e2e/mock-api.ts:691–727` PATCH returns fixed recipe/updatedAt without applying/storing request, GET builds a separate recipe. Previously inspected library page tests stub detail, and library browser tests do not qualify this control-to-storage journey. Reuse BSL-005/009 substitutions; mocked successful responses do not prove durable persistence.

Runtime browser/API/PostgreSQL checks **not-run** under A34/current instruction. Application TDD/suites/client generation/live parity/database qualification are **not-applicable** to these documentation edits. Confidence medium overall; most scenarios below are source-only.

### BSL-recipe-library-014 — draft mapping, artifacts and review handoff

A54 authorizes this CLI-scaffolded proposal/delta/design/tasks/plan. Supported assertions require no new consequential intent choice; U38–U40 withhold disputed guarantees under A12/current instruction. BSL-001–011, U29–U37, BSL-018–025/U23–U28 and member-creation history remain intact. Delta retains BSL-015's exact historical sentence and caveat. All scenario evidence is source-inspected, not a current test pass.

Step numbers refer to BSL-012 above; assertion IDs refer to BSL-013. Every row maps the owning requirement and exact scenario.

| Added requirement | Scenario | Source support / actual assertion coverage |
| --- | --- | --- |
| Initialize recipe-detail ratings and notes controls | Load existing notes and rating | Steps 1–2 loaded ID/GET mapping/setters/value/aria-pressed; source-only; B1/C1 fixture values are not initial-state assertions |
| Initialize recipe-detail ratings and notes controls | Load absent notes and rating | Step 2 null/absence defaults and equality; source-only; C1 null fixture has no corresponding value assertion |
| Initialize recipe-detail ratings and notes controls | Offer the three rating meanings | Steps 2/7 RATING_OPTIONS/enum and button labels; source-only; V1 asserts valid numbers, not labels/pressed meanings |
| Select or clear the loaded recipe rating | Select a different rating | Steps 3/6 local setRating/byId/serializer; source-only, no rating-interaction assertion |
| Select or clear the loaded recipe rating | Clear the current rating | Steps 3/6 equality-to-0/number writer; source-only; V1 accepts 0 but does not assert toggling/submission |
| Select or clear the loaded recipe rating | Select from Unknown | Steps 2–3/6; source-only, no initial-Unknown click/payload/omission assertion |
| Submit changed recipe notes after the editing delay | Submit exact notes text | Steps 4/6 exact controlled text/timer/string writer; B1 asserts notes payload for ordinary text only; whitespace/delay/omission/target ID source-only |
| Submit changed recipe notes after the editing delay | Clear initially nonempty notes | Steps 4/6 empty string retained; source-only, no empty-clear assertion; requires initial nonempty baseline |
| Submit changed recipe notes after the editing delay | Replace a pending notes edit | Steps 4–5 effect dependencies/cleanup/timer; source-only; C1 polling fake timers do not assert notes debounce |
| Persist supplied recipe ratings and exact notes | Store a rating or clear it to Unknown | Steps 7–9 DTO/validation/recipe field/Save; V1 only accepts 0–3; no rating PATCH/storage/member-specific assertion |
| Persist supplied recipe ratings and exact notes | Store notes without trimming | Steps 7–9 direct notes assignment/Save; source-only; A1 asserts 200/workflow, not notes value; no PostgreSQL evidence |
| Persist supplied recipe ratings and exact notes | Durably clear notes with empty text | Steps 7–9 non-null empty assignment/Save/MapToDto; source-only, no storage/GET/file empty-string assertion; not inferred from B1 success |
| Preserve omitted recipe content during ratings and notes updates | Preserve null and omitted facts | Steps 6–8 writer/non-null guards; source-only, no focused null/omission/preservation assertion |
| Preserve omitted recipe content during ratings and notes updates | Preserve unrelated recipe content | Steps 6–9 guards/no member binding/side-effect qualification; source-only, no rating-only/notes-only stored-content preservation assertion |
| Retain local ratings and notes display on successful completion | Complete an update with the sheet open | Steps 3–6/10 no response mapping/refetch/onClose; B1 asserts sheet visible after request capture only, not resolved-request ordering/local values/no GET; remaining assertions source-only |

| Artifact | Status |
| --- | --- |
| [Proposal](../../openspec/changes/baseline-recipe-library-ratings-notes/proposal.md) | Draft, existing owner only |
| [Delta](../../openspec/changes/baseline-recipe-library-ratings-notes/specs/recipe-library/spec.md) | Six ADDED requirements/15 scenarios; no Purpose or MODIFIED/REMOVED operations |
| [Design](../../openspec/changes/baseline-recipe-library-ratings-notes/design.md) | Extraction decisions and integration limits; no application design change |
| [Tasks](../../openspec/changes/baseline-recipe-library-ratings-notes/tasks.md) | Documentation extraction/validation only; completion is not acceptance |
| Main / prior artifacts | Library 25/48 and identity 36/92 unchanged; six prior active changes and all archives preserved; this seventh change is draft only |
| Review | Stop at validated draft. Acceptance, main promotion, archival and successor extraction require separate authorization |

**Checks / handoff:** Selected `openspec validate baseline-recipe-library-ratings-notes --strict --no-interactive` passed (exit 0). All-item strict passed 9/9, zero failures. Six-path `task verify -- <plan and all five change files>` passed documentation, spec:check and content (exit 0). Bounded content/mapping/link and full before-image/index preservation checks passed: six requirements/15 scenarios mapped, all pre-existing files except the authorized plan unchanged, index bytes and deletions retained. Failed: none; blocked: none. These first-pass results precede the final checklist/evidence recording edits; final post-edit documentation/all-strict/content/preservation outcomes and tested identity are in the final response/current harness. No runtime result is attached to source digests. Runtime **not-run** A34; application TDD/client generation/live parity/database qualification **not-applicable** to documentation. No application mutations, service launch or database access attempted.

**New inspected inputs:** Reuse 50 unchanged prior input identities. Additional current source/test identities (not runtime qualification):

| Input | SHA-256 |
| --- | --- |
| `api/src/RecipeApi/Services/ValidationService.cs` | `bf2ed2aaffef7c4e7dd320c3f53f7772eaacfe8cceb4251acc6f0792b19fa1a1` |
| `api/src/RecipeApi.Tests/Services/ValidationServiceTests.cs` | `1957400792e1899c0e93f979532930f797baa45c909b8f5e9f0eedec76298acb` |
| `api/src/RecipeApi.Tests/Integration/RecipeUpdateIntegrationTests.cs` | `8b3b2d9ed80c77f39061d31054410e02d6e63e9cdb39de6f9ce2896ae4c8acc7` |
| `api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs` | `6f3f2893b4ae03ef3328efad306de1e8fc33ab470c4c430bfbe5d3ed1ae17efc` |
| `api/src/RecipeApi/Models/RecipeInfo.cs` | `7a154a58b5f360279cd1891f9a9e33c4ad3097f382f088dccc855ec27c957452` |

### BSL-recipe-library-015 — ratings and notes main-spec promotion

**Authority:** A55, user “promote this spec, then produce the prompt for me to generate the next spec”, 2026-10-15, following the validated A54 draft. Authorizes promotion of this reviewed delta and a next-session prompt, not execution of successor extraction, application work or archival. No separate acceptance statement is inferred beyond the direct promotion instruction.

**Result:** Appended exactly the six requirement blocks/15 scenarios from the [ratings/notes delta](../../openspec/changes/baseline-recipe-library-ratings-notes/specs/recipe-library/spec.md) to [main recipe-library](../../openspec/specs/recipe-library/spec.md), now 31 requirements/63 scenarios. All prior main bytes, including the original Purpose and 25 requirements/48 scenarios, remain an exact prefix. No delta operation header or non-normative evidence note was copied into main. All seven changes remain active.

**Evidence/preservation:** All 55 source/dependency digests from the library manifests rechecked unchanged. Full delta (including BSL-015 historical sentence/caveat), metadata, proposal and design retained byte-for-byte. BSL-recipe-library-001–014, U29–U40, BSL-018–025/U23–U28 and historical member-creation limitations remain intact. Household-identity stays 36/92; archives, all unrelated tracked/untracked inputs, index bytes and deletions are preserved. Source-supported A10 assertions remain distinct from deferred A34 runtime/database qualification.

**Checks / handoff:** Final main/specs/all strict validation, bounded three-path documentation/content, exact-append/delta equality and full preservation results are in the final response/current harness. Runtime browser/API/PostgreSQL **not-run** A34; application suites/TDD/client generation/live parity/database checks **not-applicable** to documentation promotion. No application mutations, database access or service launch attempted. Changed only main recipe-library, this plan and the ratings/notes task follow-up.

**Next-session prompt:** Recommend the missing recipe-library loaded-detail discoverability control slice: actual control/initial state → activation → PATCH partial update → persistence → visible completion/failure, reusing existing list eligibility/filter requirements. Treat optimistic state, pending controls, rollback/error and refresh as discovery targets. Exclude discovery votes/consensus, search ranking and other lifecycle/quality/sharing actions. Prompt requests bounded discovery and source-supported draft only, stop for review; it is supplied for later use and not executed now. No next change scaffolded or accepted.

## Promoted slice — recipe-library ordinary-household detail discoverability

**Current lifecycle:** A57 promotes the exact six/13 delta. A56 draft-state tables and evidence below record extraction-time status; BSL-recipe-library-019 records current promotion.

| Item | Recorded state |
| --- | --- |
| Domain / purpose | Recipe library: let the household mark a loaded recipe for discoverability using its stored recipe-level flag |
| Actor / entry / result | Ordinary-household person, successful library detail GET, viewing-mode Ask the Family button; inverse boolean submission and local completion or restoration |
| Source identity | `moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus preserved dirty/staged/untracked inputs; OpenAPI/SQL/mock edits are not newly qualified |
| Authorization / evidence | A56; BSL-recipe-library-016–018; source-inspected, implementation-supported A10, medium overall confidence; runtime not-run A34 |
| Dependencies | Existing identity gates/member context, React state, Kiota generated PATCH/JSON serializer, controller/EF/database, orchestrator and recipe store |
| Boundary / stop | Loaded library detail → control → supported submission/persistence → local visible result. Draft only; no application mutations, DB access, services or lifecycle actions |

### BSL-recipe-library-016 — connected discoverability control and partial update

**Reused evidence:** Recomputed every one of the 55 prior per-file library source/dependency hashes in BSL-recipe-library-002/006/010/014: 55 unchanged, zero changed. Reuse BSL-recipe-library-001–015, including established partial-update, list/filter and detail retrieval evidence. Do not rescan unrelated capabilities. Before-images of all pre-existing tracked/untracked files and index hash were saved privately for preservation checks; the plan's pre-existing staged/unstaged differences are retained.

**Ordered trace and representation changes:**

1. `pwa/src/app/(app)/browse-all-stack/page.tsx` `handleCardTap` sets detailRecipeId; `handleDetailSheetClose` clears it; conditional RecipeDetailSheet receives ID and close/planning/find callbacks, with no field-update notification or refresh callback. Existing main owns entry and detail reading. This extraction begins after successful loading; the card-level StackActionBar update path is not the selected detail path.
2. `pwa/src/lib/api/recipes.ts` `getRecipe`/`mapToRecipe` maps returned isDiscoverable with `?? false`. `RecipeDetailSheet.tsx:110,138–170` independently initializes local state false, then sets it from loaded nextRecipe.isDiscoverable ?? false. True remains true, false remains false, absent/null becomes false. This does not assert absent storage: Recipe.IsDiscoverable is a non-null boolean. The loaded recipe object and the separate control state are different representations.
3. `RecipeDetailSheet.tsx:974–1026` renders DiscoveryToggleCard while not editing. `DiscoveryToggleCard.tsx` is a type=button, data-testid action-toggle-discovery, with title Ask the Family and subtitle Shows in Discovery voting. English strings are confirmed in `pwa/src/locales/en/common.json`, resolved through `pwa/src/locales/index.ts`. True uses sage background/on knob position and action label Turn off Discovery for this recipe; false uses subdued track/off position and Turn on Discovery for this recipe. Track is aria-hidden, without role=switch/aria-checked/aria-pressed. No switch semantic or universal localization/accessibility guarantee is inferred.
4. `RecipeDetailSheet.tsx:207–223` `handleToggleDiscovery` returns if no recipe, takes next = !isDiscoverable, immediately sets that local state and pending, then awaits updateRecipe(recipe.id,{isDiscoverable:next}). The target is loaded recipe.id, not a member/vote ID. Only this boolean is supplied. `DiscoveryToggleCard` disabled={isLoading}, opacity/cursor-wait are connected to isUpdatingDiscovery. Ordinary clicks on the disabled button cannot repeat submission after pending renders; the handler has no isUpdatingDiscovery guard. Do not generalize into single-flight, deduplication or concurrency ordering.
5. `recipes.ts:577–609` forwards optional fields to generated `api.recipes.byId(id).patch` and discards its result (Promise<void>). `generated/api/recipes/item/index.ts` binds the ID PATCH route and UpdateRecipeDto serializer. `generated/models/index.ts` serializeUpdateRecipeDto uses writeBooleanValue. Installed Kiota JSON writer writes true/false (including false), skips undefined unrelated properties; strings, arrays, rating/instructions remain undefined here. OpenAPI `/api/recipes/{id}` PATCH and UpdateRecipeDto agree on optional nullable boolean; no required field or special discoverability validation. This is serializer-source inspection, not an executed HTTP capture for omission/false.
6. `RecipeController.cs:150–160` forwards ID and DTO. `Dto/UpdateRecipeDto.cs` uses bool? IsDiscoverable. `RecipeService.cs:354–465` finds recipe by ID with existing U32 tracked/deletion-filter caveat, assigns IsDiscoverable only when HasValue (either true or false), and does not assign null/omitted fields. Readiness, deletion, attribution, notes/rating, name/description/ingredients/instructions/cuisine/meals are untouched by this boolean-only path. `Models/Recipe.cs` maps non-null flag/default false to is_discoverable, separately from is_ready/deleted_at; `api/database/schema.sql` declares boolean NOT NULL. SaveChangesAsync follows UpdatedAt assignment. `MapToDto` (same service, :700 onward) returns IsDiscoverable; existing GET mapping/read ownership applies. No member vote or consensus update occurs in this method; no policy for those capabilities is extracted.
7. A supplied boolean is search-relevant even when equal to storage. Before save, the method creates/marks the search sidecar index/embedding pending (clearing existing fingerprint); after save it attempts index-recipe-search with ID/fingerprint and catches/logs trigger exceptions. Reuse BSL-008/012 partial-update side effects, without indexing completion guarantees. It then awaits `ImageService.UpdateRecipeInfo` with all metadata arguments null on this path. That method reads or creates recipe.info, writes it, and does not assign discoverability; `RecipeInfo.IsDiscoverable` exists/defaults false but is not propagated here. Existing file value can remain stale; a new info defaults false. Broad controller/DTO comments claiming DB/file synchronization exceed this path (U42). LocalRecipeStore disk implementation is reused evidence; actual persistence not executed. Save precedes uncaught file failure, so rejection does not establish absence of a DB commit. No direct event publication exists in this inspected method, without a global/downstream event-absence guarantee.
8. Successful await leaves optimistic state as-is, clears pending in finally and keeps the sheet open. There is no setRecipe update, response reconciliation, completion GET, library store write or parent callback. PATCH actual RecipeDetailResponseDto bypasses success wrapping while OpenAPI/generated PATCH describes a data object (U36). Client discards both shapes. No immediate list removal/summary update or freshness/synchronization guarantee follows.
9. Catch logs Failed to toggle discovery, restores !next and finally clears pending; action label/visual state follow restored state. There is no dedicated visible error, automatic retry or unchanged-state retry loop. Another activation after restoration submits a fresh inverse for loaded ID. Local restoration is not persistence rollback/safe retry. Close/backdrop remain usable pending and library close unmounts. Reopening mounts with existing detail GET; no transport abort, PATCH cleanup, response-generation check or promise of final ordering exists. An old request may settle after close/new detail; scope completion scenarios to same mounted detail/no intervening state changes (U41), without concurrent-request guarantees.

**Main/shared-owner comparison:** Read all 31 existing library requirements/scenarios. None owns the loaded-detail discoverability control/update or enumerates that fact in persisted detail. Reuse “Return only eligible household library recipes” and “Request list pages for the selected library filter” unchanged; do not restate their rules or assert immediate list consequences. “Retrieve the selected library recipe for detail reading”, “Return persisted recipe detail for an available record” and “Apply supplied non-null recipe-detail update fields” remain owners for the surrounding seam; the new persistence requirement adds only the missing boolean and its partial-update consequences. Household-identity gate/access/member context requirements are referenced, not copied or broadened. A04 assigns vote identity/totals/consensus to recipe discovery, workflow lifecycle to background processing and SSE semantics to household live updates. Each of the six additions below fills a missing control/fact outcome only; Purpose and prior requirements remain unchanged.

### BSL-recipe-library-017 — actual assertions, fixtures and substitutions

These are inspected assertions, not current passing tests:

- **B1 — `pwa/e2e/recipes.spec.ts:606–650`**, “toggling discovery from the detail sheet calls PATCH with isDiscoverable without navigating”: enters `/recipes` Search, searches chicken and opens the top pick. Overrides GET/PATCH `**/api/recipes/*`; fixed MOCK_DETAIL_RECIPE from builders.recipe; GET/PATCH omit required updatedAt; PATCH spreads captured body into a mock response, GET always returns the old fixture. Actual poll asserts only objectContaining isDiscoverable expect.any(Boolean), then detail visible and /recipes URL retained. Does not assert exact true/false, target ID, omitted fields, initial labels/state, optimism/pending, success reconciliation, reject/restore/retry, close/reopen, storage or connected library. It is stateless mocked shared-detail evidence, not real persistence.
- **C1 — `pwa/src/components/recipes/RecipeDetailSheet.test.tsx`**, “shows only edit actions while editing and restores viewing actions on cancel”: real detail component, getRecipe/updateRecipe adapter mocked; fixture isDiscoverable false, localization returns English fallbacks, family/image helpers substituted. Asserts discovery button visible before Edit, absent in Edit and visible after Cancel. Does not activate the detail toggle or assert its boolean/labels/pending/rejection/retry/persistence. `pwa/src/lib/api/recipes.test.ts` defines a byIdPatch mock but no updateRecipe assertion; preserve BSL-009 adapter gap.
- **C2 — `pwa/src/components/recipes/StackActionBar.test.tsx`**: actual assertions in the two aria-label tests expect Turn on Discovery for this recipe for false and Turn off Discovery for this recipe for true; the first test title still says Ask the Family, so rely on its assertion. It renders the shared DiscoveryToggleCard through a different caller with mocked callbacks/fallback localization. Adjacent tests assert callback recipe-abc/true or false; StackActionBar.tsx has its own pendingValue/loadingForId/reentry guard. Those interaction/pending/rollback assertions must not be imported as detail-handler coverage. C2 provides shared-card label evidence only for this draft.
- **A1/F1 — reuse BSL-recipe-library-009 API assertion inspection:** RecipeServiceTests PATCH editable-fields/cuisine/meals cases assert HTTP 200, other fields in another scope and indexing workflow; no discoverability PATCH assertion. BSL-013's RecipeUpdateIntegrationTests asserts instructions in EF/recipe.info and workflow count, not this flag. Default TestWebApplicationFactory disables auth and substitutes InMemory EF/recipe store/orchestrator; no real DB/file/index/auth qualification. Wider isDiscoverable fixture/property occurrences are not evidence of this connected PATCH persistence. No focused assertion for boolean/null/omission/unrelated preservation, detail-read-after-toggle or file parity was identified in the inspected update tests.
- **M1 — reuse BSL-009/013 common browser handler:** common PATCH returns fixed mocked success, not a request-applied durable store. The library page unit test stubs RecipeDetailSheet; it cannot establish connected detail behavior. No new tests or application edits are authorized.

Confidence: medium overall. Source path is directly connected; labels have shared-card assertions and browser dispatch/open-sheet has a stateless Search assertion. Most behavioral edges and all discoverability storage/recovery requirements are source-only. Runtime unit/API/browser/PostgreSQL checks **not-run** A34; application TDD/client generation/live parity/database qualification **not-applicable** to documentation edits, not newly blocked.

### BSL-recipe-library-018 — draft mapping, artifact status and review handoff

A56 authorizes CLI scaffolding and this bounded proposal/delta/extraction design/tasks/plan. No unresolved consequential intent decision is needed for the supported subset; U41–U43 withhold stronger disputed/unsupported assertions under A12. Preserve BSL-recipe-library-001–015/U29–U40, BSL-018–025/U23–U28, member-creation history and BSL-015's exact historical sentence/caveat in the delta's non-normative note.

Each row maps its owning requirement and exact scenario. Step numbers mean BSL-016; C/B/A/F/M labels mean inspected BSL-017 assertions, never test passes.

| Added requirement | Exact scenario | Source support / actual assertion coverage |
| --- | --- | --- |
| Initialize the loaded-detail discoverability control | Load discoverability enabled | Steps 1–3: map/load/state/card/English labels; C2 true label in shared card; detail initialization/on graphic source-only |
| Initialize the loaded-detail discoverability control | Load discoverability disabled | Steps 1–3; C2 false label in shared card, C1 false fixture/control visibility only; detail off-state mapping source-only |
| Initialize the loaded-detail discoverability control | Load an absent discoverability value | Steps 2–3 nullish fallbacks and card strings; source-only, no absent/null/title/subtitle assertion |
| Submit the inverse discoverability state for the loaded recipe | Turn discoverability on | Steps 4–5 inverse/loaded ID/serializer; B1 asserts boolean PATCH only, no exact value/ID/omissions/optimism; C2 callback is different caller |
| Submit the inverse discoverability state for the loaded recipe | Turn discoverability off | Steps 4–5 include false serializer; same B1 limit; exact off/ID/omissions/optimism source-only |
| Persist the supplied recipe discoverability fact | Store enabled discoverability | Steps 6–7 HasValue/assignment/EF Save/MapToDto/GET; source-only, A1/F1 other-field InMemory evidence cannot qualify flag |
| Persist the supplied recipe discoverability fact | Store disabled discoverability | Step 6 false is assigned; source-only; no flag PATCH/read assertion or PostgreSQL qualification |
| Persist the supplied recipe discoverability fact | Preserve an omitted or null discoverability flag | Step 6 bool?/HasValue; source-only, no focused null/omission assertion |
| Persist the supplied recipe discoverability fact | Retain unrelated facts during a discoverability update | Steps 5–7 omission/non-null guards and separate readiness/deletion/attribution; source-only, no preservation assertion; timestamp/sidecar/file limits explicit |
| Disable the detail discoverability button while pending | Request remains pending | Steps 3–4 disabled/opacity/cursor/state; source-only; C2 different handler coverage not transferred |
| Retain the local discoverability display after success | Complete with the sheet open | Steps 8–9 adapter void/finally/no navigation/GET/callback; B1 open-sheet and URL only, not confirmed local state/re-enable/response/GET assertion |
| Restore local discoverability after rejection and allow another activation | Request rejects | Step 9 catch !next/finally/card derives label; source-only, no focused detail rejection assertion; DB commit may already exist |
| Restore local discoverability after rejection and allow another activation | Activate again after rejection | Steps 4/9 fresh inverse after pending cleared; source-only, no retry assertion or idempotency guarantee |

| Artifact | State |
| --- | --- |
| [Proposal](../../openspec/changes/baseline-recipe-library-detail-discoverability/proposal.md) | Draft; documentation only |
| [Delta](../../openspec/changes/baseline-recipe-library-detail-discoverability/specs/recipe-library/spec.md) | Six ADDED requirements/13 scenarios; no Purpose/MODIFIED/REMOVED/RENAMED operations |
| [Design](../../openspec/changes/baseline-recipe-library-detail-discoverability/design.md) | Extraction approach/representations/risks, no application design change |
| [Tasks](../../openspec/changes/baseline-recipe-library-detail-discoverability/tasks.md) | Documentation extraction/validation only; checkbox completion does not establish acceptance |
| Main / lifecycle | Recipe-library 31/63 and household-identity 36/92 unchanged; seven prior active changes retained, new eighth draft; no acceptance/promotion/archive |
| Review handoff | Human review of this bounded draft only; no successor extraction authorized |

**Checks:** selected strict validation passed (exit 0); first-pass all-item strict passed 10/10, zero failures (exit 0). Six-path `task verify` passed documentation, spec:check and content (exit 0). Bounded checks passed six requirements/13 scenarios mapped, all 60 evidence identities matching, no duplicate main headers/Purpose edits, historical note/previous evidence/approval/uncertainty rows retained, every pre-existing file except the authorized plan unchanged, index hash/deletions preserved and exactly five new artifacts/eight active changes. These checks precede the final checklist/evidence recording edits; final post-edit strict/documentation/content/preservation outcomes and tested identity are in the final response/current harness. No runtime result is attached to a source digest. Failed/blocked applicable checks: none. Runtime **not-run** under A34; behavior TDD/application suites/client generation/live parity/database qualification **not-applicable** to documentation. No services, application mutations or database access attempted.

**Additional inspected identities:** Prior 55 inputs unchanged; these five additions bring the reusable library manifest to 60 unique inputs. Digests identify source evidence, not runtime qualification.

| Input | SHA-256 |
| --- | --- |
| `pwa/src/components/recipes/DiscoveryToggleCard.tsx` | `21b426b8e855d59c7a34cd3e16da648eca1534192c8f9eb3c683ace3eec45141` |
| `pwa/src/components/recipes/StackActionBar.tsx` | `c1e5ec187b69238e583ed83e9573c9acedaac78cc7706e9a5bc4c33773d50a30` |
| `pwa/src/components/recipes/StackActionBar.test.tsx` | `8aae6e07eab7ca6e433e9edc01bd31ef2fb43981ea9fcc7ed846970b2206a0ca` |
| `pwa/src/locales/en/common.json` | `3519f2d7e0140a11786597976b6868fa195312e0bc3feb3e4d3c3e144a41d0bc` |
| `pwa/src/locales/index.ts` | `898e7367a9d83aec4e5673b5cc541fe7e6ea29211d7a2b14ed23e9b4a5a2c5ae` |

### BSL-recipe-library-019 — discoverability main-spec promotion

**Authority:** A57, user “promote”, 2026-10-15, immediately after the validated A56 draft. Authorizes exact promotion of that reviewed delta and plan/task lifecycle follow-up. No separate acceptance statement, archival, successor extraction or application work is inferred.

**Result:** Appended the exact six requirement blocks/13 scenarios from [discoverability delta](../../openspec/changes/baseline-recipe-library-detail-discoverability/specs/recipe-library/spec.md) to [main recipe-library](../../openspec/specs/recipe-library/spec.md), now 37 requirements/76 scenarios. All previous main bytes, including original Purpose and 31 requirements/63 scenarios, remain an exact prefix. Only ADDED requirement blocks were appended; no operation header or non-normative evidence note was copied into main.

**Evidence/preservation:** Full delta, historical BSL-015 sentence/caveat, proposal/design/metadata and BSL-recipe-library-001–018/U29–U43 evidence/limits remain unchanged. BSL-018–025/U23–U28 and historical member-creation limitations retained. All 60 source/dependency digests rechecked unchanged. Household-identity stays 36/92. All eight changes remain active; archives, index, unrelated tracked/untracked work and deletions are preserved. Promotion adds no runtime evidence and does not resolve file propagation, contract, retry, synchronization or database qualification limits.

**Checks / stop:** Main recipe-library strict validation and all-spec strict validation (2/2) passed, exit 0. Final all-item strict, three-path documentation/content, exact-append/delta-equality and full preservation outcomes are in the final response/current harness at final content identity. Failed/blocked applicable checks: none observed. Runtime unit/browser/API/PostgreSQL **not-run** under A34; application TDD, client generation, live parity and database behavior checks **not-applicable** to documentation edits. No services or application mutations executed. Stop after this promotion; no archival or successor extraction authorized.

## Drafted slice — recipe-library ordinary-household View Original

**Current lifecycle:** A58 authorizes discovering and drafting only ordinary-household View Original behavior from successfully loaded library detail, stopping at a validated draft for review.

| Field | Scope / status |
| --- | --- |
| Authority | A58: user session instruction authorizes read-only discovery, CLI scaffolding, proposal, recipe-library ADDED delta, extraction design/tasks and plan updates once supported boundary is established; stop for review |
| Identity | `moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus pre-existing staged/unstaged/untracked inputs; before-image hashes and staged diff preserved |
| Root | Read-only `openspec list --json`, `openspec list --specs --json` resolved nearest repository root `/Users/alex/Code/whats-for-supper`; schema spec-driven, no store redirection or initialization/reconfiguration |
| Main/owners | Recipe-library 37/76 and household-identity 36/92 unchanged; A04 detail-loading, displayed-hero-reference, fact/read/update and identity access/member requirements reused |
| Draft | `baseline-recipe-library-view-original`: proposal, seven ADDED requirements/17 scenarios, extraction design/tasks; validated draft for review only |
| Evidence | BSL-recipe-library-020–022; source-inspected, implementation-supported under A10, medium confidence; runtime not-run A34 |
| Exclusions | Uploading/replacing originals, selecting a new finished-dish image, hero generation/regeneration, recipe capture/import, sharing/export/download workflows, detail editing, ratings/notes submission, discoverability changes, reporting/re-import, cooking, planning, search/discovery ranking, votes/consensus, deletion/restore/purge, preference policy and demo/preview/deployment variants |

### BSL-recipe-library-020 — connected View Original availability, activation, and photo viewer semantics

**Reused evidence:** Recomputed all 60 per-file identities in the library manifests: all 60 unchanged, zero changed. Reuse BSL-recipe-library-001–019 for list/detail entry, facts, mapping and shared ownership; no rescan of unrelated capabilities.

**Ordered trace and representations:**

1. `pwa/src/components/recipes/RecipeDetailSheet.tsx:620–642` renders the View Original button when `!isEditing && (recipe.imageCount > 0 || recipe.sourceType === 'url')`. In editing mode (`isEditing === true`), the control is suppressed. When `imageCount <= 0` and `sourceType !== 'url'` (e.g. `synthesized` with zero images), the control is omitted.
2. The control displays inside the hero container at bottom-right (`absolute bottom-4 right-4`). It renders `<span>{t('recipes.viewOriginal', 'View Original')}</span>` which resolves to `"View Original"` in English (`pwa/src/locales/en/common.json:422`). It renders `<span data-testid="view-original-icon">` containing `<ExternalLink size={18} />` when `recipe.sourceType === 'url'`, and `<Images size={18} />` when `recipe.sourceType !== 'url'`.
3. Fact representation and defaults: in `Recipe.cs`, `SourceUrl` is a nullable string column `source_url`, `ImageCount` is an integer column `image_count` (default 0), and `FinishedDishIndex` is an integer column `finished_dish_index` (default -1). In `RecipeService.MapToDto(Recipe r)`, `sourceType` is computed: `!string.IsNullOrEmpty(r.SourceUrl) ? "url" : (r.ImageCount > 0 ? "photos" : "synthesized")`. In `pwa/src/lib/api/recipes.ts:165–170`, `mapRecipeDto` defaults `sourceType` to `'synthesized'`, `imageCount` to `dto.imageCount || 0`, `finishedDishIndex` to `dto.finishedDishIndex ?? -1`, and `sourceUrl` to `dto.sourceUrl ?? null`.
4. Activation branch: in `RecipeDetailSheet.tsx:624–630`:
   - If `recipe.sourceType === 'url' && recipe.sourceUrl`: calls `window.open(recipe.sourceUrl, '_blank', 'noopener,noreferrer')`. This requests opening the URL in a new browser browsing context without altering current application navigation, unmounting the detail sheet, or making an API call. External page loading success, popup blocker allowance, or URL scheme validity cannot be guaranteed (U45).
   - Else (when `recipe.sourceType !== 'url'`, or when `recipe.sourceType === 'url'` but `recipe.sourceUrl` is null/empty): calls `setShowOriginals(true)`. For a URL-imported recipe with absent URL and zero images, `OriginalPhotosViewer` mounts with `imageCount: 0`, displaying counter `1 / 0`, requesting `/api/recipes/{id}/original/undefined`, and modulo navigation produces `NaN` (U44).
5. Photo viewer mounting: `RecipeDetailSheet.tsx:1033–1039` renders `<OriginalPhotosViewer recipeId={recipe.id} imageCount={recipe.imageCount} finishedDishIndex={recipe.finishedDishIndex} onClose={() => setShowOriginals(false)} />`.
6. Image ordering: `OriginalPhotosViewer.tsx:23–31` computes `imageIndices`. Base indices are `Array.from({ length: imageCount }, (_, i) => i)`. `heroIndex` is `finishedDishIndex >= 0 && finishedDishIndex < imageCount ? finishedDishIndex : -1`. If `heroIndex !== -1`, it returns `[heroIndex, ...indices.filter((i) => i !== heroIndex)]`, placing the finished dish photo first. If `heroIndex === -1`, it returns `indices` in ascending index order `[0, ..., imageCount - 1]`.
7. Displayed image path and serving route: `OriginalPhotosViewer.tsx:105–108,180–188` sets `currentPhotoIndex = imageIndices[currentIndex]` (where `currentIndex` initializes to 0), and constructs `imageUrl = /api/recipes/${recipeId}/original/${currentPhotoIndex}` rendered via native `<img src={imageUrl} ... />`. No Kiota generated client, request wrapper, or bearer token is used.
8. API endpoint handling: in `RecipeController.cs:359–365`, `[HttpGet("{recipeId:guid}/original/{photoIndex:int}")]` is marked `[AllowAnonymous]` and has no security requirements in `specs/openapi.yaml:2068–2092`. It calls `ImageService.GetImage(recipeId, photoIndex)`, which delegates to `IRecipeStore.ReadOriginalImageAsync(recipeId, photoIndex)`. `LocalRecipeStore.cs:84–94` resolves `{Root}/{recipeId}/original/{index}.{ext}` checking `.jpg`, `.png`, `.webp`. If found, it returns HTTP 200 `File(stream, contentType)`. If not found, `ImageService` throws `KeyNotFoundException`, translated to HTTP 404 by `ErrorHandlingMiddleware.cs:35`.
9. Photo navigation and wrapping: `OriginalPhotosViewer.tsx:54–64,213–261` provides desktop chevrons (`hidden sm:contents`), mobile pager chevrons (`sm:hidden`), pager dot buttons, and window `keydown` listeners (`ArrowRight` calls `handleNext`, `ArrowLeft` calls `handlePrev`). Next advances `currentIndex` via `(prev + 1) % imageIndices.length`, wrapping from last to first. Prev decrements `currentIndex` via `(prev - 1 + imageIndices.length) % imageIndices.length`, wrapping from first to last. Navigation resets `scale` to 1 if `scale > 1`. Activating dot `idx` sets `direction` and `currentIndex` to `idx`.
10. Zooming and panning: `OriginalPhotosViewer.tsx:34–52,66–89,164–210` initializes `scale = 1`. Activating the zoom button (bottom right) or clicking the photo toggles between scale 1 and scale 2.5 (`toggleZoom`). At scale 1, the button displays `<Maximize2 size={24} />`. At scale > 1, the button displays `<Minimize2 size={20} />` and `"Fit to Screen"`. Framer-motion `<motion.div drag={scale > 1} dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }} ...>` enables dragging only when `scale > 1`. Two-finger pinch touch gestures in `handleTouchMove` calculate touch distance delta and clamp scale between 1 and 5. Returning to scale 1 animates back to `{ scale: 1, x: 0, y: 0 }`.
11. Dismissal and absence of side effects: clicking the close button (`data-testid="action-close-viewer"`) or pressing `Escape` triggers `onClose()`, which calls `setShowOriginals(false)` in `RecipeDetailSheet`. The viewer unmounts and the detail sheet remains open in its loaded viewing state. Viewing, navigating, zooming, panning, or dismissing performs no data mutation (no POST/PATCH/DELETE), no selection persistence in storage, no detail refetch (no GET `/api/recipes/{id}`), and no live stream notification. Reopening mounts fresh with `currentIndex = 0` and `scale = 1`.

### BSL-recipe-library-021 — actual assertion coverage and substitutions

Inspected assertions, not executed tests:

- **C1 — `pwa/src/components/recipes/RecipeDetailSheet.test.tsx`**:
  - Line 101, `renders Share in the visible action slot while keeping View Original separate`: asserts `screen.getByTestId('action-view-original')` is visible.
  - Line 502, `hides action-view-original for synthesized recipes with no source URL`: fixture `sourceType: 'synthesized'`, `imageCount: 0`, `sourceUrl: null`; asserts `action-view-original` is null (`expect(screen.queryByTestId('action-view-original')).toBeNull()`).
  - Line 531, `shows action-view-original with ExternalLink icon for url-type recipes`: fixture `sourceType: 'url'`, etc.; asserts `action-view-original` is visible, contains text `/View Original/i`, and has child `[data-testid="view-original-icon"]`. Does not assert click, `window.open`, or icon type difference.
- **B1 — `pwa/e2e/recipe-original-viewer.spec.ts`**:
  - Line 73, `View Original is hidden for synthesized description-only recipes`: mocks recipe `sourceType: 'synthesized'`, `imageCount: 0`, `sourceUrl: null`; asserts `action-view-original` is not visible.
  - Line 83, `View Original shows ExternalLink icon and opens URL for URL-based recipes`: mocks `sourceType: 'url'`, `sourceUrl: 'https://example.com/test-recipe'`, `imageCount: 0`; asserts `action-view-original` is visible, contains text 'View Original', and icon is visible. Does not click or assert `window.open`.
  - Line 99, `View Original shows Images icon and opens viewer for photo-based recipes`: mocks `sourceType: 'photos'`, `imageCount: 2`, `sourceUrl: null`; asserts `action-view-original` is visible, clicks it, and asserts `page.getByTestId('action-close-viewer')` is visible. Does not assert photo ordering, chevrons, keyboard controls, zoom, gestures, or dismissal return state.
- **A1 — `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs:440–459`**, `GetImage_Returns_Image_Binary`: writes fake image to store at index 0, calls GET `/api/recipes/{recipeId}/original/0`, asserts HTTP 200 OK, ContentType `image/jpeg`, and binary length > 0. Does not assert 404 response for missing index or nonexistent recipe.
- **F1 — `TestWebApplicationFactory.cs`**: substitutes in-memory `IRecipeStore` (`InMemoryRecipeStore.cs`); does not test real disk filesystem access or PostgreSQL.
- **M1 — `pwa/e2e/mock-api.ts`**: provides mock recipe builders; Playwright tests use route mocking without live backend services.

Confidence: medium overall. Connected source path is clear and consistent across component, viewer, and API controller; existing unit and browser tests cover button visibility, label, and viewer opening, but leave gestures, photo ordering, navigation wrapping, zoom toggling, keyboard shortcuts, and 404 handling source-supported without focused test assertions. Runtime unit/browser/API/PostgreSQL checks **not-run** under A34; application TDD/client generation/database qualification **not-applicable** to documentation edits.

### BSL-recipe-library-022 — draft mapping, artifact status and review handoff

A58 authorizes CLI scaffolding and this bounded proposal, recipe-library delta, extraction design, tasks, and plan updates. No unresolved intent decision is needed for the supported subset; U44–U47 withhold stronger disputed/unsupported assertions under A12. Preserve BSL-recipe-library-001–019/U29–U43, BSL-018–025/U23–U28, member-creation history and BSL-015's exact historical sentence/caveat in the delta's non-normative note.

Each row maps its owning requirement and exact scenario. Step numbers mean BSL-recipe-library-020; C/B/A/F/M labels mean inspected BSL-recipe-library-021 assertions.

| Added requirement | Exact scenario | Source support / actual assertion coverage |
| --- | --- | --- |
| Offer View Original control for eligible loaded library recipes | Offer URL original control | Steps 1–3: `!isEditing && sourceType === 'url'`, ExternalLink icon, English label; B1/C1 visibility and label assertions; ExternalLink vs Images icon selection source-only |
| Offer View Original control for eligible loaded library recipes | Offer photo original control | Steps 1–3: `!isEditing && imageCount > 0`, Images icon, English label; B1 visible/click assertion; Images icon selection source-only |
| Offer View Original control for eligible loaded library recipes | Hide control while editing | Step 1: `!isEditing` guard; source-only, no dedicated test asserts entering edit mode hides View Original |
| Offer View Original control for eligible loaded library recipes | Hide control for recipes without original source or images | Step 1: `imageCount <= 0 && sourceType !== 'url'`; C1 line 502 and B1 line 73 assert `action-view-original` not visible |
| Open external source URL in a new browser context | Open external URL in a new context | Step 4: `recipe.sourceType === 'url' && recipe.sourceUrl` calls `window.open(..., '_blank', 'noopener,noreferrer')`; source-only, B1 asserts button presence without click or popup verification |
| Present original photos in the photo viewer overlay | Open photo viewer with finished dish first | Steps 5–6: `imageIndices` orders `finishedDishIndex` first when in bounds; source-only, no test asserts index reordering |
| Present original photos in the photo viewer overlay | Open photo viewer with sequential ordering | Steps 5–6: `imageIndices` returns `[0, ..., imageCount - 1]` when `finishedDishIndex` is -1 or out of bounds; source-only, B1 line 99 asserts viewer opening only |
| Present original photos in the photo viewer overlay | Open photo viewer as fallback for absent source URL | Step 4: `else` branch calls `setShowOriginals(true)` when `sourceUrl` is null/empty; source-only, no test asserts absent URL fallback |
| Navigate between original photos with wrapping | Advance to next photo with wrapping | Step 9: `handleNext` advances index modulo `length` and resets scale; source-only, no test asserts next chevron or ArrowRight |
| Navigate between original photos with wrapping | Return to previous photo with wrapping | Step 9: `handlePrev` decrements index modulo `length` and resets scale; source-only, no test asserts prev chevron or ArrowLeft |
| Navigate between original photos with wrapping | Select photo via pager indicator | Step 9: pager dot click sets direction and index; source-only, no test asserts pager dot selection |
| Support photo zooming and panning | Toggle zoom with control or image activation | Step 10: `toggleZoom` sets scale 2.5, enables drag with constraints, button shows Fit to Screen; source-only, no zoom assertion |
| Support photo zooming and panning | Reset zoom to fit to screen | Step 10: scale > 1 click or button resets scale 1 and centers image; source-only, no zoom-reset assertion |
| Dismiss photo viewer and retain detail state | Dismiss viewer via close button | Step 11: `onClose` calls `setShowOriginals(false)`, unmounting viewer and retaining detail sheet; B1 line 116 asserts close button visibility without click |
| Dismiss photo viewer and retain detail state | Dismiss viewer via Escape key | Step 11: keydown Escape listener calls `onClose`; source-only, no keyboard dismissal assertion |
| Dismiss photo viewer and retain detail state | Reopen photo viewer after dismissal | Step 11: `showOriginals` toggle mounts fresh viewer at index 0 and scale 1; source-only, no reopen assertion |
| Serve raw original photo image binary | Serve raw original photo binary | Steps 7–8: GET `/api/recipes/{id}/original/{index}` with `[AllowAnonymous]` returns HTTP 200 with MIME stream; A1 asserts 200 OK and binary length for seeded index 0 |
| Serve raw original photo image binary | Return not found for nonexistent photo | Step 8: `ImageService` throws `KeyNotFoundException`, middleware returns HTTP 404; source-only, no 404 assertion in controller tests |

| Artifact | State |
| --- | --- |
| [Proposal](../../openspec/changes/baseline-recipe-library-view-original/proposal.md) | Draft; documentation only |
| [Delta](../../openspec/changes/baseline-recipe-library-view-original/specs/recipe-library/spec.md) | Seven ADDED requirements/18 scenarios; no Purpose/MODIFIED/REMOVED/RENAMED operations |
| [Design](../../openspec/changes/baseline-recipe-library-view-original/design.md) | Extraction approach/representations/risks, no application design change |
| [Tasks](../../openspec/changes/baseline-recipe-library-view-original/tasks.md) | Documentation extraction/validation only; checkbox completion does not establish acceptance |
| Main / lifecycle | Recipe-library promoted to 44/94 (A59) and household-identity 36/92 unchanged; all nine changes remain active; no archival |
| Review handoff | Human review completed; promoted under A59; no successor extraction authorized |

**Checks:** selected strict validation passed (exit 0); all-item strict passed 11/11, zero failures (exit 0). Six-path `task verify` passed documentation, spec:check and content (exit 0). Bounded checks passed seven requirements/18 scenarios mapped, all 60 prior evidence identities matching, no duplicate main headers/Purpose edits, historical note/previous evidence/approval/uncertainty rows retained, every pre-existing file except the authorized plan unchanged, index hash/deletions preserved and exactly five new artifacts/nine active changes. These checks precede the final checklist/evidence recording edits; final post-edit strict/documentation/content/preservation outcomes and tested identity are in the final response/current harness. No runtime result is attached to a source digest. Failed/blocked applicable checks: none. Runtime **not-run** under A34; behavior TDD/application suites/client generation/live parity/database qualification **not-applicable** to documentation. No services, application mutations or database access attempted.

**Additional inspected identities:** Prior 60 inputs unchanged; these five additions bring the reusable library manifest to 65 unique inputs. Digests identify source evidence, not runtime qualification.

| Input | SHA-256 |
| --- | --- |
| `pwa/src/components/recipes/OriginalPhotosViewer.tsx` | `31cd87fa5cf47dca80148c5bcd6298b674e15eb7f5c2b79cf99c5ed6c1869236` |
| `pwa/e2e/recipe-original-viewer.spec.ts` | `71fdec75120c87150e92f9055e6e6f4c8fb2bbeab788c085ec1b575f4eb48d5e` |
| `api/src/RecipeApi/Infrastructure/IRecipeStore.cs` | `3e75a0ee6f4b2e16f4319d13edfcd50baf7340288b46ddc53dfab2b288a8204d` |
| `api/src/RecipeApi/Infrastructure/InMemoryRecipeStore.cs` | `cbfd7fcc70656d85dea89be8941d360f69ef1a622badf73e2ab5e719867cdcbb` |
| `pwa/src/locales/fr/common.json` | `b5d957a8f395091038e1c3ab64fed1b300cd7f015e0e11172ed1cba611d4e198` |

### BSL-recipe-library-023 — View Original main-spec promotion

**Authority:** A59, user “promote”, 2026-10-15, immediately after the validated A58 draft. Authorizes exact promotion of that reviewed delta and plan/task lifecycle follow-up. No separate acceptance statement, archival, successor extraction or application work is inferred.

**Result:** Appended the exact seven requirement blocks/18 scenarios from [View Original delta](../../openspec/changes/baseline-recipe-library-view-original/specs/recipe-library/spec.md) to [main recipe-library](../../openspec/specs/recipe-library/spec.md), now 44 requirements/94 scenarios. All previous main bytes, including original Purpose and 37 requirements/76 scenarios, remain an exact prefix. Only ADDED requirement blocks were appended; no operation header or non-normative evidence note was copied into main.

**Evidence/preservation:** Full delta, historical BSL-015 sentence/caveat, proposal/design/metadata and BSL-recipe-library-001–022/U29–U47 evidence/limits remain unchanged. BSL-018–025/U23–U28 and historical member-creation limitations retained. All 65 source/dependency digests rechecked unchanged. Household-identity stays 36/92. All nine changes remain active; archives, index, unrelated tracked/untracked work and deletions are preserved. Promotion adds no runtime evidence and does not resolve absent URL, external navigation, native image error or gesture limits.

**Checks / stop:** Main recipe-library strict validation and all-spec strict validation (2/2) passed, exit 0. Final all-item strict, three-path documentation/content, exact-append/delta-equality and full preservation outcomes are in the final response/current harness at final content identity. Failed/blocked applicable checks: none observed. Runtime unit/browser/API/PostgreSQL **not-run** under A34; application TDD, client generation, live parity and database behavior checks **not-applicable** to documentation edits. No services or application mutations executed. Stop after this promotion; no archival or successor extraction authorized.

### BSL-recipe-library-024 — Ordinary-household recipe deletion, Recycle Bin, restore, and PIN-protected purge discovery

**Behavior and actor:** An authenticated household member in viewing mode moves a loaded recipe to the Recycle Bin (`action-move-to-bin`), views deleted recipes in the Recycle Bin bottom sheet opened from the library browse header (`recycle-bin-entry`), restores a soft-deleted recipe back to active library listings (`action-restore-${id}`), or permanently purges a soft-deleted recipe by submitting the elevated actions PIN (`action-purge-${id}`).

**Entry state / trigger / observable outcome:**
1. Loaded detail sheet Move to Bin trigger: when `!isLoading && recipe && !isEditing` in `RecipeDetailSheet.tsx:579–588`, `ActionGearMenu` is rendered (`action-gear-menu`). Opening the gear menu reveals `action-move-to-bin` with a trash icon. Clicking it immediately invokes `handleMoveToBin()` without a secondary confirmation prompt.
2. Soft-delete request and active-planner conflict check: `deleteRecipe(recipe.id)` sends `DELETE /api/recipes/{id}`. `RecipeController.Delete` reads `familyMemberId` (defaulting to `Guid.Empty` if omitted) and calls `RecipeService.SoftDeleteRecipe`. The service queries `db.CalendarEvents.Where(e => e.RecipeId == id && e.Date >= today)`. If any active or future calendar events exist, it returns HTTP 409 Conflict with `{ errorCode: "RECIPE_ASSIGNED_TO_PLANNER", message: "...", assignedDays: [...] }`. Past calendar events (`Date < today`) are ignored.
3. Soft-delete persistence and search doc cleanup: when unassigned to active slots, the service sets `recipe.DeletedAt = DateTimeOffset.UtcNow` and `recipe.DeletedBy = deletedBy`. It finds and removes the `RecipeSearchDocuments` row for `id` synchronously, then calls `db.SaveChangesAsync()`. It returns HTTP 200 with the soft-deleted recipe detail response (`deletedAt` populated). No background workflow is triggered and no SSE event is emitted.
4. Detail dismissal and library list refresh: on success, `handleMoveToBin` invokes `onDeleted?.()` and `onClose()`. In `RecipesPage` (`recipes/page.tsx:891–893`), `onDeleted` calls `runSearch(...)`, refreshing the active recipe query and removing the deleted recipe card from view without page navigation or URL changes. On failure (e.g. 409 Conflict or network error), the catch block logs `console.error('Failed to move recipe to bin', error)`, no user-facing toast or inline banner is shown, and the detail sheet remains open (U48).
5. Global query filtering on soft-deleted recipes: `RecipeDbContext.cs:81` configures `entity.HasQueryFilter(e => e.DeletedAt == null)` on `Recipes`. This filter automatically excludes soft-deleted recipes from standard queries: `GET /api/recipes` (paged list), `POST /api/recipes/search` (search queries), and `GET /api/recipes/{id}` (returning HTTP 404 NotFound).
6. Recycle Bin sheet presentation and listing: in `browse-all-stack/page.tsx:675–684`, the header provides `data-testid="recycle-bin-entry"` with the `Recycle` icon. Clicking it sets `isTrashOpen(true)`, rendering `RecycleBinSheet.tsx`. The sheet mounts with `isLoading = true`, showing a loading indicator, and calls `getTrashItems()` (`GET /api/recipes/trash`). `RecipeService.GetTrash()` uses `.IgnoreQueryFilters().Where(r => r.DeletedAt != null).OrderByDescending(r => r.DeletedAt)`. If empty, the sheet displays "Your Recycle Bin is empty." If populated, it renders `trash-list` with each item's name (or "Unknown Recipe"), localized deletion date, Restore button (`action-restore-${id}`), and Delete button (`action-purge-${id}`).
7. Restore execution and side effects: clicking Restore sends `POST /api/recipes/{id}/restore`. `RecipeService.RestoreRecipe` locates the recipe with `IgnoreQueryFilters()`, clears `DeletedAt` and `DeletedBy` to null, updates `UpdatedAt`, and saves changes. It then triggers the background workflow `index-recipe-search` with `recipeId` and source fingerprint (wrapped in a non-fatal try/catch). It returns HTTP 200 with restored recipe detail. On success, `RecycleBinSheet` removes the item from local state. The recipe immediately becomes visible in standard library reads and search. No SSE broadcast occurs (U49).
8. Elevated PIN dialog and permanent purge: clicking Delete (`action-purge-${id}`) opens `elevated-pin-dialog`. The dialog renders a destructive warning, a password PIN input, a Cancel button, and a Delete Forever button (disabled when PIN is empty or submitting). Submitting sends `DELETE /api/recipes/{id}/purge` with `X-Elevated-Pin`.
9. Purge verification, filesystem asset deletion, and database cascade: `RecipePurgeService.PurgeAsync` checks `ELEVATED_ACTIONS_PIN` from the environment. If unconfigured, returns 503 `PIN_NOT_CONFIGURED`. If the provided PIN does not match, returns 403 `FORBIDDEN`. If the recipe is not found, returns 404. If `recipe.DeletedAt == null`, returns 409 `NOT_IN_TRASH`. Inside a database transaction, it cancels pending index jobs (`WorkflowStatus.Failed`), removes `RecipeSearchDocuments`, `RecipeVotes`, and all `CalendarEvents` (both past and future). It recursively deletes the recipe directory on disk (`RecipesRootResolver.Root/{id}`) before removing the recipe from the database. On success, returns HTTP 200 `{ data: { purged: true } }`. The client removes the item from the bin list and closes the dialog. On error, the dialog stays open and displays a generic error message (U51).

**Business rule and eligibility:**
- Soft-delete: available on any loaded recipe in viewing mode; blocked if scheduled on or after the current date; persists deletion timestamp and member attribution.
- Recycle Bin: accessible from the browse library header; lists all soft-deleted recipes in descending deletion date order.
- Restore: re-includes recipe in active library listings and triggers search index re-indexing.
- Permanent Purge: restricted to recipes already in the Recycle Bin; requires server-configured elevated PIN; deletes filesystem directory assets and all related database records.

**Failure / cancellation / recovery behavior:**
- Soft-delete failure (e.g. 409 Conflict): logs to console, keeps sheet open and recipe visible; no user-facing error message (U48).
- PIN dialog cancellation: dismisses dialog without sending purge request.
- Purge rejection: displays inline error message in dialog; item remains in Recycle Bin.

**Configuration and time assumptions:**
- `ELEVATED_ACTIONS_PIN` environment variable controls purge authorization.
- Deletion timestamps use UTC (`DateTimeOffset.UtcNow`).
- Active planner conflict evaluates `CalendarEvent.Date >= DateOnly.FromDateTime(DateTime.UtcNow)`.

**Ordered trace:**
- Detail sheet: `RecipeDetailSheet.tsx` (action gear menu `action-move-to-bin`) → `handleMoveToBin` → client `deleteRecipe(id)` → `DELETE /api/recipes/{id}` → `RecipeController.Delete` → `RecipeService.SoftDeleteRecipe` → `RecipeDbContext.Recipes` / `RecipeSearchDocuments`
- Recycle Bin view: `browse-all-stack/page.tsx` (`recycle-bin-entry`) → `RecycleBinSheet.tsx` → client `getTrashItems()` → `GET /api/recipes/trash` → `RecipeController.GetTrash` → `RecipeService.GetTrash` → `RecipeDbContext.Recipes.IgnoreQueryFilters()`
- Restore: `RecycleBinSheet.tsx` (`action-restore-${id}`) → `restoreRecipe(id)` → `POST /api/recipes/{id}/restore` → `RecipeController.Restore` → `RecipeService.RestoreRecipe` → `SearchFingerprintService` / `IWorkflowOrchestrator`
- Purge: `RecycleBinSheet.tsx` (`action-purge-${id}` → `elevated-pin-dialog`) → `purgeRecipe(id, pin)` → `DELETE /api/recipes/{id}/purge` with `X-Elevated-Pin` → `RecipeController.Purge` → `RecipePurgeService.PurgeAsync` → `RecipesRootResolver` / filesystem `Directory.Delete` / `RecipeDbContext` transaction

**Relevant source files and symbols:**
- `pwa/src/components/recipes/RecipeDetailSheet.tsx` (`handleMoveToBin`, `ActionGearMenu` render)
- `pwa/src/components/recipes/ActionGearMenu.tsx` (`action-move-to-bin`, `handleMoveToBin`)
- `pwa/src/components/recipes/RecycleBinSheet.tsx` (`RecycleBinSheet`, `handleRestore`, `handlePinSubmit`, `openPinDialog`)
- `pwa/src/lib/api/recipes.ts` (`deleteRecipe`, `getTrashItems`, `restoreRecipe`, `purgeRecipe`, `TrashItem`)
- `pwa/src/app/(app)/recipes/page.tsx` (`onDeleted` callback and `runSearch` refresh)
- `pwa/src/app/(app)/browse-all-stack/page.tsx` (`recycle-bin-entry` trigger, `isTrashOpen` state)
- `api/src/RecipeApi/Controllers/RecipeController.cs` (`Delete`, `GetTrash`, `Restore`, `Purge`)
- `api/src/RecipeApi/Services/RecipeService.cs` (`SoftDeleteRecipe`, `GetTrash`, `RestoreRecipe`)
- `api/src/RecipeApi/Services/RecipePurgeService.cs` (`PurgeAsync`, `CancelPendingIndexJobsAsync`, `DeleteRecipeDirectory`)
- `api/src/RecipeApi/Data/RecipeDbContext.cs` (`HasQueryFilter(e => e.DeletedAt == null)`)
- `api/src/RecipeApi/Models/Recipe.cs` (`DeletedAt`, `DeletedBy`)
- `specs/openapi.yaml` (`DELETE /api/recipes/{id}`, `GET /api/recipes/trash`, `POST /api/recipes/{id}/restore`, `DELETE /api/recipes/{id}/purge`)

**Relevant test assertions and substitutions:**
- `RecipeSoftDeleteIntegrationTests.cs`: asserts `DELETE /api/recipes/{id}` sets `deleted_at`, returns 200, excludes from `GET /api/recipes`, detail 404, excludes from search, removes search doc, includes in trash, returns 409 Conflict when assigned to active planner; asserts `GetTrash` returns soft-deleted recipes; asserts `Restore` clears `deleted_at`, re-includes in active reads/search, and removes from trash.
- `RecipePurgeIntegrationTests.cs`: asserts `Purge` removes DB row, returns 200 `{ purged: true }`, rejects 409 when not in trash, rejects 403 on missing/incorrect PIN, rejects 503 when PIN unconfigured, removes search doc, cancels pending index workflows, removes votes/calendar events, and recursively deletes recipe directory from disk.
- `recipes/page.test.tsx`: asserts moving recipe to bin closes detail sheet, refreshes search results, and keeps sheet open without refresh on failure.
- `search-hardening.spec.ts`: E2E soft-delete, trash verification, restore, and PIN purge with success/error verification.
- `browse-all-stack.spec.ts`: asserts recycle-bin-entry visibility and opening trash view.

**Evidence class and confidence:** Implementation-supported; confidence high for endpoint, query filtering, and dialog mechanics; medium for unasserted multi-client synchronization.

**Check command / outcome / environment / content identity:** Runtime not-run under A34; implementation-supported under A10. Checked with source snapshot `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`.

**Open question or explicit limitation:** U48–U52 record confirmation omission, silent soft-delete rejection, absence of live SSE, generic purge error UI, and missing RecycleBinSheet unit tests.

**Disposition:** drafted under A60.

### BSL-recipe-library-025 — Recipe deletion, Recycle Bin, restore, and PIN purge assertion review

**Inspected test assertions and coverage boundaries:**
- `api/src/RecipeApi.Tests/Integration/RecipeSoftDeleteIntegrationTests.cs`:
  - `Delete_SetsDeletedAt_On_Recipe_Row`: asserts `DELETE /api/recipes/{id}` returns HTTP 200 and sets `DeletedAt` on entity with `IgnoreQueryFilters()`.
  - `Delete_Returns200_With_SoftDeleted_RecipeBody`: asserts HTTP 200 payload returns `{ id, deletedAt }`.
  - `Delete_Removes_Recipe_From_Active_Library`: asserts deleted recipe ID is absent from `GET /api/recipes`.
  - `Delete_Makes_RecipeDetail_Return404`: asserts `GET /api/recipes/{id}` returns HTTP 404 after soft-delete.
  - `Delete_Removes_Recipe_From_Search_Results`: asserts deleted recipe is excluded from `POST /api/recipes/search`.
  - `Delete_Removes_SearchDocument`: asserts corresponding `RecipeSearchDocuments` row is removed.
  - `Delete_Includes_Recipe_In_Trash`: asserts deleted recipe is present in `GET /api/recipes/trash` items.
  - `Delete_Returns409_When_Recipe_Is_Assigned_To_Planner`: asserts `DELETE` returns HTTP 409 Conflict with `RECIPE_ASSIGNED_TO_PLANNER` and `assignedDays` when scheduled for `tomorrow`.
  - `GetTrash_Returns_All_SoftDeleted_Recipes`: asserts `GET /api/recipes/trash` lists multiple soft-deleted recipes.
  - `Restore_Clears_DeletedAt_And_Returns_Recipe`: asserts `POST /api/recipes/{id}/restore` returns 200 and sets `DeletedAt = null`.
  - `Restore_ReIncludes_Recipe_In_Active_Surfaces`: asserts restored recipe appears in `GET /api/recipes` and `POST /api/recipes/search`.
  - `Restore_Removes_Recipe_From_Trash`: asserts restored recipe is omitted from `GET /api/recipes/trash`.
- `api/src/RecipeApi.Tests/Integration/RecipePurgeIntegrationTests.cs`:
  - `Purge_RemovesRecipeRow_FromDatabase`: asserts `DELETE /api/recipes/{id}/purge` with valid PIN removes DB entity row.
  - `Purge_Returns200_WithPurgedTrue`: asserts response is `{ data: { purged: true } }`.
  - `Purge_Returns409_WhenRecipeIsNotInTrash`: asserts 409 Conflict when recipe `DeletedAt` is null.
  - `Purge_Returns403_WhenPinHeaderMissing`: asserts 403 Forbidden without `X-Elevated-Pin` header.
  - `Purge_Returns403_WhenPinIsWrong`: asserts 403 Forbidden with incorrect PIN.
  - `Purge_TrimsConfiguredPinAndHeaderValue`: asserts trimming whitespace around PIN.
  - `Purge_Returns503_WhenPinEnvVarNotConfigured`: asserts 503 `PIN_NOT_CONFIGURED` when env var is null.
  - `Purge_RemovesSearchDocument_FromDatabase`: asserts search doc removed during purge.
  - `Purge_CancelsPendingWorkflowInstances_ForRecipe`: asserts pending index jobs are cancelled.
  - `Purge_RemovesRealisticTrashDependencies_AndRecipeDirectory`: asserts directory deleted from disk, search doc removed, votes removed, calendar events removed.
- `pwa/src/app/(app)/recipes/page.test.tsx`:
  - `refreshes %s results after moving a recipe to the bin without navigating`: asserts clicking `action-gear-menu` → `action-move-to-bin` calls `mocks.deleteRecipe(id)`, closes sheet, removes card, and re-executes `searchRecipes` with current filter parameters.
  - `keeps the recipe available and the detail sheet open when moving to the bin fails`: asserts rejected `deleteRecipe` logs to `console.error`, leaves detail sheet open and recipe card in document, with no search re-execution.
- `pwa/src/components/recipes/ActionGearMenu.test.tsx`:
  - Asserts `action-move-to-bin` renders in dropdown and invoking it calls `onMoveToBin()`.
- `pwa/e2e/search-hardening.spec.ts`:
  - Scenario: moves recipe to bin from `/recipes`, navigates to `/browse-all-stack`, clicks `recycle-bin-entry`, verifies `trash-list` and `trash-item-${id}`, clicks `action-restore-${id}`, verifies item removed.
  - Scenario: opens bin, clicks `action-purge-${id}`, enters PIN into `elevated-pin-dialog`, submits, verifies dialog closes and item removed.
  - Scenario: incorrect PIN in dialog shows `elevated-pin-error` and keeps item in list.
- `pwa/e2e/browse-all-stack.spec.ts`:
  - Asserts `recycle-bin-entry` button visibility and click opening `trash-list`.

**Evidence class and confidence:** Implementation-supported; integration and E2E assertions provide high confidence for API routes, PIN validation, DB/file purge, and sheet interaction; medium for unasserted multi-client synchronization.

**Open question or explicit limitation:** U48–U52.

**Disposition:** drafted under A60.

### BSL-recipe-library-026 — Recipe deletion, Recycle Bin, restore, and PIN purge baseline proposal and draft

**Authority:** A60 session instruction, 2026-10-15. Authorizes discovery and drafting only ordinary-household recipe deletion (Move to Bin / soft-delete), Recycle Bin listing, recipe restore, and PIN-protected permanent purge behavior. Stop at validated draft for human review; no application changes, promotion, archival, or successor extraction.

**Artifacts produced:**
| Artifact | Status |
| --- | --- |
| [Proposal](../../openspec/changes/baseline-recipe-library-deletion-restore-purge/proposal.md) | Draft; documentation only |
| [Delta](../../openspec/changes/baseline-recipe-library-deletion-restore-purge/specs/recipe-library/spec.md) | 11 ADDED requirements/28 scenarios; no Purpose/MODIFIED/REMOVED/RENAMED operations |
| [Design](../../openspec/changes/baseline-recipe-library-deletion-restore-purge/design.md) | Technical extraction approach, representations, and risks; no application design change |
| [Tasks](../../openspec/changes/baseline-recipe-library-deletion-restore-purge/tasks.md) | Documentation extraction/validation checklist only; checkbox completion does not establish acceptance |
| Main / lifecycle | Recipe-library 44/94 and household-identity 36/92 unchanged; all ten changes remain active; no archival |
| Review handoff | Human draft review pending; promotion and archival require separate authorization |

**Requirements and scenario mapping:**
1. `Offer Move to Bin control for loaded library recipe detail`:
   - `Access Move to Bin from the detail gear menu`: `RecipeDetailSheet.tsx:579–588`, `ActionGearMenu.tsx:84–93`, `ActionGearMenu.test.tsx:21–52`, `recipes/page.test.tsx:740–741`.
   - `Trigger Move to Bin immediately without confirmation`: `RecipeDetailSheet.tsx:309–321`, `ActionGearMenu.tsx:34–37`, `recipes/page.test.tsx:781–786`, `recipes.spec.ts:190–192`.
2. `Soft-delete the loaded recipe when not assigned to active planner slots`:
   - `Soft-delete unassigned recipe successfully`: `RecipeController.cs:412–436`, `RecipeService.cs:616–640`, `RecipeSoftDeleteIntegrationTests.cs:32–60`, `specs/openapi.yaml:1750–1772`.
   - `Record actor and timestamp on soft-deleted recipe`: `RecipeService.cs:630–631`, `RecipeSoftDeleteIntegrationTests.cs:32–44`.
3. `Reject soft-delete when recipe is assigned to active planner slots`:
   - `Reject deletion of scheduled recipe with Conflict`: `RecipeService.cs:621–628`, `RecipeController.cs:422–428`, `RecipeSoftDeleteIntegrationTests.cs:139–151`, `specs/openapi.yaml:1759–1772`.
   - `Retain recipe availability on deletion rejection`: `RecipeService.cs:627–628`, `RecipeSoftDeleteIntegrationTests.cs:139–151`.
4. `Synchronize library view and dismiss detail after deletion`:
   - `Dismiss detail sheet and refresh library on deletion success`: `RecipeDetailSheet.tsx:313–315`, `recipes/page.tsx:891–893`, `recipes/page.test.tsx:754–814`, `recipes.spec.ts:187–198`.
   - `Retain detail sheet and library state on deletion failure`: `RecipeDetailSheet.tsx:316–318`, `recipes/page.test.tsx:816–831`.
5. `Exclude soft-deleted recipes from standard library listings and search`:
   - `Exclude soft-deleted recipe from standard paged library reads`: `RecipeDbContext.cs:81`, `RecipeSoftDeleteIntegrationTests.cs:64–75`.
   - `Exclude soft-deleted recipe from recipe search results`: `RecipeService.cs:633–636`, `RecipeSoftDeleteIntegrationTests.cs:92–119`.
   - `Return NotFound for soft-deleted recipe detail lookup`: `RecipeDbContext.cs:81`, `RecipeSoftDeleteIntegrationTests.cs:78–88`.
6. `Open Recycle Bin sheet from library browse header`:
   - `Present Recycle Bin sheet from browse header trigger`: `browse-all-stack/page.tsx:675–696`, `browse-all-stack/page.test.tsx:990–1005`, `browse-all-stack.spec.ts:742–747`.
   - `Dismiss Recycle Bin sheet back to browse view`: `RecycleBinSheet.tsx:94–110`, `browse-all-stack/page.tsx:696`, `browse-all-stack/page.test.tsx:1006–1011`.
7. `List soft-deleted recipes in Recycle Bin`:
   - `Show loading indicator while retrieving trash items`: `RecycleBinSheet.tsx:21–44, 114–117`.
   - `Display empty bin message when no recipes are deleted`: `RecycleBinSheet.tsx:120–127`.
   - `Render soft-deleted recipes with name, date, and actions`: `RecycleBinSheet.tsx:128–166`, `RecipeService.cs:643–658`, `RecipeSoftDeleteIntegrationTests.cs:122–135, 154–171`.
8. `Restore soft-deleted recipe to active library`:
   - `Restore soft-deleted recipe to active status`: `RecycleBinSheet.tsx:46–60`, `recipes.ts:685–687`, `RecipeController.cs:447–459`, `RecipeService.cs:661–671`, `RecipeSoftDeleteIntegrationTests.cs:174–218`.
   - `Trigger search index re-indexing upon recipe restore`: `RecipeService.cs:673–687`.
   - `Remove restored recipe from trash list view`: `RecycleBinSheet.tsx:50`, `RecipeSoftDeleteIntegrationTests.cs:220–234`, `search-hardening.spec.ts:248–252`.
9. `Present elevated PIN dialog for permanent purge`:
   - `Open PIN confirmation dialog for selected trash recipe`: `RecycleBinSheet.tsx:62–64, 172–229`, `search-hardening.spec.ts:269–272`.
   - `Dismiss PIN dialog on cancel without sending request`: `RecycleBinSheet.tsx:66–68, 209–216`.
10. `Permanently purge soft-deleted recipe with valid elevated PIN`:
    - `Purge recipe, filesystem assets, and dependencies with valid PIN`: `RecycleBinSheet.tsx:70–80`, `recipes.ts:689–702`, `RecipeController.cs:462–480`, `RecipePurgeService.cs:17–110`, `RecipePurgeIntegrationTests.cs:36–64, 170–190`, `search-hardening.spec.ts:254–278`.
    - `Cancel pending index workflows during purge`: `RecipePurgeService.cs:112–141`, `RecipePurgeIntegrationTests.cs:150–167`.
    - `Remove purged recipe from trash list and close PIN dialog`: `RecycleBinSheet.tsx:78–79`, `search-hardening.spec.ts:276–278`.
11. `Reject permanent purge on invalid PIN, missing configuration, or non-trash recipe`:
    - `Reject purge with 403 on missing or incorrect PIN`: `RecipePurgeService.cs:43–57`, `RecipeController.cs:486`, `RecipePurgeIntegrationTests.cs:77–97`, `specs/openapi.yaml:2040–2048`.
    - `Reject purge with 503 when elevated PIN is unconfigured`: `RecipePurgeService.cs:37–41`, `RecipeController.cs:481–485`, `RecipePurgeIntegrationTests.cs:114–128`, `specs/openapi.yaml:2059–2066`.
    - `Reject purge with 409 when recipe is not in trash`: `RecipePurgeService.cs:65–66`, `RecipeController.cs:487–491`, `RecipePurgeIntegrationTests.cs:66–74`, `specs/openapi.yaml:2049–2057`.
    - `Display error feedback and retain dialog on purge rejection`: `RecycleBinSheet.tsx:80–90`, `search-hardening.spec.ts:535–538`.

**Additional inspected identities:** Prior 65 inputs unchanged; these two additions bring the reusable library manifest to 67 unique inputs. Digests identify source evidence, not runtime qualification.

| Input | SHA-256 |
| --- | --- |
| `pwa/src/components/recipes/RecycleBinSheet.tsx` | `b91f5e1a53e5ec7997de650c61e5b4b9f1af5708435644dcfdb7a1c49d637021` |
| `api/src/RecipeApi.Tests/Integration/RecipePurgeIntegrationTests.cs` | `3c777812c36cf7e0652bf0fedbbfc01f6b354eeff0570828fb8759b7b73cc7e8` |

### BSL-recipe-library-027 — Recipe deletion, Recycle Bin, restore, and PIN purge main-spec promotion

**Authority:** A61, user “promote”, 2026-10-15, immediately after the validated A60 draft. Authorizes exact promotion of that reviewed delta and plan/task lifecycle follow-up. No separate acceptance statement, archival, successor extraction or application work is inferred.

**Result:** Appended the exact 11 requirement blocks/28 scenarios from [Deletion, Recycle Bin, restore, and purge delta](../../openspec/changes/baseline-recipe-library-deletion-restore-purge/specs/recipe-library/spec.md) to [main recipe-library](../../openspec/specs/recipe-library/spec.md), now 55 requirements/122 scenarios. All previous main bytes, including original Purpose and 44 requirements/94 scenarios, remain an exact prefix. Only ADDED requirement blocks were appended; no operation header or non-normative evidence note was copied into main.

**Evidence/preservation:** Full delta, historical BSL-015 sentence/caveat, proposal/design/metadata and BSL-recipe-library-001–026/U29–U52 evidence/limits remain unchanged. BSL-018–025/U23–U28 and historical member-creation limitations retained. All 67 source/dependency digests rechecked unchanged. Household-identity stays 36/92. All ten changes remain active; archives, index, unrelated tracked/untracked work and deletions are preserved. Promotion adds no runtime evidence and does not resolve confirmation omission, silent deletion failure, absent live SSE broadcasts, generic purge UI error messages, or calendar event cleanup asymmetry.

**Checks / stop:** Main recipe-library strict validation and all-spec strict validation (2/2) passed, exit 0. Final all-item strict, three-path documentation/content, exact-append/delta-equality and full preservation outcomes are in the final response/current harness at final content identity. Failed/blocked applicable checks: none observed. Runtime unit/browser/API/PostgreSQL **not-run** under A34; application TDD, client generation, live parity and database behavior checks **not-applicable** to documentation edits. No services or application mutations executed. Stop after this promotion; no archival or successor extraction authorized.


## Coverage audit — 2026-10-16 (BSL-recipe-library-028)

**Authorization and stop:** User's attached coverage-audit request authorizes this documentation-only record and a small index correction. No requirements drafting, main-spec mutation, promotion, archival, fixes, successor execution, service startup or runtime/network/database/model qualification. This record supersedes historical next-action text only for audit status; A34 and all U29–U52 remain open with their original meaning. Historical member-creation and identity qualifications are preserved.

**Conclusion:** Source-supported coverage is **partial** for the ordinary-household library entry, both browse presentations, recipe fact reads/updates, asset operations and deletion lifecycle, including API-only reads/updates. The seven inspected library deltas are fully promoted as text, but material unextracted behavior and overstatements remain. Runtime qualification is **not-run**, not failed or verified. Do not mark the whole capability complete.

### Boundary, identity and method

Audited branch `moving-to-openspec`, HEAD `db6fede90ec0a7dfff26e6050036310bc8211837`, 2026-10-16. The starting tree contains staged capability-plan/spec work and an untracked `baseline-meal-planning-empty-day-recipe-assignment` change. The target plan is already staged as added; the index already has staged modifications. Their before-images, complete Git status/index entries and tracked/untracked file hashes were saved before audit edits to `/tmp/wfs-recipe-library-audit-20261016/`. This session issued no staging command. A concurrent session subsequently staged shared documentation (including an intermediate audit version) and promoted empty-day planning; those index changes are preserved, not reverted. Before-image comparison identified concurrent changes in the planning change design/tasks, meal plan and main spec, and shared index. No application-source change was found; the 67 historical library inputs remain unchanged. A refreshed preservation snapshot distinguishes that external work from the two audit-owned edits. Source identity is the working-tree bytes, not HEAD alone: all **67/67** historical library evidence digests were recomputed and match. Additional current identities are recorded below. These hashes establish inspected content, not observed behavior.

Installed `openspec-explore` used for investigation within the user's explicit audit-record authorization. `openspec list --json` resolves root `/Users/alex/Code/whats-for-supper`, source `nearest`; no store override, initialization or configuration changes. CLI lists **22 active changes**, including seven library deltas, and eight main specs: background-processing 14, household-identity 36, household-live-updates 15, meal-planning 30 after concurrent promotion (15 at audit entry), recipe-capture 37, recipe-library 55, recipe-quality 37, recipe-sharing 9 requirements. Main library actual headers are **55 requirements / 122 scenarios**, with no repeated requirement headings. Inventory/task status establishes presence, not coverage.

Read main requirement bodies and scenarios, connected browser entry/callers, adapter/generated representations, OpenAPI, controller/service, storage/EF/SQL and actual test assertion bodies. Below, R01–R55 are audit-local ordinal references, not new requirement IDs. Every exact scenario header is listed under its current requirement. E references expand to paths/symbols/assertion substitutions; all rows inherit those boundaries. **Captured** means the bounded behavior has normative coverage and executable source support, not that its assertions were executed or exhaustive. **Partial** means some existing coverage has a gap/overstatement. **Missing** means implemented behavior has no promoted library extraction; **unresolved** withholds a disputed claim/ownership; **intentionally excluded** identifies a concrete other owner or an explicit environment boundary. Behavior evidence for source-supported rows is **implementation-supported**; conflicting/untraced portions are **incomplete**, never verified. No inference from comments or test titles is treated as normative support.

### Evidence paths and assertion substitutions

| Key | Current executable path and symbols | Actual inspected assertions and limits |
| --- | --- | --- |
| B | `pwa/src/components/home/HomeSections.tsx:BrowseLibraryTrigger`; `pwa/src/app/(app)/browse-all-stack/page.tsx:fetchLibraryData`, `wrapToLastPage`, swipe handlers, `loadNextListPage`, detail/bin mounts; `pwa/src/components/recipes/EndCard.tsx` | `pwa/src/app/(app)/browse-all-stack/page.test.tsx` asserts request arguments, list dedupe/scroll, first/previous/last card, 180-item wrap and same-card dismissal. Motion is replaced, drag handlers invoked directly; API methods mocked; detail/bin replaced with stub children. `pwa/e2e/browse-all-stack.spec.ts` uses real browser components against route mocks, asserts swipe targets, list paging, restored saved view, depth/control presence, empty capture CTA. These do not prove DB order, real touch behavior or every recipe traversed after a wrap. |
| S | `pwa/src/store/browseStackStore.ts:appendRecipes`, `reset`; `pwa/src/components/recipes/RecipeStackCard.tsx:handleDragEnd`, `handleTap`; `StackActionBar.tsx:handleIndividualToggle`; `DiscoveryToggleCard.tsx` | Browse page assertions cover store results; `RecipeStackCard.test.tsx` covers rendered content/interaction under motion substitutions. Stack browser pending/error assertions check loading-test-ID disappearance and toggle visibility; they do not assert reverted boolean/pressed state. |
| D | `pwa/src/components/recipes/RecipeDetailSheet.tsx` load effect, draft/rating/notes/discovery handlers and render; `ActionGearMenu.tsx`; `pwa/src/lib/duration.ts:formatRecipeTime` | `RecipeDetailSheet.test.tsx` mocks recipes API, family/UI stores and image util; covers controls, gear/edit visibility, cancel presentation, no-meal Save disabled, cuisine/meal payload and View Original eligibility. `pwa/e2e/recipes.spec.ts` enters `/recipes` (Search), uses local stateless PATCH routes for editing/notes/discovery; assertions do not prove persistence/reload. `pwa/src/app/(app)/recipes/page.test.tsx` separately asserts Search deletion refresh/failure using mocked API. |
| A | `pwa/src/lib/api/recipes.ts:getRecipe`, `mapToRecipe`, `updateRecipe`, trash/restore/purge/upload/regenerate wrappers; generated `pwa/src/lib/api/generated/api/recipes/index.ts`, `item/index.ts`, `models/index.ts`; `pwa/src/lib/imageUtils.ts` | Adapter tests in `pwa/src/lib/api/recipes.test.ts` principally cover search and sharing/bundle mapping, not complete library PATCH preservation. Generated list supports ID/name/url; generated PATCH expects data object; instructions use UntypedNode. Manual purge/upload use fetch; upload reads top-level id although actual response is wrapped. |
| L | `api/src/RecipeApi/Controllers/RecipeController.cs:List`, `Detail`, `Update`, `GetLibrarySummary`, `Delete`, `Restore`, `GetTrash`; `api/src/RecipeApi/Services/RecipeService.cs:GetRecipesList`, `GetRecipeDetail`, `MapToDto`, `DeserializeIngredients`, `ExtractRecipeInstructions`, `UpdateRecipe`, `SoftDeleteRecipe`, `RestoreRecipe`; `Dto/RecipeDto.cs`, `Dto/UpdateRecipeDto.cs` | `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs`, `RecipeLibrarySummaryTests.cs`; `Services/RecipeServiceTests.cs`, `ValidationServiceTests.cs`; `Integration/RecipeUpdateIntegrationTests.cs`, `RecipeSoftDeleteIntegrationTests.cs`. Factory defaults to auth-disabled TestServer, EF InMemory, InMemoryRecipeStore and mocked orchestrator which inserts workflow rows, not executing processors. Readiness/filter/order/field assertions have these substitutions. |
| I | `api/src/RecipeApi/Services/ImageService.cs`; `Infrastructure/IRecipeStore.cs`, `LocalRecipeStore.cs`, `InMemoryRecipeStore.cs`; `Infrastructure/SuccessWrappingFilter.cs`; `RecipeController.GetImage/GetHero/UploadOriginal/RegenerateHero` | Controller raw binary tests use InMemoryRecipeStore; local store serves hero.webp as image/webp while test store returns JPEG. `Integration/RecipeActionIntegrationTests.cs` asserts upload numeric next index, DB count, 201, regeneration workflow once, missing recipe 404; regeneration 202/trigger; not actual image generation. `RecipeUpdateIntegrationTests` asserts instruction DB JSON and info-store array plus index trigger once / recipe_ready never. |
| V | `pwa/src/components/recipes/OriginalPhotosViewer.tsx:imageIndices`, `handleNext`, `handlePrev`, `toggleZoom`, touch handlers, keyboard effect/pager | `pwa/e2e/recipe-original-viewer.spec.ts` asserts synthesized hidden, URL text/icon wrapper and photo viewer opens. URL case never activates button. `pwa/e2e/mock-api.ts` serves empty original JPEG bytes; no meaningful ordering/navigation/zoom/pinch/error/Escape assertion inspected. |
| T | `pwa/src/components/recipes/RecycleBinSheet.tsx` mount effect, `handleRestore`, `openPinDialog`, `closePinDialog`, `handlePinSubmit` | No dedicated component test found. Browse unit test stubs this sheet. `pwa/e2e/search-hardening.spec.ts` supplies local stateful delete/trash/restore routes, asserts sheet closes on Search delete, trash item exists then disappears on restore, purge dialog closes/item removed, wrong-PIN error retained; it does not observe server persistence or underlying Browse refresh. |
| P | `api/src/RecipeApi/Services/RecipePurgeService.cs:PurgeAsync`, `CancelPendingIndexJobsAsync`, `DeleteRecipeDirectory`; `RecipeController.Purge`; `Data/RecipeDbContext.cs`; `api/database/schema.sql` | `Integration/RecipePurgeIntegrationTests.cs` uses default InMemory factory, ignores transaction warning; one test creates actual temp recipe directory and checks its deletion with row/dependency absence. No real PostgreSQL JSONB query, FK cascade, rollback-after-filesystem-removal or racing-worker assertion. SQL rating 0..3 check and added_by SET NULL are inspected schema declarations, not runtime enforcement evidence. |
| F | `RecipeService.MapToDto`; `Models/Recipe.cs`, `Models/RecipeInfo.cs`; `Services/Processors/ClassifyRecipeVegetarianProcessor.cs:ExecuteAsync`; `RecipeSearchPredicate.cs` immediate vegetarian filter | `Services/Processors/ClassifyRecipeVegetarianProcessorTests.cs` uses mocked IChatClient, InMemory context/fixed clock; asserts supplied boolean stored, ingredient prompt contains beans, malformed result preserves confirmed true. No real model, migration/backfill or library null-to-false response assertion. Classification administration is outside this audit. |

All E2E suites import `pwa/e2e/fixtures.ts`: fixed 2026-05-04 time, seeded access/member cookies/locale and unmatched API 403 interception. `pwa/e2e/mock-api.ts` uses synthetic list/summary/detail, stateless PATCH/DELETE/restore/purge defaults and empty raw image buffers; later route overrides may supply local state but never the real backend. InMemory store substitutions do not establish local filesystem encoding or PostgreSQL behavior. Existing assertions were inspected, **not run**.

### Specification → implementation matrix (all promoted headers)

Actor is an ordinary household person for client controls, an authenticated API caller for persisted list/detail/update/lifecycle operations, and an anonymous or authenticated asset requester for R44. A row spanning client/API uses both actors. Paths in the source column expand through the evidence keys above. Each row lists **all** its exact current scenario headers; missing focused assertions are explicitly reported rather than replaced by a test title. For captured rows follow-up is only retained evidence/qualification limits; partial/unresolved rows require the specific reconciliation described, subject to later authorization.

| Ref / journey and exact promoted requirement | Exact scenario headers | Current source path/symbol | Actual inspected assertions | Agreement, coverage, evidence and follow-up |
| --- | --- | --- | --- | --- |
| R01 — Open the household library and offer list presentation | `Open from Home`<br>`Select list presentation` | B: BrowseLibraryTrigger; fetchLibraryData | HomeSections href /browse-all-stack; browse page test selects list and asserts limit 12. HomeCommandCenter test stubs trigger. | **captured**; implementation-supported. Connected entry; access delegated to identity owner. |
| R02 — Return only eligible household library recipes | `Ready active recipes are eligible in All mode`<br>`Not-ready records are excluded`<br>`Deleted records are excluded`<br>`Discovery mode narrows eligible records` | L: GetRecipesList | RecipeControllerTests GetRecipes_Excludes_NotReady_Recipes and explore deleted test assert ID inclusion/exclusion; no focused cross-attribution assertion. | **captured**; implementation-supported. Stored IsReady and non-deleted predicates; discoverableOnly true adds flag, no attribution filter. U29 remains. |
| R03 — Return an explore-ordered library page | `Explore ordering`<br>`Page response and count`<br>`Page bounds are normalized` | L: GetRecipesList; RecipeController.List | Controller tests assert unwrapped recipes/pagination and never-cooked/older-cooked relative positions. No full tie-break/bounds assertion inspected. | **captured**; implementation-supported. Lowercase explore agrees; controller accepts case-insensitively but service branches case-sensitively (U29). |
| R04 — Request list pages for the selected library filter | `Load the All list`<br>`Change to Discovery` | B: fetchLibraryData | browse page tests assert first request and list limit 12; browser helper supplies filtered fixed pages. | **captured**; implementation-supported. All/Discovery request flags agree; no server freshness guarantee. |
| R05 — Display successfully returned library items | `Display a returned page` | B: list render; handleCardTap | browse page list tests assert grid/count; browser List infinite scroll checks 12 to 13 cards; detail child is stubbed in page unit test. | **captured**; implementation-supported. Name, computed hero reference and duration; successful list-button detail dispatch is source-supported. |
| R06 — Request and append additional library list pages | `Scroll requests the next page`<br>`Append overlapping results` | B: loadNextListPage; S: appendRecipes | browse page requests pages of 12 and asserts five deduped cards; real scroll-container test asserts next requests and final ID. Some tests dispatch browse-list-load-more custom event. | **captured**; implementation-supported. 600px scroll/observer threshold and ID dedupe; complete fresh pagination is withheld U31. |
| R07 — Show pending library-load feedback | `First-page load is pending` | B: fetchLibraryData; loading render | No focused pending-summary/first-page visibility assertion inspected. | **captured**; implementation-supported. Source loading branch supports scenario; assertion gap, not missing requirement. |
| R08 — Show an empty All-mode library result | `No All-mode items are returned` | B: isEmpty; EndCard | browse-all-stack.spec empty feedback and capture navigation assertions use stack-mode mocks. No dedicated empty-list assertion inspected. | **captured**; implementation-supported. Empty returned collection, not absence of all DB records; U30 retained. |
| R09 — Offer retry after initial library-load failure | `Initial load fails`<br>`Retry succeeds` | B: catch; Retry render | No focused initial reject/retry assertion inspected. | **captured**; implementation-supported. Summary/list failure and retry branch supported; append failure differs U30. |
| R10 — Retrieve the selected library recipe for detail reading | `Request detail by the activated recipe ID` | D: detail-load effect; A: getRecipe | RecipeControllerTests detail assertion checks requested ID; browse page stubs detail; browser opens mocked detail. | **captured**; implementation-supported. Fresh GET for detail; not list-only content. |
| R11 — Return persisted recipe detail for an available record | `Return the retrieved record` | L: GetRecipeDetail; MapToDto | Controller detail checks ID; RecipeServiceTests ingredient cases assert arrays, length and first flour value. No complete persisted DTO assertion. | **captured**; implementation-supported. FindAsync and unwrapped recipe/updatedAt; no ready predicate in detail U32. |
| R12 — Display returned recipe text and image reference | `Show returned name and description`<br>`Omit absent description`<br>`Select the detail image reference` | D: name/description/hero render; A: mapToRecipe | recipes.spec detail name and time assertions; component base recipe and optional text are mocks. No explicit absent-description/placeholder assertions inspected. | **captured**; implementation-supported. Text/placeholder references agree; image delivery is separate. |
| R13 — Display available recipe metadata in detail | `Show cuisine and meal types`<br>`Omit absent metadata badges`<br>`Format available time` | D: mealTypesForDisplay; formatRecipeTime | RecipeDetailSheet.test shows Italian/Supper/Lunch badges; browser asserts READY IN 45 MINS. Absent badge/time branches source-only. | **captured**; implementation-supported. Read mode has no synthesized meal badge; edit defaults differ U35. |
| R14 — Display returned ingredient strings in detail | `Read returned ingredients`<br>`No ingredients are returned` | D: Ingredients render; L: DeserializeIngredients | RecipeServiceTests null array length 0, string array length 3/first flour, object array length 2; browser edited ingredient visibility. No exact Pasta/Sauce order assertion. | **captured**; implementation-supported. Order follows returned strings; legacy object/raw fallback remains U34. |
| R15 — Show pending recipe-detail feedback | `Detail retrieval is pending` | D: isLoading render; detail-load effect | No deferred-request pending/close assertion inspected. | **captured**; implementation-supported. New-sheet pending feedback supported. Failed first GET still displays Loading recipe (U33). |
| R16 — Dismiss recipe detail back to the loaded library | `Close loaded detail`<br>`Close pending detail` | B: handleDetailSheetClose; D: onClose | browse page same-card test asserts sheet disappears, same ID and one recipes call, but substitutes detail child; browser same-card test uses real sheet with mocked GET. Pending-close source-only. | **captured**; implementation-supported. Dismissal does not abort transport; no broad freshness/cancellation guarantee. |
| R17 — Open initialized recipe-detail field drafts | `Edit loaded detail`<br>`Initialize meal-type choices` | D: resetDrafts; resolveMealTypes; ActionGearMenu | Detail component asserts gear Edit, editing controls, cuisine input/pills; no exhaustive fallback-default assertion. | **captured**; implementation-supported. Five field drafts initialized; offered meal values source-inspected. |
| R18 — Edit ingredient rows in the detail draft | `Change and add ingredients`<br>`Remove an ingredient` | D: handleIngredientChange/AddIngredient/RemoveIngredient | recipes.spec edits one ingredient then asserts visible submitted text. Add/remove/relative-order branches have no focused assertion inspected. | **captured**; implementation-supported. Local draft row operations source-supported. |
| R19 — Restrict local detail Save eligibility | `Name is blank`<br>`No meal type is selected` | D: Save disabled expression | Detail component deselects Supper/Lunch then asserts Save disabled; whitespace-name eligibility source-only. | **captured**; implementation-supported. Local validation exceeds API DTO validation U35. |
| R20 — Submit normalized detail fields for the loaded recipe | `Submit edited fields`<br>`Submit blank optional drafts` | D: handleSaveRecipeFields; A: updateRecipe | Detail component asserts cuisineType/mealTypes PATCH; browser asserts edited name/ingredient local display. Trimming/null/blank rows lack focused assertions. | **captured**; implementation-supported. Captured normalized five-field payload; cuisine null preserves server value U35. |
| R21 — Apply supplied non-null recipe-detail update fields | `Store supplied detail fields`<br>`Preserve omitted or null values`<br>`Replace with empty values` | L: UpdateRecipe; U: UpdateRecipeDto | RecipeServiceTests assert name/description/ingredients persisted, cuisine/meal array persisted, empty meal array Category Supper. Empty/null preservation source-only. | **captured**; implementation-supported. Conditional successful DB storage agrees; file writer omits ingredients/cuisine/meals, no general disk parity U37. |
| R22 — Show pending detail-save feedback | `Save is pending` | D: isSavingRecipe render | No slow-save Save/Cancel disabled assertion inspected. | **captured**; implementation-supported. Saving disables these buttons only; fields and sheet Close remain usable. |
| R23 — Discard unsubmitted recipe-detail drafts with Cancel | `Cancel before submission`<br>`Reopen after Cancel` | D: handleCancelEdit; resetDrafts | Detail component asserts viewing actions restored after Cancel; no discard/reopen/no-PATCH assertion inspected. | **captured**; implementation-supported. Cancel discards unsubmitted drafts only. Hero uploads inside Edit are already separate mutations. |
| R24 — Display the submitted snapshot after successful detail Save | `Save resolves successfully` | D: handleSaveRecipeFields success | recipes.spec asserts Rainy Night Lasagna and San Marzano tomato after mocked PATCH; no real reload/persistence. | **captured**; implementation-supported. Local submitted snapshot, not response/refetch; U37 retains stale parent limitation. |
| R25 — Retain editing and offer another attempt after detail Save failure | `Save rejects`<br>`Retry after failure` | D: handleSaveRecipeFields catch/finally | No focused rejected-save/retry assertion inspected. | **captured**; implementation-supported. Current drafts and error branch source-supported; DB may already have committed before file failure. |
| R26 — Initialize recipe-detail ratings and notes controls | `Load existing notes and rating`<br>`Load absent notes and rating`<br>`Offer the three rating meanings` | D: load effect; RATING_OPTIONS; notes textarea | Component fixtures include rating/notes; no focused initial pressed-state/absent-values assertion inspected. | **captured**; implementation-supported. 0 Unknown and three choices agree; recipe-level facts. |
| R27 — Select or clear the loaded recipe rating | `Select a different rating`<br>`Clear the current rating`<br>`Select from Unknown` | D: handleRatingChange; A: updateRecipe | ValidationServiceTests accepts 0..3/rejects -1,4,100 directly. No UI select/clear or rating-only wire assertion inspected. | **captured**; implementation-supported. Optimistic local rating with discarded click promise; U39 retained. |
| R28 — Submit changed recipe notes after the editing delay | `Submit exact notes text`<br>`Clear initially nonempty notes`<br>`Replace a pending notes edit` | D: notes effect | recipes.spec routes PATCH and waits for notes body after filling; no exact whitespace/clear/debounce replacement timing assertion inspected. | **captured**; implementation-supported. 800ms timer compares original recipe notes; U38 remains. |
| R29 — Persist supplied recipe ratings and exact notes | `Store a rating or clear it to Unknown`<br>`Store notes without trimming`<br>`Durably clear notes with empty text` | L: UpdateRecipe; ImageService.UpdateRecipeInfo | ValidationServiceTests checks range; no focused exact whitespace/clear/storage assertion inspected. | **captured**; implementation-supported. Recipe-level successful storage source-supported; no universal durability after rejection U40. |
| R30 — Preserve omitted recipe content during ratings and notes updates | `Preserve null and omitted facts`<br>`Preserve unrelated recipe content` | L: UpdateRecipe null guards | No focused null/omitted/unrelated-fact preservation assertion inspected. | **captured**; implementation-supported. Source guards support scenarios; unrelated facts retained except timestamp/connected side effects. |
| R31 — Retain local ratings and notes display on successful completion | `Complete an update with the sheet open` | D: handleRatingChange; notes effect | recipes.spec asserts sheet stays open after notes request; stateless mock, no persistence read. | **captured**; implementation-supported. Local values retained without GET; Saved is dispatch feedback U39. |
| R32 — Initialize the loaded-detail discoverability control | `Load discoverability enabled`<br>`Load discoverability disabled`<br>`Load an absent discoverability value` | D: isDiscoverable initialization; DiscoveryToggleCard | Detail test asserts toggle visibility and hide-on-edit; no exact true/false/absent label initialization test inspected. | **captured**; implementation-supported. Returned boolean defaults false; shared label source supports scenarios. |
| R33 — Submit the inverse discoverability state for the loaded recipe | `Turn discoverability on`<br>`Turn discoverability off` | D: handleToggleDiscovery; A: updateRecipe | recipes.spec inspects boolean isDiscoverable in PATCH and sheet/URL retained, not exact inverse for both initial states. | **captured**; implementation-supported. Optimistic inverse only for loaded detail; stack action is a different missing slice. |
| R34 — Persist the supplied recipe discoverability fact | `Store enabled discoverability`<br>`Store disabled discoverability`<br>`Preserve an omitted or null discoverability flag`<br>`Retain unrelated facts during a discoverability update` | L: UpdateRecipe; MapToDto | No focused storage/null/retain-all-fields discoverability assertion inspected. | **captured**; implementation-supported. Successful DB flag update agrees; flag is not written to recipe.info U42. |
| R35 — Disable the detail discoverability button while pending | `Request remains pending` | D: isUpdatingDiscovery; DiscoveryToggleCard | Detail component visibility only; browser pending assertion exists for StackActionBar, not detail. | **captured**; implementation-supported. Disabled detail button source-supported; not a handler reentry or request-order guarantee U41. |
| R36 — Retain the local discoverability display after success | `Complete with the sheet open` | D: handleToggleDiscovery success/finally | recipes.spec asserts sheet and URL after stateless PATCH; no exact local-success/no-GET assertion. | **captured**; implementation-supported. No response reconciliation or parent notification. |
| R37 — Restore local discoverability after rejection and allow another activation | `Request rejects`<br>`Activate again after rejection` | D: handleToggleDiscovery catch/finally | Stack browser error test checks loading disappears and control visible, not detail restoration or boolean value. Detail reject/retry lacks focused assertion. | **captured**; implementation-supported. Same-detail/no-intervening-change restriction matters; no DB rollback U41. |
| R38 — Offer View Original control for eligible loaded library recipes | `Offer URL original control`<br>`Offer photo original control`<br>`Hide control while editing`<br>`Hide control for recipes without original source or images` | D: View Original render | Detail component asserts synthesized hidden, URL visible text/icon wrapper; browser photos button visible. Icon wrapper presence does not distinguish actual icon shape. | **captured**; implementation-supported. Eligibility and edit suppression supported; U44 absent-URL edge retained. |
| R39 — Open external source URL in a new browser context | `Open external URL in a new context` | D: View Original onClick | recipe-original-viewer.spec URL test never clicks button or asserts popup/window.open despite its title. | **captured**; implementation-supported. Source calls window.open with noopener,noreferrer; external success unqualified U45. |
| R40 — Present original photos in the photo viewer overlay | `Open photo viewer with finished dish first`<br>`Open photo viewer with sequential ordering`<br>`Open photo viewer as fallback for absent source URL` | V: imageIndices; D: showOriginals | Browser photos test clicks and asserts viewer close button only; no ordering/counter/zero-image assertion. | **partial**; implementation-supported subset; incomplete disputed claim. Finished-dish-first source supported; prose says initial photo index 0 while first scenario expects underlying photo 1. Positional versus asset index ambiguous; U44 zero-image fallback remains. |
| R41 — Navigate between original photos with wrapping | `Advance to next photo with wrapping`<br>`Return to previous photo with wrapping`<br>`Select photo via pager indicator` | V: handleNext/handlePrev; pager onClick | No navigation/wrapping/keyboard/dot assertions inspected. | **partial**; implementation-supported subset; incomplete disputed claim. Arrows reset scale; dot handler changes index without resetting scale, contrary to broad navigation-reset prose. Scenarios for arrows and dot targeting are source-supported; prose discrepancy remains. |
| R42 — Support photo zooming and panning | `Toggle zoom with control or image activation`<br>`Reset zoom to fit to screen` | V: toggleZoom; handleTouchMove; controls effect | No zoom/pinch/drag assertions inspected. | **captured**; implementation-supported. Scale 2.5 toggle, clamp 1..5, drag bounds +/-500 and centering at 1 source-supported; device qualification not-run U47. |
| R43 — Dismiss photo viewer and retain detail state | `Dismiss viewer via close button`<br>`Dismiss viewer via Escape key`<br>`Reopen photo viewer after dismissal` | V: keydown cleanup; D: conditional mount | Browser only asserts viewer opening, not close/Escape/reopen. | **captured**; implementation-supported. Fresh mount resets index/scale; no mutation/refetch on viewer close source-supported. |
| R44 — Serve raw original photo image binary | `Serve raw original photo binary`<br>`Return not found for nonexistent photo` | I: GetImage; ReadOriginalImageAsync; RecipeController.GetImage | RecipeControllerTests GetImage_Returns_Image_Binary asserts 200 image/jpeg and nonempty bytes using InMemory store. No missing original/anonymous HTTP assertion inspected. | **captured**; implementation-supported. Anonymous raw stream and missing stored asset exception to 404. Store-only lookup, no DB readiness/deletion check; local MIME details below. |
| R45 — Offer Move to Bin control for loaded library recipe detail | `Access Move to Bin from the detail gear menu`<br>`Trigger Move to Bin immediately without confirmation` | D: handleMoveToBin; ActionGearMenu | ActionGearMenu.test callback assertion; recipes page test activates real detail menu with mocked delete. | **captured**; implementation-supported. Immediate trigger; no confirmation and no visible failure toast U48. |
| R46 — Soft-delete the loaded recipe when not assigned to active planner slots | `Soft-delete unassigned recipe successfully`<br>`Record actor and timestamp on soft-deleted recipe` | L: SoftDeleteRecipe; RecipeController.Delete | RecipeSoftDeleteIntegrationTests asserts DeletedAt, 200 body, removed search doc; does not assert exact UTC instant/deletedBy. | **captured**; implementation-supported. Actor supplied through binder, Guid.Empty fallback if absent; date cutoff is UTC not client local. |
| R47 — Reject soft-delete when recipe is assigned to active planner slots | `Reject deletion of scheduled recipe with Conflict`<br>`Retain recipe availability on deletion rejection` | L: SoftDeleteRecipe assignedDates; RecipeController.Delete | Soft-delete test asserts 409 and errorCode/assignedDays property text; no exact dates, null timestamp or race assertion. | **captured**; implementation-supported. Reads calendar Date >= UTC today, then separate save; no transaction/locking against concurrent assignment U52. |
| R48 — Synchronize library view and dismiss detail after deletion | `Dismiss detail sheet and refresh library on deletion success`<br>`Retain detail sheet and library state on deletion failure` | D: onDeleted; B: detail mount; Search page onDeleted | recipes/page.test refreshes browse/lexical-only results and retains sheet on rejected delete; recipes.spec URL is /recipes, not /browse-all-stack. | **unresolved**; implementation-supported subset; incomplete disputed claim. Success claim unsupported for actual Browse Library: no onDeleted passed, no store removal/refetch. Search caller supplies refresh; child closes in both. Needs bounded reconciliation decision, not silent spec edit. |
| R49 — Exclude soft-deleted recipes from standard library listings and search | `Exclude soft-deleted recipe from standard paged library reads`<br>`Exclude soft-deleted recipe from recipe search results`<br>`Return NotFound for soft-deleted recipe detail lookup` | L: GetRecipesList; GetRecipeDetail; EF filter; RecipeSearchPredicate | Soft-delete tests assert list/search absence and fresh HTTP detail 404. | **captured**; implementation-supported. Fresh request context agrees; FindAsync tracked-entity qualification U32 remains; no universal tracking or anonymous asset deletion claim. |
| R50 — Open Recycle Bin sheet from library browse header | `Present Recycle Bin sheet from browse header trigger`<br>`Dismiss Recycle Bin sheet back to browse view` | B: isTrashOpen; T: onClose | Browse page unit test uses stub RecycleBinSheet, asserts open/close; browser asserts trash-list visible. Backdrop source-only. | **captured**; implementation-supported. Title/close/backdrop source-supported; list does not refresh on bin close. |
| R51 — List soft-deleted recipes in Recycle Bin | `Show loading indicator while retrieving trash items`<br>`Display empty bin message when no recipes are deleted`<br>`Render soft-deleted recipes with name, date, and actions` | T: mount effect/render; L: GetTrash; A: getTrashItems | Soft-delete test asserts both trashed IDs; browser seeded trash item visible. No deletion-date descending/loading/empty/localized date assertions inspected. | **captured**; implementation-supported. All soft-deleted records includes not-ready; no pagination. Load rejection falls through empty display, missing error/retry slice. |
| R52 — Restore soft-deleted recipe to active library | `Restore soft-deleted recipe to active status`<br>`Trigger search index re-indexing upon recipe restore`<br>`Remove restored recipe from trash list view` | L: RestoreRecipe; T: handleRestore | Soft-delete tests assert deletedAt clear, fresh ready-recipe list/search inclusion and trash absence; search-hardening asserts local trash item removed. | **partial**; implementation-supported subset; incomplete disputed claim. Index trigger is caught/nonfatal, so unconditional SHALL trigger overstates success. Not-ready restored records still excluded by list readiness; immediate search depends on indexing/search path. No browse refresh callback. |
| R53 — Present elevated PIN dialog for permanent purge | `Open PIN confirmation dialog for selected trash recipe`<br>`Dismiss PIN dialog on cancel without sending request` | T: openPinDialog; closePinDialog | search-hardening opens dialog and enters PIN; no Cancel/no-request/password/empty-disable assertion inspected. | **captured**; implementation-supported. Pre-submit cancel supported; cancel stays usable in flight and cannot undo dispatched purge. |
| R54 — Permanently purge soft-deleted recipe with valid elevated PIN | `Purge recipe, filesystem assets, and dependencies with valid PIN`<br>`Cancel pending index workflows during purge`<br>`Remove purged recipe from trash list and close PIN dialog` | P: PurgeAsync; CancelPendingIndexJobsAsync | Purge tests assert row/search doc/votes/calendar/directory removed and no pending jobs; test factory EF InMemory ignores transaction; directory assertion uses actual temp filesystem. | **partial**; implementation-supported subset; incomplete disputed claim. Nominal purge supported. Pending lookup matches any workflow Parameters containing ID, not only index workflows. Filesystem deletion precedes DB commit with no file rollback; no concurrent/running-worker safety qualification. |
| R55 — Reject permanent purge on invalid PIN, missing configuration, or non-trash recipe | `Reject purge with 403 on missing or incorrect PIN`<br>`Reject purge with 503 when elevated PIN is unconfigured`<br>`Reject purge with 409 when recipe is not in trash`<br>`Display error feedback and retain dialog on purge rejection` | P: PIN branches; RecipeController.Purge; T: handlePinSubmit | Purge tests assert 403/409/503 and PIN_NOT_CONFIGURED text; browser wrong-PIN asserts visible error/item retention. | **captured**; implementation-supported. Status mapping agrees; missing recipe 404 absent OpenAPI; generic UI error and mutable in-flight dialog boundaries U51. |

### Implementation → specification matrix (additional or cross-cutting behaviors)

These rows close the forward-discovery pass beyond R01–R55. “None” in the promoted-header column means no library requirement/scenario was found for that distinct operation; nearby coverage is identified without treating it as equivalent. Actors and E path keys use the definitions above.

| Ref / journey or operation / actor | Current source path and symbol | Promoted requirement / exact scenario headers | Actual inspected assertions and substitutions | Agreement / coverage / behavior evidence / follow-up |
| --- | --- | --- | --- | --- |
| G01 — Card stack browse / household person | B `visibleRecipes`, `handleSwipeLeft/Right`, `wrapToLastPage`; S `RecipeStackCard.handleDragEnd/handleTap` | None for stack rendering, swipe/velocity intent, first/last wrap, depth indicator, page size 20 or prefetch with <=5 remaining. R01 covers list selection; R10/R16 cover detail entry/return only. | Browse page tests assert next/previous/loop, filtered wrap, empty-page fallback, 180-item final/first and bounded index/page numbers; browser asserts card targets/depth. Motion unit handlers are synthetic. | **missing**, implementation-supported. Up to four visual cards, front-only tap/drag, short-drag suppression, next/previous indicators, conditional haptic vibration, and reset on departure are source-supported. Backward wrap merges first page plus last page, skips middle pages and sets hasMorePages false; tests of first/last do not establish complete traversability. Extract bounded stack navigation later, preserving that limitation. |
| G02 — Library health summary / API caller and browse consumer | L `GetLibrarySummary`, controller; B first-load summary/effectiveTotal | None defining summary API counts/envelope. R03 `Page response and count` defines list pagination total, not summary total/neverCooked/rating buckets. | RecipeLibrarySummaryTests asserts 200 data shape, all-zero empty, nondeleted total, never-cooked and each rating bucket/count, partition total. Factory InMemory and auth-disabled. | **missing**, implementation-supported. Stored ready/nondeleted aggregate, no discoverable filter, nullable cooked date and rating buckets. OpenAPI summary prose only says excludes deleted; code also excludes not-ready. Recommend next smallest extraction: this single read operation and bounded initial browse total consumption. |
| G03 — API list default order, lookup filters and invalid order / API caller; capture/sharing consumers | L `GetRecipesList` id/name/url predicates and default ordering; `RecipeController.List`; A generated query interface | No library scenario for newest-created default, exact ID, trimmed case-insensitive exact name/url, combined predicates, blank-filter omission or invalid order 400. R02/R03 cover eligibility/lowercase explore only. `recipe-sharing` → `Display advisory warning for existing library duplicates` → `Display duplicate warning when recorded recipe ID matches existing recipe`, `Display duplicate warning when recipe name matches existing recipe` describes consumers, not full provider semantics. | RecipeControllerTests filter-by-ID/name/url and ignore-deleted/not-ready duplicate tests assert single matching ID; default-order test checks shape only, not sequence; invalid-order asserts 400/error contains explore. | **missing**, implementation-supported. Contract/generated query fields agree with source, but discoverable prose conflates flag/high family interest and readiness prose derives more than code. Capture/sharing caller ownership does not discharge library provider coverage. Separate read slice later. |
| G04 — Instruction read/update / API caller | L `ExtractRecipeInstructions`, `UpdateRecipe` recipeInstructions raw-metadata merge; U DTO object; A UntypedNode conversion | None defining library instructions read/PATCH. R11 `Return the retrieved record` only names string ingredients and other fields. `recipe-sharing` → `Generate privacy-scrubbed portable export bundle` → `Preserve structured instructions and original images up to five`, `Wrap flat instruction strings in a default section` owns export transformation only. | RecipeUpdateIntegrationTests asserts new array length 3/first updated step in DB and info store, index trigger once and recipe_ready never. InMemory/store/mock orchestrator. | **missing**, implementation-supported. API object permits shapes broader than OpenAPI array/null; malformed/missing raw metadata returns null on read. Detail has no inline instructions/editor; Steps opens CooksMode. Extract provider read/update separately without inventing inline instruction capability or schema parity. |
| G05 — Persisted vegetarian/provenance/readiness facts / API caller and detail consumers | F model/SQL nullable IsVegetarian → L MapToDto false fallback → A mapToRecipe; sourceType URL/photos/synthesized derived from URL/count, CanReimport URL or count; image indices/count/finishedDishIndex/addedBy/createdAt/isReady | R02 eligibility, R38–R44 consume provenance/images, but no full fact representation requirement/scenario for nullable vegetarian, sourceType/CanReimport derivation or attribution/createdAt mapping. | Controller finished-dish test asserts 2; classification tests assert mocked response boolean and malformed-response preservation, not actual diet accuracy or DTO null representation. | **partial**, implementation-supported; **incomplete** semantics for unknown vegetarian collapsed to false. No library vegetarian edit control or badge found; no vegetarian PATCH field. Library owns represented fact, not search eligibility or classifier administration. Capture readiness owner is separate (X02). Later extraction must settle null/false meaning without silently drafting dietary truth guarantees. |
| G06 — Hero binary retrieval / anonymous or authenticated asset requester | I `RecipeController.GetHero` → ImageService → LocalRecipeStore.ReadHeroImageAsync | None for hero content/MIME/cache/missing asset; R05/R12 reference image URLs only. | Controller tests assert 200/JPEG/nonempty, exact public max-age=31536000 immutable, missing hero 404 using InMemory store. | **missing**, implementation-supported. Local implementation serves hero.webp/image/webp; OpenAPI advertises JPEG/PNG only and omits cache/404. Reads bypass DB deleted/readiness predicates just like originals; retained files can remain accessible after soft-delete. Extract asset-serving scope later, with explicit discrepancy. |
| G07 — Append original photo and request hero regeneration / person in Edit and API caller | D `handleHeroCameraClick/handleFileChange`; A `uploadRecipeOriginal`; I ImageService.AddOriginalImageAsync; L AddOriginalImageAsync → TriggerHeroRegenerationAsync | None for append-to-existing recipe or its toasts/failure/reset; capture's initial photo upload is a different operation. | RecipeActionIntegrationTests asserts next numeric index 2, count 3, 201, one regeneration trigger, no recipe_ready trigger, missing recipe 404. recipe-hero-actions.spec filechooser mock asserts upload called and toasts; no real image bytes/encoding. | **missing**, implementation-supported. Storage write/info count precede DB count/save, then workflow trigger; no endpoint validation call/count limit observed. Concurrent uploads can reuse info.ImageCount; later failure can leave partial success. OpenAPI says unwrapped UUID id; actual wrapped data.id is integer; manual adapter reads top-level id and returns empty string (caller ignores result). Edit Cancel does not undo this dispatched operation. Later smallest asset-mutation slice, no repair now. |
| G08 — Explicit hero regeneration / person in Edit and API caller | D handleHeroRegenerateClick; A regenerateHero; L TriggerHeroRegenerationAsync; controller RegenerateHero | None for this command/feedback. `background-processing` lifecycle requirements do not specify library action acceptance/content. | RecipeActionIntegrationTests asserts 202/one mocked workflow call; browser local route asserts request and toast. | **missing**, implementation-supported. No recipe existence lookup in trigger path; caught KeyNotFound in controller does not ensure absent IDs rejected. API returns wrapped message, OpenAPI expects ManagementTaskAcceptedResponse. UI says regenerating on acceptance, no completion/refetch/cache invalidation observed here; failures toast, repeated activation unguarded. Workflow execution outside library boundary remains excluded, acceptance path unextracted. |
| G09 — Unavailable, failed and stale presentation / person and overlapping requests | B fetch relevance tuple/catch/finally; D detail load active flag; T trash load/restore catch | R07/R09 initial load/retry and R15 pending detail capture only a subset; no exact scenario for append failure, empty Discovery, failed detail GET, trash fetch/restore failure. U30–U33/U48–U51 record unresolved behavior, not complete normative coverage. | No focused reject/retry/ABA-generation/detail replacement/trash-failure assertions inspected. Source paths inspected; mock success does not establish recovery. | **partial**, implementation-supported limited branches; incomplete broader recovery. Failed append retains cards and unused prefetchFailed; Discovery empty has no empty message; failed first detail leaves loading text, replacement failure may reveal prior recipe; failed trash fetch becomes apparent empty bin; restore failure only logs. Record uncertainty; do not draft defects as desired behavior. |
| G10 — Mutation persistence, indexing and live-update boundary / API caller | L UpdateRecipe creates/resets pending search sidecar and clears existing embedding fingerprint; save → caught index trigger → uncaught ImageService.UpdateRecipeInfo. SoftDelete saves removal; Restore saves before caught trigger; P deletes filesystem before DB commit | R21/R29/R34 qualify successful persistence; R52 partly claims trigger; no library requirement/scenario fully defining sidecar invalidation/post-commit partial failure. `background-processing` → `Persist initial workflow and task identities before returning` owns orchestration, not recipe transaction/file parity. | RecipeServiceTests asserts workflow instance/fingerprint, once for multifield PATCH; instruction integration checks index call and no recipe_ready call. Purge assertions omit relational rollback. | **partial**, implementation-supported. Index enqueue may fail without reverting recipe DB; file failure may reject after commit. File writer updates only name/description/notes/rating/instructions, not ingredients/cuisine/meals/discoverable. No SSE broadcast in these library service methods, and browse has no event subscription. Preserve U37/U42/U49; extract mutation side-effect boundary later, no broad atomicity/synchronization claim. |
| G11 — Concurrency and dispatched cancellation / person, API caller, background worker | B request tuple and wrapRequestId; D independent draft/rating/notes/discovery requests; T restoringIds/PIN dialog; P pending-work query | Only narrow pending controls R22/R35/R53 and local success predicates; no general ordering, abort, ETag/version, atomic cross-store or idempotency requirement/scenario. | No inspected overlapping-request, same-tuple ABA response, assignment-vs-delete, upload-vs-upload or running-worker-vs-purge assertion. | **unresolved**, implementation-supported absence of guards; incomplete guarantees. Query relevance has no generation for same tuple; catches/finally unguarded; closed detail transport continues; rating/notes overlap; PIN cancel during submit cannot retract purge; pending cancellation does not stop running workflows. Maintain uncertainty, no invented safe concurrency baseline. |
| G12 — Status read / API caller | RecipeController.GetStatus → L GetRecipeStatus | No library status-read scenario. `recipe-capture` → `Show description synthesis waiting state` → `Intake returns a recipe ID`, `Ready event resolves description waiting state` describes client waiting/events, not this full status API. | No focused status response assertion inspected in selected controller/service tests; mock-api returns synthetic status. | **unresolved** provider extraction/ownership, implementation-supported endpoint. Returns ready/pending from stored IsReady, with id/name/imageCount/isSynthesized; no formula from comments. Treat as capture-facing library dependency pending explicit owner reconciliation. |
| G13 — Unconnected service hard-delete helper / no traced external actor | L DeleteRecipe; repository caller search finds declaration only | None; not the current DELETE route (that calls SoftDeleteRecipe), and not a new API operation to extract. | No current controller/UI caller or selected assertion located. | **intentionally excluded** from observable journey inventory: unconnected helper, not capability proof. No cleanup or removal authorized. |

### Shared ownership and explicit exclusions

No untraced “owned elsewhere” assertion counts as coverage. The following table records the exact owner where one exists and leaves absent owners unresolved. Library facts/provider operations in G03–G06 remain library gaps even when consumers have their own requirements.

| Ref / shared surface and actor | Immediate library dependency and assertions | Owning main spec / exact requirement and scenario headers | Coverage disposition and follow-up |
| --- | --- | --- | --- |
| X01 — Household entry/auth/member attribution / person, API caller | Home trigger → protected route/member context; library API uses existing auth/binder. Factory normally bypasses auth. | `household-identity`: `Gate protected page entry with household access` / `Access is missing despite a member selection`; `Apply member context after household access` / `Both page-gate inputs are present`; `Authenticate protected API requests independently` / `Protected API request has no household credentials`; `Resolve the current member through the API` / `Header identity takes precedence`, `Cookie supplies the member identity`. | **intentionally excluded** from duplicative library policy; implementation-supported dependency, full auth transport qualification not-run. Asset AllowAnonymous is an explicit local exception R44/G06, not universal auth coverage. |
| X02 — Capture creation/processing and ready transition / capturing person, worker | L CreateRecipe/CaptureUrl/DescribeRecipe persist initial facts; consumers later use stored readiness. Selected API assertions check pending creation/queued mock workflow, not real extraction. | `recipe-capture`: `Initial recipe creation and workflow dispatch` / `Initial recipe stored with pending readiness`; `Initial recipe persistence and photo workflow dispatch` / `Initial photo recipe persisted with pending readiness`; `Finalize recipe readiness and broadcast completion` / `State transition to ready`; `Access PDF originals through rendered pages` / `View completed PDF originals`, `Acquisition subsequently disabled`. | **intentionally excluded** acquisition/workflow execution; library eligibility/read/asset contract still audited. PDF initiation preview scope does not justify excluding completed rendered-page library viewing. |
| X03 — Issue reporting/re-import/review indicators / person, worker | D handleSaveImportIssue/pollImportUntilTerminal/resolve; L detail enriches ImportIssue but list MapToDto does not. Component tests assert authoritative issue response and polling; browse card tests inject status fixtures. | `recipe-quality`: `Apply the authoritative submission result in detail` / `Successful manual save`, `Started attempt acknowledgement`; `Display returned issue indicators` / `Render a returned report status`, `Render a returned review status`; `Reflect persisted resolution in subsequent successful reads` / `Read detail after resolution`, `Search again after resolution`. | **intentionally excluded** issue business policy. Conditional badge rendering captured by owner; list API enrichment gap U29 remains. Test injection is not evidence list supplies status. |
| X04 — Sharing export/import / person, API caller | D handleShareRecipe; L bundle import/export and assets. Component share tests use mocked export/download; library provider lookup remains G03. | `recipe-sharing`: `Offer Share action on eligible ready recipes in loaded detail` / `Ready recipe with hero image displays Share control`; `Generate privacy-scrubbed portable export bundle` / `Scrub personal notes and rating`; `Accept and persist imported recipe bundle into library` / `Accept valid bundle and persist ready recipe with importing member attribution`. | **intentionally excluded** bundle policy and delivery. Persisted library facts/asset retrieval are not discharged by this exclusion. |
| X05 — Search/ranking, similarity, discovery votes, recommendations / person, API caller | D Find Similar callback → Browse router /recipes?similarTo=; Search POST uses RecipeSearchService/RecipeSearchPredicate; controller recommendations is fixed mock output. | No main `recipe-search` or `recipe-discovery` spec in CLI inventory. `meal-planning` `Compose voting suggestions separately from persisted assignments` / `Voting read` is consumer composition only, not ranking/vote ownership. | **unresolved** owner coverage; explicitly outside library audit's algorithm boundary, not counted as captured. Deleted visibility predicate is traced at R49. Mock recommendations are not verified personalized recommendations. |
| X06 — Cooking/plan mutations and GOTO membership / person | D Steps → CooksMode, onUseForDay/onPlanForLater → B slotAssignment helpers; handleSetGoto → familyStore.saveGoTo. Search page test asserts GOTO stored object/toast, not full shared policy. | Concurrent promotion now adds main `meal-planning` `Present the targeted recipe-detail planning action` / `Open detail in planning context`, `Use the loaded recipe`; `Persist a planned recipe entry for an empty date` / `Empty date receives the chosen recipe`; `Return targeted Search assignment to Planner` / `Search assignment resolves`. Read these newly promoted blocks before finalizing ownership. No main `cooking`/`tonight-meal-decisions`/GOTO membership requirement located. | **partial** named planning owner for empty-day targeted Search/Quick Find assignment; **unresolved** broader ordinary Browse Cook This/Plan for Later, occupied-slot recovery, cooking and GOTO ownership. Entry callbacks inspected; no complete-owner or cooking capability claim. Do not pull planner mutations into this audit. |
| X07 — Saved browse presentation / person/member | B handleViewModeChange → familyStore.updateMemberPreferences; page unit asserts optimistic list and preference PUT, browser locally persists saved mode across navigation. | No main `member-preferences` spec; library R01 only covers selecting list, not member persistence/rollback/default lifecycle. OpenAPI family preferences PUT declares stack/list but is not an OpenSpec owner. | **partial** library interaction, **unresolved** preference owner. Distinguish immediate browse-mode switch (G01) from server-owned member preference extraction; no universal cross-device persistence claim. |
| X08 — Workflow lifecycle / worker/operator and SSE consumer | Library index/hero trigger calls → orchestrator; no command execution inspected beyond immediate trigger boundary. No library delete/restore/purge SSE publisher. | `background-processing`: `Persist initial workflow and task identities before returning` / `Accept a dependency workflow`, `API acceptance identity`; `Retain terminal task failure and pause its workflow` / `Earlier work already completed`; `household-live-updates`: `Bound delivery to current process registrations` / `Healthy registered responses`, `Registered response fails during output`. | **intentionally excluded** worker administration/transport lifecycle, implementation-supported dependency. Owner spec cannot establish that a library action actually emits/finishes an event or index. G10 retains missing producer boundary. |
| X09 — Demo, deployment/device/model/runtime qualification / variant user/operator | Ordinary-household source paths only; no service/browser/DB/model execution. | Explicit A09 environment sequencing and A34 deferred qualification, not an invented promoted requirement. | **intentionally excluded** variant qualification in this audit; mobile gesture source R42 inspected but actual device outcome not verified. No whole-environment completeness claim. |

### Discrepancies and unresolved audit findings

These audit-local F identifiers supplement, and do not close or rewrite, U29–U52. An unsupported existing SHALL is not fixed by appending more requirements; it needs a separately authorized reconciliation decision.

- **F01 — Caller boundary overstatement (R48):** Main `Synchronize library view and dismiss detail after deletion` / `Dismiss detail sheet and refresh library on deletion success` is supported on `/recipes` Search, whose `onDeleted` calls `runSearch`. Actual `/browse-all-stack` passes no onDeleted; loaded store cards remain after successful delete. Source and tests establish caller-specific behavior, not the blanket library claim. Existing BSL-024/026 mappings primarily cite Search; their generic refresh description is qualified by this finding.
- **F02 — Restore success is broader than source (R52):** Restore clears deletion fields for any found row, including an already-active/not-ready row. It does not make IsReady true or synchronously rebuild a search document. Reindex enqueue failure is caught after DB save. `Trigger search index re-indexing upon recipe restore` cannot be unconditional successful dispatch, and immediate library/search reappearance requires eligibility and a fresh consumer read/index path. Ready-fixture InMemory search assertions do not qualify every restored row, index completion or live Browse refresh.
- **F03 — Purge workflow scope and partial failure (R54):** CancelPendingIndexJobsAsync is named for indexing but executable predicates match any Pending workflow whose serialized Parameters contain the recipe ID; no workflow-ID filter. Existing requirement says pending indexing workflows, which describes only a subset of actual cancellation. Filesystem removal is not rolled back if subsequent DB commit fails; PostgreSQL parameters::text LIKE is not tested by InMemory. Running work can recreate files; no isolation guarantee recorded. Preserve U52's calendar asymmetry and U49's no-SSE boundary.
- **F04 — Viewer prose/edge conditions (R40/R41):** “initial photo index 0” conflicts with finished-dish underlying index example unless interpreted as sequence position; dot navigation does not reset zoom although broad navigation prose says it does. Missing URL fallback can yield zero images/undefined asset/NaN index (U44), not a working zero-image viewer guarantee. URL test title says opens URL but actual assertion does not activate it. These are specification/source and assertion distinctions, not runtime failure observations.
- **F05 — Representation/contract disagreements:** PATCH unwrapped RecipeDetailResponseDto versus OpenAPI/generated data object (U36), restore actual `{data: recipe}` versus documented RecipeDetailResponse, original upload wrapped integer versus unwrapped UUID/adapter empty id, regeneration message versus documented task response, local hero WebP versus documented JPEG/PNG, object instructions versus array contract, and missing documented 404/error cases. Main facts must not promise universal envelope, wire, persistence or generated-client parity. Discoverability's “high family interest” OpenAPI gloss is not vote-derived source behavior. No contract/client fixes authorized.
- **F06 — Fact/side-effect extraction missing:** G04 instruction API, G05 nullable vegetarian/provenance/readiness facts, and G10 sidecar/file/commit ordering are not covered by tests of nearby UI or generic worker lifecycle. SQL/FK/check declarations, comments claiming disk sync, and fixture booleans do not prove storage parity, classifier correctness or database enforcement.
- **F07 — Recovery/overlap remains unresolved:** G09/G11 retain all U30–U33/U35–U43/U48–U51 limitations. Missing failure/race tests are different from unextracted states and from absent implementation. No fresh-response generation/abort guards, request-order safety or universal Retry UI was inferred. No defect was normalized into a new requirement.
- **F08 — Specification framing is stale:** Purpose still says “This first baseline slice” and only list loading/empty/failure, despite later detail/mutation/asset/lifecycle append blocks. It understates current document scope; no Purpose edit is authorized. Historical draft headings and first-slice descriptions are provenance, not current promotion status.

### Promotion reconciliation (content, not checkbox status)

All active changes with a `specs/recipe-library/spec.md` were compared requirement-body-and-scenario-wise to main after excluding extraction-time non-normative notes. Proposals/designs define bounded exclusions; later task promotion records explicitly supersede earlier draft-review text. The union equals all 55 main requirement blocks and 122 scenarios, each once; no inspected library requirement is drafted-only, partially promoted, duplicated or superseded by another library requirement block. This is textual promotion completeness for these seven slices, not capability completeness or independent human acceptance evidence.

| Active library delta | Actual requirements/scenarios | Main mapping / promotion record |
| --- | --- | --- |
| baseline-recipe-library-list-visibility | 9/18 | R01–R09; A49; BSL-003 and its promotion follow-up |
| baseline-recipe-library-detail-reading | 7/13 | R10–R16; A51; BSL-007 |
| baseline-recipe-library-detail-editing | 9/17 | R17–R25; A53; BSL-011 |
| baseline-recipe-library-ratings-notes | 6/15 | R26–R31; A55; BSL-015 |
| baseline-recipe-library-detail-discoverability | 6/13 | R32–R37; A57; BSL-019 |
| baseline-recipe-library-view-original | 7/18 | R38–R44; A59; BSL-023; the old 17-scenario draft label is superseded by the 18-scenario promoted delta |
| baseline-recipe-library-deletion-restore-purge | 11/28 | R45–R55; A61; BSL-027 |

Cross-owner capture/sharing/quality deltas also touch library facts/controls but add no unpromoted library delta blocks. The concurrent empty-day planning promotion is now main meal-planning 30/70 and covers the bounded targeted assignment dependency in X06; it adds no main library block and does not settle occupied-slot recovery/cooking/GOTO ownership. All changes stay active; no archive or sync occurred.

### Separate conclusions and prioritized follow-up

1. **Source-supported specification coverage: partial.** Boundary: ordinary-household connected Browse Library list and card stack, loaded detail text/metadata/ingredients, fact PATCH and API-only instruction/read/lookups, originals/heroes, deletion/bin/restore/purge, and immediate persistence/index/consumer state effects. R01–R55 map every promoted scenario; G01–G12 and F01–F08 prevent a whole-capability completion claim. Successful mapped behaviors are implementation-supported, disputed assertions incomplete. There is no current runtime-verified behavior claim from this audit.
2. **Promotion completeness: complete for the seven inspected library slices as text (55/122 exact blocks); partial for the capability.** No lost library delta found. This does not accept the overstatements, supply missing extractions, or imply all owners exist.
3. **Runtime qualification: not-run/deferred A34.** Application unit/API/integration/browser/device/PostgreSQL/model/live endpoint qualification was neither authorized nor performed. Inspected assertions are available evidence, not passed test results. Source/contract disagreements are audit findings, not observed runtime failures.
4. **Remaining exclusions/decisions:** X01–X04/X08 have named owner requirements for their bounded dependencies; X05–X07 lack promoted owners for important algorithms/mutations/preferences and remain unresolved. G12 status provider ownership needs reconciliation. Environment variants X09 are explicitly outside this audit. Existing identity/member-creation qualifications and all U29–U52 remain visible.

Prioritized documentation work, each requiring separate selection:

| Priority | Specific bounded work | Reason / separation |
| --- | --- | --- |
| 1 | Reconcile F01/F02/F03/F04 overstatements against actual callers/eligibility/trigger scope/viewer handlers | Existing normative claims exceed or ambiguously describe source; requires a decision about correcting scope versus future implementation, not a silent baseline append. |
| 2 | Extract G02 library-summary read and initial count consumption | One implemented API operation, existing meaningful count assertions, clear library ownership; no mutation/algorithm/workflow qualification needed. |
| 3 | Extract G01 card-stack presentation/navigation/prefetch and front-card discoverability | Major default library journey missing; include wrap skipping/duplicates, source-only gesture limits and action's local state without claiming all-page traversal or vote ownership. |
| 4 | Extract G03 default list/lookup provider semantics, then G04 instructions read/PATCH as separate slices | Existing API-only behavior is independently callable; capture/sharing/cooking consumers do not replace provider specification. |
| 5 | Extract G06 hero serving, then G07 upload and G08 regeneration acceptance separately | Keep binary retrieval, mutation partial-success and workflow completion distinct; settle F05 contract disagreements before normative parity claims. |
| 6 | Resolve G05 fact representation, G09/G10/G11 failure/index/file/concurrency boundaries and G12/X05–X07 ownership | Do not invent recovery, dietary certainty or owner requirements. Existing non-normative uncertainties remain until selected and settled. |

**Recommend only the next smallest slice:** read-only extraction/review of **GET `/api/recipes/library-summary` and its initial Browse total consumption (G02)**, with zero/nonready/deleted/rating-count assertions and the separate-summary-versus-page freshness limit. No draft is started by this recommendation. F01–F04 remain higher-priority reconciliation decisions; this small read slice can proceed independently when selected. Do not include stack navigation, preferences, mutations, hero generation or fixes in that slice.

### Audit checks and stop record

Applicable static checks: verify actual 55/122 headers and exhaustive matrix labels; compare all seven delta requirement blocks to main; recheck 67 historical source digests; review complete audit/index diff against before-images; check preservation against before-images, account for concurrent planning/index edits, and verify this audit makes no additional nonselected writes or index mutations; strict recipe-library and all-item validation; `task verify -- docs/openspec-baseline/recipe-library.md docs/openspec-baseline-plan.md` for the complete selected path set. Final command outcomes/content identity are reported from the final harness record rather than attaching earlier checks to later document bytes.

- **Passed (audit evidence):** CLI root/main/active inventory resolved; actual header counts 55/122; all 67 previous source/dependency identities unchanged; seven library delta bodies match promoted main exactly, with no duplicate main requirement headers. These are static/content findings only.
- **Failed:** no applicable completed validation failure recorded at authoring time; final outcomes are reported after verification.
- **Blocked:** none encountered for authorized audit work at authoring time.
- **Not-run:** all runtime/browser/API/DB/device/network/model qualification, explicitly prohibited for this task and deferred A34.
- **Not-applicable:** application TDD, generated client regeneration, implementation finish gates, deployment, promotion and archive for these documentation-only edits.

Stop after audit record, small index correction, diff review and requested static verification. No successor drafting, implementation or lifecycle action authorized.

### Current source identities

The 67 historical path/hash rows above were rechecked unchanged. The following additional or normative inputs identify this audit snapshot (repeated entries are intentional anchors). Combined 89-input manifest SHA-256: `63ca8f63977423a1d33bb7e3ecb07b9e657bbc5625204e1cd0c42345e9aacd0f`; canonical form is sorted repository-relative path, tab, lowercase SHA-256, newline. The private manifest is in the before-image directory; historical rows plus the additions below reconstruct its inputs. Main/active delta identities do not imply runtime verification.

| Input | SHA-256 |
| --- | --- |
| `api/src/RecipeApi.Tests/Controllers/RecipeLibrarySummaryTests.cs` | `7913a1fd26f009bc354bd505063c06142747b7052656df325e69de7148b11edd` |
| `api/src/RecipeApi.Tests/Integration/RecipeActionIntegrationTests.cs` | `21f8a80a328ed770bd08efe1dbd3ffb26c7336595487af5c9e05a2c163fc76de` |
| `api/src/RecipeApi.Tests/Services/Processors/ClassifyRecipeVegetarianProcessorTests.cs` | `771565188c3f6f925d0cdecb1b16321d56bb5fd9739ee0fb3c4634883073c5b2` |
| `api/src/RecipeApi/Services/Processors/ClassifyRecipeVegetarianProcessor.cs` | `ad64a8cf3fca0d7216cadb42d19396b97d7a6740419c254bbcd293df9b991f34` |
| `api/src/RecipeApi/Services/RecipePurgeService.cs` | `de04380e396b7e302342da3bc366cc29a408f7ab28136fbe647acdadd39e6da5` |
| `openspec/changes/baseline-recipe-library-deletion-restore-purge/specs/recipe-library/spec.md` | `51da6840acbb2667c2bdff160d8a040d3eb629549515d55010a70188b0705831` |
| `openspec/changes/baseline-recipe-library-detail-discoverability/specs/recipe-library/spec.md` | `572c7611b094be6fe28e9796f7aa6b492b2dbaa2fa2db302667dae636f61a4cd` |
| `openspec/changes/baseline-recipe-library-detail-editing/specs/recipe-library/spec.md` | `20c1413c0600adb98ef0f239a2af47f0ccf81decdeb45334dad59e58ce8e52d4` |
| `openspec/changes/baseline-recipe-library-detail-reading/specs/recipe-library/spec.md` | `2f9d4c65af2b5162ba4ad0c757c6bcc789d9220eb54b631e90b715a534db6b0a` |
| `openspec/changes/baseline-recipe-library-list-visibility/specs/recipe-library/spec.md` | `5b4bc936f9f8d8737508917cd80d5d8727fabe36cf6f4a00e1c25bc87298c7ba` |
| `openspec/changes/baseline-recipe-library-ratings-notes/specs/recipe-library/spec.md` | `6dbabaa3c5a62164d6230ceda8ecb2cf562c340c9fb845ed6a8eb1f1e82d7289` |
| `openspec/changes/baseline-recipe-library-view-original/specs/recipe-library/spec.md` | `7b380d8873cf7bf7c83128702844fac3a1fccbf47566eace9616abfc47ced3d0` |
| `openspec/config.yaml` | `fa8eaeac7f9d3630c3c938bdec2f301ed993510f3200222bfd8c96b604057333` |
| `openspec/specs/background-processing/spec.md` | `a21d318f93c5cc10555ad1c13cf1babc398d1048e8696623a36a7f3ade378fb6` |
| `openspec/specs/household-live-updates/spec.md` | `65b649709688ed1d1bf782d310fee93497cb5510c5da9b454b83430ee2e9902c` |
| `openspec/specs/meal-planning/spec.md` | `a32d68f26d4348c2334201517e95931981d6a8b6e121b229cca922181489839e` |
| `openspec/specs/recipe-capture/spec.md` | `26c3bac67a723424f2e3d6a4888524bff4eb3ea56629d8b505a57e0320b7104b` |
| `openspec/specs/recipe-library/spec.md` | `1d815df65b26d3d25fa1053bbbac8b323dc321957ba5cc23528187adf9c41d4f` |
| `openspec/specs/recipe-quality/spec.md` | `73877aa85c761de351c650769577be65b9d75325a8ba4ff474c9283445ffb796` |
| `openspec/specs/recipe-sharing/spec.md` | `5099666d97b25c235c0b7b0d42eb81048d027744c8f4dc206811c70ab300f186` |
| `pwa/AGENTS.md` | `063098f6cb31bb44c6f8fbea25b3876de7ee1e5f7d00a50dbab506f6415eb7f0` |
| `pwa/src/components/recipes/RecipeStackCard.test.tsx` | `732ce3a5d22d7b2c77d737b440d5483814c76de94cd1985649c80c28e7487396` |


## Execution prompt

Paste this prompt and replace the session instruction with the desired bounded
scope. The default authorizes review only. Select the model in your host.

```text
Work on the recipe-library OpenSpec brownfield baseline in
/Users/alex/Code/whats-for-supper.
Session instruction: Review this capability's checkpoint and recommend the next
bounded slice. Do not generate specs or change application behavior.

Read AGENT.md and its active-host loading rules, then
 docs/openspec-baseline/workflow.md and
 docs/openspec-baseline/recipe-library.md.
Use these as the execution context; do not read the full history or other
capability plans unless an immediate dependency requires a specific section.
Resolve installed OpenSpec workflow/root before artifact writes. Preserve staged,
unstaged and untracked work. Recheck source identity and affected evidence.

Current user messages define scope. Reuse recorded decisions without asking for
approval again within already authorized work. Do not infer new drafting,
promotion, archive, implementation or runtime qualification authority from history.
Trace one selected observable journey through source, contracts and actual test
assertions/substitutions. Keep disputed claims non-normative. No application,
test, contract, client, SQL, configuration or dependency edits.

Update this capability plan's evidence/mappings, decisions, uncertainty, artifact
status, session log and next action. Update the small index only if its routing or
summary changes. Validate selected artifacts and run task verify with every changed
path. Distinguish passed, failed, blocked, not-run and not-applicable; source
support is not runtime verification. Stop at the authorized session boundary.
```

## Next-session record

Use this section for new capability sessions after the split. The earlier evidence
and lifecycle records above retain their original chronology.

```text
Session/date:
Branch, commit, relevant dirty inputs:
Current user authorization and selected capability/slice:
Completed discovery/evidence IDs:
Artifact paths and status (draft/validated/accepted/promoted separately):
Human decisions and unresolved questions:
Checks: passed / failed / blocked / not-run / not-applicable, with reasons:
Limitations and excluded assertions:
Exact next bounded action:
```
