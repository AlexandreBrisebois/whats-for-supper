# Spec Delta

## ADDED Requirements

### Requirement: Order Quick Find pools by live then historical interest

Quick Find and Quick Replace SHALL fill at most five unique recipes from eligible current live-liked candidates first, qualifying four-week historical liked-but-unselected candidates second, then existing Discovery fallback candidates. Each pool SHALL exclude IDs already selected. Existing hard constraints, target-week assignment exclusion and effective persisted cooked cooldown SHALL apply. Live eligibility SHALL include supported early votes without a VotingOpen gate.

#### Scenario: All three pools contribute
- **WHEN** two eligible live-liked recipes, two additional historical recipes and fallback recipes exist
- **THEN** results contain the two live recipes first, the two historical recipes next, and one fallback last

#### Scenario: Live likes outrank history
- **WHEN** eligible A has current live likes and eligible B has only qualifying historical interest
- **THEN** A precedes B regardless of B's historical count

#### Scenario: Full live deck
- **WHEN** six eligible live-liked recipes and historical candidates exist
- **THEN** the first five live-liked recipes fill the deck; history and fallback receive no reserved slots

#### Scenario: History leads without live likes
- **WHEN** no live-liked candidate qualifies and six historical candidates qualify
- **THEN** the first five historical candidates fill the deck

#### Scenario: Historical and current liked
- **WHEN** A belongs to live-liked, historical and Discovery pools
- **THEN** A appears once in the live pool and consumes one of five slots

#### Scenario: No history
- **WHEN** no historical candidate qualifies
- **THEN** existing live-liked then Discovery fallback ordering fills the available slots subject to accepted constraints

#### Scenario: Neither interest signal
- **WHEN** neither live nor historical candidates qualify
- **THEN** existing eligible fallback candidates fill up to five slots

#### Scenario: Early votes before opening
- **WHEN** valid live likes arrive after the previous close but before the next week explicitly opens
- **THEN** eligible liked recipes participate in the first pool without a VotingOpen status gate

#### Scenario: Votes cleared
- **WHEN** close clears current votes and A has qualifying historical unselected interest
- **THEN** A can enter the second pool without a new vote; with no eligible live recipes that pool leads

#### Scenario: Hard exclusion
- **WHEN** a live-liked or historically liked recipe is assigned in the target week, unavailable or in effective persisted cooked cooldown
- **THEN** it is excluded even if fewer than five alternatives remain

#### Scenario: Manual Discovery off
- **WHEN** a ready unassigned live-liked or historical recipe is manually outside Discovery but not under effective cooked suppression
- **THEN** that fact alone does not newly exclude it from those pools; the Discovery fallback retains its own eligibility

### Requirement: Preserve meaningful ordering inside Quick Find pools

The live-liked pool SHALL retain never-cooked first, then oldest cooked date, then current like count descending, with stable identity for remaining ties. Historical-only candidates SHALL use never-cooked first, then oldest cooked date and stable identity. The fallback SHALL retain its existing ordering with stable final ties. Historical counts SHALL not be added to live likes or turned into arbitrary score weights.

#### Scenario: Preserve live recency priority
- **WHEN** live-liked A was cooked longer ago than live-liked B but B has more current likes
- **THEN** A retains priority under existing cooked-date-first ordering

#### Scenario: Equal live recency
- **WHEN** two live-liked candidates share cooked-date position but differ in current likes
- **THEN** the higher current-like candidate comes first

#### Scenario: Historical-only intensity
- **WHEN** historical-only A had five historical likes and B one, with equal cooked-date position
- **THEN** identity resolves the tie without adding historical counts to current likes

#### Scenario: Deterministic repeat
- **WHEN** all eligible candidate facts remain unchanged
- **THEN** repeated reads return the same ordered set of at most five unique IDs

### Requirement: Keep full Search reachable from replacement suggestions

Quick Find SHALL expose Search Library in empty and terminal states with the target day/week context retained. Selection SHALL remain disabled without a recipe. Moving to Search or skipping cards SHALL not mutate the existing meal; existing recovery contracts own replacement commit and partial recovery.

#### Scenario: All cooled
- **WHEN** cooldown leaves no suggestions
- **THEN** No recipes found and an accessible Search Library action are shown; the original meal remains

#### Scenario: Search after exhaustion
- **WHEN** all five suggestions are skipped
- **THEN** Search retains the target and can find recipes outside Discovery or cooldown according to normal filters

#### Scenario: Interrupted replacement
- **WHEN** a background refresh or failed read occurs during replacement
- **THEN** existing current-request guards and retained-deck behavior apply; no unchosen replacement is committed

#### Scenario: Disable historical priority
- **WHEN** historical ranking is disabled but historical rows remain stored
- **THEN** Quick Find skips the historical pool, retains current fallback order and the independently accepted cooldown/unavailable filters, and does not delete history
