# Feature inventory

## Purpose

This document is the starting catalog for writing one or more specifications for
each product capability in What's for Supper (WFS). It records behavior that is
present in the current application; it is not itself a requirements document and
does not imply that every behavior is complete or should be preserved unchanged.

The inventory was assembled from the family-facing routes and components, the API
controllers, the OpenAPI contract, automated tests, the PWA manifest, and the
family guide. Archived plans and specifications were not treated as evidence of
current behavior.

### How to use this catalog

- Keep the stable feature ID when splitting an entry into requirements, design,
  and task documents.
- Use the completed [feature specification catalog](../.kiro/specs/FEATURE_CATALOG.md)
  to open the requirements, design, and future-change tasks for any stable ID.
- Treat every bullet under an entry as a behavior to confirm, change, or reject
  during specification discovery—not as pre-approved acceptance criteria.
- Start with the **family-facing product features**. Specify supporting platform
  capabilities separately when they have their own lifecycle or operational risk.
- Capture cross-feature rules (identity, synchronization, localization, async
  processing, accessibility, and responsive/PWA behavior) in every affected spec
  rather than assuming they are inherited automatically.

## Product surfaces at a glance

| Surface | Primary purpose | Route |
|---|---|---|
| Welcome and onboarding | Enter a household and choose a family identity | `/welcome`, `/invite`, `/onboarding` |
| Home | Decide and act on tonight's meal | `/home` |
| Search | Find, inspect, and act on recipes | `/recipes` |
| Discover | Vote through the household's discovery queue | `/discovery` |
| Planner and groceries | Plan weeks and shop from the derived list | `/planner` |
| Capture | Add recipes from photos, links, descriptions, or share bundles | `/capture` |
| Browse library | Explore and manage the whole recipe collection | `/browse-all-stack` |
| Profile and settings | Select identity and manage household preferences | `/profile`, `/profile/settings` |

## Family-facing product features

### Household access and identity

#### ID-01 — Shared household authentication

- Enter the household passphrase to establish access without an individual user
  account.
- Validate invite links and carry the household secret into the session.
- Pre-populate showcase credentials when the server reports demo mode.

#### ID-02 — Member onboarding and switching

- List household members, select the active perspective, or create a new member.
- Persist the selected member for later requests and restore it on a return visit.
- Switch members from onboarding, the profile screen, or the in-app member menu.

#### ID-03 — Household member administration and invitations

- Add and rename family members and select the current member.
- Generate a member-specific invite link, then copy it or invoke the device share
  sheet.
- The API also supports removing a member; a family-facing removal control was not
  found and should be explicitly accepted or rejected when this feature is
  specified.

### Tonight command center

#### HOME-01 — Tonight's meal status

- Present tonight's planned recipe, timing, readiness, image, and next actions.
- Open recipe details or Cook's Mode from the current meal.
- Reflect schedule changes received from the shared household state.

#### HOME-02 — Empty-night fallback

- Offer a randomly selected ready GOTO recipe when tonight has no meal.
- Assign the offered recipe to tonight in one action.
- Open Quick Find for a bounded suggestion stack or continue into library search.

#### HOME-03 — Changed-plan recovery

- Mark an empty night as Ordered In.
- For an existing plan, choose another meal, move the recipe to tomorrow, defer it
  to the next available day starting next week, or drop it.
- Preserve the server-selected destination and surface success or recovery errors.

#### HOME-04 — GOTO fallback rotation

- Maintain multiple household fallback recipes rather than a single favorite.
- Add or remove recipes from the rotation from recipe details and settings.
- Create a pending GOTO from photo capture or a description, then promote it when
  background processing completes.

### Weekly planning and voting

#### PLAN-01 — Week navigation and status

- View past, current, and future weeks with a shareable week-offset URL.
- Distinguish draft, voting-open, and locked/finalized week states.
- Show planned-count and completion feedback.

#### PLAN-02 — Meal assignment and replacement

- Fill an empty day through Quick Find or planner-aware library search.
- Inspect a planned recipe and replace it through the planning pivot flow.
- Detect an occupied destination and resolve the displaced recipe instead of
  silently overwriting it.

#### PLAN-03 — Schedule movement and exceptions

- Drag meals to reorder or move them across days and weeks.
- Mark a date as Ordered In, remove a plan, move it to tomorrow, or defer it to an
  available later date.
- Validate day state and reconcile the displayed week after mutations or failures.

#### PLAN-04 — Family voting cycle

- Open voting for an eligible week, close voting, and surface vote totals on
  planned meals.
- Generate a discovery link to nudge the family, with copy and native-share
  actions.
- Promote household discovery matches into planning suggestions.

#### PLAN-05 — Automatic schedule maintenance

- Mark eligible overdue planned meals as cooked so they do not remain stale.
- Leave Ordered In, already cooked, and future meals unchanged.
- Seed or curate future suggestions through scheduled planning workflows.

### Grocery planning

#### GROC-01 — Derived weekly grocery list

- Build the grocery list from the recipes assigned to the selected week.
- Group ingredients by grocery aisle/category while retaining duplicate line items
  where they represent distinct recipe needs.
- Switch between planner and grocery views without leaving the week context.

#### GROC-02 — Collaborative shopping state

- Check and uncheck individual grocery items.
- Apply bulk grocery state changes for the week.
- Synchronize shopping changes to other household devices in real time.

#### GROC-03 — Ingredient aisle correction

- Reclassify a normalized ingredient into a different grocery category.
- Recompute list organization after classification changes.
- This capability currently has an API seam; its intended family-facing entry
  point needs confirmation in a future spec.

### Recipe discovery

#### DISC-01 — Swipe discovery queue

- Load discoverable recipes by category and present a card stack.
- Like or pass by gesture or explicit accessible controls.
- Refresh suggestions and avoid disrupting cards already visible to the member.

#### DISC-02 — Household matching feedback

- Persist each member's vote and count household matches.
- Show immediate "just planned" feedback when a matched recipe enters the plan.
- At the end of a queue, direct the member to planning, capture, or a refreshed
  feed based on the outcome.

#### DISC-03 — Discoverability controls

- Mark recipes as discoverable or hidden from family voting.
- Filter the library browse experience to discoverable recipes.
- Exclude deleted, unready, or otherwise ineligible recipes from discovery.

### Recipe search and recommendations

#### SEARCH-01 — Conversational hybrid search

- Search with natural-language text across recipe names and recipe facts.
- Combine lexical and semantic relevance when semantic search is available.
- Return an explained top pick plus ranked alternatives.

#### SEARCH-02 — Browse and incremental results

- Open with recommendations when no query is supplied.
- Load additional results through infinite scrolling, with retry and expired-search
  recovery.
- Offer "Surprise me" to rotate to another eligible result without changing the
  query.

#### SEARCH-03 — Faceted filters

- Discover available filters from current library facts rather than hard-coding
  every value.
- Filter by meal type, cuisine, main ingredient, and confirmed vegetarian status.
- Clear active filters and explain when the selected combination has no matches.

#### SEARCH-04 — Context-aware search

- Carry a target planner day/week into search and assign the chosen result back to
  that slot.
- Rank recipes already planned for the week lower while keeping them findable.
- Start a similarity search from recipe details while retaining a visible focus
  concept.

### Recipe library and details

#### LIB-01 — Immersive library browsing

- Browse the full library as cards or a list, ordered to help resurface recipes
  that have not been cooked recently.
- Toggle between all recipes and discoverable recipes.
- Open details and apply planning, cooking, or management actions without losing
  browse context.

#### LIB-02 — Recipe detail and metadata

- Display name, hero image, description, cuisine, meal types, time, ingredients,
  instructions, notes, rating, and import/readiness state.
- Edit recipe name, description, cuisine, meal types, and ingredients.
- Auto-save household notes and rating changes.

#### LIB-03 — Recipe actions

- Cook tonight, plan later, find similar recipes, or toggle GOTO status.
- Edit a recipe, report an import issue, or move it to the recycle bin.
- Only expose actions when the recipe state supports them.

#### LIB-04 — Recipe imagery and provenance

- View one or more original source photos with paging, zoom, and fit-to-screen.
- Upload an additional original photo.
- Regenerate a hero image in the background and report progress through global
  feedback.

#### LIB-05 — Soft deletion and recycle bin

- Move a recipe to the bin instead of deleting it immediately.
- List and restore deleted recipes.
- Permanently purge a recipe only after elevated-PIN confirmation.

#### LIB-06 — Portable recipe sharing

- Export an eligible ready recipe as a share bundle containing recipe data and
  imagery.
- Use the device share mechanism and prevent duplicate export attempts while the
  bundle is prepared.
- Import a shared bundle through Capture, preview its contents, and explicitly
  accept or reject it.

### Recipe capture and processing

#### CAP-01 — Photo capture

- Take one or more photos or select them from the device gallery.
- Choose the main-dish image, remove images, add appreciation/rating and notes,
  then submit the recipe.
- Continue using the app while extraction and downstream recipe work runs in the
  background.

#### CAP-02 — URL capture and PWA share target

- Paste a recipe URL or receive a URL/text/title from the operating system share
  target.
- Attach appreciation/rating and notes before submitting.
- Acquire the web source and process the recipe asynchronously.

#### CAP-03 — Description-based creation

- Describe a meal idea in free text and synthesize a recipe.
- Support the same background completion and duplicate safeguards as other capture
  paths.

#### CAP-04 — Recipe bundle import

- Select a portable recipe file shared by WFS.
- Preview recipe facts, steps, notes, rating, source, synthesis status, and image
  count before importing.
- Reject invalid bundles and show actionable import errors.

#### CAP-05 — Duplicate prevention

- Detect likely duplicates for photo, URL, description, and bundle flows.
- Let the member inspect the existing recipe and discard the duplicate attempt.
- Avoid creating a second recipe when the duplicate is rejected.

#### CAP-06 — Import progress and completion

- Surface processing/readiness status and notify the member when the recipe becomes
  usable.
- Let the member go home, open the planner, or continue to the created recipe as
  appropriate to the entry flow.
- Record import reports and expose enough status for background polling and live
  updates.

#### CAP-07 — Import failure recovery

- List failed captures in Settings with a family-friendly reason.
- Retry a failed capture or clear it from the list.
- Retain technical diagnostics behind the API/operations boundary rather than
  exposing them in the normal family experience.

### Cooking

#### COOK-01 — Step-by-step Cook's Mode

- Present recipe instructions as large, focused sections and steps.
- Move forward and backward while preserving the cook's place.
- Handle both structured instructions and parsed legacy instruction text.

#### COOK-02 — In-cook recipe feedback

- Flag an ingredient or instruction step that needs correction.
- Carry the relevant issue type and context into the recipe issue workflow.
- Return to the cooking flow without losing progress.

### Recipe quality and correction

#### QUAL-01 — Import issue reporting

- Report an ingredient, step, or duplicate concern with optional notes.
- Show unresolved and re-importing status on the recipe.
- Mark a reviewed issue as resolved.

#### QUAL-02 — Contextual re-import

- Re-read an eligible recipe's original photo or website source after ingredient or
  step feedback.
- Avoid launching a re-import for duplicate reports, unsupported sources, empty
  feedback, or an unchanged retry request.
- Preserve the report and expose a supportable import identifier when re-import
  fails.

#### QUAL-03 — Processing-language configuration

- Apply an administrator-configured target language to newly processed photo, URL,
  and description recipes.
- Allow existing sourced recipes to request corrected ingredients or steps through
  the issue/re-import flow.
- Keep processing language separate from each member's interface language.

### Preferences and application shell

#### PREF-01 — Interface localization

- Offer English and French interfaces.
- Persist locale as a member preference and propose switching when browser and
  saved preferences differ.
- Keep equivalent key coverage across supported locales.

#### PREF-02 — Installable PWA and device integration

- Install as a portrait, standalone PWA with platform and maskable icons.
- Expose Capture and Quick Find shortcuts.
- Register as a share target for recipe links and shared text.

#### PREF-03 — Responsive and accessible interaction

- Support phone, tablet, and larger layouts with touch-oriented actions.
- Provide non-gesture alternatives, labels, keyboard behavior, focus handling, and
  reduced ambiguity for destructive actions.
- Preserve safe-area spacing and usable loading, empty, error, and offline-adjacent
  states across primary surfaces.

## Supporting platform and operator capabilities

These are real application capabilities, but they should not be mixed into a
family journey spec unless that journey directly depends on them.

#### PLAT-01 — Shared real-time state

- Publish schedule, grocery, voting, recipe-readiness, and related household events
  through Server-Sent Events.
- Scope connections to the authenticated household/member context and reconnect
  after interruption.
- Reconcile local optimistic state with authoritative server state.

#### PLAT-02 — Background workflow engine

- Seed YAML-defined workflows, trigger instances, execute dependent tasks, retry
  transient failures, and reap abandoned workers.
- Report active instances, instance details, task diagnostics, and controlled task
  resets.
- Drive imports, image/description generation, search indexing, categorization,
  reconciliation, demo operations, and database maintenance.

#### PLAT-03 — Recipe search indexing

- Build lexical and embedding-backed search documents from recipe facts.
- Fingerprint work for idempotent indexing and reconcile missing or stale index
  state.
- Fall back safely when semantic infrastructure is unavailable.

#### PLAT-04 — Ingredient categorization

- Normalize ingredient names and units, assign grocery aisles, and retain manual
  corrections.
- Run categorization and recategorization as background work.

#### PLAT-05 — Storage, backup, and recovery

- Store relational household state in PostgreSQL and recipe assets on persistent
  local storage.
- Trigger backup, restore, and disaster-recovery workflows and expose management
  status.
- Include search-index state in backup/recovery behavior.

#### PLAT-06 — Managed demo mode

- Seed/capture a master showcase state and restore it on a configured schedule.
- Bypass AI-dependent work while leaving planning, browsing, voting, groceries,
  and regular search usable.
- Expose demo status so the PWA can adapt authentication and unavailable actions.

#### PLAT-07 — Health, authentication, and response conventions

- Expose service health and demo capability to the PWA.
- Enforce the household secret on protected API and event-stream requests.
- Apply consistent response wrapping, error mapping, identifiers, and generated
  client contracts.

## Cross-feature specification checklist

Every future feature spec should explicitly answer the applicable questions below.

1. **Actor and household scope** — Which family member acts, what is household
   shared, and what is member-specific?
2. **Entry and exit** — From which routes/states can the journey start, and where
   does success, cancellation, or recovery return the member?
3. **State model** — What are the ready, empty, pending, failed, stale, deleted,
   demo, and unauthorized states?
4. **Concurrency** — What happens when two devices act on the same plan, vote,
   grocery item, or recipe?
5. **Async feedback** — Which work is fire-and-forget, how is progress surfaced,
   and how does the UI learn completion or failure?
6. **Eligibility and safety** — Which actions are hidden, disabled, confirmed, or
   protected by an elevated PIN?
7. **Localization** — Which copy and persisted preferences are localized, and is
   recipe-processing language involved?
8. **Accessibility and devices** — What is the keyboard/non-gesture equivalent,
   focus behavior, screen-reader name, responsive layout, and PWA integration?
9. **Contracts and persistence** — Which API operations, events, entities, files,
   or workflows own the behavior?
10. **Acceptance evidence** — Which unit, contract, integration, real-database,
    and end-to-end checks demonstrate the complete journey?

## Suggested specification sequence

The following order reduces dependency churn while still producing independently
reviewable specs:

1. **Foundation:** ID-01–03, PREF-01–03, and PLAT-01/07.
2. **Recipe core:** LIB-01–06 and SEARCH-01–04.
3. **Acquisition and quality:** CAP-01–07 and QUAL-01–03.
4. **Decision loop:** DISC-01–03 and HOME-01–04.
5. **Planning and shopping:** PLAN-01–05 and GROC-01–03.
6. **Kitchen execution:** COOK-01–02.
7. **Operational lifecycle:** PLAT-02–06.

Within each group, write a short feature brief first to confirm boundaries and
open questions. Only then split it into requirements, design, and implementation
tasks. This prevents current implementation details from silently becoming product
requirements.

## Evidence map

| Evidence area | Current source of truth used for this inventory |
|---|---|
| Family journeys and intended explanations | `docs/user-guide.md` |
| Family-facing routes and interactions | `pwa/src/app/`, `pwa/src/components/` |
| Client state and real-time behavior | `pwa/src/store/`, `pwa/src/hooks/` |
| Install/share integration | `pwa/public/manifest.json`, `pwa/public/sw.js` |
| API surface | `specs/openapi.yaml`, `api/src/RecipeApi/Controllers/` |
| Domain and orchestration behavior | `api/src/RecipeApi/Services/`, `api/src/RecipeApi/Workflows/` |
| Persisted domain model | `api/src/RecipeApi/Models/`, `api/src/RecipeApi/Data/` |
| Executable behavior evidence | `pwa/src/**/*.test.ts(x)`, `pwa/e2e/`, `api/src/RecipeApi.Tests/` |

