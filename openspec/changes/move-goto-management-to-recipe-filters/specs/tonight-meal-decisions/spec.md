# Spec Delta

## ADDED Requirements

### Requirement: Open GOTO management directly in Browse

Browse SHALL accept `gotoOnly=true&manageGoto=true` to initialize GOTO-filtered results, open Filters and expand management. GOTO capture return SHALL use this destination; Home recipe selection SHALL use unfiltered Browse. Opening management SHALL NOT itself create, remove or assign a recipe. Dismissing it SHALL leave Browse usable.

#### Scenario: Follow Home recipe selection
- **WHEN** a person activates Home's Choose GOTO recipes action
- **THEN** ordinary unfiltered Browse opens so the person can inspect and star recipes without navigating through Settings

#### Scenario: Return after pending capture
- **WHEN** a person follows Back to GOTOs after successful GOTO registration
- **THEN** Browse opens with management visible and the configured pending entry remains inspectable even if no recipe is ready for filtered results

### Requirement: Distinguish immediate management saves from filter drafts

GOTO management SHALL explain that list changes save immediately after server confirmation while filter changes take effect on Apply. Closing Filters SHALL discard only unsubmitted filter selections and SHALL NOT undo or report rollback of confirmed membership saves. Acquisition navigation SHALL discard unsubmitted filter drafts without losing confirmed saves.

#### Scenario: Save then cancel Filters
- **WHEN** a person removes a GOTO successfully, changes a filter draft and closes without Apply
- **THEN** membership remains saved while the unsubmitted filter change is discarded

### Requirement: Recover GOTO management read errors

A rejected management list read SHALL display a retryable load error rather than assert that the configured collection is empty. Retrying SHALL request the list again. Failure SHALL retain any previously confirmed browser membership without claiming a successful empty read.

#### Scenario: Initial read rejects
- **WHEN** the configured list cannot be loaded
- **THEN** management shows load failure and Retry without an authoritative empty-list message

#### Scenario: Retry succeeds
- **WHEN** a person retries and the list read succeeds
- **THEN** management replaces load failure with the returned ready/pending entries or confirmed empty state

### Requirement: Keep relocated GOTO controls readable and reachable

GOTO filter and management controls SHALL have localized English/French names, selected/expanded state and keyboard operation. Chooser dismissal SHALL restore entry focus; acquisition-sheet dismissal SHALL retain applied selections and restore usable focus. Controls SHALL remain reachable without horizontal overflow at 320 CSS px and with 200% text, respecting safe areas and reduced motion.

#### Scenario: Keyboard operation
- **WHEN** a keyboard user opens Filters, expands management, opens acquisition choices and dismisses them
- **THEN** focus stays within the active modal, dismissal restores usable entry focus and no recipe is created by dismissal

#### Scenario: French and enlarged text
- **WHEN** French labels, long recipe names or 200% text are used on phone or iPad
- **THEN** filtering, management, Apply and Close remain readable and reachable without horizontal scrolling

### Requirement: Explain GOTO selection on the ordinary empty Home pivot

After the initial active-GOTO read settles, only an ordinary empty supper-choice pivot without a represented GOTO or saved non-cooking context SHALL show the introductory helper. It SHALL briefly explain that the recipe-detail GOTO star saves future ready fallback choices. Ready, checking, pending and saved Mystery presentations SHALL retain their existing content without this helper.

#### Scenario: Teach at the point of need
- **WHEN** the ordinary empty pivot has no represented GOTO after its initial active read settles
- **THEN** a short localized explanation and Choose GOTO recipes text-style link appear together below Quick Find and Order In in reading and focus order
- **AND** the link opens unfiltered Browse without creating, assigning or starring a recipe

#### Scenario: Initial active read is pending
- **WHEN** the initial active-GOTO read has not settled
- **THEN** the introductory helper does not appear while that read is pending

#### Scenario: Represented recipe or saved Mystery
- **WHEN** the pivot presents a ready, checking or pending GOTO, or saved Mystery context
- **THEN** the introductory helper is absent and the existing state text, image treatment and available actions remain

#### Scenario: Active read has no usable result
- **WHEN** a settled active read returns 404 or fails without a represented GOTO on an ordinary empty pivot
- **THEN** the invitation does not claim that the configured list is empty, that tonight is assigned or that a recipe is ready

### Requirement: Present GOTO management within the existing filter surface

The management disclosure SHALL use readable sentence-case headings and simple list rows within the existing Filters surface. It SHALL preserve pending entries and management actions without nesting the old Settings glass card or tiny uppercase labels. GOTO filter selection SHALL use the existing Search selected/unselected vocabulary with explicit state rather than a separate yellow action treatment.

#### Scenario: Expand management on either page
- **WHEN** Manage GOTOs expands in Browse or Search Filters
- **THEN** readable rows share the chooser surface, with pending/removal feedback and acquisition entry still available
- **AND** the selected GOTO filter remains distinguishable independently of colour

## MODIFIED Requirements

### Requirement: Handle unavailable active GOTO without blocking Tonight choices

Home SHALL load an active GOTO on mount. An active-read error, including the no-ready 404, SHALL leave no active GOTO. When supper choices are displayed without a GOTO, Home SHALL offer its Choose GOTO recipes link to unfiltered Browse, Quick Find and Order In. A ready active choice SHALL offer Make This Tonight through the existing Tonight assignment behavior.

#### Scenario: No ready result
- **WHEN** active retrieval returns 404 while Tonight offers supper choices
- **THEN** Home still offers Quick Find, Order In and Browse GOTO setup without a GOTO confirmation action

#### Scenario: Confirm ready choice
- **WHEN** a person activates Make This Tonight for the ready active recipe
- **THEN** Tonight assignment receives that configured recipe identity

### Requirement: Offer GOTO setup and list removal

Family GOTO management in Browse and Search Filters SHALL load the list, display ready items by description and pending items with pending feedback. Add a GOTO SHALL offer Search the Library, Describe a Dish and Take a Photo. Search SHALL open Recipes; description and photo SHALL open capture with GOTO intent and the selected mode. Closing the add sheet SHALL not create a recipe.

#### Scenario: Choose library
- **WHEN** a person chooses Search the Library in the add sheet
- **THEN** Recipes opens without launching Quick Find

#### Scenario: Choose acquisition
- **WHEN** a person chooses Describe a Dish or Take a Photo
- **THEN** capture opens with intent=goto and mode=describe or mode=photo respectively

#### Scenario: Dismiss setup
- **WHEN** a person closes the add sheet before choosing an acquisition path
- **THEN** the sheet closes without creating a recipe

#### Scenario: Open management in either recipe page
- **WHEN** a person expands Manage GOTOs inside Browse or Search Filters
- **THEN** the configured household collection and its management actions are available, including pending entries, independently of applied result filters

#### Scenario: Settings no longer hosts management
- **WHEN** a person opens Profile Settings
- **THEN** Family GOTO management is absent while the other Settings sections remain available

### Requirement: Remove a configured GOTO without deleting its recipe

GOTO management removal SHALL submit the list with matching recipe identities filtered out, marking the selected removal pending until the request settles. Rejection SHALL show retryable error feedback, log the error and release pending presentation without this action deleting the recipe or reporting successful removal.

#### Scenario: Removal succeeds
- **WHEN** the replacement list excluding the selected recipe saves
- **THEN** the selected GOTO disappears from the loaded list while its recipe is retained

#### Scenario: Removal rejects
- **WHEN** the list replacement rejects
- **THEN** pending removal ends, the prior browser list remains and visible error feedback permits another attempt

### Requirement: Keep GOTO capture success available for explicit departure

After GOTO capture and list registration resolve, the capture success view SHALL remain available without automatic Home navigation and offer Back to GOTOs. This waiting view SHALL NOT establish that synthesis or recipe readiness has completed.

#### Scenario: Registration succeeds
- **WHEN** GOTO description submission and its list replacement resolve
- **THEN** the success screen offers the GOTO preparation state without automatic navigation

#### Scenario: Return explicitly
- **WHEN** a person activates Back to GOTOs in that GOTO success view
- **THEN** navigation targets Browse with GOTO filtering and management open

### Requirement: Prioritize immediate Tonight choices over GOTO setup

When supper choices are offered, a ready GOTO SHALL make Make this tonight the primary action; otherwise Quick Find SHALL be primary. Order In SHALL remain an available secondary action. Without an active GOTO, Browse GOTO setup SHALL follow the immediate supper choices in reading and focus order. Existing readiness and assignment rules SHALL determine action availability and effects.

#### Scenario: Ready GOTO
- **WHEN** the pivot has a ready active GOTO
- **THEN** Make this tonight leads the actions, with Quick Find and Order In available secondarily
- **AND** merely viewing the card submits no assignment

#### Scenario: No ready GOTO or active-read failure
- **WHEN** no active GOTO is available, including after a 404 or failed active read
- **THEN** Quick Find leads, Order In remains available, and Browse GOTO setup follows these supper choices without a GOTO confirmation action

#### Scenario: Checking or preparing a represented GOTO
- **WHEN** the pivot receives an existing GOTO identity whose represented status is checking or pending
- **THEN** it displays the corresponding readable feedback without Make this tonight, and keeps Quick Find and Order In available
- **AND** this presentation does not establish that the active-GOTO service returns pending recipes

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

### Requirement: Use refined Home action treatments

Each Tonight card SHALL have one visually dominant primary action, using light text on rich terracotta. Dark text on yellow SHALL NOT be used for its action surfaces. Secondary actions SHALL have less visual weight; ingredient disclosure SHALL use a text-style affordance. Readable contrast, visible focus, semantics and 48 by 48 CSS px targets SHALL remain intact without enclosing every action in a prominent border.

#### Scenario: Planned-meal controls
- **WHEN** the planned card is shown
- **THEN** Cook is the dominant terracotta action, Change plan is a quieter secondary action, and View ingredients is a text-style disclosure with an indicator and generous hit area
- **AND** all remain directly discoverable and operable without a whole-card flip or a stack of three equally prominent boxed controls

#### Scenario: Pivot controls
- **WHEN** the pivot is shown with or without a ready GOTO
- **THEN** Make this tonight for a ready GOTO, otherwise Quick Find, receives the primary terracotta treatment
- **AND** Order In and other available alternatives remain visibly enabled but visually subordinate, with Browse GOTO setup retaining its lower task priority

#### Scenario: Interactive states and accent color
- **WHEN** Home card controls are hovered, pressed, focused or shown with ochre accents
- **THEN** their labels and meaningful indicators retain the existing contrast requirements and keyboard focus remains visible
- **AND** ochre contributes restrained warmth without becoming a yellow action field with dark text

#### Scenario: Empty-pivot GOTO helper
- **WHEN** the introductory helper is eligible under Explain GOTO selection on the ordinary empty Home pivot
- **THEN** it uses short readable charcoal body text and a quiet terracotta text-style link below immediate supper actions, without a new filled button or separate callout card
- **AND** the existing white rounded shell, depth, modest empty icon, primary/secondary treatments and 48 by 48 CSS px action targets remain
