# Recipe library — list-visibility delta

## Purpose

Let people using the household app browse reusable recipes that are ready and not deleted. This first baseline slice covers the connected library list and its supported loading, empty and initial-failure outcomes.

## Evidence and status (non-normative)

Documentation-only draft under A48, backed by BSL-recipe-library-001–003 in the [durable plan](../../../../../docs/openspec-baseline-plan.md). Evidence is implementation-supported under A10; runtime browser/API/database checks are not-run and qualification remains deferred under A34. This draft is not accepted or promoted.

Household-identity owns access and member context. Reuse its existing requirements “Gate protected page entry with household access”, “Apply member context after household access”, “Authenticate protected API requests independently”, and current-member resolution/recovery. Member preferences owns selection/persistence of browse mode; this slice describes the local list presentation once selected. The library is not filtered to the active member's own captures.

U29–U31 remain non-normative under the confirmed boundary. Stored readiness is used without asserting its name/image/synthesis derivation. No badge enrichment, fresh or complete pagination, snapshot consistency, equal-key stability, cross-tab/device synchronization, Discovery-empty feedback, append-error control or universal recovery is promised. Initial summary retrieval is a separate dependency and can prevent recipe retrieval. Returned DTOs are rendered without repeating server eligibility checks. Search results, capture processing, editing, restore/purge and preference policy are outside this slice.

Historical member-creation limitation retained under BSL-015/U22:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

That sentence records the earlier review state. The user's report of later authorization remains recorded; its original reference is pending. It is not a recipe-library requirement, new lifecycle approval or runtime result.

## ADDED Requirements

### Requirement: Open the household library and offer list presentation

Home SHALL offer “Browse your library” linking to `/browse-all-stack`. The library overlay SHALL offer a “Show recipe list” control that selects its list presentation. Access and member context SHALL follow the existing household-identity requirements.

#### Scenario: Open from Home
- **WHEN** a person with the existing household access and member context activates Home's Browse Library control
- **THEN** the application opens the library overlay at `/browse-all-stack`

#### Scenario: Select list presentation
- **WHEN** a person in card presentation activates “Show recipe list” and the preceding summary request succeeds
- **THEN** the overlay selects list presentation and requests its first page

### Requirement: Return only eligible household library recipes

For authorized ordinary-household GET `/api/recipes`, the API SHALL include only records whose stored readiness is true and deletion timestamp is absent. With `discoverableOnly=true` it SHALL additionally require the discoverable flag; false or absent SHALL impose no discoverable restriction. Eligibility SHALL NOT be restricted to the selected member's recipe attribution.

#### Scenario: Ready active recipes are eligible in All mode
- **WHEN** an authorized All-mode list request succeeds with ready non-deleted recipes having different attribution and discoverable flags
- **THEN** those records are eligible for the requested page regardless of attribution or discoverable flag

#### Scenario: Not-ready records are excluded
- **WHEN** a recipe's stored readiness is false and an authorized list request succeeds
- **THEN** that recipe is absent from returned items and the filtered total

#### Scenario: Deleted records are excluded
- **WHEN** a ready recipe has a deletion timestamp and an authorized list request succeeds
- **THEN** that recipe is absent from returned items and the filtered total

#### Scenario: Discovery mode narrows eligible records
- **WHEN** an authorized list request succeeds with `discoverableOnly=true`
- **THEN** only ready non-deleted records also marked discoverable are eligible for its page and total

### Requirement: Return an explore-ordered library page

Successful authorized GET `/api/recipes` with `order=explore` SHALL order eligible records with never-cooked first, then oldest cooked date, then newest creation time. It SHALL return the requested offset page in `recipes`, with `updatedAt` and `pagination` containing page, limit and filtered total, outside a `data` envelope. Page SHALL be at least 1 and limit SHALL be clamped to 1–100.

#### Scenario: Explore ordering
- **WHEN** an authorized lowercase-explore request succeeds for eligible recipes with differing cooked dates or creation times
- **THEN** never-cooked records precede cooked records, older cooked dates precede newer ones, and creation time descending orders records with the same cooked-date position

#### Scenario: Page response and count
- **WHEN** an authorized explore request with page 2 and limit 12 succeeds
- **THEN** `recipes` contains up to 12 eligible records after the first 12 in explore order
- **AND** the unwrapped response includes `updatedAt` and pagination page 2, limit 12 and the eligible filtered total

#### Scenario: Page bounds are normalized
- **WHEN** an authorized explore request supplies page below 1 or limit outside 1–100 and succeeds
- **THEN** the response uses page at least 1 and limit clamped to 1–100

### Requirement: Request list pages for the selected library filter

In list presentation the library SHALL request GET `/api/recipes` with `order=explore`, limit 12 and the current All/Discovery filter. All SHALL send `discoverableOnly=false` and Discovery SHALL send true. After successful summary retrieval, entry into list presentation or changing All/Discovery SHALL request page 1.

#### Scenario: Load the All list
- **WHEN** list presentation loads with the initial All filter and its preceding summary request succeeds
- **THEN** it requests page 1 with explore ordering, limit 12 and `discoverableOnly=false`

#### Scenario: Change to Discovery
- **WHEN** a person changes All to Discovery in list presentation and the preceding summary request succeeds
- **THEN** it requests page 1 with explore ordering, limit 12 and `discoverableOnly=true`

### Requirement: Display successfully returned library items

After a successful first-page load in list presentation, the library SHALL replace its loaded items with the returned records and display them as named recipe buttons with a hero-image reference and formatted total time. Activating a recipe button SHALL request that recipe's detail sheet.

#### Scenario: Display a returned page
- **WHEN** a first-page list load succeeds with nonempty returned records
- **THEN** the list displays the returned recipes by name with image references and formatted time
- **AND** activating a displayed recipe requests its detail sheet

### Requirement: Request and append additional library list pages

When list scrolling reaches within 600 pixels of the bottom and more pages are indicated with no initial load or page request pending, the library SHALL request the next page using the current filter and list page size. A successful append SHALL retain loaded items and add returned records with previously unseen nonempty IDs in response order.

#### Scenario: Scroll requests the next page
- **WHEN** list scrolling reaches the loading threshold with more pages indicated and no load pending
- **THEN** the library requests the next page with explore ordering, limit 12 and the current discoverable filter

#### Scenario: Append overlapping results
- **WHEN** a subsequent page succeeds containing an already loaded ID and previously unseen nonempty IDs
- **THEN** loaded items remain and the new IDs are appended in response order without appending the repeated ID

### Requirement: Show pending library-load feedback

While an initial library load or a first-page reload for presentation/filter changes is pending, the library SHALL show a loading indicator and “Loading your library…” feedback in place of list cards.

#### Scenario: First-page load is pending
- **WHEN** the summary or first-page recipe request for the current library load is pending
- **THEN** loading feedback is displayed and list cards are suppressed

### Requirement: Show an empty All-mode library result

When an All-mode library load succeeds with an empty returned item array, the library SHALL display “Your Library is Empty” and an “Add New Recipe” link to `/capture`. This result SHALL describe the visible library collection without asserting absence of pending or deleted database records.

#### Scenario: No All-mode items are returned
- **WHEN** an All-mode list load succeeds with no returned recipes
- **THEN** the library displays its empty-library feedback and Add New Recipe link
- **AND** following the link requests `/capture`

### Requirement: Offer retry after initial library-load failure

If the summary or first-page recipe request fails, the library SHALL display “Failed to load recipes.” and a Retry control. Retry SHALL request the current filter's first-page load again, including summary retrieval, with loading feedback. A successful retry SHALL replace the displayed result with its returned items or applicable All-mode empty feedback.

#### Scenario: Initial load fails
- **WHEN** the initial summary or first-page recipe request fails
- **THEN** the library shows failure feedback and Retry in place of the list result

#### Scenario: Retry succeeds
- **WHEN** a person activates Retry and the repeated summary and first-page requests succeed
- **THEN** the library shows loading feedback while pending and then displays the returned first page or applicable All-mode empty feedback
