# Recipe library summary reading delta

## ADDED Requirements

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
