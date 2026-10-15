# Design

## Context

See [proposal](proposal.md) for motivation and [delta](specs/recipe-library/spec.md) for the behavior boundary. The [durable plan](../../../docs/openspec-baseline-plan.md), BSL-recipe-library-001–003, owns the trace, actual assertions and mapping. All 33 recorded source/spec/test inputs were rechecked unchanged before drafting. Design is included to resolve ambiguity across the list, summary, eligibility and paging seams without prescribing repairs.

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
