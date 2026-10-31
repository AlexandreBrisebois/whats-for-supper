## ADDED Requirements

### Requirement: Replace saved Mystery explicitly with Take Out

Choosing Take Out on a saved recipe-free Mystery night SHALL save a recipe-free order_in plan with a null custom label for the captured authoritative date. It SHALL await save confirmation before showing Take Out, prevent repeated pending submission and preserve another local plan/date that supersedes the captured source. Failure SHALL retain or reconcile saved state with readable retry feedback.

#### Scenario: Replace the stored plan
- **WHEN** Take Out is chosen for saved Mystery and the dated save succeeds
- **THEN** both the resulting Tonight card and subsequent schedule reads identify Take Out with no Mystery metadata
- **AND** no food order or recipe assignment is submitted

#### Scenario: Save is pending or fails
- **WHEN** the replacement request remains pending
- **THEN** choices are disabled and another activation sends no duplicate request
- **WHEN** the save rejects
- **THEN** saved state is retained or refreshed, controls recover and a localized failure offers retry without a status-only fallback

#### Scenario: Source changes while pending
- **WHEN** the captured date, recipe or local plan is superseded before the asynchronous action can apply its result
- **THEN** the old completion does not overwrite that newer local state
- **AND** an action whose source changed during calendar acquisition submits no replacement


### Requirement: Explain Mystery without a ready recipe proposal

A saved recipe-free Mystery night without a ready proposal SHALL show its localized saved-plan title, a generous Mystery icon and truthful availability text. It SHALL retain Quick Find and Take Out without Make this tonight. Display, request settlement and cancelling Quick Find SHALL NOT change the saved plan.

#### Scenario: Active suggestion read has not settled
- **WHEN** a saved Mystery night has no represented recipe and its initial active read is pending
- **THEN** the card says Checking your GOTO in the selected locale rather than implying an empty recipe collection
- **AND** Quick Find and Take Out remain available

#### Scenario: No eligible suggestion or unsuccessful active read
- **WHEN** a saved Mystery night has no represented recipe after its active read settles, whether from no eligible recipe or a request failure
- **THEN** it says No GOTO suggestion available right now in the selected locale with the saved Mystery title and generous icon
- **AND** it makes no claim that the household has no starred recipes and offers Quick Find and Take Out

#### Scenario: Represented checking or pending recipe
- **WHEN** a saved Mystery night has a represented recipe identity but no ready proposal
- **THEN** the corresponding checking or preparing feedback remains readable without Make this tonight or a fabricated photograph

#### Scenario: Proposal becomes ready
- **WHEN** a ready proposal is represented for the saved Mystery night
- **THEN** the normal quiet Mystery header, 5:4 photograph, recipe content and explicit acceptance specified by Show the normal recipe proposal beneath the Mystery header are retained
- **AND** no large decorative Mystery tile is added to that ready-proposal composition

### Requirement: Name the non-cooking choice Take Out throughout the app

Application-owned public copy SHALL name the former Order In choice Take Out in English, with equivalent French wording. This copy rule SHALL govern current labels, actions, summaries, accessibility text and supporting guidance. It SHALL preserve delivery support, stored identifiers, existing action effects and user-entered content.

#### Scenario: Choose or review the plan in either locale
- **WHEN** a person encounters the non-cooking choice on Home, Planner, a selection sheet or recovery dialog
- **THEN** visible and accessible copy uses Take Out in English or À emporter in French consistently
- **AND** explanatory copy can clarify takeout or delivery without implying that the app places an order

#### Scenario: Compatibility and historical material
- **WHEN** an existing order_in plan or legacy recipe-free Skipped entry is displayed
- **THEN** it uses the new localized label without converting its persisted/API identity or editing user-entered labels
- **AND** archived history and historical evidence remain unchanged

## MODIFIED Requirements

### Requirement: Present Tonight as a refined family cookbook

At ordinary text size, Tonight cards with recipe imagery SHALL give the food photograph and recipe title visual priority over their controls. The composition SHALL use generous state-appropriate imagery, warm surfaces, considered spacing and depth. Longer text and enlarged text SHALL remain readable in content-driven flow rather than being clipped to preserve proportions.

#### Scenario: Planned recipe or ready family GOTO with a photograph
- **WHEN** a planned recipe or ready family GOTO has usable imagery at ordinary mobile text size
- **THEN** a generous photograph and prominent recipe title lead the card, with quieter context and duration where available
- **AND** the composition preserves the respective supplied meal/pivot reference’s photographic presence, deep rounding, soft elevation and title emphasis while retaining the current visible actions and explicit details

#### Scenario: Related meal and pivot compositions
- **WHEN** the meal card and ready-GOTO pivot are shown at ordinary mobile text size
- **THEN** they share a refined rounded frame and photo/title hierarchy while planned and ready-GOTO photographs use matching 5:4 proportions at equal inner widths
- **AND** pivot alternatives are grouped side by side when complete labels and touch targets fit, with stacking when wrapping or text growth requires it

#### Scenario: Empty or unavailable imagery
- **WHEN** a represented ready recipe image is absent or fails to load
- **THEN** warm spacing, readable state and the existing modest image fallback maintain a composed card
- **AND** no fabricated image, unavailable recipe or false readiness/saved claim fills the space

#### Scenario: Saved context without a ready proposal
- **WHEN** a recipe-free saved non-cooking plan or Mystery without a ready proposal is displayed
- **THEN** the card uses its generous corresponding icon and readable plan text through the recipe-free plan and Mystery requirements
- **AND** it does not use a fabricated food photograph

#### Scenario: Larger text or long content
- **WHEN** EN/FR copy, recipe titles or text enlarged to 200 percent need more room
- **THEN** the card grows and controls wrap/reflow without shrinking labels, truncating essential content or constraining card height to preserve the ordinary-size composition

#### Scenario: Ordinary empty illustration
- **WHEN** the pivot is ordinary and empty without a represented Go-To or saved context
- **THEN** its larger fork-and-knife composition follows Enlarge only the ordinary empty pivot illustration, without altering shared recipe-image fallbacks

### Requirement: Offer choices for an empty or Mystery night

With no current recipe and no Cooked status, Home SHALL offer supper choices for an ordinary unfinished night or a saved Mystery night. Opening Quick Find SHALL not itself clear the Mystery plan. Saved recipe-free non-Mystery plans SHALL use meal-planning’s Hand eligible Home plans back to Planner editing requirement.

#### Scenario: Ordinary empty night
- **WHEN** Tonight is ordinary and empty
- **THEN** Home offers Search and Take Out alongside an available ready Go-To choice, without a setup link

#### Scenario: Mystery night
- **WHEN** Tonight is recipe-free Skipped with Mystery kind and a person opens Quick Find
- **THEN** recipe choices open without submitting a plan-clear operation

### Requirement: Handle unavailable active GOTO without blocking Tonight choices

Home SHALL load an active GOTO on mount. An active-read error, including the no-ready 404, SHALL leave no active GOTO. An unplanned pivot SHALL retain Search and Take Out without a setup link or false empty-list claim. Saved Mystery context SHALL retain its existing choices. A ready active choice SHALL offer Make this tonight through existing Tonight assignment behavior.

#### Scenario: No ready result
- **WHEN** active retrieval returns 404 while unplanned Tonight offers supper choices
- **THEN** Home still offers Search and Take Out without a GOTO confirmation action or management link

#### Scenario: Confirm ready choice
- **WHEN** a person activates Make this tonight for the ready active recipe
- **THEN** Tonight assignment receives that configured recipe identity

### Requirement: Order in from an empty Tonight choice

Outside saved Mystery replacement, activating Take Out with no current Tonight recipe SHALL immediately set local Skipped status, preserve existing non-cooking metadata or supply Take Out, and offer the same date as recipe-free Skipped to the loaded week. It SHALL dispatch status-only three validation for deployment-local today. Persistence and read fallback SHALL follow meal-planning’s Retain status-only day-validation compatibility requirement.

#### Scenario: Empty night
- **WHEN** a person activates Take Out with no current Tonight recipe
- **THEN** local Tonight and the offered week slot show Skipped while date validation runs in the background

#### Scenario: Validation rejects
- **WHEN** the background status-only validation rejects
- **THEN** failure is logged without automatic local rollback through that handler

### Requirement: Choose a backup before resolving the planned Tonight recipe

Recovery from a displayed planned recipe SHALL first offer Take Out or Pick Something Else. Take Out SHALL open the prior-recipe disposition step without submitting validation yet. Pick Something Else SHALL open Quick Find; choosing a replacement SHALL retain that choice for the disposition step without assigning it yet.

#### Scenario: Order In selected
- **WHEN** a person chooses Take Out in planned-recipe recovery
- **THEN** the disposition step opens without yet marking Tonight skipped

#### Scenario: Replacement selected
- **WHEN** a person chooses a Quick Find replacement after Pick Something Else
- **THEN** Quick Find closes and the disposition step retains the replacement without posting it

### Requirement: Cancel Home recovery before mutation

Before disposition starts, Close, backdrop dismissal and Back SHALL cancel without submitting a mutation; closing Quick Find before selection SHALL cancel its choice. While a mutation is pending, dismissal and Back SHALL be disabled. After partial completion, dismissal SHALL explain that completed work remains and offer explicit abandonment of the unsaved choice. Back SHALL NOT restart a completed disposition.

#### Scenario: Abort order-in recovery
- **WHEN** a person closes the disposition step before acting
- **THEN** no validation, move, defer, deletion or replacement is submitted by closing

#### Scenario: Return to backup choice
- **WHEN** a person activates Back before disposition starts
- **THEN** the initial Take Out / Pick Something Else choice returns without a mutation

#### Scenario: Leave after partial completion
- **WHEN** disposition succeeded, replacement is unsaved and the person closes recovery
- **THEN** Home requires confirmation to abandon the pending replacement and explains that the original meal's completed disposition is retained

### Requirement: Mark Order In before planned-recipe disposition

For Take Out plus Tomorrow, Home SHALL include the source disposition in the Tomorrow operation without prior validation or optimistic source mutation. For Save for Next Week or Drop, Home SHALL retain prior local Skipped presentation and awaited status-only validation; defer follows validation and Drop sends no deletion.

#### Scenario: Move after validation
- **WHEN** Take Out recovery chooses Save for Next Week and validation remains pending
- **THEN** deferral has not started through that invocation

#### Scenario: Move with source disposition
- **WHEN** Take Out recovery chooses Tomorrow and movement remains pending
- **THEN** one Tomorrow request carries Take Out disposition while the displayed and persisted source remain unchanged until commit

#### Scenario: Drop original cooking plan
- **WHEN** a person chooses Drop in Take Out recovery and validation resolves
- **THEN** no DELETE is sent through that branch

### Requirement: Finish Home recovery with its caller-specific follow-ups

Pick Something Else recovery SHALL close and perform success navigation only after replacement persistence is confirmed. Home SHALL refresh the captured week and Tonight; refresh failure after confirmed save SHALL show refresh feedback without repeating either mutation. Tomorrow and Drop SHALL navigate to the captured Planner target; defer SHALL remain on Home. Take Out SHALL retain its existing disposition and recipe-free Skipped follow-ups.

#### Scenario: Tomorrow or Drop completes
- **WHEN** disposition and replacement save are confirmed for Tomorrow or Drop
- **THEN** recovery closes, affected views refresh and navigation targets the captured Planner week

#### Scenario: Defer completes
- **WHEN** defer and replacement save are confirmed for Save for Next Week
- **THEN** recovery closes and affected views refresh without navigation

#### Scenario: Replacement remains pending
- **WHEN** disposition succeeded but replacement persistence is not yet confirmed
- **THEN** recovery remains open with saving feedback and no success navigation

#### Scenario: Refresh fails after save
- **WHEN** replacement is confirmed saved but a subsequent view refresh fails
- **THEN** Home identifies a refresh failure and offers refresh without replaying disposition or assignment

### Requirement: Stop a rejected Home recovery invocation at its failing await

Home SHALL stop subsequent recovery steps after a rejected await and show the failed stage. Disposition rejection SHALL withhold replacement. Completed work SHALL NOT be represented as rolled back. An uncertain mutation outcome SHALL block replay until authoritative reconciliation; Tomorrow's committed-result rules SHALL remain authoritative. Replacement failure SHALL follow the retained-stage recovery requirements.

#### Scenario: Validation rejects first
- **WHEN** Take Out validation rejects before Save for Next Week disposition
- **THEN** that invocation does not submit its defer

#### Scenario: Disposition rejects
- **WHEN** Pick Something Else movement, defer or deletion rejects before replacement
- **THEN** that invocation does not dispatch the retained replacement

#### Scenario: Disposition response is lost
- **WHEN** defer or deletion fails without an established outcome
- **THEN** Home shows uncertain disposition, retains the original and replacement choices, and does not replay disposition or start replacement merely because a read fails or shows an empty source

### Requirement: Share authoritative Today context across Home rendering and actions

SSR and mounted Home SHALL consume meal-planning's authoritative calendar context. Today assignment, Quick Find, Take Out and recovery SHALL use that context's date, weekday and captured reference Monday. A started recovery SHALL retain its date across awaits; a new action SHALL follow Refresh expired Today context before a new action. Browser timezone SHALL NOT select the supper slot.

#### Scenario: SSR and browser have different local dates
- **WHEN** Toronto deployment context identifies October 11 while the SSR host and Tokyo browser identify October 12 locally
- **THEN** both Home renderings identify October 11 as Tonight and a new selection targets that date

#### Scenario: Recovery crosses midnight
- **WHEN** recovery begins on deployment October 11 and an awaited disposition finishes on October 12
- **THEN** its subsequent replacement retains the captured October 11 target and reference Monday

#### Scenario: Returning after the deployment day changed
- **WHEN** Home resumes after its authoritative context expires
- **THEN** it refreshes Today before another date-dependent action and does not display yesterday's recipe as the newly resolved Tonight

### Requirement: Consume the committed Tomorrow result before continuing Home recovery

Home SHALL continue replacement or successful recovery only when Tomorrow confirms committed movement. While pending it SHALL suppress duplicate submission. A rejected move SHALL retain the original and pending choice with visible conflict feedback. A committed move with incomplete follow-ups SHALL trigger rereads and refresh feedback without resubmitting movement. Unknown outcomes SHALL withhold replacement until reconciled.

#### Scenario: Cooked destination rejects Order In movement
- **WHEN** Take Out plus Tomorrow is rejected because a Cooked entry would move
- **THEN** Home retains the original source and recovery choice, shows the conflict and submits neither validation nor replacement

#### Scenario: Move commits but refresh is incomplete
- **WHEN** Tomorrow returns a committed result with incomplete follow-ups
- **THEN** Home rereads affected state and identifies refresh failure without sending the move again

#### Scenario: Transport fails without a known result
- **WHEN** the response is lost and Home cannot establish whether Tomorrow committed
- **THEN** Home withholds replacement and blocks repeat movement until authoritative reads reconcile the source and destination

### Requirement: Present readable Tonight card content

The planned-meal and supper-choice cards SHALL use readable context, supporting copy and enabled action labels, including checking and preparing feedback. Normal text SHALL reach 4.5:1 contrast, qualifying large text 3:1, and meaningful control/state graphics 3:1 on their actual adjacent backgrounds. State and action meaning SHALL remain available through labels rather than colour alone.

#### Scenario: Essential copy on a card
- **WHEN** either Tonight card displays context, duration, supporting copy or enabled actions
- **THEN** those labels meet the relevant contrast threshold on their rendered backgrounds, including translucent surfaces
- **AND** essential context and action labels use readable sentence case rather than tiny tracked all-caps, except the existing localized Ready In wrapper and duration units

#### Scenario: Secondary action is available
- **WHEN** Take Out or Change plan is enabled
- **THEN** its label and control treatment visibly communicate an available action rather than an unavailable control

### Requirement: Prioritize immediate Tonight choices over GOTO setup

When supper choices are offered, a ready GOTO SHALL make Make this tonight the primary action; otherwise Search SHALL be primary on an unplanned pivot. Take Out SHALL remain an available secondary action. No separate Go-To setup link SHALL appear. Saved Mystery SHALL retain its existing Quick Find alternative. Existing readiness and assignment rules SHALL determine action availability and effects.

#### Scenario: Ready GOTO
- **WHEN** the pivot has a ready active GOTO
- **THEN** Make this tonight leads the actions, with Search and Take Out available secondarily on the unplanned pivot
- **AND** merely viewing the card submits no assignment

#### Scenario: No ready GOTO or active-read failure
- **WHEN** no active GOTO is available, including after a 404 or failed active read
- **THEN** Search leads on the unplanned pivot and Take Out remains available without a GOTO confirmation action

#### Scenario: Checking or preparing a represented GOTO
- **WHEN** the pivot receives an existing GOTO identity whose represented status is checking or pending
- **THEN** it displays the corresponding readable feedback without Make this tonight, and keeps Search and Take Out available on the unplanned pivot
- **AND** this presentation does not establish that the active-GOTO service returns pending recipes

### Requirement: Explain the Tonight choice without claiming a saved outcome

The pivot SHALL distinguish an ordinary unplanned night, an unassigned ready family GOTO and saved Mystery context using localized text. It SHALL NOT describe a ready GOTO as tonight's saved meal before selection, or imply that Take Out places a delivery order. Existing optimistic assignment and staged recovery presentation SHALL retain their established persistence meanings.

#### Scenario: Unplanned night and ready family choice
- **WHEN** an ordinary empty night is shown with or without a ready GOTO
- **THEN** it identifies that nothing is planned for tonight
- **AND** a ready recipe is identified as the family's GOTO choice rather than a saved assignment

#### Scenario: Saved Mystery night
- **WHEN** supper choices are offered for a saved Mystery night
- **THEN** its saved non-cooking context remains visible without calling the day unplanned
- **AND** opening and cancelling Quick Find leaves that context unchanged

#### Scenario: English and French meaning
- **WHEN** either card is displayed in English or French
- **THEN** added or changed labels and feedback use the selected locale with equivalent state/action meaning and room to wrap
- **AND** duration retains its existing localized wrapper, units and missing-time behavior

### Requirement: Use refined Home action treatments

Each Tonight card SHALL have one visually dominant primary action, using light text on rich terracotta. Dark text on yellow SHALL NOT be used for its action surfaces. Secondary actions SHALL have less visual weight; ingredient disclosure SHALL use a text-style affordance. Readable contrast, visible focus, semantics and 48 by 48 CSS px targets SHALL remain intact without enclosing every action in a prominent border.

#### Scenario: Planned-meal controls
- **WHEN** the planned card is shown
- **THEN** Cook is the dominant terracotta action, Change plan is a quieter secondary action, and View ingredients is a text-style disclosure with an indicator and generous hit area
- **AND** all remain directly discoverable and operable without a whole-card flip or a stack of three equally prominent boxed controls

#### Scenario: Pivot controls
- **WHEN** the pivot is shown with or without a ready GOTO
- **THEN** Make this tonight for a ready GOTO, otherwise Search on the unplanned pivot, receives the primary terracotta treatment
- **AND** Take Out and other available alternatives remain visibly enabled but visually subordinate, with no separate Go-To setup link and retained saved-context alternatives keeping their existing meaning

#### Scenario: Interactive states and accent color
- **WHEN** Home card controls are hovered, pressed, focused or shown with ochre accents
- **THEN** their labels and meaningful indicators retain the existing contrast requirements and keyboard focus remains visible
- **AND** ochre contributes restrained warmth without becoming a yellow action field with dark text

### Requirement: Explain GOTO selection on the ordinary empty Home pivot

Only the settled ordinary empty pivot without a represented Go-To or saved non-cooking context SHALL show the short helper. It SHALL use the same recipe Star icon in place of helper word GOTO, with localized accessible “star” meaning, and SHALL NOT offer Choose GOTO recipes. Helper copy SHALL describe future suggestions without claiming an empty membership list or a saved meal.

#### Scenario: Teach at the point of need
- **WHEN** the initial active read settles without a represented Go-To on an ordinary unplanned night
- **THEN** the short helper with inline recipe Star follows Search and Take Out in reading order, without a setup link

#### Scenario: Initial active read is pending
- **WHEN** the initial active read has not settled
- **THEN** the helper remains absent

#### Scenario: Represented recipe or saved context
- **WHEN** the pivot presents a ready/checking/pending Go-To or saved Mystery/non-cooking context
- **THEN** it omits the ordinary-empty helper and preserves truthful state content

#### Scenario: Active read fails or returns no ready result
- **WHEN** the settled active read fails or returns 404 without a represented Go-To
- **THEN** supper choices remain available without claiming no saved memberships, false readiness or successful assignment

### Requirement: Enlarge only the ordinary empty pivot illustration

The ordinary empty Home pivot SHALL use a larger fork-and-knife illustration with recipe-hero presence within its warm cookbook shell. Search SHALL be primary and Take Out secondary. Image space SHALL adapt before controls become unusable on short viewports. Ready recipe imagery, planned/non-cooking states and shared recipe-image fallbacks SHALL NOT be globally enlarged by this treatment.

#### Scenario: Ordinary empty invitation
- **WHEN** the settled unplanned pivot has no represented Go-To and no saved non-cooking context
- **THEN** the larger decorative illustration invites Search or Take Out without pretending to be a food photo or available recipe
- **AND** both CTAs are usable in the initial short portrait viewport at ordinary text size

#### Scenario: Ready, represented or saved state
- **WHEN** a ready Go-To, checking/pending identity, planned recipe or saved non-cooking state is shown
- **THEN** it retains its own photography/icon, truthful status and action semantics without becoming the ordinary-empty invitation

### Requirement: Show the normal recipe proposal beneath the Mystery header

For a saved Mystery night with a ready recipe proposal, Home Tonight SHALL show the localized Mystery label once in the normal header above the normal 5:4 recipe hero and suggestion content. Card geometry, typography and actions SHALL match the existing suggestion presentation. It SHALL add no decorative Mystery tile, large Mystery heading, below-photo label or invitation sentence. Displaying the proposal SHALL NOT assign it; Make this tonight remains explicit acceptance.

#### Scenario: Ready Mystery proposal with usable photography
- **WHEN** a saved recipe-free Mystery night has a ready proposal with a usable photograph
- **THEN** the normal header says Mystery night in the selected locale above the ordinary 5:4 hero and normal suggestion recipe content
- **AND** card/photo dimensions and recipe typography match the ordinary ready suggestion at the same viewport and inner width
- **AND** Make this tonight, Quick Find and Take Out retain their styling, order, availability and effects; public labels follow the app-wide Take Out copy requirement
- **AND** the saved Mystery plan remains unchanged by displaying the proposal

#### Scenario: Explicit acceptance or cancelled search
- **WHEN** a ready Mystery proposal is shown and the person opens and cancels Quick Find
- **THEN** the saved Mystery plan remains intact
- **AND** only explicit acceptance through Make this tonight assigns the displayed proposal through the existing flow

#### Scenario: No ready proposal or unavailable photograph
- **WHEN** Mystery night has no ready recipe proposal
- **THEN** its presentation follows Explain Mystery without a ready recipe proposal, with checking/pending feedback and action availability preserved
- **WHEN** a ready Mystery proposal has no usable photograph or its photograph fails to load
- **THEN** the existing modest image fallback appears with the Mystery header and normal recipe content/actions still available
- **AND** no fabricated photograph or false assignment is implied

#### Scenario: Locale and viewport preservation
- **WHEN** the ready Mystery proposal uses English or French, a long title, 200 percent text, a short phone viewport or iPad portrait/landscape
- **THEN** content wraps or scrolls without essential clipping, horizontal overflow, reduced action targets or a shrunken photograph/card
- **AND** accessible image meaning, keyboard operation and visible focus remain available

#### Scenario: Other Tonight states
- **WHEN** the night is ordinary unplanned, planned, cooked or saved non-Mystery
- **THEN** its established state precedence and action effects remain unchanged; saved recipe-free plan presentation follows Present saved recipe-free Tonight plans as full cards
