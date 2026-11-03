# Design

## Context and Existing Ownership

The [proposal](proposal.md) defines scope; the four deltas define observable behavior. The following facts are source-inspected, not browser-validated:

| Current owner | Relevant mechanism and insertion point |
| --- | --- |
| `pwa/src/app/(app)/browse-all-stack/page.tsx` | Explore GET after library summary; stack 20/list 12; All/Discovery and Go-To; page cache, history generation, adjacent/wrap navigation, prefetch and retained-card retries. Currently a fixed `z-50` overlay with Close. |
| `pwa/src/store/browseStackStore.ts` | Transient Browse records, index, total and page state; reset on departure. Page/history ownership remains distinct from Search. |
| `pwa/src/app/(app)/recipes/page.tsx` | Local query/filter/preferences/Similar state, POST search, 500 ms timer, cursor and request generations, invalidation subscriptions, detail and planning/recovery handlers. Currently always expanded and renders a hero plus alternatives. Debounce retains Similar while Enter clears it, so they need one intent-resolution path. |
| `pwa/src/lib/api/recipes.ts` | `searchRecipes` accepts raw/enveloped responses, retains error status and maps Search DTOs. `RecipeSearchResult`/`mapSearchResult` currently drop description. `readField` already supports generated `additionalData`. |
| Search DTO/service and `specs/openapi.yaml` | `RecipeSearchResultDto` and `RecipeSearchService.MapResult` already return description; the OpenAPI result does not explicitly declare that property. Preserve this existing optional payload through the adapter's established `readField`/additional-data handling. Do not add an API field, regenerate types merely to add it, or synthesize detail DTOs. |
| Recipe components | Reuse `RecipeStackCard`, `StackActionBar`, compact Browse grid, `RecipeDetailSheet`, `RecipeFiltersSheet`, `RecipeImportIssueBadge`, `RecycleBinSheet` and existing gesture/focus hooks. No voting-card business logic belongs in Recipes. |
| Shell and entry points | `Navigation.tsx` labels `/recipes` Search; `(app)/layout.tsx` hides navigation for legacy Browse. `HomeSections.tsx` supplies the Browse tile. Planner and Home already supply day/week/reference context. `baseManifest.json` feeds `pdfManifest.ts` and `manifest.json/route.ts`. |
| Browser fixtures | `pwa/e2e/mock-api.ts` owns method-sensitive Explore, summary, Search, filter-vocabulary, membership and mutation handlers, with `MOCK_IDS` and builders. Existing recipes/browse/search-hardening/invalidation specs exercise their consumers. |

Shared authorities remain [member-preferences](../../../specs/member-preferences/spec.md), [meal-assignment](../../../specs/meal-assignment/spec.md), [recipe-editing](../../../specs/recipe-editing/spec.md), [recipe-quality](../../../specs/recipe-quality/spec.md), [recipe-recycle-bin](../../../specs/recipe-recycle-bin/spec.md) and [household-live-updates](../../../specs/household-live-updates/spec.md). Their persistence, eligibility, mutation and recovery rules are reused. Unified collection refresh specializes the former route-specific Search callback at `/recipes`: successful deletion refreshes GET in Explore and POST in active Search, without changing deletion itself.

Terminology: **Explore** is the GET library collection. **Search** is a client collection using POST for effective intent. **Discovery scope** is the library's discoverable-only predicate; it is different from the backend's existing `searchMode=discovery` policy and from the bottom Discovery voting destination. Scope-only client browsing never invokes POST's Discovery promotion path. Direct API callers retain that path and existing GOTO-only Explicit behavior.

## Decisions and Tradeoffs

1. **One screen controller with separate collection state.** Move the reusable Browse behavior under `/recipes`, integrate Search there, and leave a redirect at the legacy route. Keep a small page-local controller or cohesive hooks for intent, Browse pages and Search cursor state. Avoid mounting two route pages inside each other or building a generic collection framework. Separate state prevents mixing offset pages, history tokens, cursors and wrap rules.
2. **Visibility is a disclosure boolean.** `searchControlsExpanded` is independent of collection mode, request generation and presentation. Disclosure handlers change visibility/focus only. They are not dependencies of collection loading, timer cleanup, cursor invalidation or reset effects. Leaving Recipes performs lifecycle cleanup; hiding controls does not.
3. **One effective-intent resolver.** Scope consists of `discoverableOnly` and `gotoOnly`. Nonblank text, Similar, usable Focus or another effective supported Search filter selects POST; scope alone selects GET. Planner target, `open`, `focus=search` and expanded controls do not count as Search criteria. Keep the server's normalization, lexical/semantic paths and ranking unchanged.
4. **One shared card summary.** Explicit adapters from Browse DTO and Search result expose only identity, name, description, image/time, rating/notes/discoverability and supplied issue status needed by shared cards/actions. Normalize absent optional text at this boundary; preserve Search description when supplied. Detail still loads by identity; a summary never pretends to contain complete recipe detail. Reuse stack cards and one compact grid instead of duplicating markup or converting everything to the full `Recipe` model with invented fields.
5. **Flatten at the presentation boundary.** Build the initial sequence by taking optional initial `topPick`, then `results`, retaining the first occurrence of each nonempty identity. Continue by appending unseen identities in response order, considering the entire initial sequence. Keep transport fields and alternative-count semantics unchanged: 12 alternatives plus a topPick can mean 13 displayed cards. No local sorting, random choice, reason-based promotion or spotlight. Backend review selection still owns whether a topPick is returned.
6. **One applied scope, separate chooser draft.** Toolbar scope applies immediately. The chooser copies applied scope and Search selections into a fresh draft; Apply commits together, dismissal discards. Existing Go-To selection reflects the toolbar; Discovery scope is represented consistently in the chooser so Clear Filters can clear both scope choices. Shared scope counts once in the existing active-filter count. Membership stars remain recipe mutations, distinct from the toolbar's Go-To filter.
7. **Switch views without re-searching.** Persist the selected member's existing `browseViewMode`, using existing optimistic/save-failure behavior. In active Search, render the loaded sequence/cursor in the other presentation and reset its position; do not POST again. In Explore, retain current summary-first, presentation-specific page-size reload. Member preference loading/override ownership remains unchanged.

The alternative of using POST for every entry would lose full-library Explore traversal and ordering. Using GET for text or Focus would lose retrieval/ranking/continuation semantics. The two-source controller is intentional; no backend rewrite or migration is justified.

## First Observable Slice

Ordinary bottom Recipes entry → member presentation resolution → library summary → generated GET recipes client with `order=explore` and selected page size → existing API → recipe service/database → shared stack or grid, with bottom navigation visible and Search first in the toolbar. A saved list preference must select 12-item paging; default stack selects 20 and retains wrap.

The first slice includes actual route/layout/controller integration and both empty/failure recovery and multi-page navigation. Playwright's mock boundary proves browser integration, not SQL sorting. Retain the existing API Explore/history tests as separate real-seam evidence; test selection and fixtures are named in tasks. The API layers need no production changes. Subsequent slices add ranked Search, disclosure lifecycle, contextual recovery and entry retirement to that working route.

## State, Concurrency and Recovery

### State ownership

| State | Lifetime and change rules |
| --- | --- |
| Presentation | Existing member preference plus member-scoped mounted override; position resets on view change. No new persistence. |
| Disclosure | Mounted Recipes session; normal entry collapsed, explicit Search/Similar/planner entry expanded. No request effects. |
| Intent | Current text/Similar, applied filters/preferences and scope; chooser draft is independent. Nonblank typing clears Similar consistently before debounce or Enter. |
| Browse | Summary/filtered total, page size, pages/cache, global position, history generation and retries; never populated from Search results. |
| Search | Submitted immutable request context, loaded sequence, cursor, current position/scroll, exhaustion, request generation, invalidation version and failure state. Never populated from Browse pages. |
| Context | Captured planner target and reference week, detail identity and return trigger/position; independent of disclosure and source. |

Keep input text distinct from the submitted request snapshot when necessary: continuation must use the query/filters/Similar/planner target that produced its cursor, not newer unsubmitted typing. A criterion/scope change legitimately supersedes the old collection; a visibility change never does. Clear or Similar actions cancel obsolete timers so an old typing closure cannot reintroduce a removed criterion. Enter cancels its timer, blurs, then uses the same resolver as debounce. Blank input retains Similar until its removable indicator or explicit clear is activated.

### Transition decisions

| Action | Collection and request effects | Position/context |
| --- | --- | --- |
| Normal entry/return | Fresh scoped-state defaults: Explore, All, empty criteria, collapsed | Start position; saved presentation |
| Reveal / hide / reopen | No request, invalidation or debounce cancellation | Preserve sequence, cursor/pages, position, mode and planning context; restore values |
| Apply text/Similar/Focus/non-scope filter | New Search generation through POST | Reset to start; keep scope, presentation and planner context |
| Change toolbar scope | Reload active source with intersected scope | Reset to start; keep other intent |
| Apply a scope-only draft / remove last Search criterion | GET Explore under resulting scope | Start position; presentation/context retained |
| Clear Filters | Clear scope plus filters/preferences; keep text and Similar; resolve remaining intent | Start position after commit; chooser Clear stays draft until Apply |
| Clear search and browse | Clear non-scope Search criteria; cancel obsolete debounce/cursor; GET scoped Explore | Start position; keep scope, presentation, planner context and disclosure visibility |
| Change presentation | Search reuses data/cursor; Explore reloads with the new page size | Reset position; save existing preference |
| Detail dismissal | No replacement request | Restore same ordinal/scroll and focus to connected trigger |
| Page departure | Retire lifecycle, invalidate outstanding generations, clear timers and transient state | Next ordinary entry is fresh |

Selecting the already active Recipes tab is not departure and must not erase the mounted session. Browser back/forward or a cached route must not restore departed search state; logical route departure must have the same cleanup as unmount. Existing explicit entry parameters are applied as entry intent, not saved session state.

### Paging and request guards

Browse retains summary-first loading, All-vs-filtered count selection, 20/12 sizes, list threshold/sentinel, five-card stack prefetch, page cache, three-request empty wrap probing and history-generation restart. Preserve 40/46 and large-library full-cycle coverage. Never calculate a Search final page using Browse totals.

Search list continues with its sentinel; stack asks for the same cursor when next crosses the loaded boundary. Keep one continuation in flight per generation, retain the card while pending, and prevent automatic repeated observer retries after failure. Previous at zero and next at exhausted end stop. Empty continuation pages with a next cursor advance the cursor without declaring exhaustion or inventing a card. Before exhaustion use a label such as “3 of 12 loaded · more available”; afterward show the exact distinct count of the served snapshot, not a claim about all theoretically relevant library recipes.

Capture lifecycle/collection identity, request generation and the existing Search invalidation version in every async operation. Apply these checks to results, errors and pending-state cleanup, including Browse summary/page/history requests, Search first/replacement/continuation, metadata and departed gesture completions. A pending Explore response cannot overwrite Search, and a pending Search response cannot overwrite cleared Explore or a later mount.

Retain Search invalidation subscriptions even though the spotlight is gone. They protect returned data, not only promotion UI. Refresh active Search with its current submitted context even while controls are hidden. Confirmed Go-To changes reload only an applied-Go-To collection through its own source; failed membership saves do not masquerade as new confirmed membership. Read failures after a saved mutation retry reading, never repeat the mutation.

Recovery remains source-specific: Explore page/wrap failure retains its card and intended retry; history expiry exposes restart. Search initial/replacement failure displays error and Retry, distinct from a valid zero-match result. Continuation failure retains all cards: 409 offers Restart search with a fresh initial request/current context, other failures retry the same cursor. No recovery action silently substitutes Explore or returns an obsolete generation.

### Correctness properties for acceptance

| Preconditions/input domain | Invariant | Suitable evidence |
| --- | --- | --- |
| Loaded Explore or Search, any disclosure sequence, including a pending debounce/request | Visibility changes preserve collection identity, criteria, sequence, paging, position and presentation; requests only arise from their original triggers | Fake-timer/deferred-response unit tests plus browser hide/reopen scenarios |
| Initial optional topPick and overlapping continuation pages | Displayed IDs equal stable first-occurrence concatenation; initial topPick appears exactly once | Adapter/controller examples with duplicate IDs and browser first-card assertions |
| Stable Explore collections spanning full/partial pages | Every scoped ID appears once per cycle with correct ordinal, including both wraps | Existing 40/46/180-record fixtures and real API ordering preservation checks |
| Search cursor is present or exhausted | Back visits loaded matches; forward only follows that cursor; no wrapping or premature exact total | Deferred continuation, duplicate/empty page, exhausted, failed and expired cases in both views |
| Arbitrary old outcomes after scope/source/departure changes | Old outcomes cannot change current cards/counts/position/loading/errors | Controlled resolution-order tests and browser delayed-response scenarios |

## Compatibility, Rollout and Reversal

`/recipes` becomes canonical. Redirect legacy `/browse-all-stack` using supported `gotoOnly`, `discoverableOnly`, `focus`, `similarTo`, `open`, `addToDay`, `weekOffset` and `referenceWeekStartDate`; discard retired management intent. Keep redirect context encoding intact and existing household/member gates. Preserve both combined scope predicates. Do not copy arbitrary query strings into persisted state.

Entry precedence: supplied detail opens its sheet first and receives focus; underlying Similar activates Search and expands controls; valid planner day/week or `focus=search` also expands controls but does not itself activate POST. With detail open, defer input autofocus until it no longer competes with modal focus. An `open`-only entry retains an Explore background. A new explicit supported context arriving while mounted is a deliberate context transition with obsolete work guarded; `open` changes continue to follow detail identity.

Home/planner links retain their target parameters and expanded Search meaning. Preserve existing day/week URLs as contextual entry, so adding `focus=search` does not become a prerequisite for planner compatibility. The current installed Search manifest URL becomes `/recipes?focus=search`; name, description, icon, identity and Capture remain unchanged. Old OS shortcut metadata may continue to target bare `/recipes` until refreshed; without an explicit parameter that URL follows the ordinary-entry contract. Do not infer installed intent from launch mode or persist hidden context to compensate.

This is a reversible UI/navigation change with no data conversion, ranking deployment or new feature flag. Backend Top Pick/reason/promotion fields and old API behavior remain compatible. Reverting presentation code does not require restoring or transforming stored recipes or preferences.

## User Experience

### Composition and content

Keep Solar Earth cream canvas, existing glass surfaces, terracotta actions, sage selections, Outfit headings and Inter body text from `globals.css` and root layout. Preserve Browse stack photography/descriptions and compact 4:3 grid cards. Replace the overlay sizing with app-shell available space: account for safe areas, notification layers and bottom navigation before sizing a stack. Do not globally shrink preferred cards to accommodate one short viewport.

```text
Recipes toolbar: [Search] [All/Discovery] [Go-To] [Stack | List] [Recycle bin]
                 [Search input                             ]  expanded only
                 [Filters · active count] [Similar ×] [Clear search and browse]
Planning for <day> · Cancel                                  contextual only
Current collection: stack + actions/position OR compact recipe grid
Current-source loading / empty / failure / continuation recovery
Bottom app navigation: Home · Recipes · Discovery · Planner · Profile
```

Toolbar DOM, visual and Tab order match, including wrapped rows. Every toolbar target is at least 48×48 CSS px; retain a segmented stack/list control with explicit selected state. Reflow rather than squeezing targets. Input and Filters are the next region directly below the toolbar; planning context sits outside the collapsible region. In a collapsed active Search use the existing selected surface plus a persistent dot/marker and an accessible “Search active; show controls” description. `aria-expanded` describes disclosure, not Search activity. Scope-only Explore never shows that active-search marker.

Use a removable Similar chip with a fallback label if the source title is unavailable. Existing semantic errors/zero-match guidance remain localized, with honest Retry vs Clear Filters vs Clear search and browse actions. Keep the explicit clear action reachable in expanded controls and empty recovery; no Browse link navigates away. Label normal sections Recipes/Results instead of Top Picks. Proposed copy parity: Recipes/Recettes, Search/Rechercher, Filters/Filtres, Clear search and browse/Effacer la recherche et parcourir, Search active/Recherche active. Reuse established Go-To terminology and translations; final copy must be checked in layout with French expansion.

### Keyboard and focus

Use native buttons for disclosure, scope, view selection and recovery; make regular result cards keyboard-openable with a localized recipe name. Retain existing gestures, provide previous/next buttons as the keyboard alternative, keep rear stack cards noninteractive and expose boundary state. Expanding focuses the input using a position-preserving approach so returning to the input does not reset the collection. Enter retains current immediate-submit/blur behavior. Hidden controls leave the accessibility tree/tab order.

The Search toggle can hide its region; an explicit hide action inside the region returns focus to that toggle. Escape dismisses an open Filters/detail/bin dialog first under the existing focus hook; closing a chooser discards its draft and returns focus to Filters. When no dialog is open, Escape from the expanded search region can hide it and return focus to Search without clearing criteria. Detail/bin dismissal restores their connected trigger, or a nearby current recipe action if the original trigger was removed. Departure and replaced identities must not steal destination focus. Reduced motion removes unnecessary disclosure/card animation without altering these behaviors.

### Designer review record

Reviewed on 2026-11-02 by Codex applying the repository [designer skill](../../../../.agents/skills/designer/SKILL.md), with its visual-identity/Solar Earth guidance. This is a source- and specification-based interaction review; it is not an independent human sign-off, rendered layout inspection or observed usability result.

| Review area | Finding and design resolution | Remaining validation |
| --- | --- | --- |
| Toolbar placement | Search first preserves a stable starting point; retained scope/view/bin remain usable in Search. Wrapped order and 48 px targets are explicit. | Both views, keyboard order, measured targets and responsive rows |
| Expanded controls | Progressive disclosure avoids permanent extra rows; opening alone retains Explore. Planning context stays outside disclosure. | Input focus and toolbar-to-controls adjacency, virtual keyboard |
| Collapsed active Search | An invisible active query would mislead members about their library. Marker plus accessible active description distinguish it from scope-only Explore. | Loading, zero results, failure and successful hidden Search with assistive technology |
| Both presentations | Shared cards preserve familiar photography and details. Search boundaries differ visibly from circular Explore. | Full Browse traversal, Search continuation, long titles/descriptions and returned issue badges |
| Contextual entry | Details and Search autofocus could compete; detail takes focus first. Explicit targets remain visible and do not assign on entry. | Home/planner links, Similar, open, shortcut and combined legacy context |
| Recovery | Empty and failure are different states; clearing and hiding have separate labels and effects. Retained-card retry prevents lost place. | Initial/replacement errors, pagination failure, 409 restart, saved mutation then failed read |
| Keyboard/focus return | Native controls, drawer focus containment and connected-trigger fallback avoid stranded or stolen focus. | Tab/Shift+Tab, Enter, Space, Escape, route departure and result deletion |
| Space/style/motion | Existing Solar Earth tokens and adaptive card dimensions preserve the cookbook treatment with safe-area app navigation. | EN/FR; 320×568, 390×667, 667×375, 360/390/430 widths, tablet portrait/landscape, 200% text, reduced motion and actual composite contrast |

No unresolved product decision blocks these tasks. Responsive measurements and assistive/browser behavior remain required acceptance work on the implemented screen; this planning review does not claim them passed.

### Implemented rendered review (2026-11-02)

The unified `/recipes` screen was rendered and inspected in local Chromium with method-sensitive mock responses. Browser assertions covered English and French at 320×568, 360×780, 390×667, 430×932, 667×375, 820×1180 and 1180×820, plus 390 and 820 widths at 200% text, with reduced motion. Both stack and list remained reachable without horizontal overflow or app-navigation overlap; the short 320 and landscape screens scroll vertically. Search remained the first toolbar control; measured segmented view targets were raised to 48 px. Composite contrast checks of the actual rendered colors passed at least 4.5:1 for tested text, including 7.12:1 for charcoal on ochre. The local keyboard sequence exercised Tab, Shift+Tab, Enter, Space, Escape, disclosure focus, Filters/Recycle Bin/detail return focus, and direct-detail precedence. The browser suite also exercised successful empty, failure, pagination and recovery states. Screenshots and detailed command results are recorded in [implementation evidence](implementation-evidence.md). Native mobile virtual keyboards, physical safe-area devices and independent assistive-technology reading were not tested; safe-area and reachability checks used emulated viewports and computed browser geometry.

## Evidence and Limits

The user reports four existing unit suites passing, 95 tests total. Suite names, command/runtime/content identity and browser results were not supplied, so this design preserves that report as baseline evidence only. Current tests contain assertions for mount-time POST, Top Pick, Surprise Me, the Home Browse tile and overlay Close; those expectations become stale under these deltas and must be replaced with meaningful unified behavior coverage. No application tests or browser validation performed for this documentation change can establish the new runtime behavior.
