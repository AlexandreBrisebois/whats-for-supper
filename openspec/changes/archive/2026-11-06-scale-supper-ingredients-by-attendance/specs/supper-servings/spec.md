## Purpose

Let households set how many portions to prepare on each date, including leftovers, and derive consistent ingredient quantities for planning, shopping and cooking without rewriting their saved recipes.

## ADDED Requirements

### Requirement: Distinguish recipe basis from dated portions

Saved recipe servings SHALL remain the positive serving basis of its stored ingredient amounts. Household default and date overrides SHALL represent total portions to prepare, including leftovers, not people or profile count. No separate extra-portions field SHALL be introduced. Effective counts SHALL be whole integers from one through the supported integer range. Existing non-cooking plans SHALL represent nights away; setting a count SHALL NOT assign, remove, complete or change a supper plan.

#### Scenario: Six portions from a two-serving recipe
- **WHEN** Wednesday's effective count is six and its recipe's saved basis is two
- **THEN** six is the dated target and two remains the recipe basis without rewriting original quantities

#### Scenario: Include leftovers in one number
- **WHEN** four people want supper and two portions for later
- **THEN** setting six portions supplies the entire target without separate people or leftovers controls

#### Scenario: Invalid count or night away
- **WHEN** zero, a negative, fractional, nonnumeric or out-of-range count is submitted
- **THEN** validation rejects it without changing any saved count or meal and the UI retains a correctable draft
- **AND** existing non-cooking choices remain available for a night away

### Requirement: Apply an explicit household default with dated exceptions

An explicitly configured household default SHALL supply current/future dates without overrides. Each date SHALL support a saved override and an explicit reset to the default, including when no recipe is assigned. Changing the default SHALL preserve overrides and past/Cooked serving snapshots. Before a default or override is configured, existing recipe quantities SHALL remain unscaled rather than assuming a household count.

#### Scenario: Change the usual portion count
- **WHEN** the default changes from four to five and future Wednesday has override six
- **THEN** future inherited days use five, Wednesday retains six and past/Cooked snapshots do not change through this operation

#### Scenario: Set portions before choosing food
- **WHEN** an empty future Saturday receives override six and later receives a recipe
- **THEN** the date retains six and its new recipe uses that count

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

Proposed-date detail, saved dated detail, dated cooking and groceries SHALL use the same server-owned rules and dated portions. No standalone quantity calculator SHALL be offered. Proposed-date reads SHALL not assign a meal or save portions. Saved-occurrence reads SHALL resolve the selected recipe against its absolute supper date; stale identity SHALL return conflict rather than another date's quantities. Without scaling context, legacy recipe reads SHALL remain compatible.

#### Scenario: Plan and cook for six
- **WHEN** a recipe with basis two and 200 g pasta is planned for six
- **THEN** dated detail and cooking show 600 g and that occurrence contributes 600 g to groceries

#### Scenario: Proposed date before assignment
- **WHEN** an unassigned recipe is considered for a date configured for four
- **THEN** it uses four portions without requiring that recipe to occupy the date and without changing the plan or portions

#### Scenario: No selected or proposed date
- **WHEN** recipe reading has no planning or saved-occurrence context
- **THEN** it shows original quantities and no independent portion adjustment

### Requirement: Save table edits as a bounded conflict-checked batch

Done SHALL submit the changed default/dated overrides together against captured absolute dates and serving-state version. Validation or stale-version conflict SHALL apply none of that batch and retain drafts with visible recovery. Counts in a successfully committed batch SHALL become visible together. Empty days SHALL not require creating recipe-backed calendar entries. Pending duplicate submissions SHALL be suppressed.

#### Scenario: Another member edits portions
- **WHEN** another member changes the relevant serving state after the editor's baseline read
- **THEN** Done reports conflict without overwriting that change or discarding local drafts

#### Scenario: Cancel or invalid row
- **WHEN** Cancel is activated or one row is invalid
- **THEN** Cancel submits no mutation, and invalid Done applies no row/default from that batch

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

Explicit preparation SHALL freeze the occurrence's effective portions or its unconfigured original-basis context. Later usual-portion changes SHALL not rescale that prepared meal. Prepared dates SHALL be read-only in At the table. No separate leftovers amount SHALL travel with a meal; unprepared movement continues to use the destination date's portions.

#### Scenario: Default changes after preparation
- **WHEN** Friday lasagna was prepared Tuesday for six and the household default later changes to four
- **THEN** Friday retains six prepared portions and its ingredient/grocery contribution is not reduced by that default edit

### Requirement: Resume grocery updating after interruption

A committed portions save SHALL retain durable pending refresh state until groceries reflect the saved inputs. Background interruption SHALL not lose that obligation. Restart or explicit Retry SHALL derive from current saved portions, preserve later checks and avoid replaying the count save. Pending or failed refresh SHALL remain visible when groceries are opened.

#### Scenario: Worker stops after portion acknowledgement
- **WHEN** Done confirms the portions save and the background worker stops before recomputation
- **THEN** saved portions remain available, groceries are identified as updating or needing retry, and resumed work produces current totals without another portions write
