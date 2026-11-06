## MODIFIED Requirements

### Requirement: Open the household library and offer list presentation

The bottom Recipes navigation SHALL open `/recipes`. The unified library SHALL offer stack and list presentation and keep bottom app navigation visible outside full-screen recipe detail. Full-screen detail SHALL provide its own Close action and restore the underlying dock on dismissal. Home SHALL NOT offer a separate Browse button. Access and member context SHALL follow the existing household-identity requirements.

#### Scenario: Open from Home
- **WHEN** a person on Home with the existing household access and member context activates the bottom Recipes navigation control
- **THEN** the application opens `/recipes` in Explore with collapsed search, no Search criteria and All scope, using the saved member presentation preference

#### Scenario: Select list presentation
- **WHEN** a person in Explore stack presentation activates “Show recipe list” and the preceding summary request succeeds
- **THEN** Recipes selects list presentation and requests its first page

### Requirement: Keep recipe detail actions clear of the sheet edge

Recipe detail SHALL keep its contextual primary action reachable without scrolling through the recipe. Read content and edit controls SHALL scroll fully clear of that action area, the keyboard and device safe areas. Full-screen phone detail and bounded larger-screen detail SHALL preserve usable targets and visible focus without duplicate bottom reservations. This replaces the former fixed trailing-gap and no-dock treatment.

#### Scenario: Read actions on phone and tablet
- **WHEN** a loaded recipe is read on a phone or tablet
- **THEN** the contextual primary action is available before scrolling and remains reachable while reading ingredients and instructions
- **AND** the final content can scroll entirely clear of the action area

#### Scenario: Edit actions and constrained content
- **WHEN** edit actions are last, or detail is shown on a short phone or with French/200% text
- **THEN** all controls and focus rings remain reachable without clipping, horizontal overflow or keyboard overlap
- **AND** Save/Cancel replace planning actions during editing

#### Scenario: Distinguish action section from scroll content
- **WHEN** the persistent action area is present
- **THEN** the reading region accounts for its rendered size and safe area once rather than adding a second dock reservation

### Requirement: Dismiss recipe detail back to the loaded library

Closing recipe detail SHALL retain the mounted library's criteria, results, continuation, presentation and collection position and restore connected trigger focus. Full-screen phone detail SHALL provide a persistent Close control; bounded detail SHALL also allow backdrop dismissal. Closing a pending read SHALL NOT wait for it. A started planning/recovery operation SHALL follow meal-assignment's pending and partial-outcome rules instead of silently discarding its state.

#### Scenario: Close loaded detail
- **WHEN** a person closes successfully loaded detail through Close or an available backdrop
- **THEN** detail disappears and the same library state and connected trigger focus remain without a dismissal-triggered collection request

#### Scenario: Close pending detail
- **WHEN** a person closes detail before its detail request finishes
- **THEN** detail disappears without waiting and that departed response cannot replace later content

## ADDED Requirements

### Requirement: Read ingredients and instructions in one recipe detail

Loaded detail SHALL show ingredients followed by numbered preparation steps in one mobile reading flow without tabs or entering Cook's Mode. Supplied meaningful instruction sections and order SHALL be retained. Reading SHALL NOT assign a meal, change cooking progress or mark it cooked. Known servings SHALL use the recipe-library serving-display requirements; without a dated projection they show the original basis.

#### Scenario: Inspect a complete recipe
- **WHEN** detail has ingredients and supported stored instructions
- **THEN** both are readable in the same view with ordered numbered steps and relevant section headings
- **AND** no schedule or cooking-progress mutation occurs from opening or reading it

#### Scenario: Instructions are unavailable
- **WHEN** stored instructions are absent or unusable
- **THEN** detail explains that instructions are unavailable and offers available original-source access and issue reporting without inventing steps
- **AND** planning remains independent of reading instructions

### Requirement: Place appreciation near recipe identity

Viewing detail SHALL place its existing Dislike, Like and Love rating choices near the title and before Ingredients. Choices SHALL have localized visible labels, accessible names and selected state, and unselected choices SHALL look available. Rating SHALL remain distinct from GOTO membership, family votes and cooking completion; selecting it SHALL NOT be required for planning.

#### Scenario: Recognise appreciation before planning
- **WHEN** a recipe with a saved rating opens
- **THEN** the saved selection is recognisable near its identity and all rating choices remain operable under existing editing rules

#### Scenario: Plan without rating
- **WHEN** the recipe is unrated
- **THEN** a person can add it to the plan without choosing a rating

### Requirement: Keep household details after recipe reading

Detail SHALL place saved notes after instructions with saving/error/retry feedback and Add a note when empty. It SHALL preserve drafts, autosave and recovery. Editing, sharing, finding similar recipes and issue reporting SHALL remain discoverable under existing permissions and availability.

#### Scenario: Return to useful notes
- **WHEN** saved notes or a retained failed-save draft exists
- **THEN** its content is visible in the notes section and any unsaved state and Retry save are explicit

#### Scenario: Secondary management
- **WHEN** the person wants to edit or report an issue
- **THEN** named recipe actions expose those operations without competing with the primary planning action

### Requirement: Keep family controls visible near recipe identity

Detail SHALL keep GOTO near the title and the existing Ask the Family toggle directly visible near recipe information before Ingredients. Appreciation SHALL remain visually distinct from both. The stack-browser Ask the Family toggle, its wording and eligibility meaning SHALL remain unchanged; no rating or toggle is required to plan.

#### Scenario: Find familiar family actions
- **WHEN** a loaded recipe opens in detail
- **THEN** GOTO, appreciation and Ask the Family are available before the long reading sections, with their existing selected states and meanings
- **AND** the stack browser retains its existing Ask the Family control

### Requirement: Reach family notes before reading the instructions

When saved notes or a nonempty retained draft exist, detail SHALL offer a quiet Family notes shortcut near recipe information. It SHALL jump to the notes section with accessible focus without opening another surface or changing content. Empty notes SHALL keep Add a note in the notes section without an empty shortcut.

#### Scenario: Consult a family adjustment
- **WHEN** the recipe has a note such as Use less chilli and Family notes is activated
- **THEN** the existing notes section becomes visible and focused with its content and saved or unsaved state intact

#### Scenario: No family notes exist
- **WHEN** saved notes and any retained draft are empty
- **THEN** no Family notes shortcut is displayed and Add a note remains available after instructions

### Requirement: Present readable Solar Earth recipe detail across viewports

Detail SHALL use the established Solar Earth typography, palette and components with prominent recipe identity and food imagery, readable sentence-case labels and stable text surfaces. Phones SHALL use full-screen detail; larger screens SHALL use a bounded spacious dialog. At 320 CSS px and 200% text, English/French content, focus and 48 CSS px action targets SHALL remain reachable without horizontal overflow.

#### Scenario: Ordinary phone and tablet reading
- **WHEN** a complete photo-filled recipe opens on phone or tablet
- **THEN** photograph, title, rating and recipe content have clear hierarchy and the primary action remains reachable without shrinking text or targets

#### Scenario: Long French content and keyboard
- **WHEN** long French content, enlarged text or the on-screen keyboard reduces available space
- **THEN** headings and actions wrap in reading order and all content and focused controls can be reached by scrolling

### Requirement: Keep original evidence readable independently of hero imagery

Available View original access SHALL have a stable readable surface rather than depend on hero-image contrast. Existing URL and original-photo destinations, controls and eligibility SHALL remain unchanged. Missing hero imagery SHALL retain recipe identity, source access and planning choices without inventing a photograph or readiness state.

#### Scenario: Light photograph or missing hero
- **WHEN** a recipe has a bright photograph or its hero cannot load
- **THEN** available original-source access remains legible and operable

### Requirement: Make detail actions reflect their entry context

Recipes/Search detail SHALL expose the working dated planning action owned by meal-assignment. Detail opened from a saved Planner meal SHALL show that source date and make Cook's Mode prominent, with a working secondary Plan another day action. It SHALL NOT expose enabled actions backed by no operation or reassign an existing meal merely by reading it.

#### Scenario: Read from a saved Planner meal
- **WHEN** a person opens a planned recipe from its dated Planner card
- **THEN** detail identifies that date, offers Cook's Mode and can intentionally plan another occurrence for a different day
- **AND** closing returns to the same Planner week without a schedule mutation
