# Design

## Context

See proposal.md for motivation and the recipe-library delta for the observable contract. This design describes documentation extraction across an existing browser/API/persistence path; it proposes no application architecture or behavior changes. A56 bounds the work, A10 permits source-supported drafts and A34 defers runtime/database qualification. Source identity is moving-to-openspec at `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus preserved dirty inputs. All 55 previous library evidence identities match.

## Goals / Non-Goals

**Goals:** Document the smallest connected slice: successfully loaded library detail → discoverability button → boolean PATCH → conditional successful storage → local visible completion or rejection restoration. Map every requirement/scenario to BSL-recipe-library-016–018 and actual assertion limits.

**Non-Goals:** Application fixes, new tests/contracts/SQL, runtime qualification, list/filter re-extraction, lifecycle actions or expansion into other detail actions and discovery policy. Do not turn missing safeguards into desired requirements.

## Decisions

1. **Extend the existing recipe-library owner with ADDED requirements.** Main library fact/read/update and list/filter owners remain intact, with household access/member context referenced from household-identity. Alternative: a separate discovery capability would conflate recipe-level curation with separately owned member votes/consensus. No existing requirement or Purpose is rewritten.
2. **Trace each representation rather than infer storage from display.** The library caller holds detailRecipeId and supplies no update callback. RecipeDetailSheet loads via getRecipe, initializes a separate isDiscoverable state with false fallback, and passes it to DiscoveryToggleCard. Its English title/subtitle and action labels are backed by the English translation table. The on/off graphic is aria-hidden; this is a button with an action label, not an asserted checked switch. Alternative: interpreting styling as a semantic switch would add unsupported accessibility behavior.
3. **Keep optimism and confirmation distinct.** handleToggleDiscovery negates current local state, sets it immediately, sets pending and awaits updateRecipe(recipe.id,{isDiscoverable:next}). The disabled button prevents ordinary repeated clicks once pending renders; the handler itself has no pending/reentry guard. Catch logs and sets !next; finally ends pending. There is no visible error/automatic retry, and subsequent activation starts a fresh update. Alternative: interpreting restoration as durable rollback or safe retry would exceed source support. Same-record/no-intervening-change conditions bound completion assertions.
4. **Reuse the established partial-update seam.** recipes.ts constructs optional fields; generated ID PATCH uses UpdateRecipeDto serialization. Installed Kiota JSON serialization includes false and omits undefined unrelated values. OpenAPI permits optional nullable boolean; C# bool? and HasValue preserve null/omission and assign either boolean. Recipe.IsDiscoverable maps to non-null SQL is_discoverable, distinct from IsReady/DeletedAt. RecipeService.SaveChangesAsync stores the assignment and MapToDto exposes it to existing detail reading. Alternative: treating false as omission conflicts with serializer and HasValue. No executed wire capture or PostgreSQL qualification is claimed.
5. **Bound directly connected side effects.** A supplied boolean counts as search-relevant even if unchanged, marks/creates pending index/embedding sidecar, updates UpdatedAt and saves. TriggerAsync(index-recipe-search) is attempted after save; trigger errors are caught. ImageService.UpdateRecipeInfo is then awaited and may fail after commit. It reads/creates/writes recipe.info with all update arguments null on this path, so it does not copy discoverability into RecipeInfo.IsDiscoverable. Existing metadata can retain its old value; newly created info defaults false. Broad controller/DTO disk-sync comments are not proof of parity. No direct event publish exists in the inspected update method; no broader event guarantee follows. Alternative: a DB/file atomicity or synchronization requirement is unsupported.
6. **Document completion at its actual boundary.** Adapter returns void and discards the PATCH response; success leaves local state without setRecipe, GET, library-store update or callback. Closing unmounts; reopening mounts and uses existing GET. No transport abort or update-generation guard exists. Alternative: asserting immediate list removal/summary refresh/freshness or ordered overlapping requests would invent behavior. U41–U43 retain these limits and U36's data-envelope discrepancy/missing-record error without fixes.
7. **Keep test evidence proportional.** The Search Playwright case checks a boolean payload, sheet visibility and unchanged /recipes URL against stateless route substitutions, not the connected library, exact boolean/ID/omissions, persistence or rollback. Component tests check control visibility across Edit/Cancel only. Shared-card labels have assertions via StackActionBar, but that caller's distinct update/reentry logic is not this detail handler. API tests use auth-disabled InMemory EF/store/orchestrator substitutions and assert other fields; no inspected assertion qualifies discoverability persistence. Alternative: treating those test names/mocks as end-to-end proof would overstate evidence.

## Risks / Trade-offs

- Optimistic display can resemble durable success → separate local-display requirements from conditional persistence, with U41 recovery/close/overlap limits non-normative.
- File write can reject after database save and does not update discoverability → U42 records the discrepancy; no atomicity or rollback promise.
- Contract/response and assertion gaps → U43/U36 record limitations without repairs; runtime not-run A34.
- Extraction completion can resemble acceptance → tasks cover documentation only; stop for human review with main specs and all prior changes preserved.

## Historical extraction evidence relocated for OpenSpec 1.14.2

The following non-normative material was moved from this change’s delta preamble to satisfy the upgraded validator. Requirement/scenario blocks and main specifications are unchanged by this relocation. Earlier draft/lifecycle statements remain historical; later recorded authorizations still govern. Relative links retain their original targets.

## Non-normative evidence and scope

A56 authorizes this bounded draft only. BSL-recipe-library-016–018 in `docs/openspec-baseline-plan.md` map every requirement/scenario to inspected source and actual assertion coverage. These are implementation-supported claims under A10; runtime behavior is not-run and implementation/database qualification remains deferred A34. Main recipe-library remains 31 requirements/63 scenarios and household-identity 36/92. The seven prior changes remain active; this draft adds an eighth.

Reuse library “Retrieve the selected library recipe for detail reading”, “Return persisted recipe detail for an available record”, “Apply supplied non-null recipe-detail update fields”, “Return only eligible household library recipes” and “Request list pages for the selected library filter”. These additions cover only missing loaded-detail discoverability behavior. Household-identity retains “Gate protected page entry with household access”, “Apply member context after household access” and “Authenticate protected API requests independently”. Discoverability is a stored recipe flag, separate from readiness/deletion and member-specific discovery votes or household consensus. The control's subtitle does not establish voting eligibility, ranking or suggestion-generation policy.

U41–U43 retain source/assertion limits without repair. The optimistic display is separate local state from the loaded recipe snapshot. Pending disables this button, without a handler-level reentry guard, transport cancellation, stale-response guard or ordering guarantee. Rejection logs to the console and restores local state; there is no dedicated visible save error or automatic retry. A later activation is a fresh attempt, not a guarantee of safe retry. Closing unmounts; reopening uses existing detail retrieval, without assured freshness or in-flight request cancellation. Completion ignores the PATCH response and does not refetch or notify the library caller, update library summaries or promise immediate list removal/synchronization.

The database save precedes a caught indexing-trigger attempt and an uncaught recipe.info read/write. That file update does not assign discoverability, despite broad database/file-sync comments. Do not infer file parity, atomicity, persistence rollback, idempotency, event delivery or indexing completion. U36's PATCH response-envelope mismatch and undocumented missing-record error remain non-normative. Successful persistence below is source-supported, not established by a local toggle or mocked response.

Reuse BSL-recipe-library-001–015 and preserve U29–U40 non-normatively. BSL-018–025, U23–U28 and historical member-creation limitations remain unchanged and non-normative here. Historical BSL-015/U22 limitation retained:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

That sentence records the earlier review state. The user's report of later authorization remains recorded; its original reference is pending. It is not a recipe-library requirement, new lifecycle approval or runtime result.

Detail-field editing, ratings/notes submission, reporting/re-import, sharing, originals, hero generation, cooking, planning assignments, search/discovery ranking, votes/consensus, capture, deletion/restore/purge, preference policy and demo/preview/deployment variants are excluded.
