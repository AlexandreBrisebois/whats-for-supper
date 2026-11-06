# supper-servings Specification

## Purpose
Let households set how many portions to prepare on each date, including leftovers, and derive consistent ingredient quantities for planning, shopping and cooking without rewriting their saved recipes.

## Requirements

### Requirement: Distinguish recipe basis from dated portions

Saved recipe servings SHALL remain the positive basis of stored amounts. Usual and override counts SHALL be total portions including leftovers, not attendance. An unset usual count SHALL derive from family membership as specified below. Effective counts SHALL be whole integers from one through the supported range. No separate extras count SHALL be introduced; changing a count SHALL NOT assign, remove or complete a meal.

#### Scenario: Six portions from a two-serving recipe
- **WHEN** Wednesday's effective count is six and its recipe's saved basis is two
- **THEN** six is the dated target and two remains the recipe basis without rewriting original quantities

#### Scenario: Include leftovers in one number
- **WHEN** four people want supper and two portions for later
- **THEN** setting six portions supplies the entire target without separate people or leftovers controls

#### Scenario: Invalid count or night away
- **WHEN** zero, a negative, fractional, nonnumeric or out-of-range count is submitted
- **THEN** validation rejects it without changing a count or meal and retains a correctable draft
- **AND** existing non-cooking choices remain available for a night away

### Requirement: Apply an explicit household default with dated exceptions

Settings SHALL configure usual portions. A positive human-set count SHALL remain effective until explicitly changed or reset to automatic, regardless of membership changes. Without an explicit choice, the current positive family-member count SHALL supply usual portions. Current/future dates SHALL use usual unless overridden. Past, Cooked and prepared snapshots and saved date overrides SHALL remain protected.

#### Scenario: Change the usual portion count
- **WHEN** usual changes from four to five and future Wednesday has override six
- **THEN** future inherited dates use five, Wednesday retains six and past/Cooked/prepared snapshots do not change

#### Scenario: Set portions before choosing food
- **WHEN** an empty future Saturday receives override six and later receives a recipe
- **THEN** the date retains six and its new recipe uses that count

#### Scenario: Automatic family size then human choice
- **WHEN** usual is unset for four family members, a member is added, and later a person explicitly sets seven
- **THEN** inherited editable dates first use four, then five, then seven
- **AND** a subsequent membership change leaves seven in effect

#### Scenario: Reset explicit usual to automatic
- **WHEN** a person deliberately selects automatic family size in Settings and confirms the save
- **THEN** inherited editable dates use the current positive member count, overrides remain, and the setting identifies its automatic source

### Requirement: Keep serving intent attached to dates through meal changes

Recipe swaps, Tomorrow chains, deferral, removal and replacement SHALL leave date counts in place. Each recipe at a new date SHALL use that destination's effective count. A source date SHALL retain its count after its recipe leaves. Non-cooking days SHALL retain their count without contributing recipe-free grocery needs. Movement and its existing rejection rules SHALL otherwise be unchanged.

#### Scenario: Tomorrow shifts several recipes
- **WHEN** Wednesday has count six, Thursday four and Friday two, and Wednesday's meal pushes the following meals forward
- **THEN** the dates retain six/four/two and moved recipes use their respective destination counts

#### Scenario: Next Week spills into a later week
- **WHEN** defer selects a later free Monday because the following week is full
- **THEN** the moved recipe uses that Monday's effective count and no count travels with the recipe

### Requirement: Scale each usable ingredient from its saved basis

With known positive recipe basis B and target T, a usable numeric ingredient amount Q SHALL contribute Q times T divided by B. Scaling SHALL use the original amount on every calculation, not a prior projection. It SHALL precede display rounding and weekly unit aggregation. Package sizes, ingredient names, notes and instruction text SHALL NOT be rewritten by multiplying numbers embedded in text.

#### Scenario: Double then triple a recipe
- **WHEN** a two-serving recipe contains 200 g pasta and is viewed for four, then six
- **THEN** projections show 400 g, then 600 g, while the saved amount remains 200 g

#### Scenario: Package quantity
- **WHEN** a usable structured ingredient represents two cans with a descriptive 400 g package size and the multiplier is three
- **THEN** the count becomes six cans and the descriptive 400 g size remains unchanged

### Requirement: Report incomplete scaling without invented quantities

Missing basis, unreliable numeric amounts or stale structured-source data SHALL produce concise actionable feedback. Intentionally unquantified directions SHALL remain normal text, not correction warnings. Original text SHALL remain available; unknown amounts SHALL NOT become zero or an invented number. Usable contributions can scale independently, but neither recipe nor grocery projections SHALL label a partial subtotal as a complete requirement. Reads/calculation SHALL NOT call AI.

#### Scenario: Salt to taste is normal recipe content
- **WHEN** an ingredient says salt to taste or oil for frying
- **THEN** its original direction remains normal text without a correction warning or invented number

#### Scenario: Yield is missing
- **WHEN** a dated recipe has no reliable original serving basis
- **THEN** original quantities remain visible with concise guidance to correct the basis or consult the original, and no complete scaled amount is claimed

#### Scenario: Ingredient text was edited independently
- **WHEN** current ingredient text no longer agrees with the structured supply's source basis
- **THEN** stale supply quantities are not presented as current scaled needs and the recipe is identified for correction/re-import review

### Requirement: Share one authoritative projection across consumers

Proposed-date detail, assigned detail, cooking and groceries SHALL share server-owned scaling rules and dated portions. Temporary recipe previews SHALL use those same rules with an explicit independent count, without becoming saved date/preparation context. Assigned reads SHALL reject stale occurrence identity. Legacy original reads remain compatible; no read SHALL assign, save portions or materialize preparation.

#### Scenario: Plan and cook for six
- **WHEN** a recipe with basis two and 200 g pasta is planned for six
- **THEN** dated detail and cooking show 600 g and its grocery contribution is 600 g

#### Scenario: Proposed date before assignment
- **WHEN** an unassigned candidate is read for a date configured for four
- **THEN** its default dated projection uses four without requiring assignment or changing saved state

#### Scenario: No selected or proposed date
- **WHEN** recipe reading has no date context
- **THEN** its default is original quantities and an explicitly selected 2/4/6 preview remains a separate read-only projection

### Requirement: Save table edits as a bounded conflict-checked batch

Planner Done SHALL submit the changed dated overrides together against captured absolute dates and serving-state version. Usual-portion configuration SHALL remain owned by Settings. Validation or stale-version conflict SHALL apply none of that batch and retain drafts with visible recovery. Counts in a successfully committed batch SHALL become visible together. Empty days SHALL not require creating recipe-backed calendar entries. Pending duplicate submissions SHALL be suppressed.

#### Scenario: Another member edits portions
- **WHEN** another member changes the relevant serving state after the editor's baseline read
- **THEN** Done reports conflict without overwriting that change or discarding local drafts

#### Scenario: Cancel or invalid row
- **WHEN** Cancel is activated or one row is invalid
- **THEN** Cancel submits no mutation, and invalid Done applies no dated override from that batch

### Requirement: Separate saved counts from grocery refresh completion

A committed serving batch SHALL remain committed if later grocery recomputation/publication fails. Confirmed portion persistence SHALL return the editor to Recipes even while groceries update. Grocery feedback SHALL distinguish updating, current and failed refresh. Unknown replies SHALL require authoritative serving reads before another write. Refresh recovery SHALL recompute/read from saved counts without replaying the count change or repeatedly unchecking an unchanged quantity.

#### Scenario: Reply lost after commit
- **WHEN** Done's reply is lost after serving state commits
- **THEN** the editor checks saved state, recognises its confirmed result when possible and avoids a duplicate write

#### Scenario: Groceries cannot refresh
- **WHEN** counts commit but grocery follow-up fails
- **THEN** the editor returns to Recipes with saved portions and visible grocery retry feedback; entering groceries exposes the failure rather than presenting stale amounts as current

#### Scenario: Save finishes before grocery work
- **WHEN** portion persistence is acknowledged while recomputation remains pending
- **THEN** Done returns to Recipes and entering groceries shows Updating your shopping list… until current data is available

### Requirement: Preserve confirmed prepared portions

Explicit preparation SHALL freeze the occurrence's effective portions or its unconfigured original-basis context. Later usual-portion changes SHALL not rescale that prepared meal. Prepared dates SHALL be read-only in Portions. No separate leftovers amount SHALL travel with a meal; unprepared movement continues to use the destination date's portions.

#### Scenario: Default changes after preparation
- **WHEN** Friday lasagna was prepared Tuesday for six and the household default later changes to four
- **THEN** Friday retains six prepared portions and its ingredient/grocery contribution is not reduced by that default edit

### Requirement: Resume grocery updating after interruption

A committed portions save SHALL retain durable pending refresh state until groceries reflect the saved inputs. Background interruption SHALL not lose that obligation. Restart or explicit Retry SHALL derive from current saved portions, preserve later checks and avoid replaying the count save. Pending or failed refresh SHALL remain visible when groceries are opened.

#### Scenario: Worker stops after portion acknowledgement
- **WHEN** Done confirms the portions save and the background worker stops before recomputation
- **THEN** saved portions remain available, groceries are identified as updating or needing retry, and resumed work produces current totals without another portions write

### Requirement: Keep previews independent of saved serving and preparation state

An explicit 2/4/6 preview SHALL project the identified recipe's reliable quantities from its saved positive basis. It SHALL return its basis, target and completeness without dated write/preparation authority. A preview SHALL never save recipe quantities, defaults, overrides, assignments, prepared snapshots, grocery totals or check state, and SHALL not trigger grocery refresh work.

#### Scenario: Repeated preview and odd saved count
- **WHEN** a recipe planned for five is previewed for two, six and four repeatedly
- **THEN** each preview derives from original amounts, five remains saved, and neither repeated reads nor display rounding compound quantities

#### Scenario: Preview an already prepared supper
- **WHEN** a supper has frozen prepared portions seven and a different preview is selected
- **THEN** seven and the actual preparation date remain saved and identifiable, while the separate preview grants no new completion or portions-editing action

#### Scenario: Missing basis and partial ingredients
- **WHEN** the recipe lacks a valid basis or contains unreliable amount/source data
- **THEN** the response and UI expose the unresolved condition without an invented factor or complete total
- **AND** reliable lines and intentionally unquantified text retain the shared projection policy, with original evidence accessible

#### Scenario: Correction after an earlier preview
- **WHEN** a recipe basis or ingredient source changes while a preview is being read
- **THEN** late results cannot be presented as the current recipe projection and subsequent previews use the current saved recipe basis

### Requirement: Keep preview errors separate from planning recovery

Preview validation, unavailable recipe and read failures SHALL remain explicit and retryable where appropriate. A failed preview SHALL not imply a saved portions change failed, clear a planning recovery stage or overwrite a good dated/prepared context. Unsupported preview counts SHALL be rejected without writes.

#### Scenario: Preview fails while dated context is loaded
- **WHEN** a six-portion preview fails for a recipe planned for five
- **THEN** failure offers retry or return to planned quantities and does not label stale preview numbers as six or invalidate the five-portion plan

#### Scenario: Invalid request or unknown recipe
- **WHEN** a preview request has an unsupported target or an unavailable recipe identity
- **THEN** the read fails with the documented validation/not-found result and no saved state or refresh job changes

### Requirement: Scale independently aligned ingredient amounts

A reliable structured amount SHALL scale only for its verified original ingredient line. Omitted or uncertain lines SHALL NOT invalidate independently verified amounts or shift quantities to another line. Ambiguous, stale or unbound amounts SHALL remain unresolved with original text available. Reads SHALL NOT invent quantities, parse arbitrary text numbers as authoritative amounts, call AI or repair saved data.

#### Scenario: Four-portion shells recipe with omitted seasonings
- **WHEN** verified original yield is four, retained/current lines agree, and structured amounts bind uniquely to 12 shells, 1 onion, 450 g beef and 500 ml marinara while salt and pepper lack reliable amounts
- **THEN** preview two shows 6 shells, 0.5 onion, 225 g beef and 250 ml marinara; preview four shows 12, 1, 450 g and 500 ml; preview six shows 18, 1.5, 675 g and 750 ml
- **AND** seasonings retain their original text and honest completeness state, other verified lines scale, and the recipe is not described as completely quantified

#### Scenario: Missing middle ingredient
- **WHEN** a lime line has no structured amount between verified garlic and honey, followed by known salmon and sesame amounts
- **THEN** garlic, honey, salmon and sesame retain their own amounts and scale independently; lime is not given honey's quantity

#### Scenario: Ambiguous duplicate or changed source
- **WHEN** an amount could belong to two same-named lines, the retained source differs from current ingredient text, or an old binding no longer matches
- **THEN** affected amounts are unresolved instead of guessed, and unrelated verified bindings remain usable

#### Scenario: Intentional unquantified text and packages
- **WHEN** an ingredient says salt to taste or oil for frying, or a verified quantity is two 400 g cans
- **THEN** the direction remains ordinary unquantified text and scaling changes the can count without multiplying its package size or instruction numbers

#### Scenario: Shared consumers and unknown basis
- **WHEN** the same aligned recipe/count is read through preview, proposed or assigned detail, cooking and grocery contribution
- **THEN** reliable numeric amounts and completeness agree across consumers before display rounding
- **AND** an unknown original yield prevents a scaling factor, offers original evidence/correction, and is never replaced by family size

### Requirement: Migrate usual portions without erasing human choices

Every existing positive saved usual count SHALL be preserved as explicit. Missing or null usual SHALL adopt automatic family count for editable current/future dates only. Migration SHALL preserve overrides and historical/prepared snapshots, including original-quantity snapshots. Settings SHALL distinguish automatic from explicit and acknowledge saves only after persistence. Unknown or zero family count SHALL not become an invented positive count.

#### Scenario: Upgrade with explicit and unset households
- **WHEN** one household has saved usual seven and another has no usual with four members
- **THEN** the first remains explicit seven and the second shows automatic four without storing four as a human choice
- **AND** existing historical original-quantity and prepared snapshots remain unchanged

#### Scenario: Empty or unavailable family roster
- **WHEN** an automatic household has zero members or its roster cannot be established
- **THEN** no fake one/four count is supplied; original quantities remain the honest unavailable fallback and Settings offers appropriate empty/retry feedback
- **AND** an existing explicit count remains usable independently of the roster

#### Scenario: Membership changes with inherited dates
- **WHEN** automatic usual changes from four to five following a confirmed membership addition
- **THEN** editable inherited dates and their quantity versions change together, affected groceries use the existing updating/failed/current journey, and overrides/prepared/history remain intact
- **AND** a draft based on the prior version cannot silently overwrite that change

#### Scenario: Existing null needs no historical backfill
- **WHEN** a past or prepared occurrence was recorded with original-quantity context before automatic fallback was introduced
- **THEN** reading or migrating it does not infer family size as its former cooking count

### Requirement: Recover Settings portions saves explicitly

Settings SHALL expose a labeled positive whole-number usual field and an explicit automatic-family option. Saving SHALL preserve concurrent changes through the existing conflict/reconciliation rules. Failure or uncertain acknowledgement SHALL retain the draft without claiming success or blindly replaying a write. Default changes SHALL retain ordinary quiet grocery freshness and warning semantics.

#### Scenario: Save explicit five then reopen
- **WHEN** a person saves five and receives confirmed persistence
- **THEN** Settings and inherited editable Planner dates show five, a fresh read agrees, and member changes do not alter it

#### Scenario: Save fails or competes with another update
- **WHEN** usual validation fails, another member changes the baseline, or persistence cannot be confirmed
- **THEN** a correctable/reviewable draft remains with explicit recovery and no false Saved or partially applied default
