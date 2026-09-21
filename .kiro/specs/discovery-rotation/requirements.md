# Discovery rotation — requirements

Status: reviewed proposal; specification only. Implementation is not selected.

## Outcome and decisions

Discovery should help the household finish active voting decisions while rotating
the remaining recipes by time since cooking or planning. The user selected a
**single order: active votes first, then rotation**, and explicitly required the
**existing global vote purge to remain unchanged**. Minimise code changes.

This proposal interprets active-vote priority as descending current Like count,
retaining the existing API's convergence priority. Within equal counts, use weekly
recency groups, saved preference, exact recency, then a stable ID tie-breaker.
This deliberately permits a recently used eligible recipe with votes to outrank
an older recipe without votes. There is no guarantee against starvation while
other recipes continually attract votes; a guaranteed 2:1 queue mix was declined.

Defaults made concrete for review: seven-day age groups; UTC calendar dates;
never-used recipes in a separate oldest group; existing saved Love/Like ratings
represent favourites/likes. No new cooldown setting or preference model.

## Scope and non-goals

Change Discovery eligibility, ordering, presentation order and reconciliation
after existing vote/calendar events. Keep the Supper-only UI and existing filters,
identity, voting controls, vote payloads and response shapes.

Do not change either global or per-recipe vote purge, vote expiry, consensus
thresholds, planner smart-default ranking/assignment, Search/Surprise Me,
Dreaming affinity, rating writes, database schema/views, generated clients, or
navigation/visual design. No new endpoint, event type, queue service, background
job, settings UI, migration or shared ranking framework.

## Acceptance

### DR-R1 — Calendar eligibility independent of votes

1. Retain ready/discoverable/undeleted and category/cuisine eligibility and the
   exclusion of recipes already voted on by the requesting member.
2. Exclude a recipe assigned to a `Planned`, `Locked` or `AwaitingConsensus`
   calendar event dated on or after the current UTC week's Monday, including
   future weeks. This also excludes overdue assignments earlier in this week.
3. Exclude recipes with a `Cooked` event in the current UTC Monday–Sunday week.
   Older cooked events affect rank, not eligibility. `Skipped` events and null
   recipe IDs do not exclude a recipe. Older prior-week assignments affect rank
   but do not permanently exclude overdue recipes.
4. Clearing votes never makes an excluded recipe eligible. A week-lock test must
   prove the existing global purge still clears votes for both selected and
   unselected recipes, while locked recipes remain absent from Discovery.
5. Category discovery uses the same eligibility predicate before taking distinct
   categories. Removing the last assignment can restore eligibility on refresh
   only if all other exclusions are absent.

### DR-R2 — Deterministic rotation within equal active-vote counts

1. Count only current `RecipeVotes` with `VoteType.Like`; do not introduce an age
   filter. Votes are active until existing code updates or purges them. Because
   the requesting member's voted recipes are excluded, remaining votes are from
   other members.
2. Define `lastUsedOn` as the latest of `Recipe.LastCookedDate` converted to a UTC
   date and retained calendar dates on/before today in states `Planned`, `Locked`,
   `AwaitingConsensus` or `Cooked`. Ignore `Skipped` and future dates for historical
   age; future assignments are handled by DR-R1. Clamp negative age to zero.
3. No evidence means never-used. Otherwise the age group is
   `floor(max(0, today - lastUsedOn) / 7)`. Older groups rank before younger groups;
   never-used ranks before all dated groups within the same vote count.
4. Sort by: current Like count descending; age group oldest first; saved rating
   `Love > Like > Unknown > Dislike`; exact `lastUsedOn` oldest first; recipe ID
   ascending. A saved dislike is not a new hard exclusion.
5. Examples with equal votes: a Like last used 35 days ago precedes a Love used
   20 days ago; a Love used 35 days ago precedes an unrated recipe used 41 days
   ago (same age group); all exact ties have repeatable ordering.
6. A recent planning date wins over an older cooking date. Retained calendar
   history is the available planning evidence: deleting a plan removes that
   evidence. Do not create planning-history persistence in this slice.

### DR-R3 — First API result is the first voting card

1. Array index zero is the front throughout the store, rendering, top-four
   selection, visible-removal badge and both voting buttons/swipe callbacks.
2. A fixture with at least six distinct recipes proves the first returned ID is
   displayed as front and submitted by the first vote, followed by the second ID.
   Seeing a recipe somewhere in the DOM is insufficient evidence.
3. Preserve existing interaction labels, layout, swipe animations and pending-card
   navigation indicator. Empty stacks retain the existing refresh action.

### DR-R4 — Live convergence follows the server order

1. Existing `vote_updated`, `fill_the_gap_invalidated`, `slot_updated`,
   `week_updated` and SSE `connected` snapshots invalidate Discovery's loaded
   order. Reconnect must recover missed changes. Existing non-Discovery event
   consumers retain their behaviour.
2. Fetch the same category through the existing endpoint. Reconcile the entire
   returned list, including additions and deep-stack promotions; removal-only
   diffs and index-1–3-only promotion are insufficient.
3. Keep the current front card in place if still eligible and not locally voted;
   apply the server order to every remaining card. If front is absent from the
   fresh response, remove it. Eligibility overrides front-card stability.
4. A positive vote on a recipe formerly below the visible four makes it next
   after the retained front when the server ranks it first. A zero Like count
   removes any event-driven interest flag and must not invent interest.
5. Empty stacks can become nonempty after vote purge, plan removal or reconnect.
   Supper remains the fetch context even when the store's active category is null.
6. Ignore responses from an earlier member/category/request or from before a newer
   invalidation. A vote during a refresh cannot resurrect the locally removed
   card. Cover invalidations during initial loading and empty states, overlapping
   fetches and navigation/member changes. When member/category identity changes,
   clear the old stack and disable voting until the new context has loaded; a
   guarded response alone must not leave the former member's cards actionable.
7. On refresh failure, retain the existing stack without fabricating eligibility
   or a new order; retry on the next invalidation, reconnect or explicit refresh.
   A failed vote restores/refetches authoritative state once that request settles;
   it must not permanently hide a recipe. Do not automatically retry vote writes.

### DR-R5 — Minimal scope and compatibility

1. `GET /api/discovery` and `/categories` keep their existing response schemas;
   vote POST and SSE payloads are unchanged. Describe ordering/eligibility in
   OpenAPI prose only. Keep API-owned ranking out of the PWA.
2. Preserve both purge implementations and the existing planner threshold/event
   path. Reaching consensus still produces existing planner suggestions; changing
   their subsequent ranking or assignment is not part of this spec.
3. No Search policy changes. Search's 28-day rediscovery/affinity model is not
   Discovery's saved-rating/weekly-age policy.
4. Use a controllable server clock, fixed test dates and meaningful API, browser
   and real PostgreSQL checks. Do not call in-memory view fixtures database proof.

## Boundaries and unresolved decisions

No unresolved product decision blocks this reviewed proposal. The user-approved
single-order tradeoff and unchanged purge are mandatory. Other explicit defaults
above are proposed specification details, not a claim that implementation is
approved. Planner smart defaults currently have their own recent-cooked-first
tie-break and recipe-duplication concerns; those remain a separate investigation
follow-up, not hidden tasks in this minimal Discovery change.
