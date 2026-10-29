# Spec Delta

## ADDED Requirements

### Requirement: Retire separate GOTO management without losing saved work

Users SHALL manage Go-To membership through recipe stars. Browse and Search SHALL NOT expose separate management, pending-management lists or Add a Go-To acquisition. Search SHALL retain its Go-To filter and Settings SHALL keep management absent. Retirement SHALL NOT delete recipes, memberships or accepted background work, or change backend membership filtering.

#### Scenario: Existing saved membership
- **WHEN** a household opens Browse, Search or recipe detail after management retirement
- **THEN** saved Go-To membership remains available to filtering and recipe stars, with no management disclosure or acquisition entry

#### Scenario: Legacy management URL
- **WHEN** `/browse-all-stack?gotoOnly=true&manageGoto=true` opens
- **THEN** normal GOTO-filtered Browse opens with the star pressed and no management/flyout
- **AND** an empty result offers Clear Go-To without mutating membership or assigning a meal

#### Scenario: Fresh legacy capture entry
- **WHEN** a newly loaded legacy capture URL contains intent=goto and a description or photo mode
- **THEN** ordinary recipe capture opens in that mode without automatic Go-To registration or creation on navigation
- **AND** adding/removing Go-To membership remains a recipe-star action

### Requirement: Explain GOTO selection on the ordinary empty Home pivot

Only the settled ordinary empty pivot without a represented Go-To or saved non-cooking context SHALL show the short helper. It SHALL use the same recipe Star icon in place of helper word GOTO, with localized accessible “star” meaning, and SHALL NOT offer Choose GOTO recipes. Helper copy SHALL describe future suggestions without claiming an empty membership list or a saved meal.

#### Scenario: Teach at the point of need
- **WHEN** the initial active read settles without a represented Go-To on an ordinary unplanned night
- **THEN** the short helper with inline recipe Star follows Search and Order In in reading order, without a setup link

#### Scenario: Initial active read is pending
- **WHEN** the initial active read has not settled
- **THEN** the helper remains absent

#### Scenario: Represented recipe or saved context
- **WHEN** the pivot presents a ready/checking/pending Go-To or saved Mystery/non-cooking context
- **THEN** it omits the ordinary-empty helper and preserves truthful state content

#### Scenario: Active read fails or returns no ready result
- **WHEN** the settled active read fails or returns 404 without a represented Go-To
- **THEN** supper choices remain available without claiming no saved memberships, false readiness or successful assignment

### Requirement: Offer today through the existing planner Search flow

Search on Home’s unplanned pivot SHALL open the existing planner day-specific recipe selection flow with today selected using authoritative calendar context. It SHALL replace that pivot’s Quick Find action without creating another search mode. Unavailable calendar context SHALL use existing retry before navigation; selection, cancellation and occupied-slot recovery SHALL retain their planner meanings.

#### Scenario: Select Search on an unplanned night
- **WHEN** a person activates Search on the unplanned pivot, including one with a ready Go-To suggestion
- **THEN** Search opens with today’s day index, weekOffset zero and reference week through the existing planning flow
- **AND** opening it makes no assignment and does not launch the Home Quick Find modal

#### Scenario: No usable calendar
- **WHEN** authoritative Today context cannot be resolved
- **THEN** existing calendar retry is available without guessing the target day or committing a plan

#### Scenario: Concurrent occupancy or cancellation
- **WHEN** the target becomes occupied before selection, or a person cancels without selecting
- **THEN** existing planner recovery handles occupancy and cancellation commits no new meal

### Requirement: Enlarge only the ordinary empty pivot illustration

The ordinary empty Home pivot SHALL use a larger fork-and-knife illustration with recipe-hero presence within its warm cookbook shell. Search SHALL be primary and Order In secondary. Image space SHALL adapt before controls become unusable on short viewports. Ready recipe imagery, planned/non-cooking states and shared recipe-image fallbacks SHALL NOT be globally enlarged by this treatment.

#### Scenario: Ordinary empty invitation
- **WHEN** the settled unplanned pivot has no represented Go-To and no saved non-cooking context
- **THEN** the larger decorative illustration invites Search or Order In without pretending to be a food photo or available recipe
- **AND** both CTAs are usable in the initial short portrait viewport at ordinary text size

#### Scenario: Ready, represented or saved state
- **WHEN** a ready Go-To, checking/pending identity, planned recipe or saved non-cooking state is shown
- **THEN** it retains its own photography/icon, truthful status and action semantics without becoming the ordinary-empty invitation

### Requirement: Keep revised recipe and Home controls accessible

Changed controls SHALL have equivalent EN/FR meaning, keyboard operation, visible focus, pressed/pending feedback and at least 48 by 48 CSS px targets. Layout SHALL accommodate short iPhone/Android viewports, iPad, 200% text, safe areas and reduced motion without horizontal overflow or essential clipped content. Selected meaning SHALL not rely on colour alone.

#### Scenario: Filter and explanatory stars
- **WHEN** a screen reader or keyboard user encounters the toolbar star or helper
- **THEN** the filter exposes a localized membership-filter name and aria-pressed, while the helper announces localized explanatory star text without masquerading as a button

#### Scenario: Text growth and safe areas
- **WHEN** French, long names, 200% text, keyboard focus or safe-area insets require more room
- **THEN** controls reflow or scroll intentionally with readable labels, visible focus and usable targets; reduced motion does not hide essential state

## MODIFIED Requirements

### Requirement: Handle unavailable active GOTO without blocking Tonight choices

Home SHALL load an active GOTO on mount. An active-read error, including the no-ready 404, SHALL leave no active GOTO. An unplanned pivot SHALL retain Search and Order In without a setup link or false empty-list claim. Saved Mystery context SHALL retain its existing choices. A ready active choice SHALL offer Make this tonight through existing Tonight assignment behavior.

#### Scenario: No ready result
- **WHEN** active retrieval returns 404 while unplanned Tonight offers supper choices
- **THEN** Home still offers Search and Order In without a GOTO confirmation action or management link

#### Scenario: Confirm ready choice
- **WHEN** a person activates Make this tonight for the ready active recipe
- **THEN** Tonight assignment receives that configured recipe identity


### Requirement: Toggle the loaded recipe in the GOTO list

Recipe detail SHALL show a star and visible GOTO label in both states, pressed when configured and unpressed otherwise. Ochre state treatments SHALL keep the label and meaningful indicators readable. Activation SHALL remove the matching item or append its identity, name, image and represented readiness, then save the replacement list. Pending save SHALL disable that action; completion SHALL show success or failure feedback.

#### Scenario: Add loaded recipe
- **WHEN** a person activates Set as GOTO for an absent loaded recipe and saving resolves
- **THEN** the list contains its identity and the action reports successful addition

#### Scenario: Remove or fail
- **WHEN** a person toggles an existing GOTO or its save rejects
- **THEN** successful saving reports removal; rejection reports Could not update GOTO and releases the pending action

#### Scenario: Recognize GOTO before selecting
- **WHEN** a loaded recipe is not configured as GOTO
- **THEN** its action has a visible GOTO label beside the star and an accessible add name, with unpressed state

#### Scenario: Selected and pending state
- **WHEN** the recipe is configured or a membership save is pending
- **THEN** the visible GOTO label remains, selected state includes a filled star and pressed semantics, and pending disablement and existing success/error feedback remain

### Requirement: Offer choices for an empty or Mystery night

With no current recipe and no Cooked status, Home SHALL offer supper choices for an ordinary unfinished night or a saved Mystery night. Opening Quick Find SHALL not itself clear the Mystery plan. Saved recipe-free non-Mystery plans SHALL use meal-planning’s Hand eligible Home plans back to Planner editing requirement.

#### Scenario: Ordinary empty night
- **WHEN** Tonight is ordinary and empty
- **THEN** Home offers Search and Order In alongside an available ready Go-To choice, without a setup link

#### Scenario: Mystery night
- **WHEN** Tonight is recipe-free Skipped with Mystery kind and a person opens Quick Find
- **THEN** recipe choices open without submitting a plan-clear operation

### Requirement: Select or cancel Home Quick Find

Where retained for saved Mystery or recovery, Home Quick Find SHALL target week zero and the deployment-local Monday-based weekday. Its deck, loading, exhaustion, inspection, dismissal and invalidation SHALL follow the accepted meal-planning Quick Find requirements. Ordinary selection SHALL close the modal and offer that recipe for Tonight assignment; dismissal SHALL not submit selection.

#### Scenario: Select from empty Tonight
- **WHEN** a person selects an available recipe through a retained Home Quick Find entry without replacement intent
- **THEN** Quick Find closes and Tonight assignment receives its identity, name and image

#### Scenario: Dismiss before selection
- **WHEN** a person closes Home Quick Find before choosing a recipe
- **THEN** Tonight receives no assignment through that dismissal

#### Scenario: Continue to Search
- **WHEN** the targeted terminal library card is displayed
- **THEN** its Search link carries addToDay and weekOffset zero under the shared Quick Find requirement

### Requirement: Prioritize immediate Tonight choices over GOTO setup

When supper choices are offered, a ready GOTO SHALL make Make this tonight the primary action; otherwise Search SHALL be primary on an unplanned pivot. Order In SHALL remain an available secondary action. No separate Go-To setup link SHALL appear. Saved Mystery SHALL retain its existing Quick Find alternative. Existing readiness and assignment rules SHALL determine action availability and effects.

#### Scenario: Ready GOTO
- **WHEN** the pivot has a ready active GOTO
- **THEN** Make this tonight leads the actions, with Search and Order In available secondarily on the unplanned pivot
- **AND** merely viewing the card submits no assignment

#### Scenario: No ready GOTO or active-read failure
- **WHEN** no active GOTO is available, including after a 404 or failed active read
- **THEN** Search leads on the unplanned pivot and Order In remains available without a GOTO confirmation action

#### Scenario: Checking or preparing a represented GOTO
- **WHEN** the pivot receives an existing GOTO identity whose represented status is checking or pending
- **THEN** it displays the corresponding readable feedback without Make this tonight, and keeps Search and Order In available on the unplanned pivot
- **AND** this presentation does not establish that the active-GOTO service returns pending recipes

### Requirement: Register acquired recipes as pending GOTO choices

Already submitted legacy GOTO captures SHALL finish accepted pending registration without replaying acquisition or list saves. Fresh legacy URLs SHALL use ordinary capture without auto-registration; confirmed memberships SHALL remain saved. Description capture SHALL use the entered name; photo SHALL use Your captured recipe; URL SHALL use Recipe from link. Acquisition, background acceptance and readiness SHALL retain their existing capability owners.

#### Scenario: Description or photo returns identity
- **WHEN** an already submitted legacy GOTO-intent description or photo capture returns a recipe identity and list save resolves
- **THEN** the saved list includes that pending identity with its corresponding description

#### Scenario: URL returns identity
- **WHEN** an already submitted legacy URL capture with GOTO intent returns a recipe identity
- **THEN** a separate list replacement appends that identity with Recipe from link and pending status

### Requirement: Keep GOTO capture success available for explicit departure

After GOTO capture and list registration resolve, the capture success view SHALL remain available without automatic Home navigation and offer localized Done to Home. This waiting view SHALL NOT establish that synthesis or recipe readiness has completed.

#### Scenario: Registration succeeds
- **WHEN** GOTO description submission and its list replacement resolve
- **THEN** the success screen offers the GOTO preparation state without automatic navigation

#### Scenario: Return explicitly
- **WHEN** a person activates Done in that GOTO success view
- **THEN** navigation targets Home without reopening management or a ready-only filtered list; accepted processing, confirmed membership and ready notifications remain available

#### Scenario: Pending departure and readiness
- **WHEN** a person leaves an already accepted legacy capture while it is pending or it becomes ready while the success view remains mounted
- **THEN** pending status remains truthful, existing ready notification/in-place transition continues, and navigation neither resubmits capture nor deletes its recipe or membership

### Requirement: Present Tonight as a refined family cookbook

At ordinary text size, Tonight cards with recipe imagery SHALL give the food photograph and recipe title visual priority over their controls. The composition SHALL use generous state-appropriate imagery, warm surfaces, considered spacing and depth. Longer text and enlarged text SHALL remain readable in content-driven flow rather than being clipped to preserve proportions.

#### Scenario: Planned recipe or ready family GOTO with a photograph
- **WHEN** a planned recipe or ready family GOTO has usable imagery at ordinary mobile text size
- **THEN** a generous photograph and prominent recipe title lead the card, with quieter context and duration where available
- **AND** the composition preserves the respective supplied meal/pivot reference’s photographic presence, deep rounding, soft elevation and title emphasis while retaining the current visible actions and explicit details

#### Scenario: Related meal and pivot compositions
- **WHEN** the meal card and ready-GOTO pivot are shown at ordinary mobile text size
- **THEN** they share a refined rounded frame and photo/title hierarchy while the planned meal card uses an adaptive landscape image and the pivot retains the wider crop shown in its reference
- **AND** pivot alternatives are grouped side by side when complete labels and touch targets fit, with stacking when wrapping or text growth requires it

#### Scenario: Empty or unavailable imagery
- **WHEN** a represented recipe image is absent or fails to load, or saved non-cooking context is shown
- **THEN** warm spacing, readable state and a deliberate modest icon treatment maintain a composed card without a large generic placeholder dominating the task
- **AND** no fabricated image, unavailable recipe or false readiness/saved claim fills the space

#### Scenario: Larger text or long content
- **WHEN** EN/FR copy, recipe titles or text enlarged to 200 percent need more room
- **THEN** the card grows and controls wrap/reflow without shrinking labels, truncating essential content or forcing the ordinary-size image proportions onto the enlarged layout

#### Scenario: Ordinary empty illustration
- **WHEN** the pivot is ordinary and empty without a represented Go-To or saved context
- **THEN** its larger fork-and-knife composition follows Enlarge only the ordinary empty pivot illustration, without altering shared recipe-image fallbacks

### Requirement: Use refined Home action treatments

Each Tonight card SHALL have one visually dominant primary action, using light text on rich terracotta. Dark text on yellow SHALL NOT be used for its action surfaces. Secondary actions SHALL have less visual weight; ingredient disclosure SHALL use a text-style affordance. Readable contrast, visible focus, semantics and 48 by 48 CSS px targets SHALL remain intact without enclosing every action in a prominent border.

#### Scenario: Planned-meal controls
- **WHEN** the planned card is shown
- **THEN** Cook is the dominant terracotta action, Change plan is a quieter secondary action, and View ingredients is a text-style disclosure with an indicator and generous hit area
- **AND** all remain directly discoverable and operable without a whole-card flip or a stack of three equally prominent boxed controls

#### Scenario: Pivot controls
- **WHEN** the pivot is shown with or without a ready GOTO
- **THEN** Make this tonight for a ready GOTO, otherwise Search on the unplanned pivot, receives the primary terracotta treatment
- **AND** Order In and other available alternatives remain visibly enabled but visually subordinate, with no separate Go-To setup link and retained saved-context alternatives keeping their existing meaning

#### Scenario: Interactive states and accent color
- **WHEN** Home card controls are hovered, pressed, focused or shown with ochre accents
- **THEN** their labels and meaningful indicators retain the existing contrast requirements and keyboard focus remains visible
- **AND** ochre contributes restrained warmth without becoming a yellow action field with dark text

## REMOVED Requirements

### Requirement: Offer GOTO setup and list removal

**Reason**: Users manage membership directly through recipe stars; separate management, pending rows and acquisition are retired.
**Migration**: Retain Search filtering and recipe stars. Legacy Browse management parameters open normal filtered Browse; fresh legacy capture entries use ordinary capture. Preserve stored and in-flight work under the compatibility requirements above.

### Requirement: Remove a configured GOTO without deleting its recipe

**Reason**: This requirement describes the retired management-list removal action.
**Migration**: Recipe-detail star removal retains its existing replacement-list save and failure feedback under Toggle the loaded recipe in the GOTO list. Removing a star never deletes the recipe.
