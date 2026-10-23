# Spec Delta

## ADDED Requirements

### Requirement: Add a name-only extra to the current grocery week

The grocery view SHALL accept a trimmed nonblank extra name for the deployment-calendar current week. A successful add SHALL return and display one distinct unchecked extra with server-owned identity, `Extra` source label, default section, and current-week editability. Name SHALL be the only household-entered field.

#### Scenario: Add one extra
- **WHEN** a member adds `Coffee` while the current deployment week is displayed
- **THEN** one unchecked Coffee row marked `Extra` appears in its server-selected section for that week

#### Scenario: Blank name
- **WHEN** a member submits a name containing only whitespace
- **THEN** no extra is created and the composer remains available with validation guidance

#### Scenario: Add while another week is displayed
- **WHEN** the grocery view displays a past or future week
- **THEN** it does not offer creation for that displayed week

### Requirement: Keep repeated and recipe-matching extras distinct

Each accepted add SHALL create a distinct extra identity. Extras SHALL NOT merge with another extra or a recipe-derived row merely because their names or normalized names match. Each extra SHALL retain independent check, category, edit, and delete behavior.

#### Scenario: Extra matches recipe milk
- **WHEN** the week contains recipe-derived Milk and a member adds an extra named Milk
- **THEN** two rows remain visible and only the manual row carries the `Extra` source label and extra actions

#### Scenario: Add the same extra twice
- **WHEN** a member successfully adds Coffee twice using two distinct submissions
- **THEN** two independently actionable Coffee extras are present

#### Scenario: Retry the same accepted submission
- **WHEN** an add response is lost and the identical creation identity is submitted again
- **THEN** the server returns the already-created extra without creating another occurrence

### Requirement: Enter extras from a persistent bottom composer

The current-week grocery view SHALL keep a compact name composer at the bottom of the shopping surface above navigation and the device safe area, including when no rows exist. Successful submission SHALL clear the field, retain entry focus when practical, and keep the composer available for another item.

#### Scenario: Empty meal plan
- **WHEN** the current week has neither recipe-derived rows nor extras
- **THEN** the empty grocery surface still offers the bottom extra composer without requiring planning first

#### Scenario: Add several items
- **WHEN** a member successfully adds an extra from the composer
- **THEN** the new row appears, the entered name clears, and another name can be entered without reopening a form

#### Scenario: Add is pending
- **WHEN** an add request has not completed
- **THEN** the composer identifies the pending save and prevents replay of that same submission while leaving existing rows usable

#### Scenario: Add fails
- **WHEN** an add request fails without an authoritative created result
- **THEN** the entered name remains available with retryable failure guidance and no saved row is implied

### Requirement: Suggest previously used extra names without replacing free text

While the current-week extra composer is focused and contains at least two non-whitespace characters, the system SHALL offer at most three matching names drawn only from that household's prior extra occurrences. Recipe-derived ingredient names SHALL NOT become autocomplete candidates merely because they appear in a grocery list.

#### Scenario: Two characters match household history
- **WHEN** a member types `mi` and the household previously used Milk, Milk bags, and Almond milk as extras
- **THEN** the composer offers those names in deterministic prefix-then-recency order with no more than three results

#### Scenario: Fewer than two characters
- **WHEN** the trimmed composer value contains fewer than two characters
- **THEN** no autocomplete tray is shown and ordinary name entry remains available

### Requirement: Rank and suppress household extra suggestions deterministically

The suggestion service SHALL group historical names by normalized match key and use each group's most recent occurrence for display spelling and removal state. It SHALL omit removed candidates and names matching a currently outstanding extra, then rank prefix matches before substring matches and more recently used candidates before older candidates.

#### Scenario: Current outstanding name is suppressed
- **WHEN** current-week Milk remains outstanding and the member types a query that matches Milk
- **THEN** Milk is omitted from suggestions without preventing the member from typing and adding another distinct Milk extra manually

#### Scenario: Matching recipe row does not suppress a suggestion
- **WHEN** recipe-derived Milk is present, no Milk extra is currently outstanding, and household extra history contains Milk
- **THEN** Milk may be suggested and selecting it does not merge the eventual extra with the recipe row

#### Scenario: Most recent matching history was removed
- **WHEN** the most recent occurrence for a normalized matching name was explicitly removed
- **THEN** that name is absent from suggestions until a later successful add makes it recent again

### Requirement: Keep free-text add authoritative when suggestions are used or unavailable

Selecting a suggestion SHALL only replace the composer text and SHALL NOT create an occurrence. The member SHALL remain able to submit any nonblank free-text name, including a deliberate duplicate. A failed, cancelled, or stale suggestion lookup SHALL NOT block submission or replace newer input.

#### Scenario: Select a suggestion
- **WHEN** a member selects a suggested name
- **THEN** it replaces the composer text, retains entry focus, and creates no item until the member activates Add or submits the completed composer

#### Scenario: Suggestion lookup fails
- **WHEN** name suggestions cannot be loaded
- **THEN** the tray closes or remains absent, the typed name is preserved, and free-text submission remains available without presenting the add as failed

#### Scenario: Older lookup completes last
- **WHEN** a response for an earlier query arrives after the composer value has changed
- **THEN** that response is ignored and cannot replace suggestions for the current value

### Requirement: Present bottom-composer suggestions accessibly above the field

The suggestion tray SHALL attach to the current-week bottom composer and grow upward within the visible viewport so neither the input nor primary Add action is covered by the tray or on-screen keyboard. The tray SHALL use compact text rows rather than pills, horizontal chips, or a full-screen sheet. The input and tray SHALL expose the standard combobox/listbox relationship, result count, active option, and expanded state to assistive technology.

#### Scenario: Phone keyboard is open
- **WHEN** matching suggestions appear while the on-screen keyboard is visible
- **THEN** at most three suggestion rows appear immediately above the composer while the input and Add action remain visible and reachable

#### Scenario: Touch selection
- **WHEN** a member taps a suggestion with one hand
- **THEN** the suggestion fills the composer without moving focus away from the entry workflow or submitting it

#### Scenario: Keyboard selection
- **WHEN** a keyboard user moves through suggestions and presses Enter on an active option
- **THEN** that option fills the composer, a subsequent submit adds it, and pressing Enter with no active option submits the current free text

#### Scenario: Dismiss suggestions
- **WHEN** the member presses Escape, clears the text below the threshold, submits successfully, or leaves the composer
- **THEN** the suggestion tray closes without discarding unsaved text except after successful submission

### Requirement: Carry each outstanding extra through weekly snapshots

An unchecked extra SHALL occur in its creation week and in every later elapsed week through the deployment-calendar current week. Carry-forward SHALL preserve one read-only occurrence in each prior week and one editable occurrence in the current week, without manual transfer or early creation of an occurrence in an unelapsed future week.

#### Scenario: One rollover remains unchecked
- **WHEN** Coffee is added in week one, remains unchecked, and the deployment calendar reaches week two
- **THEN** week one retains its unchecked read-only Coffee snapshot and week two contains one editable unchecked Coffee occurrence

#### Scenario: Several rollovers are reconciled
- **WHEN** an unchecked extra was last materialized several Mondays before the current week
- **THEN** each elapsed intervening week has exactly one snapshot in that lineage and the current week has exactly one editable occurrence

#### Scenario: Browse immediately next week
- **WHEN** a member browses the immediately next week before rollover
- **THEN** no next-week occurrence is created merely to present the current outstanding extra for shopping

#### Scenario: Browse farther ahead
- **WHEN** a member browses a week later than the immediately next week
- **THEN** current extras are neither displayed nor materialized in that farther future week

#### Scenario: Meal plan changes
- **WHEN** meals are added, replaced, moved, removed, regenerated, or re-imported
- **THEN** extra occurrences and their history remain unchanged by recipe grocery recomputation

### Requirement: Stop carry-forward after current completion or deletion

Checking a current extra SHALL retain it as checked in that week and prevent a later occurrence while it remains checked. Deleting a current extra SHALL remove that occurrence from every shopping view presenting it and prevent later carry-forward. Neither action SHALL rewrite earlier-week snapshots.

#### Scenario: Checked before rollover
- **WHEN** Coffee is checked in the current week before the next Monday
- **THEN** it remains checked in that week and no Coffee successor is carried into the new current week

#### Scenario: Check then uncheck before rollover
- **WHEN** a current extra is checked and then unchecked before rollover
- **THEN** its current occurrence is unchecked and remains eligible for the next carry-forward

#### Scenario: Delete a carried occurrence
- **WHEN** a current occurrence carried from an earlier week is deleted
- **THEN** it disappears from the current week, no later occurrence is created, and its earlier snapshots remain visible

### Requirement: Include current outstanding extras when shopping immediately next week

Before rollover, the immediately next week's grocery view SHALL show its recipe-derived rows together with visible unchecked current-week extras. Those extras SHALL retain their current occurrence identity and ordinary `Extra` source label without an added week label. Checked or removed current extras and extras from any other week SHALL be absent.

#### Scenario: Shop next week's suppers on Saturday
- **WHEN** a member opens the immediately next week's grocery view while current-week Toilet paper remains unchecked
- **THEN** next week's supper groceries and the editable Toilet paper extra appear together without creating a next-week Toilet paper occurrence

#### Scenario: Check while viewing next week
- **WHEN** the member checks that Toilet paper extra before rollover
- **THEN** the current-week occurrence becomes checked, disappears from the next-week shopping view, remains checked in current-week history, and does not carry forward

#### Scenario: Current extra is edited from next-week view
- **WHEN** a current extra is renamed, recategorized, or deleted while the immediately next week is displayed
- **THEN** the action targets the current occurrence and preserves all earlier snapshots

#### Scenario: No additional week label
- **WHEN** a current outstanding extra is presented with immediately-next-week groceries
- **THEN** it uses the ordinary compact `Extra` source label without `This week` or another week-origin label

### Requirement: Identify extras with a compact text source label

Every visible extra SHALL show the word `Extra` as compact, non-interactive accent-colored text adjacent to its item name. The source label SHALL use the existing Solar Earth ochre highlight family with sufficient contrast on the actual grocery-row surface. It SHALL NOT add a pill background, border, icon, icon-only substitute, hover treatment, or week-origin wording. The visible word SHALL carry the meaning so color is not the sole identifier.

#### Scenario: Extra appears in a compact grocery row
- **WHEN** an extra row is shown in a current, immediately-next-week, or historical grocery view
- **THEN** `Extra` appears as compact accent-colored text beside the item name without adding a pill or action-like control

#### Scenario: Item name needs more room
- **WHEN** the item name and source label do not fit on one line
- **THEN** the source label may wrap with the name without reducing the tag or edit controls below their supported touch targets

#### Scenario: Checked or historical extra
- **WHEN** an extra is checked or displayed as read-only history
- **THEN** its text source label remains legible and continues to identify the row as an extra

### Requirement: Make historical extra occurrences read-only

An extra occurrence for a week earlier than the deployment-calendar current week SHALL expose its snapshotted name, category, and checked state as shopping history, without controls that check, uncheck, rename, recategorize, or delete it. Recipe-derived rows in past weeks SHALL retain their existing interaction behavior.

#### Scenario: View an earlier extra
- **WHEN** a member opens a past week containing an extra snapshot
- **THEN** the row is visible as an extra without checkbox, tag-change, edit, or delete actions

#### Scenario: Recall whether an item was bought
- **WHEN** a member opens last week's grocery view to check whether Toilet paper was purchased
- **THEN** its historical extra row visibly retains the checked or unchecked state recorded for that week

#### Scenario: Past recipe grocery remains interactive
- **WHEN** that past week also contains a recipe-derived grocery row
- **THEN** the recipe-derived row retains the previously supported grocery interactions

### Requirement: Check an extra by stable identity

Activating an editable extra checkbox SHALL optimistically invert only that occurrence and submit its identity, intended checked value, week identity, and concurrency version. Success SHALL retain the state; a rejection SHALL restore the authoritative state and show a retryable item error.

#### Scenario: Check one duplicate
- **WHEN** two current extras share the name Coffee and one is checked successfully
- **THEN** only the selected extra becomes checked

#### Scenario: Check request rejects
- **WHEN** a current extra is optimistically checked and the request rejects
- **THEN** that row returns to its authoritative state with retry guidance while unrelated rows remain usable

#### Scenario: Stale version
- **WHEN** an extra was changed by another household member before a check using an older version arrives
- **THEN** the stale mutation is not applied and the caller receives authoritative current state for reconciliation

### Requirement: Rename the current extra inline

Activating an editable extra's edit icon SHALL replace that row's name display with an inline name editor and save/cancel/delete actions. A successful nonblank rename SHALL preserve that occurrence's identity, category, and checked state and SHALL affect only that week and later carry-forward.

#### Scenario: Rename current occurrence
- **WHEN** a member renames current-week Milk to Oat milk and saves
- **THEN** that row keeps its identity, category, and checked state while displaying Oat milk

#### Scenario: Earlier snapshot retains its name
- **WHEN** a carried Milk occurrence is renamed Oat milk in the current week
- **THEN** earlier weeks continue to display Milk and a later successor inherits Oat milk

#### Scenario: Cancel rename
- **WHEN** a member cancels inline editing
- **THEN** the prior name remains and no rename request is submitted

#### Scenario: Rename fails
- **WHEN** an inline rename is rejected
- **THEN** the authoritative name remains available in the row with retryable guidance and no saved rename is implied

### Requirement: Recategorize only the selected extra occurrence

The existing tag interaction SHALL let a member change an editable extra's section by stable identity. A successful change SHALL preserve its name and check state, affect later carry-forward, and leave matching extras, recipe-derived rows, global ingredient-category rules, and earlier snapshots unchanged.

#### Scenario: Change an extra category
- **WHEN** a member moves an extra named Batteries from Grocery to Pantry through its tag control
- **THEN** only that extra occurrence moves section and a later successor inherits Pantry

#### Scenario: Matching recipe row
- **WHEN** a recipe-derived Milk row and an extra Milk row coexist and the extra is recategorized
- **THEN** the recipe-derived Milk category and ingredient-category rule remain unchanged

#### Scenario: Category save fails
- **WHEN** an extra category change rejects
- **THEN** the extra retains its authoritative section with retryable per-item feedback

### Requirement: Delete the current extra optimistically

Activating Delete in an editable extra's inline controls SHALL immediately remove that row from the displayed shopping view and submit deletion of its current occurrence by stable identity, occurrence week, and version. A failed or stale deletion SHALL restore authoritative state with retryable feedback; a successful deletion SHALL not imply removal from historical weeks.

#### Scenario: Delete succeeds
- **WHEN** a member deletes a mistaken current extra and the request succeeds
- **THEN** the row remains absent from the current week and does not carry forward

#### Scenario: Delete fails
- **WHEN** an optimistically removed extra cannot be deleted
- **THEN** the authoritative row returns to its section with clear retryable failure feedback

#### Scenario: Delete after another update
- **WHEN** deletion uses a stale version after another member changed the extra
- **THEN** the newer authoritative row is restored rather than silently deleting that update

### Requirement: Return extras with the selected weekly grocery view

A successful grocery-bearing schedule read SHALL return recipe-derived lines for the requested absolute week and the extra occurrences eligible for that shopping view. Extra rows SHALL identify their own absolute occurrence week, source, stable occurrence, checked state, concurrency version, and whether current-week mutation is allowed.

#### Scenario: Mixed grocery list
- **WHEN** a requested week contains recipe-derived tomatoes and two extras
- **THEN** the response preserves all three rows with enough identity to check each supported row correctly

#### Scenario: Historical extra
- **WHEN** a requested past week contains an extra snapshot
- **THEN** its returned representation marks it as read-only

#### Scenario: Immediately-next-week shopping extras
- **WHEN** the requested week is the immediately next week
- **THEN** its response includes visible unchecked current-week extras with their current occurrence week and editable state

#### Scenario: No recipe groceries
- **WHEN** a week contains extras but no recipe-derived lines
- **THEN** the grocery view shows the extras rather than the no-items planning-only state

### Requirement: Reconcile extra mutations against absolute week and version

An extra mutation response or household update SHALL affect a loaded row only when occurrence identity and the row's absolute occurrence week match and its version is not older than loaded state. The selected grocery week MAY differ when it is the immediately next week. Missing or conflicting identity SHALL trigger authoritative refresh rather than name-based guessing.

#### Scenario: Navigate during rename
- **WHEN** a rename response arrives after the member navigates to another week
- **THEN** it updates only the matching occurrence if that view is eligible to present it and does not rename a same-name row by inference

#### Scenario: Older household update
- **WHEN** a loaded extra has version five and a household update supplies version four
- **THEN** version five remains displayed

#### Scenario: Uncertain mutation outcome
- **WHEN** a mutation response is lost after the server may have committed it
- **THEN** the client rereads authoritative week state before offering a retry that could repeat the action

### Requirement: Keep extra controls accessible and interruption-safe

The composer combobox, suggestion options, checkbox, tag button, edit icon, inline editor, save, cancel, and delete controls SHALL have accessible names, keyboard operation, visible focus, and stable touch targets where they are interactive. Pending and error state SHALL not move the primary controls or rely on color alone.

#### Scenario: Keyboard add and edit
- **WHEN** a keyboard user enters a name, adds it, opens inline edit, renames it, and saves
- **THEN** each action is reachable in a logical focus order with its purpose and state announced

#### Scenario: Return after interruption
- **WHEN** the document becomes visible after an add or edit was left pending
- **THEN** the visible row or composer still communicates whether the action is pending, saved, or failed and exposes the appropriate next action

## MODIFIED Requirements

### Requirement: Use display name as the shared check identity

Recipe-derived grocery rows SHALL read and toggle checks by displayName within the loaded map. Recipe-derived rows sharing that display name SHALL share their checked state even when normalized keys or unit buckets differ. Extra rows SHALL use their stable occurrence identity instead, and all rendered rows SHALL retain their supplied cardinality.

#### Scenario: Duplicate names
- **WHEN** three recipe-derived Eau rows have different unit buckets and one is checked
- **THEN** all three show checked while three rows remain

#### Scenario: Uncheck duplicate
- **WHEN** one checked recipe-derived Eau row is unchecked
- **THEN** all recipe-derived rows sharing Eau show unchecked without deleting a row

#### Scenario: Extra shares the display name
- **WHEN** a recipe-derived Eau row and an extra Eau row coexist and the extra is checked
- **THEN** the recipe-derived Eau check map is unchanged

### Requirement: Initialize an empty loaded check map from displayed names

When recipe-derived rows exist and the loaded check map has no keys, the grocery view SHALL initialize their display names as unchecked. A nonempty map SHALL be retained; a missing recipe-derived key SHALL display as unchecked. Extra checked state SHALL come from each extra occurrence and SHALL NOT be added to the display-name map.

#### Scenario: Empty map
- **WHEN** recipe-derived rows first render with an empty check map
- **THEN** their display names initialize to false

#### Scenario: Existing map
- **WHEN** the map contains Tomato true but lacks Lettuce
- **THEN** Tomato stays checked and Lettuce displays unchecked

#### Scenario: Extra row
- **WHEN** an extra Coffee row renders beside recipe-derived rows
- **THEN** Coffee's occurrence checked state is used without creating a Coffee key in the recipe check map

### Requirement: Submit one optimistic grocery check at a time

A recipe-derived row activation SHALL immediately invert its local display-name check and submit only ingredientName and checked to the initiating week's item PATCH. Successful completion SHALL retain that optimistic check. Recipe-derived checkboxes SHALL expose aria-checked and support click, Enter and Space activation; extras SHALL use their identity-specific check requirement.

#### Scenario: Check succeeds
- **WHEN** recipe-derived Tomato is unchecked and its activation request succeeds
- **THEN** Tomato becomes checked and the body contains ingredientName Tomato and checked true

#### Scenario: Uncheck succeeds
- **WHEN** recipe-derived Tomato is checked and its activation request succeeds
- **THEN** Tomato becomes unchecked with checked false

### Requirement: Show the grocery empty state for no loaded lines

When no recipe-derived or extra rows are grouped for display, the checklist SHALL show empty-list guidance and the current-week bottom extra composer. Where a close callback exists, Start Planning SHALL return through that callback. The composer SHALL remain independent of planning guidance.

#### Scenario: Empty list
- **WHEN** the current grocery view has no loaded recipe-derived or extra rows
- **THEN** empty-list guidance and the extra composer are displayed

#### Scenario: Start planning
- **WHEN** Start Planning is available and activated
- **THEN** the view invokes its return-to-planner callback

#### Scenario: Add without planning
- **WHEN** the current week is empty and a member adds an extra successfully
- **THEN** the extra appears without requiring Start Planning or a supper assignment
