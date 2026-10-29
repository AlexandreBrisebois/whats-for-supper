# Design

## Context and Existing Ownership

See [proposal](proposal.md) for scope. This cross-page, API-backed change needs a design. Findings below come from source inspection, not a rendered review.

- `/browse-all-stack` uses GET `/api/recipes`, Explore ordering, 20-item stack pages or 12-item list pages, a history-generation token and request-generation guards. It has an All/Discovery toggle, presentation toggle, recycle bin and Close, but no Filters chooser. Its unfiltered All total currently comes from library summary; a filtered collection must instead use the page's filtered total.
- `/recipes` is Search. `RecipeFiltersSheet` already owns drafts, Apply, Clear and grouped filters. `RecipeSearchPredicate` owns normalized hard predicates for EF and SQL; search continuation also rechecks eligibility. `familyFavorite` is based on rating and other facts, not configured GOTO membership.
- `GoToService` owns persisted `family_goto` reads/replacement. `FamilyGOTOSettings` owns management presentation, pending labels, remove and Search/Describe/Photo entry. `RecipeDetailSheet` already adds/removes a loaded recipe through the shared family store, with pending/error feedback.
- `tonight-meal-decisions` owns these management contracts, Home setup and capture return. Their current Profile/Settings destinations must move with the feature; Home education needs an unfiltered selection destination. Home's random ready-GOTO selection stays unchanged.

## Decisions and Tradeoffs

1. **Keep one toolbar entry for filtering.** Add Browse Filters on a compact row below its existing controls. Search reuses its chooser. GOTO is a filter choice inside both, with an active count and selected semantics. Do not add a third All/Discovery/GOTO mode or import all Search filters into Browse.
2. **Use intersection.** GOTO restricts configured membership; Discovery further restricts discoverability. Search text, Focus and other hard filters keep their existing meanings. False/absent `gotoOnly` is inactive. GOTO-only Search selects Explicit, retaining the existing filter-only order rather than Discovery personalization.
3. **Filter at the server.** Extend GET `/api/recipes` with optional boolean `gotoOnly` and `RecipeSearchFiltersDto` with the same field. Resolve distinct configured recipe IDs from the current household list once per initial request or continuation eligibility recheck through the existing GOTO owner. Apply membership before count, offset and candidate limits. Reuse that resolution in EF and SQL predicates; an empty configured list must yield zero results, not omit the predicate. Do not index membership or derive it from rating. No database migration is needed.
4. **Preserve management inside Filters.** Reuse the existing management behaviour as a collapsed, clearly labelled Manage GOTOs disclosure in each panel. Render simple readable rows on the existing sheet surface; do not embed the old Settings glass card, tiny tracked uppercase headings or repeated elevated frames. It lists the complete configured collection, including pending entries, independently of the result filters. Keep Add a GOTO and its existing acquisition choices here; retain per-recipe star actions in detail. Do not make opening the panel or toggling GOTO launch management automatically. The explicit setup deep link is the exception.
5. **Separate draft and saved effects.** Apply/Close semantics affect filter drafts only. List saves are immediate, confirmed server mutations; cancelling Filters must not pretend to undo them. Explain this locally in the management disclosure. Preserve the existing full-list replacement boundary rather than silently adding concurrency controls.
6. **Move navigation with the feature.** Add a shared route target `/browse-all-stack?gotoOnly=true&manageGoto=true`. GOTO capture completion uses it. Home's Choose GOTO recipes action instead opens ordinary unfiltered `/browse-all-stack`, so an empty configured collection does not send people straight into empty filtered results. The capture return target initializes applied GOTO filtering, opens Filters and expands management. Update the capture return label to Back to GOTOs in EN/FR. Ordinary Browse and Search mounts remain unfiltered. There is no cross-page filter synchronization.

## First Observable Slice

Start on Browse list presentation with configured ready GOTO A, ordinary ready B, pending configured C and deleted configured D. Open Filters, select GOTO, Apply: real page -> generated GET client -> controller -> library query -> persisted household configuration -> filtered page/count. Only A appears and total is one. Clear GOTO and B returns; C remains pending only in management and D remains excluded from results. Use actual API/database tests for membership/count behavior and schema-compliant Playwright route mocks for UI integration. Neither replaces the other.

Then extend that working path to stack navigation, Search's filter-only/typed/Similar retrieval and continuation, then management relocation and entry/return links. Update contract and generated client before the first runtime behavior slice, and keep each slice test-first.

## State, Concurrency and Recovery

Collection identity includes GOTO selection, All/Discovery, presentation and request generation. Applying a changed filter resets page/index, stack caches, pending navigation and continuation state. Every fetch path, including wrapping, retry and prefetch, carries the selection. Ignore departed-generation responses using the existing guards. GOTO-filtered Browse uses pagination totals even in All mode; library summary remains an unfiltered fact.

Each confirmed local membership save refreshes mounted applied-GOTO results from the first page without clearing text, Discovery selection, Search preferences or planning target. Failed saves retain confirmed membership and existing result state with visible error/retry feedback. A successful save followed by failed refresh remains saved; report the refresh error and offer retry. Do not replay the mutation merely to reload results. Closing an unchanged detail sheet still preserves place and does not trigger a new request.

Search fingerprints must include normalized `gotoOnly`. Reusing a cursor with a changed selection must return the existing 409 restart response. Ranked continuation retains frozen ordering and rechecks current GOTO membership; removed recipes are excluded without inserting newly added recipes into that snapshot. Fresh search includes new members. Existing process lifetime/history-generation recovery remains in force. This does not introduce cross-device membership invalidation guarantees.

Management loading must not be represented as an empty configured collection after a rejected read. Show a retryable read error; removal errors retain the configured item. Pending-item feedback and existing recipe-ready event handling remain available after relocation without claiming worker completion from list registration.

## Compatibility, Rollout and Reversal

Additive request fields default inactive, preserving old callers and response envelopes. Update OpenAPI first, regenerate Kiota and synchronize API DTOs, clients and method-sensitive mock handlers in each slice. Existing GOTO payloads and JSONB storage remain unchanged. Deploy compatible API support before relying on the new client filter. Code reversal can restore Settings management without converting data. No commit, deploy or archival is part of the implementation tasks.

## User Experience

Proposed Browse composition:

```text
[ All / Discovery ] [ Cards / List ] [ Bin ] [ Close ]
[ Filters  0 ]

Recipe cards or list
```

Filters contains a GOTO choice, a collapsed Manage GOTOs disclosure and Apply/Clear/Close controls. Search keeps its existing choices alongside GOTO. Use labelled buttons/checkboxes, 44 px or larger targets for the new filter/management controls and readable sentence case; preserve Home's existing 48 px minimum targets. Reuse the existing filter selected/unselected pattern rather than adding a yellow GOTO filter treatment. Keep the current cream sheet surface and shared tokens. Management may scroll; all controls and dismissal remain reachable above safe areas with 200% text and French expansion.

Reuse established modal focus, Escape/backdrop and scroll containment patterns. Avoid competing nested focus traps for the acquisition sheet: keep acquisition visibility and trigger-focus state in a page-level coordinator or mounted sibling of the filter panel, so dismissing/unmounting Filters cannot also destroy the requested acquisition sheet. Close the filter presentation before opening acquisition choices, then restore the Filters entry on dismissal. Preserve applied filters and discard unsubmitted drafts when leaving the chooser for acquisition. Direct capture links continue to use the existing `intent=goto` and mode parameters.

GOTO results with zero eligible recipes say there are no matching GOTO recipes and offer Clear filters or management. Do not claim the household library is empty or omit pending management entries. The management list is explicitly the full household collection, while results obey the current filters. Check EN/FR at 320, 390 and 412 CSS px, short phones at 320x568 and 390x667, landscape phone at 667x375, iPad portrait/landscape, long names, keyboard focus and reduced motion; record actual rendered findings separately from mocked interaction and database evidence.

## Home education after removing Settings management

Teach GOTO starring only on the ordinary empty supper-choice pivot, without a represented GOTO identity or saved non-cooking/Mystery context, after the existing initial active read has settled. Use the existing Home `hasCheckedActive` state rather than add another fetch or policy owner. Do not introduce the helper while the initial read is pending. Ready, checking and pending recipe presentations and saved Mystery remain unchanged. A 404 or failed active read does not establish an empty configured list, so the invitation must make no absence claim.

Place one short body sentence and the text-style Choose GOTO recipes link together below Quick Find and Order In in reading and focus order. Proposed English: “Tap the GOTO star on favourite recipes so we can suggest one here.” Use equivalent French; keep the sentence readable at body scale with normal weight and wrapping, not a heading or small uppercase annotation. Use charcoal-600 text and terracotta-700 for the link, without a filled button or separate teaching callout/card. Keep Home's existing 48 px target and visible focus on the link. It opens unfiltered Browse; starring does not assign tonight's meal or guarantee readiness.

## Cookbook and colour preservation

The main capability requirements [Present Tonight as a refined family cookbook](../../specs/tonight-meal-decisions/spec.md#requirement-present-tonight-as-a-refined-family-cookbook), [Use refined Home action treatments](../../specs/tonight-meal-decisions/spec.md#requirement-use-refined-home-action-treatments) and [Preserve appetizing planned Tonight photography](../../specs/tonight-meal-decisions/spec.md#requirement-preserve-appetizing-planned-tonight-photography) remain the owners. Preserve the current adaptive landscape planned photograph rather than restoring a historical near-square crop. The ready-GOTO pivot retains its wider image, bold Outfit recipe title, quiet context and compact alternative actions. Keep the white deeply rounded Home shell on cream, soft card/image elevation and modest warm icon fallback. No teaching text, management UI or badge is added to the ready-GOTO or planned card.

| Element | Bounded treatment |
|---|---|
| Home primary | Existing rich terracotta with light text; existing hover/pressed shades |
| Home secondary | Existing quieter outlined/tonal actions; enabled appearance retained |
| Home helper/link | Charcoal-600 body copy; terracotta-700 text-style link below immediate actions |
| Filter selection | Existing Search selected/unselected treatment with explicit state |
| GOTO star | Existing ochre identity, with visible GOTO label in both states and readable state pairs |
| Management | Existing cream sheet, readable charcoal labels and simple rows; no nested glass Settings card |

For the star's bounded correction, start with ochre-800 text/icon on ochre-50 when unselected and ochre-800 on ochre-100 with a filled star when selected. Retain `aria-pressed`, pending disablement and success/error feedback. Check text, indicator, edge and focus contrast on actual composites in each state; these are candidate token pairs, not rendered acceptance. The source's white-on-base-ochre pair calculates to about 2.06:1 and must not be copied into the new presentation. This does not authorize recolouring unrelated Discovery, Browse or recipe-detail controls, changing global tokens, or replacing ochre throughout the app.

Do not edit `TonightCardBase`, `TonightRecipeImage`, planned-card presentation or shared button primitives to fit the helper. In Browse, the extra Filters row must share available viewport space with the card and its actions; preserve readable labels, reachable actions and swipe/list behaviour on short screens rather than shrinking text or clipping the card. Match before/after Home captures using identical content, image, locale and viewport; explicitly assess planned, ready-GOTO, empty, checking/pending and saved Mystery. Source/style checks alone cannot establish that the cookbook treatment survived.
