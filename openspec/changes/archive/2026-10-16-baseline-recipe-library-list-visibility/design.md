# Design

## Context

See [proposal](proposal.md) for motivation and [delta](specs/recipe-library/spec.md) for the behavior boundary. The [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md), BSL-recipe-library-001–003, owns the trace, actual assertions and mapping. All 33 recorded source/spec/test inputs were rechecked unchanged before drafting. Design is included to resolve ambiguity across the list, summary, eligibility and paging seams without prescribing repairs.

The first observable slice is HomeCommandCenter → BrowseLibraryTrigger → `/browse-all-stack` → Show recipe list. BrowseAllStackPage directly uses the generated API client: summary GET followed by list GET with lowercase explore, page 1, list limit 12 and a discoverable boolean. RecipeController.List → RecipeService.GetRecipesList → EF recipes query → MapToDto/RecipeListResponseDto → generated DTO deserialization → browseStackStore → named grid buttons. Neither the general getRecipes adapter nor libraryStore's notification queue owns these list records. Search `/recipes` uses another endpoint and is not included.

## Goals / Non-Goals

**Goals:** Capture a coherent first recipe-library baseline with traceable observable requirements, shared-owner references and separately stated evidence limits. Keep successful page consumption distinct from complete/fresh traversal.

**Non-Goals:** Application implementation, readiness production/derivation, badge enrichment, search ranking, capture processing, editing, restore/purge, preference persistence policy, new error handling, service/database qualification and deployment variants.

## Decisions

1. **Create the approved recipe-library owner with additions only.** Main inventory has household-identity only. A04 assigns recipe eligibility/facts to recipe-library; placing this under search would conflate the separate POST search policy. Identity's access/context requirements remain unchanged dependencies. List does not bind a member argument or filter AddedBy.
2. **Use stored readiness and deletion facts.** GetRecipesList requires IsReady and no DeletedAt, with the EF deletion query filter reinforcing exclusion. The contract headline agrees, but its name/image/synthesis prose is not recomputed by this method. Extracting that formula would expand into capture and overstate local enforcement (U29).
3. **Specify the connected lowercase explore request and response.** The query orders never-cooked, cooked date ascending and creation descending before offset Skip/Take; count reflects eligibility/filtering. The unwrapped response matches the generated deserializer. Uppercase controller/service branching differs, so no case-equivalence claim. Equal keys have no ID tie-breaker; response updatedAt is not a snapshot token (U29/U31).
4. **Separate eligibility from presentation.** The page stores returned RecipeDto records directly and maps them into grid buttons, without readiness/deletion filtering. Discovery adds a server predicate; All imposes no discoverable restriction. Loaded browse preference can select the presentation but remains owned by member preferences. Do not invent independent client eligibility policy.
5. **Bound paging to supported requests and append results.** List uses 12-item requests, scroll/observer/custom-event triggers and pending guards; append deduplicates nonempty IDs. All's total comes preferentially from a separate summary; Discovery uses list total. Separate reads and request relevance keys do not establish complete traversal, freshness or stale-response immunity. Do not turn the mocked 100-item test into those guarantees (U31).
6. **Keep feedback local to the implemented stage.** Initial summary failure prevents list fetching; initial request failures render Retry, and Retry repeats summary then page 1. All empty arrays render EndCard's empty variant, not the disconnected BrowseAllEmptyState component. Discovery-empty and append-error feedback are absent; retain U30 rather than drafting new UI behavior.
7. **Keep test evidence and runtime qualification separate.** API eligibility/ordering assertions use default auth-free TestServer and InMemory EF with mocked orchestration. Page tests replace generated API calls and motion; their fixtures omit readiness/deletion and have pagination/ID inconsistencies. Browser tests supply identity/cookies and intercepted fixed pages; empty assertions use stack mode. Source supports the bounded feedback branches without focused rejection/retry assertions. No tests execute for this extraction; A10/A34 applies. Preserve BSL-015's exact historical sentence/caveat outside requirements.

## Risks / Trade-offs

- Stored readiness prose can be mistaken for an enforced formula → keep U29 non-normative and exclude derivation.
- Summary and page counts can diverge; offset pages and request races can omit or repeat records → keep U31 and avoid complete/fresh/stable paging claims.
- Discovery-empty and append failures provide less feedback than first-page failures → retain U30; no repair tasks.
- Mocked badges and fixed-page successes can appear to prove production enrichment/persistence → document substitutions and withhold runtime claims.
- Completed extraction tasks can be mistaken for acceptance → stop at validated draft; main identity and prior active changes remain unchanged.

## Migration Plan

No application migration, deployment or rollback applies. Review and validate these documentation artifacts. Human acceptance, main-spec promotion and archival remain separate authorized actions. Database/implementation qualification stays deferred under A34 and does not block source-supported extraction under A10.

## Historical extraction evidence relocated for OpenSpec 1.14.2

The following non-normative material was moved from this change’s delta preamble to satisfy the upgraded validator. Requirement/scenario blocks and main specifications are unchanged by this relocation. Earlier draft/lifecycle statements remain historical; later recorded authorizations still govern. Relative links retain their original targets.

## Evidence and status (non-normative)

Documentation-only draft under A48, backed by BSL-recipe-library-001–003 in the [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md). Evidence is implementation-supported under A10; runtime browser/API/database checks are not-run and qualification remains deferred under A34. This draft is not accepted or promoted.

Household-identity owns access and member context. Reuse its existing requirements “Gate protected page entry with household access”, “Apply member context after household access”, “Authenticate protected API requests independently”, and current-member resolution/recovery. Member preferences owns selection/persistence of browse mode; this slice describes the local list presentation once selected. The library is not filtered to the active member's own captures.

U29–U31 remain non-normative under the confirmed boundary. Stored readiness is used without asserting its name/image/synthesis derivation. No badge enrichment, fresh or complete pagination, snapshot consistency, equal-key stability, cross-tab/device synchronization, Discovery-empty feedback, append-error control or universal recovery is promised. Initial summary retrieval is a separate dependency and can prevent recipe retrieval. Returned DTOs are rendered without repeating server eligibility checks. Search results, capture processing, editing, restore/purge and preference policy are outside this slice.

Historical member-creation limitation retained under BSL-015/U22:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

That sentence records the earlier review state. The user's report of later authorization remains recorded; its original reference is pending. It is not a recipe-library requirement, new lifecycle approval or runtime result.
