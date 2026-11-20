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

Settings SHALL configure usual portions. Explicit counts SHALL persist until changed or reset to automatic; otherwise positive family size supplies usual. Current/future uncompleted dates inherit usual unless overridden. Default/member changes SHALL preserve overrides and past/Cooked/prepared snapshots. A deliberate correction of today's Cooked supper without a preparation receipt SHALL follow the current-day correction requirement; explicit preparation remains protected.

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

With positive recipe basis B and target T, each proportional exact scalar or range endpoint Q SHALL scale from its original saved amount as Q * T / B before display rounding and weekly aggregation, while fixed facts, package capacities, names, notes and unrelated step numbers remain unscaled. Cooking and recipe detail (preview and dated) SHALL project step quantities only via validated `instructionProjection` allocations, hiding the original-quantities notice when present.

#### Scenario: Double then triple a recipe
- **WHEN** a two-serving recipe contains 200 g pasta and is viewed for four, then six
- **THEN** projections show 400 g, then 600 g, while the saved amount remains 200 g

#### Scenario: Package quantity
- **WHEN** a usable structured ingredient represents two cans with a descriptive 400 g package size and the multiplier is three
- **THEN** the count becomes six cans and the descriptive 400 g size remains unchanged

#### Scenario: Original exact fractions and fixed values
- **WHEN** an original 1/3-cup proportional ingredient is repeatedly projected and an explicit fixed quantity is present
- **THEN** calculation always starts from exact original facts and the fixed quantity does not change

#### Scenario: Recipe detail projects validated step quantities in preview and dated contexts
- **WHEN** `RecipeDetailSheet` renders a 2/4/6 preview or a proposed/assigned dated context whose projection includes `instructionProjection`
- **THEN** the Instructions section renders the projected `instructionProjection` step quantities while preserving section headings, fixed metrics and uncertain or unquantified spans in their original wording, hides the original-quantities instruction limitation notice whenever `instructionProjection` is present, and restores original instruction wording when viewing original recipe quantities

### Requirement: Report incomplete scaling without invented quantities

Authoritative projections SHALL read structured canonical ingredient lines exclusively, keeping missing basis and unreliable amounts truthful without invented quantities or complete partial totals, and failing closed when populated recipes lack canonical content. Recipe detail SHALL retain original text and missing-basis correction without generic review warnings. Intentional unquantified directions remain normal text; reads SHALL NOT call AI.

#### Scenario: Salt to taste is normal recipe content
- **WHEN** an ingredient says salt to taste or oil for frying
- **THEN** its original direction remains normal text without a correction warning or invented number

#### Scenario: Yield is missing
- **WHEN** a dated recipe has no reliable original serving basis
- **THEN** original quantities remain visible and no complete scaled amount is claimed; recipe detail offers Set recipe portions with its saved-change explanation in the editor, while other consumers retain their existing correction/original feedback

#### Scenario: Ingredient text was edited independently
- **WHEN** saved canonical ingredient lines were edited independently of retained raw metadata supply
- **THEN** projections read only the saved canonical ingredient lines without consulting retained supply or deriving a `stale_source` fallback, and recipe detail retains current canonical text without a generic review warning or replacement cue

#### Scenario: Populated recipe without structured canonical content fails closed
- **WHEN** a projection or weekly grocery derivation reads an unready empty capture placeholder with no canonical or legacy ingredient content, or reads a populated recipe lacking structured v2 canonical content
- **THEN** the empty capture placeholder projects zero lines without error, whereas the populated non-canonical recipe fails closed instead of scraping legacy `ingredients` strings, binding `rawMetadata.supply`, or silently returning an empty list

#### Scenario: Remove generic detail review without changing completeness
- **WHEN** a recipe-detail preview has usable numeric lines and unreliable lines
- **THEN** verified lines scale and other lines retain original text, with no generic amounts-review row, reserved warning space, icon, badge, tooltip or color substitute
- **AND** authoritative partial/completeness data and grocery known-subtotal semantics remain honest under the dependable-check contract, without prior-unknown check warnings; no all-amounts-adjusted claim is added

### Requirement: Share one authoritative projection across consumers

Home dated ingredients, proposed/assigned detail, cooking and groceries SHALL share canonical original facts and server-owned dated scaling. Temporary previews use that owner with an independent count. Assigned reads reject stale occurrence identity; original reads remain compatible through the common adapter. Reads SHALL NOT assign, save portions, call providers or materialize preparation.

#### Scenario: Plan and cook for six
- **WHEN** a recipe with basis two and 200 g pasta is planned for six
- **THEN** dated detail and cooking show 600 g and its grocery contribution is 600 g

#### Scenario: Proposed date before assignment
- **WHEN** an unassigned candidate is read for a date configured for four
- **THEN** its default dated projection uses four without requiring assignment or changing saved state

#### Scenario: No selected or proposed date
- **WHEN** recipe reading has no date context
- **THEN** its default is original quantities and an explicitly selected 2/4/6 preview remains a separate read-only projection

#### Scenario: Converted and edited canonical record
- **WHEN** a canonical content revision replaces legacy live supply reads
- **THEN** all quantity consumers use that revision and its original amounts, with grocery normalization/aggregation after projection rather than another recipe ingredient parser

#### Scenario: Home ingredients and dated Cook agree
- **WHEN** Home Tonight and Cook refer to the same captured assigned recipe, date and effective portions
- **THEN** Home uses the shared dated projection with the same reliable amounts and completeness before display rounding, including frozen prepared portions
- **AND** late results from an earlier recipe/date/occurrence cannot replace the current list; pending, failure or changed-plan state is explicit rather than labeling original strings as scaled
- **AND** opening the ingredient list performs no assignment, portions, grocery, preparation or completion write

### Requirement: Save table edits as a bounded conflict-checked batch

Planner Done SHALL submit the changed dated overrides together against captured absolute dates and serving-state version. Usual-portion configuration SHALL remain owned by Settings. Validation or stale-version conflict SHALL apply none of that batch and retain drafts with visible recovery. Counts in a successfully committed batch SHALL become visible together. Empty days SHALL not require creating recipe-backed calendar entries. Pending duplicate submissions SHALL be suppressed.

#### Scenario: Another member edits portions
- **WHEN** another member changes the relevant serving state after the editor's baseline read
- **THEN** Done reports conflict without overwriting that change or discarding local drafts

#### Scenario: Cancel or invalid row
- **WHEN** Cancel is activated or one row is invalid
- **THEN** Cancel submits no mutation, and invalid Done applies no dated override from that batch

### Requirement: Separate saved counts from grocery refresh completion

Committed portions SHALL remain saved if grocery refresh fails; confirmed persistence returns to Recipes while groceries update. Grocery status SHALL distinguish updating, updated (auto-clearing on grocery interaction), and Era 3 Hearth Retry failure without replaying writes or re-unchecking unchanged items; unknown replies SHALL read saved portions first.

#### Scenario: Reply lost after commit
- **WHEN** Done's reply is lost after serving state commits
- **THEN** the editor automatically checks saved state, recognises its confirmed result when possible and avoids a duplicate write

#### Scenario: Groceries cannot refresh
- **WHEN** counts commit but grocery follow-up fails
- **THEN** the editor returns to Recipes with saved portions and visible grocery retry feedback; entering groceries displays an Era 3 Hearth alert with an accessible Retry `<Button>` rather than presenting stale amounts as current

#### Scenario: Save finishes before grocery work
- **WHEN** portion persistence is acknowledged while recomputation remains pending
- **THEN** Done returns to Recipes and entering groceries shows an Era 3 updating status notice (`Updating your shopping list…`) until current data is available

#### Scenario: Updated shopping list notice clears automatically on grocery interaction
- **WHEN** refreshed groceries display the calm Garden `Shopping list updated` notice and the person interacts with a grocery item, extra, or aisle control
- **THEN** the notice clears automatically without requiring a manual dismiss tap while retaining a `>= 48 CSS px` close control for assistive or explicit dismissal

### Requirement: Preserve confirmed prepared portions

Explicit preparation SHALL freeze the occurrence's effective portions or its unconfigured original-basis context. Later usual-portion changes SHALL not rescale that prepared meal. Prepared dates SHALL be read-only in Portions. No separate leftovers amount SHALL travel with a meal; unprepared movement continues to use the destination date's portions.

#### Scenario: Default changes after preparation
- **WHEN** Friday lasagna was prepared Tuesday for six and the household default later changes to four
- **THEN** Friday retains six prepared portions and its ingredient/grocery contribution is not reduced by that default edit

#### Scenario: Read current recipe after preparation
- **WHEN** a meal prepared for six is consulted after recipe content or basis changes
- **THEN** ingredients and eligible steps use the current recipe at recorded six, without changing that count, actual preparation date or occurrence/history
- **AND** no historical recipe snapshot is implied; recorded original-context preparation without a count stays unknown/original rather than gaining a count

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
- **THEN** the response exposes the unresolved condition without an invented factor or complete total; recipe detail offers missing-basis correction when applicable and retains unreliable lines verbatim without generic review warnings or replacement cues
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

Known canonical amounts SHALL scale only for their stable original-basis line identities. Missing/uncertain lines do not invalidate other known lines. Legacy name/source matching is a conservative conversion/import boundary, not a second live quantity owner. Unknown/conflicting facts retain text. Reads SHALL NOT guess text numbers, call AI or repair saved data.

#### Scenario: Four-portion shells recipe with omitted seasonings
- **WHEN** original yield is four and canonical lines converted from coherent unambiguous source facts retain 12 shells, 1 onion, 450 g beef and 500 ml marinara while salt and pepper lack reliable amounts
- **THEN** preview two shows 6 shells, 0.5 onion, 225 g beef and 250 ml marinara; preview four shows 12, 1, 450 g and 500 ml; preview six shows 18, 1.5, 675 g and 750 ml
- **AND** seasonings retain their original text and honest completeness state, other verified lines scale, and the recipe is not described as completely quantified

#### Scenario: Missing middle ingredient
- **WHEN** a lime line has no structured amount between verified garlic and honey, followed by known salmon and sesame amounts
- **THEN** garlic, honey, salmon and sesame retain their own amounts and scale independently; lime is not given honey's quantity

#### Scenario: Ambiguous duplicate or changed source
- **WHEN** legacy conversion cannot associate an amount unambiguously, source/current strings conflict or an association has become invalid without an explicit accepted correction
- **THEN** affected amounts are unresolved instead of guessed, and unrelated verified bindings remain usable

#### Scenario: Intentional unquantified text and packages
- **WHEN** an ingredient says salt to taste or oil for frying, or a verified quantity is two 400 g cans
- **THEN** the direction remains ordinary unquantified text and scaling changes the can count without multiplying its package size or instruction numbers

#### Scenario: Legacy garlic count exposes a placeholder unit when scaled
- **WHEN** original wording is `2 Gousses d'ail`, basis is two, and coherently associated legacy supply records amount 2, name `Gousses d'ail` and the generic placeholder unit `unit`
- **THEN** detail at four portions displays `4 Gousses d'ail`, never `4 unit Gousses d'ail`; returning to original displays `2 Gousses d'ail`
- **AND** the equivalent canonical amount-2, null-unit count has the same display, while genuine measurement units remain visible
- **AND** preview/read does not rewrite saved ingredients, units, extraction evidence or revisions, perform implicit conversion, or call a provider
- **AND** grocery demand includes each recipe contribution once; a companion recipe recorded with unit `Gousses` remains conservatively separate unless equivalence is independently established, rather than merging because detail suppresses the placeholder
- **AND** this display regression does not authorize generic count conversion, bilingual garlic/ail merging or bulk repair of existing recipes

#### Scenario: Shared consumers and unknown basis
- **WHEN** the same aligned recipe/count is read through preview, proposed or assigned detail, cooking and grocery contribution
- **THEN** reliable numeric amounts and completeness agree across consumers before display rounding
- **AND** an unknown original yield prevents a scaling factor, offers original evidence/correction, and is never replaced by family size

#### Scenario: Explicit canonical identities distinguish duplicate names
- **WHEN** distinct canonical lines have the same descriptive name but their own accepted amounts and stable identities
- **THEN** scaling retains each association without re-matching names or inventing identity from grocery grouping keys

#### Scenario: Valid unquantified lines and correction flags
- **WHEN** a canonical collection includes legitimate unquantified directions beside numeric amounts
- **THEN** the directions remain ordinary text without a correction flag solely for missing numbers; technical completeness and saved household report membership retain their separate meanings

### Requirement: Migrate usual portions without erasing human choices

Every existing positive saved usual count SHALL be preserved as explicit. Missing or null usual SHALL adopt automatic family count for uncompleted current/future dates only. Migration SHALL preserve overrides and historical/prepared snapshots, including original-quantity snapshots. Settings SHALL distinguish automatic from explicit and acknowledge saves only after persistence. Unknown or zero family count SHALL not become an invented positive count.

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

#### Scenario: Migration does not correct a completed current date
- **WHEN** today's supper is Cooked without a preparation receipt and the household default or member count changes
- **THEN** its saved portion snapshot remains unchanged unless a person deliberately saves a dated correction

### Requirement: Recover Settings portions saves explicitly

Settings SHALL expose a labeled positive whole-number usual field and automatic-family toggle. Saving SHALL preserve concurrent changes cleanly: on conflict or uncertain acknowledgement, Settings SHALL automatically read current saved portions, keep the user's draft intact without claiming success, show the updated saved baseline inline without a manual Review gate, and keep ordinary grocery freshness semantics.

#### Scenario: Save explicit five then reopen
- **WHEN** a person saves five and receives confirmed persistence
- **THEN** Settings and inherited editable Planner dates show five, a fresh read agrees, and member changes do not alter it

#### Scenario: Save fails or competes with another update
- **WHEN** usual validation fails, another member changes the baseline, or persistence cannot be confirmed
- **THEN** Settings automatically reads current saved portions (offering a single Era 3 `Retry portions` `<Button>` only if that read fails) and displays the updated baseline inline inside a Hearth recovery card without a separate `Review current portions` gate so a valid draft can save directly via `Save usual portions`

### Requirement: Correct portions of the current cooked supper explicitly

Deployment-local today's Cooked supper without an explicit preparation receipt SHALL permit a dated portions correction. Saving SHALL preserve recipe/occurrence, Cooked status and cooking history and use existing batch/version/recovery rules. Past dates, future Cooked dates, non-cooking plans and explicit preparations SHALL remain read-only. Default/member changes SHALL not apply this exception.

#### Scenario: Correct the observed five-portion current supper
- **WHEN** today is November 6, its supper is Cooked without a preparation receipt and saved portions five are explicitly changed to six and saved
- **THEN** a fresh read and assigned ingredient projection use six, while its recipe/occurrence, status, cooking history and usual setting remain unchanged
- **AND** no preparation receipt or actual preparation date is invented

#### Scenario: Ordinary today remains editable
- **WHEN** the deployment's today is empty or has an unprepared Planned or Locked supper
- **THEN** existing dated editing remains available, without requiring it to become tomorrow first

#### Scenario: Retain historical and explicitly prepared protection
- **WHEN** a date is past, a Cooked date is future, a non-cooking plan applies, or an explicit preparation receipt exists even on today
- **THEN** portions remain read-only and attempted date edits apply none of their batch

#### Scenario: Version changes during correction
- **WHEN** another member changes portions, replaces the occurrence or records explicit preparation after the editor's baseline read
- **THEN** existing guarded save/reconciliation rules prevent a stale correction from overwriting the changed state and retain a reviewable draft

#### Scenario: Deployment day rolls over before save
- **WHEN** a correction captures today's absolute date and the deployment advances to the next day before submission
- **THEN** the now-past date is rejected without applying any batch row, and the draft is retained for clear review rather than moved to the new today
- **AND** browser timezone or a captured reference week cannot bypass this cutoff

#### Scenario: Reset today's cooked correction to usual
- **WHEN** the current Cooked supper has no preparation receipt, usual is four and its five-portion override is reset and saved
- **THEN** the override is removed and four is captured for that completed date; a later usual/member change does not rescale it
- **AND** returning without edits preserves five and an unavailable usual supplies no invented reset number

#### Scenario: Saved correction updates groceries
- **WHEN** today's cooked count correction commits and changes a reliable weekly grocery requirement
- **THEN** the existing updating/current/failed grocery journey and increased-needs check policy apply to the corrected quantities
- **AND** an increase can uncheck that affected item, while unchanged/decreased requirements and unrelated checks retain their existing policy

#### Scenario: Correction acknowledgement or grocery follow-up is uncertain
- **WHEN** the save reply is lost or grocery work fails after a committed correction
- **THEN** authoritative portion reconciliation and grocery retry recover the saved correction without blindly repeating it, reopening cooking or recording history again

### Requirement: Preserve the saved baseline while correcting inherited Cooked portions

Today's editable Cooked supper without preparation SHALL display its saved effective count until edited. A deliberate different numeric count or existing reset SHALL persist its intended count even when the saved override is absent. Existing control visibility, copy, layout, date/preparation protections and grocery policy SHALL remain unchanged.

#### Scenario: Open a frozen inherited count
- **WHEN** today's Cooked supper has inherited five, no override or preparation, and current usual four
- **THEN** opening Portions shows five and leaving without edits writes nothing

#### Scenario: Correct to the current usual number
- **WHEN** that saved five is deliberately changed to four and saved
- **THEN** a fresh read returns four and existing ingredient/grocery consumers use four

#### Scenario: Existing reset after an intervening draft
- **WHEN** that saved five is changed to six, then the existing reset to usual four is selected and saved
- **THEN** four is persisted without an override and later usual changes preserve the completed count

#### Scenario: Preserve normal corrections and protections
- **WHEN** an explicit five is edited or reset, or a past, future Cooked, non-cooking or explicitly prepared date is inspected
- **THEN** ordinary editing/reset and existing read-only protections remain intact
