# Recipe library Specification

## Purpose

Let household members browse eligible reusable recipes, read stored detail and summary facts, and navigate list or stack presentation. This capability retains catalog eligibility, persisted fact representation, readiness reads and vegetarian fact classification.

## Relocation provenance (non-normative)

The original preamble and qualification records above describe earlier combined-capability checkpoints. Their historical counts, exclusions and lifecycle status remain evidence, not current ownership. All applicable limitations continue to apply after relocation.

- [recipe-library evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/recipe-library.md)

## Capability dependencies (non-normative)

Preserved references to the former combined owners resolve through these current capability links. Each requirement retains its original normative text.

| Capability | Requirements / scenarios |
|---|---:|
| [recipe-library](../recipe-library/spec.md) | 46 / 100 |
| [recipe-editing](../recipe-editing/spec.md) | 25 / 54 |
| [recipe-media](../recipe-media/spec.md) | 12 / 27 |
| [recipe-recycle-bin](../recipe-recycle-bin/spec.md) | 13 / 31 |

- [Persist the supplied recipe discoverability fact](../recipe-editing/spec.md#requirement-persist-the-supplied-recipe-discoverability-fact)
- [Apply supplied non-null recipe-detail update fields](../recipe-editing/spec.md#requirement-apply-supplied-non-null-recipe-detail-update-fields)
- [Serve an existing hero asset independently of recipe DTO reads](../recipe-media/spec.md#requirement-serve-an-existing-hero-asset-independently-of-recipe-dto-reads)
- [Exclude soft-deleted recipes from standard library listings and search](../recipe-recycle-bin/spec.md#requirement-exclude-soft-deleted-recipes-from-standard-library-listings-and-search)
- [Authenticate protected API requests independently](../household-identity/spec.md#requirement-authenticate-protected-api-requests-independently)

## Requirements

### Requirement: Open the household library and offer list presentation

The bottom Recipes navigation SHALL open `/recipes`. The unified library SHALL offer stack and list presentation and SHALL keep bottom app navigation visible. Home SHALL NOT offer a separate Browse button. Access and member context SHALL follow the existing household-identity requirements.

#### Scenario: Open from Home
- **WHEN** a person on Home with the existing household access and member context activates the bottom Recipes navigation control
- **THEN** the application opens `/recipes` in Explore with collapsed search, no Search criteria and All scope, using the saved member presentation preference

#### Scenario: Select list presentation
- **WHEN** a person in Explore stack presentation activates “Show recipe list” and the preceding summary request succeeds
- **THEN** Recipes selects list presentation and requests its first page

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

Successful authorized GET `/api/recipes` with `order=explore` SHALL order eligible records with never-cooked first, then oldest cooked date, then H descending from weekly-household-interest, newest creation time and stable identity. It SHALL return the requested offset page in `recipes`, with `updatedAt` and `pagination` containing page, limit and filtered total, outside a `data` envelope. Page SHALL be at least 1 and limit SHALL be clamped to 1–100.

#### Scenario: Explore ordering
- **WHEN** an authorized lowercase-explore request succeeds for eligible recipes with differing cooked dates or creation times
- **THEN** never-cooked records precede cooked records, older cooked dates precede newer ones, and H descending, then creation time descending and identity order records with the same cooked-date position

#### Scenario: Page response and count
- **WHEN** an authorized explore request with page 2 and limit 12 succeeds
- **THEN** `recipes` contains up to 12 eligible records after the first 12 in explore order
- **AND** the unwrapped response includes `updatedAt` and pagination page 2, limit 12 and the eligible filtered total

#### Scenario: Page bounds are normalized
- **WHEN** an authorized explore request supplies page below 1 or limit outside 1–100 and succeeds
- **THEN** the response uses page at least 1 and limit clamped to 1–100

### Requirement: Request list pages for the selected library filter

In the Explore collection, in list presentation the library SHALL request GET `/api/recipes` with `order=explore`, limit 12 and the current All/Discovery filter. All SHALL send `discoverableOnly=false` and Discovery SHALL send true. After successful summary retrieval, entry into list presentation or changing All/Discovery SHALL request page 1.

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

When an unfiltered All-mode library load succeeds with an empty returned item array, the library SHALL display “Your Library is Empty” and an “Add New Recipe” link to `/capture`. This result SHALL describe the visible library collection without asserting absence of pending or deleted database records.

#### Scenario: No All-mode items are returned
- **WHEN** an unfiltered All-mode list load succeeds with no returned recipes
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

### Requirement: Retrieve the selected library recipe for detail reading

When the library requests a detail sheet for a loaded recipe, the application SHALL request GET `/api/recipes/{id}` using that recipe's ID. Access and member context SHALL follow existing household-identity requirements.

#### Scenario: Request detail by the activated recipe ID
- **WHEN** the loaded library requests a detail sheet for recipe ID R
- **THEN** the application requests GET `/api/recipes/R` rather than using only the list record as detail content

### Requirement: Return persisted recipe detail for an available record

When an authorized ordinary-household GET `/api/recipes/{id}` successfully retrieves an available record, the API SHALL return 200 with `recipe` and `updatedAt` outside a `data` envelope. The recipe SHALL carry its persisted ID, name, description, total time, cuisine and meal types, and ingredients represented as strings.

#### Scenario: Return the retrieved record
- **WHEN** an authorized detail request retrieves an available record and its response succeeds
- **THEN** the unwrapped response contains `updatedAt` and that record's `recipe` with the persisted fields and string ingredient representation

### Requirement: Display returned recipe text and image reference

After successful detail retrieval, the sheet SHALL display the returned name and nonempty description. It SHALL omit an empty description and use the returned image reference, with a local placeholder reference when that reference is empty.

#### Scenario: Show returned name and description
- **WHEN** detail retrieval succeeds with a name and nonempty description
- **THEN** the sheet displays that name and description

#### Scenario: Omit absent description
- **WHEN** detail retrieval succeeds with a null or empty description
- **THEN** the sheet omits the description paragraph

#### Scenario: Select the detail image reference
- **WHEN** detail retrieval succeeds
- **THEN** the sheet uses the returned image reference or `/placeholder-recipe.jpg` if it is empty
- **AND** this reference selection does not establish image delivery

### Requirement: Display available recipe metadata in detail

The detail sheet SHALL display nonempty cuisine and returned nonempty meal-type values as badges. It SHALL omit absent cuisine and meal types without adding a default meal type for reading. It SHALL show a Ready In time label using formatted returned total time, with an empty time value when none is available.

#### Scenario: Show cuisine and meal types
- **WHEN** detail retrieval succeeds with cuisine Italian and meal types Supper and Lunch
- **THEN** the sheet displays Italian, Supper and Lunch badges

#### Scenario: Omit absent metadata badges
- **WHEN** detail retrieval succeeds without cuisine or meal-type values
- **THEN** those badges are absent without a synthesized Supper badge

#### Scenario: Format available time
- **WHEN** detail retrieval succeeds with total time `PT30M`, or with no total time
- **THEN** the Ready In label uses `30 MINS` for `PT30M` and an empty time value for absent time

### Requirement: Display returned ingredient strings in detail

The detail sheet SHALL show an Ingredients section listing returned ingredient strings in their returned order. With no ingredient strings, the section SHALL contain no ingredient rows.

#### Scenario: Read returned ingredients
- **WHEN** detail retrieval succeeds with ingredient strings Pasta followed by Sauce
- **THEN** the Ingredients section lists Pasta followed by Sauce

#### Scenario: No ingredients are returned
- **WHEN** detail retrieval succeeds with no ingredient strings
- **THEN** the Ingredients heading remains with no ingredient rows

### Requirement: Show pending recipe-detail feedback

While a newly opened sheet's detail request is pending, the sheet SHALL display loading feedback in place of recipe content and retain its Close controls.

#### Scenario: Detail retrieval is pending
- **WHEN** a newly opened library detail sheet is awaiting its detail response
- **THEN** loading feedback is visible instead of recipe content and Close remains available

### Requirement: Dismiss recipe detail back to the loaded library

Activating the detail sheet's Close control or surrounding backdrop SHALL dismiss the sheet while retaining the loaded library presentation. Closing while retrieval is pending SHALL dismiss the sheet without waiting for that retrieval to finish.

#### Scenario: Close loaded detail
- **WHEN** a person closes successfully loaded detail through Close or its backdrop
- **THEN** the sheet disappears and the loaded library remains

#### Scenario: Close pending detail
- **WHEN** a person closes a newly opened sheet before its detail request finishes
- **THEN** the sheet disappears without waiting for the request

### Requirement: Return eligible library summary counts

Successful authorized GET `/api/recipes/library-summary` SHALL count only recipes with stored readiness true and no deletion timestamp. It SHALL return their total without restricting discoverability or member attribution. Household access SHALL follow household-identity's `Authenticate protected API requests independently` requirement.

#### Scenario: Count ready active recipes across library flags
- **WHEN** an authorized summary request succeeds for ready active recipes with differing discoverability and attribution
- **THEN** all those recipes contribute to the total regardless of those flags

#### Scenario: Exclude not-ready recipes from summary counts
- **WHEN** an authorized summary request succeeds with stored not-ready recipes present
- **THEN** those recipes contribute to none of the summary counts

#### Scenario: Exclude deleted recipes from summary counts
- **WHEN** an authorized summary request succeeds with deleted recipes present
- **THEN** those recipes contribute to none of the summary counts

### Requirement: Report never-cooked and persisted rating counts

Within the eligible summary collection, the API SHALL count absent last-cooked dates as `neverCooked`. It SHALL report `ratings.love`, `like`, `dislike` and `unrated` for stored ratings Love=3, Like=2, Dislike=1 and Unknown=0 respectively. These are recipe-level facts, independent of member votes.

#### Scenario: Count absent cooked dates
- **WHEN** a successful summary includes two eligible recipes without a last-cooked date and one with a date
- **THEN** `neverCooked` is 2

#### Scenario: Count the four supported ratings
- **WHEN** a successful summary includes one eligible recipe at each supported rating
- **THEN** total is 4 and love, like, dislike and unrated are each 1

### Requirement: Represent successful library summaries including empty collections

A successful summary SHALL return HTTP 200 with integer `total`, `neverCooked` and nested `ratings` counts inside one `data` object. The ratings object SHALL contain `love`, `like`, `dislike` and `unrated`. With no eligible recipes all six counts SHALL be zero.

#### Scenario: Read the summary response shape
- **WHEN** an authorized summary request succeeds
- **THEN** the response has one `data` envelope containing total, neverCooked and the four nested rating counts

#### Scenario: No eligible recipes contribute
- **WHEN** an authorized summary request succeeds with no eligible recipes
- **THEN** it returns the same HTTP 200 shape with total, neverCooked and all four rating counts zero

### Requirement: Retrieve summary before the Browse first page

For initial Browse loading and first-page reloads caused by All/Discovery or presentation changes, the application SHALL await summary retrieval before requesting the recipe page. Missing summary data or total SHALL supply zero as the All-library total. Existing `Show pending library-load feedback` and `Offer retry after initial library-load failure` requirements govern pending, failure and Retry outcomes.

#### Scenario: Summary completes before page retrieval
- **WHEN** a Browse first-page load starts
- **THEN** it requests the summary and waits for it to resolve before requesting page 1

#### Scenario: Summary total is absent
- **WHEN** the summary request resolves without data or total and the first page subsequently succeeds
- **THEN** the All-library total supplied by that summary is zero

#### Scenario: Filter or presentation starts another first-page load
- **WHEN** changing All/Discovery or presentation starts a first-page reload
- **THEN** summary retrieval precedes the new page-1 request under the current selection

### Requirement: Select the initial Browse total by collection mode

After a relevant first-page response succeeds, unfiltered All mode SHALL use the preceding summary total, including its zero default. Discovery mode or an applied GOTO filter SHALL use the page's nonnegative filtered pagination total, defaulting missing pagination or total to zero. Existing `Return an explore-ordered library page` owns the page total; summary and page reads do not establish an atomic snapshot.

#### Scenario: All uses summary rather than page total
- **WHEN** a relevant unfiltered All first-page response succeeds with summary total 45 and page total 10
- **THEN** the Browse collection total is 45

#### Scenario: Discovery uses filtered page total
- **WHEN** a relevant Discovery first-page response succeeds with summary total 45 and filtered page total 10
- **THEN** the Browse collection total is 10

#### Scenario: Discovery pagination total is absent
- **WHEN** a relevant Discovery first-page response succeeds without pagination or its total
- **THEN** the Browse collection total is zero even if the summary total is positive

#### Scenario: GOTO uses its filtered total
- **WHEN** GOTO is applied in All mode with summary total 45 and filtered page total 3
- **THEN** the Browse collection total is 3

### Requirement: Initialize Browse pagination from the selected count

On a relevant successful first-page load, Browse SHALL replace loaded recipes with returned items, treating absent items as an empty array, reset the current item index to zero, and set the current page to 1. It SHALL indicate more pages exactly when the selected collection total exceeds that presentation's requested page size. This initial indication SHALL NOT guarantee fresh, stable or complete subsequent traversal.

#### Scenario: Initial page state uses the selected total
- **WHEN** a relevant first-page load succeeds
- **THEN** returned items replace the loaded collection, the item index is zero and current page is 1
- **AND** more-pages indication is true exactly when the selected total exceeds the requested page size

#### Scenario: Page items are absent
- **WHEN** a relevant first-page response succeeds without recipe items
- **THEN** the loaded collection becomes empty without deriving the selected total from its item count

### Requirement: Offer and load library stack presentation

In the Explore collection, the library SHALL use stack presentation when the selected member has no saved list preference or current override. Selecting Show recipe stack SHALL select stack presentation. After the shared summary succeeds, stack first-page loads SHALL request explore order, limit 20 and the active All/Discovery filter.

#### Scenario: Load the default stack
- **WHEN** a member without a saved list preference enters the library and summary retrieval succeeds
- **THEN** the stack requests page 1 with order explore, limit 20 and discoverableOnly false

#### Scenario: Switch from list to stack
- **WHEN** a person selects Show recipe stack from list presentation and summary retrieval succeeds
- **THEN** stack presentation starts its page-1 load with limit 20 and the selected collection filter

### Requirement: Present the current stack card and visual depth

Browse SHALL render up to four loaded stack cards from the current index, with one front card. The face SHALL show its hero and complete name, plus localized Ready In over the image only for usable returned total time. It SHALL omit description and other secondary metadata. The immediate next backing card SHALL show its loaded image and a bounded name preview beneath the front during drag. Deeper cards SHALL remain quiet depth peeks. Backing content SHALL NOT increase front-matched bounds.

#### Scenario: Render a window of loaded cards
- **WHEN** stack results are available at a valid current index with no stack loader replacing cards
- **THEN** up to four loaded records beginning at that index are rendered with one front card

#### Scenario: Read stack card content
- **WHEN** a returned card has a hero reference, a long name, a description and total time `PT1H30M`
- **THEN** its face shows the hero and complete wrapping name, with a badge over the image reading localized Ready In with `1H 30 MINS`
- **AND** the description and other secondary recipe metadata are absent from the face

#### Scenario: No usable total time
- **WHEN** a returned card has absent, empty, zero or unformattable total time
- **THEN** no Ready In badge or estimated duration appears on its face
- **AND** its image and name remain available for detail opening and stack navigation

#### Scenario: Preserve stack context and external actions
- **WHEN** a stack face is simplified in Explore or Search, including a planner-targeted entry
- **THEN** position, available navigation, recipe detail opening and external per-recipe actions remain available under their existing requirements
- **AND** the presentation change does not reset the collection, search criteria or planner target

#### Scenario: Keep the original stack interactions
- **WHEN** a person taps or presses Enter or Space on the focused front card
- **THEN** the existing detail sheet opens for that card identity without advancing the collection
- **AND** dismissing detail returns focus to the front card when it remains mounted
- **WHEN** a person drags the front card horizontally
- **THEN** Explore or Search navigates under its existing wrap, cursor and boundary rules
- **AND** release or click after the drag does not also open detail
- **AND** the simplified face adds no visible Previous / View recipe / Next row

#### Scenario: Backing records have longer names
- **WHEN** one or more backing records have names that wrap to more lines than the front card
- **THEN** their hidden content does not increase their visible height below the front card
- **AND** backing-card bottom edges remain small, consistent depth peeks rather than protruding toward the position or Discovery controls

#### Scenario: Short or enlarged viewport
- **WHEN** the stack is shown at 320x568 or 390x667 CSS pixels, in 667x375 landscape, or at 200 percent text in English or French
- **THEN** the front image and complete wrapping name remain reachable without clipping or dock overlap
- **AND** backing depth remains aligned while constrained height uses intentional vertical scrolling

#### Scenario: Reveal the next loaded recipe mid-swipe
- **WHEN** a person drags the front card sideways while a next loaded recipe is underneath
- **THEN** the next recipe's image and name are visibly rendered within the backing card during movement
- **AND** the backing card remains noninteractive and outside keyboard focus until promoted

#### Scenario: Long title and repeated navigation
- **WHEN** a long-name backing recipe is revealed and the person swipes through multiple loaded cards in succession
- **THEN** its preview stays inside front-matched bounds without protruding into position or Discovery controls
- **AND** promotion shows its full name and each swipe advances once without opening detail

#### Scenario: Missing backing image
- **WHEN** the next loaded recipe's hero image is unavailable
- **THEN** its name remains visibly identifiable on the backing card using existing card styling
- **AND** the failed image does not alter stack bounds or introduce a new fallback request

#### Scenario: Insert a new rear record after advancing
- **WHEN** advancing a six-record stack adds a previously unmounted record behind the visible cards
- **THEN** its first painted frame already has the size, offset and opacity of its assigned depth
- **AND** its shell and shadow never flash as a full-size opaque card before settling

#### Scenario: Departed and promoted cards overlap in time
- **WHEN** a departing card remains rendered while its successor becomes the current front
- **THEN** the departed card does not add its height to the stack's front-matched backing bounds
- **AND** equal-height fronts do not produce a transient enlargement of the backing shells or shadows

#### Scenario: Full-title height changes during repeated advances
- **WHEN** successive front records alternate between one-line and multi-line names
- **THEN** each complete front name remains readable and the stack may adapt to its needed height
- **AND** backing bounds follow that front-height transition without a separate oversize pulse or protrusion caused by the departed card

### Requirement: Navigate loaded stack cards with directional swipes

On the front card, a right drag exceeding 35 pixels or rightward velocity exceeding 280 pixels/second SHALL request previous navigation after departure animation; corresponding negative thresholds SHALL request next navigation. Below both thresholds SHALL return the card without navigation. Back cards SHALL ignore navigation and tap callbacks.

#### Scenario: Navigate next or previous
- **WHEN** the front card completes a directional drag beyond the displacement or velocity threshold
- **THEN** leftward intent requests next and rightward intent requests previous

#### Scenario: Release a short drag
- **WHEN** a front card releases with displacement and velocity below the directional thresholds
- **THEN** the card returns without invoking either navigation callback

#### Scenario: Ignore back-card activation
- **WHEN** a non-front card receives a tap or drag-end handler invocation
- **THEN** it does not invoke detail or navigation callbacks

### Requirement: Open front-card detail only for a tap

Tapping the front card without a tracked drag in that pointer session SHALL open that recipe detail. A horizontal drag exceeding 5 pixels SHALL suppress that session's tap. A later fresh tap SHALL be eligible independently. Closing detail SHALL retain the loaded card position under the existing detail dismissal requirement.

#### Scenario: Tap the front card
- **WHEN** the front card is tapped without a tracked drag
- **THEN** detail opens for that card ID

#### Scenario: Suppress a drag-induced tap
- **WHEN** the front card has tracked horizontal displacement greater than 5 pixels in the current pointer session before its tap handler runs
- **THEN** that handler does not open detail

#### Scenario: Tap after an incomplete drag
- **WHEN** a short drag returns the front card without navigation and a new stationary tap follows
- **THEN** the first new tap opens detail once without changing the card position

### Requirement: Wrap stack navigation within available results

In the Explore collection, for a stable collection, navigation SHALL fetch missing adjacent pages and reach every eligible recipe in both directions. Next at the collection end SHALL wrap to its first card. Previous at its first card SHALL select the last card, requesting the calculated final page with limit 20 and the active filter when necessary. Pending page retrieval SHALL retain the current position.

#### Scenario: Loop forward after the last loaded card
- **WHEN** next is requested at the final collection card with no pending prefetch for more pages
- **THEN** the first collection card becomes current

#### Scenario: Wait at a pending page boundary
- **WHEN** next is requested on the final collection card while more pages are indicated and prefetch is pending
- **THEN** navigation waits at that boundary

#### Scenario: Wrap backward to loaded end
- **WHEN** previous is requested at the first card with the active total already loaded and no more pages
- **THEN** the final collection card becomes current

#### Scenario: Retrieve the final page for backward wrapping
- **WHEN** previous is requested at the first card with a positive active count and the end not loaded
- **THEN** the calculated final-page request uses explore order, limit 20 and the active filter, and its last returned card becomes current

### Requirement: Bound empty-page probing during backward wrapping

If a calculated wrap page is empty, Browse SHALL probe decreasing page numbers, stopping at a nonempty result, page 1 or three total requests. A nonempty response SHALL supply the landing card. This probing SHALL NOT establish complete or stable traversal.

#### Scenario: Find an earlier nonempty wrap page
- **WHEN** the calculated final page is empty and the preceding page returns cards
- **THEN** Browse requests the preceding page and lands on its final returned card

### Requirement: Prefetch additional stack pages near the loaded end

In stack mode, five or fewer remaining cards on the current page SHALL trigger the next explore page with limit 20 and the active filter, unless loading, failed-prefetch suppression or an available/pending page prevents it. A relevant response SHALL make that page available in returned order without moving the current card or ordinal. Revisiting cached pages SHALL NOT append duplicate copies.

#### Scenario: Prefetch within five remaining cards
- **WHEN** stack browsing reaches at most five remaining cards on its current page with a next page available and no suppressing condition
- **THEN** the next page is requested and a successful relevant response becomes available for navigation without changing the current card or ordinal

### Requirement: Display the loaded stack position against selected total

In the Explore collection, the action bar SHALL display current global collection ordinal and the selected collection total in position / total form. The ordinal SHALL include preceding pages, including after backward wrap. Offset pagination SHALL NOT promise a stable snapshot during concurrent server mutations.

#### Scenario: Display stack depth
- **WHEN** the current global index is 2 and selected total is 24
- **THEN** the indicator reads 3 / 24

### Requirement: Toggle front-card discoverability with pending feedback

The action bar SHALL initialize from the current recipe discoverability, defaulting absent values false. Activation SHALL optimistically show the inverse, disable the toggle while pending and PATCH that recipe flag. Success SHALL update the loaded matching record; rejection SHALL clear optimism and restore the record-backed display. Existing persisted discoverability ownership applies.

#### Scenario: Submit the inverse front-card flag
- **WHEN** the enabled front-card toggle is activated
- **THEN** it displays the inverse flag, disables while pending and submits that flag for the current ID

#### Scenario: Complete a successful stack toggle
- **WHEN** the PATCH resolves successfully without intervening record changes
- **THEN** the matching loaded record retains the submitted flag and pending feedback clears

#### Scenario: Recover from rejected stack toggle
- **WHEN** the PATCH rejects while the same recipe remains current
- **THEN** pending feedback clears and the control displays its record-backed flag again

### Requirement: Show directional stack cues and request supported haptics

The front card SHALL show BACK and NEXT drag cues for previous and next navigation. When horizontal displacement exceeds 60 pixels and haptics are armed, the card SHALL request a 10 ms vibration if the browser exposes vibration support, rearming below 50 pixels. This SHALL NOT guarantee physical haptic delivery.

#### Scenario: Display directional navigation cues
- **WHEN** the front stack card is rendered for dragging
- **THEN** it provides BACK for rightward previous navigation and NEXT for leftward next navigation

#### Scenario: Attempt an armed supported vibration
- **WHEN** displacement exceeds 60 pixels with haptics armed and navigator vibration available
- **THEN** the card requests a 10 ms vibration once until displacement falls below 50 pixels and rearms it

### Requirement: Return newest-created library pages by default

Authorized GET `/api/recipes` without order SHALL sort eligible records by creation time descending. Existing list eligibility, filter count, normalized pagination and unwrapped response ownership SHALL apply; equal creation times SHALL NOT imply a stable tie order.

#### Scenario: Read without an order parameter
- **WHEN** an authorized list request omits order and succeeds with distinct creation timestamps
- **THEN** newer-created eligible records precede older-created records on the requested offset page

### Requirement: Constrain library lookups by supplied predicates

List lookup SHALL apply each supplied ID, nonblank name and nonblank URL conjunctively to the already eligible collection. ID SHALL match exactly. Name and URL SHALL compare exact lowercased values after trimming the requested filter. Null/whitespace name or URL SHALL add no predicate. This SHALL NOT canonicalize URLs or perform substring matching.

#### Scenario: Lookup an exact recipe ID
- **WHEN** an authorized list request supplies an eligible recipe ID and succeeds
- **THEN** only that ID can match before pagination

#### Scenario: Lookup a trimmed case-insensitive exact name
- **WHEN** an authorized list request supplies a nonblank name with different case and surrounding whitespace
- **THEN** only eligible records with an equal lowercased stored name match

#### Scenario: Lookup a trimmed case-insensitive exact URL
- **WHEN** an authorized list request supplies a nonblank URL with different case and surrounding whitespace
- **THEN** only eligible records with an equal lowercased stored source URL match

#### Scenario: Combine lookup predicates
- **WHEN** ID, name and URL are supplied together and the successful list query evaluates them
- **THEN** a record must satisfy all supplied predicates and existing ready/nondeleted/discoverable eligibility

#### Scenario: Ignore blank text filters
- **WHEN** a successful authorized list request supplies null or whitespace-only name or URL
- **THEN** that text filter does not narrow the eligible collection

### Requirement: Reject unsupported library order parameters

GET `/api/recipes` with a non-null order other than a case-insensitive spelling of explore SHALL return HTTP 400 with an error identifying explore as allowed. This rejection rule SHALL NOT guarantee that mixed-case accepted spellings receive explore sorting.

#### Scenario: Reject an unsupported order
- **WHEN** an authorized request sends order invalid
- **THEN** the API returns HTTP 400 with an error mentioning explore rather than a recipe page

### Requirement: Read stored array instructions through recipe detail

For an available recipe, successful detail reading SHALL expose an array-valued recipeInstructions member parsed from persisted raw metadata. Missing, blank, malformed metadata or an absent member SHALL expose null. Existing detail response ownership SHALL apply.

#### Scenario: Read a stored instruction array
- **WHEN** available recipe metadata contains recipeInstructions as an array and detail reading succeeds
- **THEN** the returned recipe exposes that array without applying sharing-export section transformation

#### Scenario: Read without usable instruction metadata
- **WHEN** available recipe metadata is blank, malformed or lacks recipeInstructions and detail reading succeeds
- **THEN** recipeInstructions is null

### Requirement: Represent persisted recipe attribution and readiness

Successful recipe DTO mapping SHALL carry the stored addedBy value, including null, creation timestamp, stored readiness, deletion timestamp, image count and finished-dish index. Readiness SHALL be read as a stored flag, not inferred from title, images or synthesis status. Existing list eligibility SHALL still govern which records appear.

#### Scenario: Read stored attribution and creation time
- **WHEN** a successful eligible list or available detail read maps a recipe
- **THEN** addedBy and createdAt reflect stored values, allowing null attribution

#### Scenario: Read stored readiness and image facts
- **WHEN** an available recipe is mapped to a response
- **THEN** isReady, imageCount and finishedDishIndex reflect stored flags/count/index and images enumerates zero-based indices up to count minus one

### Requirement: Derive represented source provenance and reimport availability

Recipe DTO mapping SHALL select sourceType url for a nonempty stored source URL, otherwise photos for positive image count, otherwise synthesized. canReimport SHALL be true exactly when a stored source URL is nonempty or image count is positive. This represented availability SHALL NOT guarantee successful acquisition or the presence of an executed synthesis workflow.

#### Scenario: Prefer source URL provenance
- **WHEN** a mapped recipe has a nonempty source URL and any supported image count
- **THEN** sourceType is url and canReimport is true

#### Scenario: Represent photo provenance
- **WHEN** a mapped recipe has no nonempty source URL and positive image count
- **THEN** sourceType is photos and canReimport is true

#### Scenario: Represent absent original sources
- **WHEN** a mapped recipe has no nonempty source URL and zero originals
- **THEN** sourceType is synthesized and canReimport is false

### Requirement: Represent the persisted vegetarian value without dietary inference

The persisted vegetarian field SHALL permit true, false or null. DTO mapping SHALL preserve explicit boolean values and represent a null stored value as false. This fallback SHALL describe the API representation only and SHALL NOT establish dietary accuracy, completed classification or semantic equivalence of unknown and confirmed false.

#### Scenario: Read an explicit vegetarian boolean
- **WHEN** a successful DTO read maps a stored true or false vegetarian value
- **THEN** the API represents the same boolean

#### Scenario: Read a legacy nullable vegetarian value
- **WHEN** a successful DTO read maps a recipe whose stored vegetarian value is null
- **THEN** the API represents isVegetarian false without changing the stored nullable value by this read

### Requirement: Read the persisted recipe readiness status

Authorized GET `/api/recipes/{id}/status` for an available stored recipe SHALL report ready exactly when stored IsReady is true, otherwise pending. It SHALL return HTTP 200 with one data object carrying stored id, name, imageCount and isSynthesized alongside that status. This SHALL NOT infer workflow progress or completion from image count or synthesis flags.

#### Scenario: Read a pending stored recipe
- **WHEN** an available recipe has stored readiness false and its status read succeeds
- **THEN** the response data reports pending with its stored ID, name, imageCount and isSynthesized

#### Scenario: Read a ready recipe without originals
- **WHEN** an available recipe has stored readiness true and zero originals
- **THEN** the status read reports ready without requiring positive image count

#### Scenario: Read stored status fields independently
- **WHEN** an available record has stored name, image count and synthesis flag values
- **THEN** a successful status read returns those stored fields without recalculating readiness from them

### Requirement: Reject status reads without an available recipe

When the status provider cannot find the requested recipe, GET `/api/recipes/{id}/status` SHALL return HTTP 404 instead of pending or ready.

#### Scenario: Read status for an absent ID
- **WHEN** an authorized status request targets an absent recipe ID
- **THEN** the API returns HTTP 404

### Requirement: Classify stored vegetarian facts from ingredient evidence

Operator classification SHALL use nonblank ingredient strings or object name fields without requiring a recipe title. A missing recipe SHALL return not-found; absent usable ingredients SHALL return unknown-no-ingredients. An explicit boolean response SHALL update the persisted vegetarian fact and update time when saving succeeds.

#### Scenario: No usable ingredients
- **WHEN** the recipe has empty, malformed or unsupported ingredient content
- **THEN** classification returns unknown-no-ingredients without changing its stored vegetarian fact

#### Scenario: Explicit classification
- **WHEN** the classifier returns an explicit boolean from usable ingredient evidence
- **THEN** that boolean and the operation's update time are saved

#### Scenario: Recipe missing
- **WHEN** the requested recipe is not found
- **THEN** classification returns not-found without calling the classifier

### Requirement: Preserve confirmed facts when classification is ambiguous

A classification response without an explicit boolean SHALL return unknown-insufficient-ingredients without overwriting the stored fact. Malformed response JSON SHALL propagate failure without persisting a replacement fact. Plain JSON and supported Markdown-fenced JSON SHALL be accepted; these behaviors SHALL NOT establish dietary accuracy.

#### Scenario: Ambiguous response
- **WHEN** a valid response supplies null vegetarian classification
- **THEN** the existing fact is preserved and the outcome is unknown-insufficient-ingredients

#### Scenario: Malformed response
- **WHEN** response JSON cannot be parsed
- **THEN** the existing fact is preserved and the parsing exception propagates

#### Scenario: Fenced response
- **WHEN** the response encloses an explicit boolean JSON object in a supported Markdown code fence
- **THEN** the explicit classification is accepted

### Requirement: Queue bounded vegetarian classification batches

Operator backfill SHALL select up to 25 undeleted recipes ordered by identity after an optional cursor. It SHALL select unknown facts by default and include known facts when force is true. It SHALL request one classifier workflow per selected recipe and request a successor with the final identity and force setting when the batch is full.

#### Scenario: Default backfill
- **WHEN** known and unknown undeleted recipes are available without force
- **THEN** only unknown recipes are selected for classification requests

#### Scenario: Forced backfill
- **WHEN** force is true
- **THEN** known recipes are eligible for classification requests

#### Scenario: Full batch
- **WHEN** a batch selects 25 recipes and all its launch requests succeed
- **THEN** it requests a successor after the final identity without waiting for those classifiers to finish

### Requirement: Distinguish classification launch counts from current facts

Classification status SHALL count undeleted recipes as total, classified, unknown, vegetarian and nonvegetarian. Backfill results SHALL add queued count and a next cursor for a full batch. Queued SHALL describe launch requests completed by that coordinator, not classification completion or correctness.

#### Scenario: Read current status
- **WHEN** four undeleted recipes contain one true, one false and two unknown facts
- **THEN** status reports total four, classified two, unknown two, vegetarian one and nonvegetarian one

#### Scenario: Queued children remain pending
- **WHEN** backfill has launched child work that has not completed
- **THEN** queued count does not imply those recipes' stored facts changed

### Requirement: Recover stack page navigation without changing collection identity

A failed page fetch SHALL retain the current card and expose retry. Responses from a departed filter, presentation or page lifecycle SHALL NOT replace the current collection. Closing detail SHALL preserve the current card and global position.

#### Scenario: Traverse a multipage deck
- **WHEN** a stable multipage library with a full or partial last page (40 or 46 recipes at 20 per page) is traversed forward and backward through wrap
- **THEN** every recipe appears once per complete cycle with its correct ordinal and first/last identities
- **AND** swiping backward from recipe 1 loads the actual last page and selects the final recipe (40 or 46), and swiping forward from that recipe returns to recipe 1

#### Scenario: Failed adjacent page or wrap
- **WHEN** a needed page request fails
- **THEN** the current card remains and explicit retry can resume that navigation

#### Scenario: Departed collection response
- **WHEN** an old request resolves after changing filter, presentation or unmounting
- **THEN** it does not change the current cards, count, position or pending/error feedback

### Requirement: Keep Explore history ordering coherent across pages

Explore list and stack pagination SHALL apply one historical ordering generation for a navigation sequence or require restart when it changes. Count, page identity and stack position SHALL remain coherent; history SHALL not be reranked independently inside each loaded page.

#### Scenario: Forward then backward
- **WHEN** history changes while a user navigates Explore pages
- **THEN** the client uses a pinned historical generation or restarts visibly; it does not silently mix historical orders

#### Scenario: Failed page recovery
- **WHEN** an Explore page load fails
- **THEN** existing retained-card and retry behavior from PR243 remains intact

### Requirement: Preserve library eligibility and newest-first order

Historical augmentation SHALL affect Explore ordering only, without adding Discovery/cooldown exclusions or changing filtered totals. Default newest-created order and exact lookup predicates SHALL retain their existing behavior.

#### Scenario: Outside Discovery
- **WHEN** All-mode Explore includes a ready explicitly kept out of rotation recipe with history
- **THEN** it remains visible and its H participates normally

#### Scenario: Default list
- **WHEN** the request omits order=explore
- **THEN** history does not replace newest-created ordering

### Requirement: Recover failed detail reads
The detail sheet SHALL replace pending feedback with visible failure feedback and Retry when its current read fails. Retry SHALL read the selected recipe again and retain Close. A response for a departed recipe identity SHALL NOT replace current content or feedback, and content for a previous identity SHALL NOT remain visible.

#### Scenario: Retry a failed initial read
- **WHEN** an initial detail read rejects and the person selects Retry
- **THEN** the sheet shows failure feedback followed by pending feedback and the retry result

#### Scenario: Replace recipe identity
- **WHEN** the selected identity changes while an earlier read is pending or content is loaded
- **THEN** the old content and any late response for that identity do not appear as current detail

### Requirement: Filter library recipes by configured GOTO membership

GET `/api/recipes` SHALL accept optional boolean `gotoOnly`. True SHALL restrict eligible recipes to identities in the configured household GOTO list before counting, ordering and pagination. False or absent SHALL add no restriction. Readiness, deletion, exact lookup and discoverability predicates SHALL continue to apply together.

#### Scenario: Membership differs from rating
- **WHEN** GOTO filtering is active with a ready configured unrated recipe and a ready loved recipe outside the configured list
- **THEN** only the configured recipe is eligible regardless of those ratings

#### Scenario: Discovery intersection
- **WHEN** both gotoOnly and discoverableOnly are true
- **THEN** only configured, ready, nondeleted and discoverable recipes contribute to returned items and total

#### Scenario: No eligible configured recipes
- **WHEN** the configured list is absent, empty or contains only missing, not-ready or deleted recipes
- **THEN** the GOTO-filtered response has no items and a total of zero

#### Scenario: Filter before pagination
- **WHEN** configured eligible recipes occur beyond the first unfiltered page
- **THEN** the first filtered page still contains those recipes up to its limit and the total counts the entire eligible filtered collection

### Requirement: Offer compact GOTO filtering on Browse

Recipes SHALL offer an immediate Go-To Star toggle beside All/Discovery. It SHALL change the applied membership filter without Apply. Collapsed Search SHALL have no Filters row; expanded Search SHALL expose Filters below the toolbar without Go-To management. Toolbar and chooser SHALL share applied Go-To state while drafts wait for Apply. Selection SHALL survive scope and presentation changes while mounted.

#### Scenario: Toggle GOTO
- **WHEN** a person activates the unpressed Star filter
- **THEN** it becomes pressed and the current presentation requests page one with gotoOnly true without opening a sheet
- **AND** no recipe membership or meal assignment changes

#### Scenario: Change mode or presentation
- **WHEN** a person switches All/Discovery or stack/list with GOTO active
- **THEN** the first-page request retains GOTO and the current mode/presentation semantics
- **AND** All/Discovery remains one mode toggle, not tabs or an All/Discovery/GOTO mode selector

#### Scenario: Clear GOTO
- **WHEN** a person activates the pressed Star or clears the GOTO empty-state filter
- **THEN** Browse reloads page one without GOTO, retaining the other selections

#### Scenario: Accessible filter state
- **WHEN** the toolbar is displayed in English or French
- **THEN** Star has a localized membership-filter name, aria-pressed, keyboard activation, visible focus and selected meaning beyond colour
- **AND** it remains distinct from a recipe’s membership star

### Requirement: Keep GOTO Browse navigation within its filtered collection

With GOTO applied, Browse SHALL use returned filtered pagination totals in both All and Discovery. Every page, wrap, prefetch and retry SHALL carry the applied filter. Changing GOTO selection SHALL reset page/index and invalidate departed collection responses. A zero filtered result SHALL offer filter clearing and guidance to star recipes without claiming the entire household library is empty.

#### Scenario: All with GOTO
- **WHEN** library summary reports 45 recipes and the GOTO-filtered page reports 3
- **THEN** Browse displays 3 as the collection total and navigation stays within those 3 recipes

#### Scenario: Departed GOTO request
- **WHEN** an earlier filtered request resolves after GOTO selection changes
- **THEN** it does not replace current cards, counts, position or feedback

#### Scenario: Empty filtered collection
- **WHEN** a current GOTO-filtered request succeeds with no eligible items
- **THEN** Browse shows GOTO-specific no-match guidance with Clear Go-To and guidance to star recipes without reopening management

#### Scenario: Additional pages and recovery
- **WHEN** a GOTO-filtered list appends or a stack loads an adjacent, wrapped or retried page
- **THEN** that request retains current gotoOnly, discoverableOnly, page size and applicable history-generation context

### Requirement: Refresh GOTO Browse after confirmed local membership changes

A confirmed local GOTO membership change SHALL reload a mounted applied-GOTO Browse from page one, retaining its All/Discovery and presentation settings. A rejected save SHALL retain confirmed membership and current results. A failed reload after a successful save SHALL offer read retry without reporting the save as rejected or repeating it.

#### Scenario: Remove from recipe detail
- **WHEN** removing an eligible recipe from GOTO saves successfully while Browse has GOTO applied
- **THEN** the refreshed collection excludes it and uses the new filtered total

#### Scenario: Failed refresh after saved removal
- **WHEN** removal saves but the following collection request fails
- **THEN** the saved membership remains confirmed and recovery retries retrieval rather than removal

#### Scenario: Close unchanged detail
- **WHEN** a person opens and closes detail without changing GOTO membership
- **THEN** Browse retains its current card and position without a membership-triggered refresh

### Requirement: Preserve Browse usability on short viewports

Collapsed Search SHALL omit its controls row. Recipes SHALL preserve preferred stack/card dimensions when space permits, accounting for expanded controls and bottom navigation. Size reduction SHALL apply only when usable viewport space shrinks. Controls SHALL retain 48 by 48 CSS px targets, readable labels and visible focus. Content SHALL reflow or scroll without horizontal overflow or traps, respecting safe areas and reduced motion.

#### Scenario: Preserve normal-phone baseline size
- **WHEN** Browse is compared with search collapsed before and after unification where the same card space is available at the same normal-phone reference viewport, content, locale, text scale and safe-area conditions
- **THEN** preferred stack/card width and height remain unchanged within 1 CSS px rounding and the image area is not reduced solely for the toolbar change
- **AND** there is no permanently visible Filters row; moving the stack upward does not count as shrinking it

#### Scenario: Adaptive fallback does not lower preferred size
- **WHEN** Browse adapts to a genuinely smaller available viewport and is then shown at the normal-phone reference viewport
- **THEN** the smaller-screen constraints do not reduce the reference viewport’s preferred stack/card size

#### Scenario: Initial short portrait view
- **WHEN** stack Browse opens at 320x568 or 390x667 CSS px at ordinary text size
- **THEN** the collapsed layout shows the toolbar, a recognizable recipe image, title, recipe-opening/selection action, stack navigation and bottom app navigation; intentional vertical scrolling is available when content cannot fit
- **AND** the extra Filters row does not occupy height

#### Scenario: Short landscape and enlarged content
- **WHEN** either presentation uses 667x375 CSS px or 200% text, including French and long recipe names
- **THEN** toolbar controls and app navigation stay available and essential body actions remain reachable by intentional content scrolling without clipping, horizontal overflow or reduced touch targets

#### Scenario: List and tablet
- **WHEN** Browse uses list presentation or iPad portrait/landscape
- **THEN** useful recipe content starts in the viewport and app navigation, paging, filter state and Search disclosure remain operable without a Browse Close button

### Requirement: Track front-card horizontal movement directly

A front library stack card SHALL follow horizontal pointer movement with the same displacement response as the Discovery voting card. Existing directional release thresholds, browsing action meanings and detail activation rules SHALL continue to apply. Rear cards SHALL remain noninteractive.

#### Scenario: Grab at different visible card locations
- **WHEN** a horizontal pointer or touch drag begins on the front card's image, title or noninteractive body
- **THEN** the card follows the horizontal displacement directly without an added hold delay
- **AND** release requests navigation only under the existing directional thresholds

#### Scenario: Preserve small motion and release policy
- **WHEN** a recognized front-card drag is released below both navigation thresholds
- **THEN** it returns without navigation and without opening detail from that drag

### Requirement: Recover interrupted stack gestures

A cancelled front-card gesture SHALL return the card without navigation or detail activation. A subsequent fresh tap or drag SHALL work. Departing a card lifecycle SHALL invalidate its pending gesture action so a late animation completion cannot navigate the new view or collection.

#### Scenario: Pointer cancellation
- **WHEN** an active front-card drag receives pointer cancellation
- **THEN** it returns without previous, next or detail activation, even if displacement exceeds the release threshold
- **AND** the next fresh tap or drag is eligible

#### Scenario: Leave during departure animation
- **WHEN** a swipe departure animation is pending and the person changes filter or presentation, closes Browse or replaces the front-card lifecycle
- **THEN** the old completion does not navigate or open detail in the new lifecycle

### Requirement: Keep the Recipes toolbar available in both presentations

Recipes SHALL order its toolbar controls Search, All/Discovery, Go-To, Stack/List, then Recycle bin, in visual and keyboard reading order. The same toolbar SHALL remain available in Explore and Search, with controls expanded or collapsed. Search SHALL reveal its input and Filters directly below the toolbar and focus the input.

#### Scenario: Search is the first toolbar control
- **WHEN** either stack or list presentation opens or changes collection mode
- **THEN** Search precedes All/Discovery, Go-To, Stack/List and Recycle bin
- **AND** the toolbar and bottom app navigation remain available while requests are pending

#### Scenario: Activate the disclosure
- **WHEN** a person activates Search with controls collapsed
- **THEN** the input and Filters appear directly below the toolbar and the input receives focus
- **AND** opening alone does not change the collection, ordering, position or request generation

### Requirement: Select Explore for library scope without Search criteria

Without effective Search criteria, Recipes SHALL use GET `/api/recipes` with `order=explore`. Discovery and Go-To SHALL constrain library scope individually or together without activating Search. The existing eligibility, Explore ordering, filtered totals, page sizes, history-generation, wrap, prefetch and retry contracts SHALL apply to that scoped collection.

#### Scenario: Scope-only browsing
- **WHEN** text is blank, Similar is absent and no effective non-scope Search filter or Focus is applied, with Discovery and/or Go-To selected
- **THEN** Recipes requests scoped Explore pages rather than POST search
- **AND** never-cooked first, oldest cooked date next, H descending, creation descending and identity ties are preserved

#### Scenario: Complete multi-page traversal
- **WHEN** a stable Explore library containing 40 or 46 eligible recipes is traversed at 20 per stack page
- **THEN** every recipe is reachable in both directions, including first-to-last backward wrap and last-to-first forward wrap, with correct global ordinals
- **AND** list presentation uses 12 per page and reaches the complete scoped collection

### Requirement: Switch presentation without replacing active Search results

Changing stack/list SHALL use the existing member-preference contract in either collection. It SHALL reset position while retaining Search criteria, scope, planning context, loaded Search matches and continuation state. Explore SHALL retain its existing presentation-specific first-page loading behavior. Selecting the current view SHALL NOT save a new preference.

#### Scenario: Change view during Search
- **WHEN** a person switches stack to list or list to stack with loaded or pending Search results
- **THEN** the view changes and its position resets to the beginning, while criteria and loaded results/cursor are retained
- **AND** no replacement Search is submitted solely for the view change and a pending current Search may complete into the new view

#### Scenario: Return after saving a view
- **WHEN** a saved list or stack preference is loaded on a fresh ordinary Recipes entry
- **THEN** Explore starts in that presentation with empty Search criteria and default All scope

### Requirement: Enter and leave Recipes through app navigation

Recipes SHALL be a normal app destination without the former Browse overlay Close action. Normal page departure SHALL discard its session, invalidate departed responses and reset Browse traversal state. A normal return SHALL start fresh in Explore with collapsed controls, no Search criteria and All scope, retaining only existing saved member presentation preferences.

#### Scenario: Leave while work is pending
- **WHEN** a person leaves Recipes during a debounce, initial request, page request or continuation
- **THEN** departed completions cannot alter another screen or a later Recipes session
- **AND** returning normally begins a new Explore session instead of restoring the old query or cursor

#### Scenario: Dismiss detail without departure
- **WHEN** a detail sheet is dismissed while Recipes remains mounted
- **THEN** the collection, card ordinal or list scroll position and presentation remain without a dismissal-triggered collection request

### Requirement: Preserve recipe actions within the unified collection

Both collections and presentations SHALL retain existing detail, editing, membership-star, discoverability, issue-indicator, recycle-bin and assignment/recovery contracts. A confirmed deletion SHALL dismiss detail and refresh the current collection through its own data source. Failed mutation and failed subsequent read SHALL remain distinct, with read retry never repeating a confirmed mutation.

#### Scenario: Delete from Explore or Search
- **WHEN** a detail deletion succeeds in either collection
- **THEN** Explore reloads its scoped first page or Search restarts with its current criteria and planning context
- **AND** exclusion follows the successful read; rejected deletion retains detail and current cards under the recycle-bin contract

#### Scenario: Retain shared controls
- **WHEN** a person opens detail or the Recycle bin from a stack or list in either collection
- **THEN** existing editing, stars, discoverability, issue reporting/review, bin recovery and planning actions remain available under their owning contracts
- **AND** dismissing an unchanged sheet returns to the same collection position and connected trigger focus

### Requirement: Redirect legacy Browse entry with supplied context

`/browse-all-stack` SHALL redirect to `/recipes` while preserving supported `gotoOnly`, `discoverableOnly`, `focus=search`, `similarTo`, `open`, `addToDay`, `weekOffset` and `referenceWeekStartDate` context. Retired `manageGoto` SHALL NOT reopen management. Scope-only entry SHALL use Explore; Search, Similar, detail and planner entry SHALL follow their existing contextual meanings.

#### Scenario: Legacy scope entry
- **WHEN** `/browse-all-stack?gotoOnly=true&manageGoto=true` opens
- **THEN** Recipes opens scoped Explore with the Go-To toggle pressed and no management surface

#### Scenario: Legacy contextual entry
- **WHEN** a supported legacy link supplies focused Search, Similar, detail identity or planner context alongside scope
- **THEN** the redirect retains those supported values and Recipes honors them without assigning a meal on entry

### Requirement: Fill the Recipes canvas while bounding its content

The Recipes canvas SHALL fill the app shell's available width above the bottom navigation. On a 390–393 CSS px phone, the grid/content SHALL use one 16–20 CSS px side gutter, without compounded page and content padding. The toolbar SHALL use its available width before wrapping. iPad content SHALL retain responsive gutters and bounded cards. Safe-area and short-viewport reachability SHALL remain in Explore and Search.

#### Scenario: Phone Browse or Search
- **WHEN** Recipes opens in stack or list presentation at 390–393 CSS px wide, with or without expanded Search controls
- **THEN** its outer surface reaches both viewport edges above the full-width dock, and the grid/content begins 16–20 CSS px from each side rather than behind compounded insets
- **AND** no horizontal overflow or bottom-navigation overlap hides the current collection or its recovery actions

#### Scenario: Toolbar uses available width
- **WHEN** the toolbar shows Search, All/Discovery, Go-To, Stack/List and Recycle bin at ordinary phone text size
- **THEN** it uses the available Recipes width before wrapping, without reducing any target below 48×48 CSS px
- **AND** at 200% text or when localized labels cannot fit, it wraps in visual and keyboard order without clipping controls

#### Scenario: iPad portrait and landscape
- **WHEN** Recipes opens on an iPad in portrait or landscape with a loaded or empty collection
- **THEN** its outer surface fills the shell, the compact grid starts within 24–32 CSS px of each side at 820 or 1180 CSS px, and the stack remains centered within a readable bound
- **AND** content remains readable, reachable and free of accidental narrow-page side strips

### Requirement: Identify Recipes as a library destination in the dock

The bottom Recipes navigation SHALL show a recipe-book icon with the existing localized Recipes label. Its destination and current-page indication SHALL remain `/recipes`; the magnifier SHALL remain the distinct Search control in the Recipes toolbar.

#### Scenario: Enter Recipes from another app page
- **WHEN** a person activates Recipes in the bottom navigation from Home, Planner or Profile
- **THEN** the book-labeled destination opens `/recipes` and identifies itself as the current page
- **AND** the Search control remains the first control in the Recipes toolbar

#### Scenario: Navigate with keyboard or large text
- **WHEN** a person reaches the Recipes dock entry by keyboard or at enlarged text size
- **THEN** its localized label, visible focus and usable target remain available without truncating or displacing the other destinations

### Requirement: Keep the Recipes Search action at a stable left anchor

The first Recipes toolbar action, Search, SHALL remain at the same left content gutter while the other controls change label, state or row. The toolbar SHALL preserve Search, All/Discovery, Go-To, Stack/List and Recycle bin in visual and keyboard order, with at least 48×48 CSS px targets and no horizontal overflow.

#### Scenario: Scope label changes on a phone or tablet
- **WHEN** a person toggles All to Discovery or back at a fixed viewport, locale and text size
- **THEN** the Search action retains the same left edge within 1 CSS px, while the remaining toolbar actions may use or wrap in the available width

#### Scenario: Search and presentation change
- **WHEN** Search controls expand or hide, Search becomes active or inactive, or the person switches stack and list
- **THEN** the Search action stays at that left anchor and remains the first keyboard toolbar action without covering another control

#### Scenario: Narrow or enlarged toolbar
- **WHEN** French labels, a 320 CSS px phone, landscape or 200% text make the toolbar wrap
- **THEN** Search remains at the consistent left gutter on the first toolbar row, and all actions retain their order, visible focus, target size and reachability

### Requirement: Use the visible region above the Recipes dock for results

When controls fit above the dock, Recipes SHALL let the current list or stack use the visible space to within 8 CSS px of the actual dock top, accounting for browser viewport, keyboard, safe area and text changes. When controls cannot fit, they and the results SHALL remain reachable by intentional vertical scrolling without overlap or horizontal overflow. Collection position and request state SHALL survive disclosure changes under their existing contracts.

#### Scenario: Ordinary list and stack space
- **WHEN** a nonempty Explore or Search collection is shown in list or stack and the controls fit at phone or iPad size
- **THEN** the result viewport extends to within 8 CSS px above the bottom navigation rather than stopping at a fixed empty band
- **AND** the last result can be brought fully clear of the dock by scrolling or paging

#### Scenario: Browser chrome or keyboard changes visible height
- **WHEN** the browser's visual viewport grows or shrinks, including keyboard open and close
- **THEN** the current collection reflows to the visible region without obscuring the focused field, a result action or the bottom navigation
- **AND** its loaded results, pagination and position are retained

#### Scenario: Safe area and large text on a short screen
- **WHEN** safe-area insets, French text, 200% text or a short landscape/portrait viewport reduce available height
- **THEN** toolbar, context, recovery actions and recipes remain reachable by intentional scrolling with visible focus and usable targets
- **AND** content does not overlap the dock or require a complete first card to fit before scrolling when that is physically impossible

#### Scenario: Hide and restore Search controls
- **WHEN** Search controls hide and reopen while a Search result is loaded or a request is pending
- **THEN** the result region resizes without clearing criteria, results, pagination, list/stack position, presentation or the pending work

#### Scenario: Settled enlarged-text list viewport
- **WHEN** a loaded Explore or Search list is displayed at 393x852 CSS pixels with 200% root text in English or French, its controls fit above the dock, and layout has settled after reflow
- **THEN** the list's scrollable viewport ends between zero and 8 CSS pixels above the actual dock top
- **AND** list sizing does not extend its scrollable viewport below the dock or clip its usable bottom behind the canvas edge
- **AND** text enlargement alone does not clear the collection, criteria, pagination or current request state

#### Scenario: Reach the last list recipe after reflow and append
- **WHEN** a nonempty list has more loaded rows than fit above the dock, including an appended page, with controls fitting above the dock at ordinary or 200% text
- **THEN** list scrolling can bring the final recipe's name and activation target clear of the dock without an additional canvas scroll to uncover the list's bottom
- **AND** when that final row fits in the available result height, the complete row and its focused activation target can be shown above the dock
- **AND** a row taller than the available height remains readable and operable by intentional scrolling without requiring the whole row to fit at once
- **AND** keyboard activation opens the final recipe's existing detail sheet, and dismissal returns to that recipe under the existing focus and position contracts

### Requirement: Keep recipe detail actions clear of the sheet edge

When detail content is scrolled to its end, the final action SHALL have ordinary trailing space inside the sheet. At 16 px root text size, the normal read action's bottom-to-panel-edge gap SHALL be approximately 32 CSS px: 8 CSS px inside the button section plus the scroller's original 24 CSS px. The increment SHALL belong to the action section, without another dock or safe-area spacer.

#### Scenario: Read actions on phone and tablet
- **WHEN** a person scrolls the detail sheet to its end on a normal phone or tablet
- **THEN** the final action remains fully visible with approximately 32 CSS px of trailing space at normal text size
- **AND** the action section owns 8 CSS px of that space while the inner scroller retains 24 CSS px
- **AND** the sheet retains its existing placement, action order and button targets

#### Scenario: Edit actions and constrained content
- **WHEN** edit actions are last, or the detail sheet is shown on a short phone or with French/200% text
- **THEN** the final control and its focus ring remain reachable by scrolling without clipping or dock overlap
- **AND** the edit action section owns the same 8 CSS px increment while its existing margin remains unchanged
- **AND** the sheet does not add a duplicate safe-area spacer or change any action behavior

#### Scenario: Distinguish action section from scroll content
- **WHEN** the Read actions are visible at the end of the scrollable recipe detail
- **THEN** the added bottom space is inside the action section rather than a larger generic scroller padding
- **AND** the overall final control-to-panel edge gap stays at the established spacing step

### Requirement: Center the recipe stack above its bottom family action

In stack presentation, Recipes SHALL center the current card stack above the counter and Ask the Family panel when the content fits. The counter and panel SHALL form a bottom group above the dock without changing their dimensions or behavior. When content does not fit, card, counter and panel SHALL remain reachable by scrolling in that order. Reflow SHALL retain the active collection, position and pending work.

#### Scenario: Ordinary phone with free height
- **WHEN** a loaded stack is shown at 390×844 CSS pixels with collapsed Search controls and no planning row
- **THEN** the current card stack is centered in the space between the result top and counter
- **AND** the counter remains immediately above Ask the Family and the panel rests at the result bottom above the dock
- **AND** the card dimensions and backing peeks remain unchanged

#### Scenario: Tall tablet or expanded controls
- **WHEN** a loaded stack is shown on a tablet, or Search controls expand or hide while the content still fits
- **THEN** the card and bottom group redistribute within the available result height without changing card size or panel design
- **AND** Search criteria, result order, cursor and current position remain unchanged

#### Scenario: Constrained viewport or enlarged text
- **WHEN** short portrait, landscape, browser chrome, keyboard, safe area, French or 200 percent text leaves too little height for the stack and bottom group
- **THEN** the card, counter and complete Ask the Family panel remain reachable in that order by vertical scrolling
- **AND** they do not cover each other or the dock, shrink targets or cause horizontal overflow

#### Scenario: Planner context and recovery
- **WHEN** a planner-targeted stack or a stack with retry/loading feedback needs extra vertical room
- **THEN** the context and recovery controls remain reachable without an overlay from Ask the Family
- **AND** opening details, swiping and voting retain their existing behavior

### Requirement: Persist servings for the extracted ingredient basis

The recipe database record SHALL retain nullable positive integer `servings`, meaning how many servings its stored ingredient quantities make. Successful extraction synchronization SHALL derive the count from its raw recipeYield, saving null when unresolved. The raw yield SHALL remain retained. Neither recipeYield nor servings SHALL be added to recipe.info. Ingredients SHALL NOT be scaled.

#### Scenario: Four-portion extraction
- **WHEN** a recipe with yield “4 portions” and 340 g pasta successfully synchronizes
- **THEN** the database stores servings 4 and the original yield, ingredients retain 340 g pasta, and no yield or serving-count field is added to recipe.info

#### Scenario: Replacement content has no resolved count
- **WHEN** successful re-extraction replaces a known recipe with content whose yield is ambiguous or absent
- **THEN** synchronization sets servings null rather than attaching the previous count to the replacement ingredients

#### Scenario: Retry synchronization
- **WHEN** the same extracted content is synchronized more than once
- **THEN** the resulting count and ingredients remain identical

### Requirement: Recover unambiguous existing serving yields

Legacy backfill SHALL fill null database servings from unambiguous stored serving-yield metadata without AI calls, file writes, ingredient changes or replacing known counts. Missing, malformed, fractional, range, alternative and non-serving yields SHALL leave the count unknown. Backfill SHALL be idempotent and SHALL NOT publish a count derived from content replaced concurrently.

#### Scenario: Three supplied recipes
- **WHEN** backfill processes the supplied chicken-thigh, zaatar-chicken and radiatore recipes with yields “2 portions”, “2 portions” and “4 portions”
- **THEN** their database counts become 2, 2 and 4 respectively, while ingredient quantities, raw metadata and recipe.info remain unchanged

#### Scenario: Unknown and known records
- **WHEN** backfill encounters null servings with yield “2 or 4 portions”, “2–4 servings”, “12 muffins”, or malformed metadata, and another record with known servings 4
- **THEN** unresolved counts remain null and the known count remains 4

#### Scenario: Concurrent replacement
- **WHEN** a recipe's metadata changes after backfill reads it but before backfill writes its derived count
- **THEN** the obsolete count is not written over the replacement state

#### Scenario: Interrupted backfill
- **WHEN** backfill is interrupted after some records are saved and later runs again
- **THEN** it safely fills remaining eligible null counts without changing already known counts or recipe content

### Requirement: Return persisted servings in the recipe DTO

Successful reads using the public recipe DTO SHALL expose nullable integer `servings` from the database record. Unknown counts SHALL return null without a default. Existing envelopes, access and eligibility rules SHALL continue to apply. Detail reads SHALL NOT call AI or mutate recipe storage.

#### Scenario: Known count in detail
- **WHEN** authorized GET /api/recipes/{id} retrieves a recipe with stored servings 4
- **THEN** HTTP 200 includes recipe.servings equal to 4 in its existing unwrapped recipe/updatedAt response

#### Scenario: Unknown count
- **WHEN** a successful recipe DTO read retrieves a recipe with null servings
- **THEN** its servings is null without defaulting to 2 or 4

### Requirement: Display localized servings in recipe detail

Loaded detail SHALL show a known positive serving count in a read-only badge immediately after the Ingredients title, as part of that heading's accessible name, with localized singular/plural wording. Null or absent counts SHALL omit it. The count SHALL NOT also appear beside Ready In. Existing loading, failure, close and stale-response behavior SHALL continue to apply.

#### Scenario: Four servings in each language
- **WHEN** successful detail retrieval returns servings 4
- **THEN** English detail shows “4 servings” immediately beside Ingredients and French detail shows “4 portions” immediately beside Ingrédients, each within the corresponding heading

#### Scenario: One serving
- **WHEN** successful detail retrieval returns servings 1
- **THEN** English detail shows “1 serving” and French detail shows “1 portion”

#### Scenario: Known recipe followed by unknown recipe
- **WHEN** detail changes from a recipe with servings 4 to one whose response has null or absent servings
- **THEN** the new detail shows no serving label and retains none from the previous recipe

### Requirement: Keep the ingredient serving badge readable and noninteractive

The serving badge SHALL remain readable without truncation or horizontal scrolling at 320 CSS px and at 200% text size. It SHALL follow the Ingredients title in reading order and wrap beneath it when needed. The badge SHALL remain noninteractive in viewing mode, without adding a focus stop or ingredient scaling; edit mode SHALL provide the separate labeled field specified below. Badge text SHALL meet 4.5:1 contrast against its rendered background.

#### Scenario: Narrow or enlarged bilingual heading
- **WHEN** detail is displayed at 320 CSS px or with 200% text size in English or French
- **THEN** the full Ingredients title and serving badge remain visible in reading order, wrapping within their section without overlapping content or causing horizontal scrolling

#### Scenario: Serving field in edit mode
- **WHEN** a recipe enters editing with known or missing servings
- **THEN** a keyboard-accessible labeled servings field is available alongside existing recipe editing, initialized with the saved count or blank respectively

#### Scenario: No ingredient quantities are rescaled
- **WHEN** the Ingredients heading shows a serving badge
- **THEN** the ingredient list retains its returned quantities and the badge provides no scaling action

### Requirement: Correct or add servings through recipe editing

Recipe editing SHALL let authorized users correct known servings or add a missing count through the existing Save/Cancel flow. A supplied count SHALL be a positive whole integer within the database integer range. Saving SHALL persist the count independently of raw yield, without changing ingredient quantities or adding yield/count fields to recipe.info. Omitting the count SHALL preserve its saved value, including null.

#### Scenario: Correct a known count
- **WHEN** a user changes servings from 4 to 3 and successfully saves the recipe
- **THEN** subsequent detail reads and reopening show 3, even if raw recipeYield still says “4 portions”, with original ingredient quantities and raw metadata retained

#### Scenario: Add a missing count
- **WHEN** a user edits a recipe with null servings, enters 2 and successfully saves
- **THEN** subsequent detail reads show 2 and the viewing heading shows the localized two-serving badge

#### Scenario: Omitted count preserves stored state
- **WHEN** a recipe update omits servings, including an older client's request or an untouched blank field for an unknown count
- **THEN** the existing count or null remains unchanged

#### Scenario: Invalid count
- **WHEN** a user supplies zero, a negative, fractional, out-of-range or nonnumeric count
- **THEN** editing presents an associated localized validation error and prevents saving that input, and direct API requests with invalid supplied counts are rejected without changing the recipe

#### Scenario: Cancel or failed save
- **WHEN** the user cancels a changed servings draft or saving fails
- **THEN** Cancel discards the draft, while failure retains it for correction or retry and does not present the new count as successfully saved

### Requirement: Make servings editing accessible in both languages

The editor SHALL use a visible localized label (“Servings” in English, “Portions” in French), an associated validation message and normal keyboard operation. Its field, error and existing Save/Cancel controls SHALL remain usable at 320 CSS px and 200% text size, in both sheet layouts. Switching recipe identity SHALL reset the servings draft to that recipe's state.

#### Scenario: Bilingual validation and responsive editing
- **WHEN** a user edits servings in English or French at 320 CSS px or 200% text size
- **THEN** the complete label, field, associated error and Save/Cancel controls remain reachable without overlap, truncation or horizontal scrolling

#### Scenario: Change recipe while editing
- **WHEN** detail moves to another recipe after a servings draft was entered
- **THEN** the previous recipe's draft or validation error is not shown for the new recipe
