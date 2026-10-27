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

After a relevant first-page response succeeds, All mode SHALL use the preceding summary total, including its zero default. Discovery mode SHALL use the page's nonnegative filtered pagination total, defaulting missing pagination or total to zero. Existing `Return an explore-ordered library page` owns the page total; summary and page reads do not establish an atomic snapshot.

#### Scenario: All uses summary rather than page total
- **WHEN** a relevant All first-page response succeeds with summary total 45 and page total 10
- **THEN** the Browse collection total is 45

#### Scenario: Discovery uses filtered page total
- **WHEN** a relevant Discovery first-page response succeeds with summary total 45 and filtered page total 10
- **THEN** the Browse collection total is 10

#### Scenario: Discovery pagination total is absent
- **WHEN** a relevant Discovery first-page response succeeds without pagination or its total
- **THEN** the Browse collection total is zero even if the summary total is positive

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

The library SHALL use stack presentation when the selected member has no saved list preference or current override. Selecting Show recipe stack SHALL select stack presentation. After the shared summary succeeds, stack first-page loads SHALL request explore order, limit 20 and the active All/Discovery filter.

#### Scenario: Load the default stack
- **WHEN** a member without a saved list preference enters the library and summary retrieval succeeds
- **THEN** the stack requests page 1 with order explore, limit 20 and discoverableOnly false

#### Scenario: Switch from list to stack
- **WHEN** a person selects Show recipe stack from list presentation and summary retrieval succeeds
- **THEN** stack presentation starts its page-1 load with limit 20 and the selected collection filter

### Requirement: Present the current stack card and visual depth

With nonempty successfully loaded stack results, Browse SHALL render up to four consecutive loaded cards beginning at the current index, with the first designated front. Cards SHALL display returned name, description, hero reference and formatted time; deeper cards SHALL have reduced scale, opacity and vertical offset.

#### Scenario: Render a window of loaded cards
- **WHEN** stack results are available at a valid current index with no stack loader replacing cards
- **THEN** up to four loaded records beginning at that index are rendered with one front card

#### Scenario: Read stack card content
- **WHEN** a returned card is displayed
- **THEN** its name, description, hero reference and formatted time are presented

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

Tapping the front card without a tracked drag SHALL open that recipe detail. A horizontal drag exceeding 5 pixels SHALL suppress the tap. Closing detail SHALL retain the loaded card position under the existing detail dismissal requirement.

#### Scenario: Tap the front card
- **WHEN** the front card is tapped without a tracked drag
- **THEN** detail opens for that card ID

#### Scenario: Suppress a drag-induced tap
- **WHEN** the front card has tracked horizontal displacement greater than 5 pixels before its tap handler runs
- **THEN** that handler does not open detail

### Requirement: Wrap stack navigation within available results

For a stable collection, navigation SHALL fetch missing adjacent pages and reach every eligible recipe in both directions. Next at the collection end SHALL wrap to its first card. Previous at its first card SHALL select the last card, requesting the calculated final page with limit 20 and the active filter when necessary. Pending page retrieval SHALL retain the current position.

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

The action bar SHALL display current global collection ordinal and the selected collection total in position / total form. The ordinal SHALL include preceding pages, including after backward wrap. Offset pagination SHALL NOT promise a stable snapshot during concurrent server mutations.

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

### Requirement: Leave the Browse overlay through its navigation controls

Close SHALL request browser back navigation. Search SHALL request `/recipes?focus=search`. Unmounting Browse SHALL reset its stack store.

#### Scenario: Close or search from Browse
- **WHEN** a person activates Close or Search in the library overlay
- **THEN** Close requests back navigation or Search requests the focused Search route respectively

#### Scenario: Reset departed Browse state
- **WHEN** the Browse page unmounts
- **THEN** loaded recipes, index, total and pagination return to the initial stack-store state

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
