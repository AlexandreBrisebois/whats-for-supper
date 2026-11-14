## MODIFIED Requirements

### Requirement: Keep Search disclosure accessible and responsive
Search disclosure SHALL use semantic keyboard-operable controls with visible focus, 48 CSS px toolbar targets, correct expansion state and localized names. Expanded controls, planning banner, both presentations and recovery actions SHALL reflow or scroll above safe-area-aware app navigation. Reduced motion SHALL preserve the same actions and state transitions.

#### Scenario: Keyboard disclosure and sheet return
- **WHEN** Search is opened by keyboard, hidden, or Filters/detail/bin is explicitly dismissed
- **THEN** explicit Search opening focuses the input; Find Similar entry follows its non-input focus rule; hiding from inside its region returns focus to Search; sheet dismissal returns focus to its connected trigger or an appropriate current result
- **AND** route departure never restores focus to a departed trigger and hidden input/Filters are absent from the tab order

#### Scenario: Locale and available space
- **WHEN** either presentation is used in English or French at short portrait, landscape, tablet or 200% text sizes
- **THEN** toolbar reading order, active-state meaning, input, Filters, recovery actions and bottom navigation remain usable without clipped essential content or page-wide horizontal overflow; an overflowing compact Search control row uses its indicated horizontal scrolling behavior

### Requirement: Make expanded Search recognizable and localized
When Search controls are expanded, the input SHALL show a magnifier, a localized example placeholder and a soft light surface with a visible terracotta focus state. The field SHALL retain its accessible Search name, current text and existing Enter, debounce, disclosure and focus-return behavior, with Find Similar entry following its non-input focus rule.

#### Scenario: Expand Search in either view
- **WHEN** a person explicitly expands Search in stack or list presentation in English or French
- **THEN** the field appears directly below the toolbar with its magnifier and localized example, and receives visible focus
- **AND** expansion alone does not submit or replace the current collection

#### Scenario: Return to a hidden active Search
- **WHEN** a current Search is active and its controls are hidden, then the person reopens them
- **THEN** the existing active marker disappears from the collapsed control, the field retains its criteria and focus returns to the input without changing results, position or pending work

### Requirement: Show applied Search selections and ordinary result context
Expanded Search SHALL show Filters with a visible count of applied selections and an accessible count description, counting shared scope choices once and applied Similar once. The independently visible Similar control SHALL NOT cause double counting; dismissed filter drafts SHALL NOT change the applied count. A loaded nonempty Search list SHALL have a modest localized Results heading above its ordinary cards. Stack SHALL retain its compact position context. These cues SHALL not promote any result or change recovery actions.

#### Scenario: Applied filters in either presentation
- **WHEN** filters, scope selections or Similar are applied and Search controls are expanded in stack or list
- **THEN** Filters shows the applied count in text or digits as well as an accessible description
- **AND** draft selections dismissed without Apply do not change that count

#### Scenario: Ordinary list results
- **WHEN** a current Search returns one or more matches in list presentation
- **THEN** a localized Results heading introduces the compact ordinary cards in returned order
- **AND** the former Top Pick, when supplied, remains exactly one ordinary card without a spotlight, reason, Surprise Me or other promotion

#### Scenario: Empty or loading result state
- **WHEN** Search is loading or returns zero matches
- **THEN** the existing loading or empty recovery message remains the primary content instead of an empty Results section

## ADDED Requirements

### Requirement: Keep compact Search controls and Similar on one line

Expanded Search SHALL place Filters/count, active Similar removal and active Search Clear on one non-wrapping row below its full-width input. Similar SHALL remain visible outside Filters. Clear SHALL use a short localized label, Clear in English and Effacer in French, with a full accessible clear-search name. Each control SHALL retain a minimum 48×48 CSS px target and legible text.

#### Scenario: Active Similar on a narrow phone
- **WHEN** Similar Search is expanded in stack or list at 320, 360 or 390 CSS px in English or French
- **THEN** Filters/count, Similar × and Clear share one row; the input remains full-width above
- **AND** compact French labels use Filtres, Similaires × and Effacer, with localized accessible names describing each actual action

#### Scenario: Retain explicit Similar removal
- **WHEN** a person activates the visible Similar removal control
- **THEN** Similar clears immediately through its existing search owner without opening Filters or requiring Apply
- **AND** remaining criteria/scope and planner context are preserved, current Search or scoped Explore is selected by existing intent rules, and obsolete Similar responses cannot replace it

#### Scenario: Clear Search versus Clear Filters
- **WHEN** the row's Clear action is activated
- **THEN** it performs the existing Clear search and browse action, clearing text/Similar/non-scope criteria while retaining Discovery/Go-To scope, presentation and planner context
- **AND** Clear Filters inside the sheet continues to retain text and Similar; dismissing filter drafts changes neither applied state nor requests

### Requirement: Keep overflowing Search controls reachable without shrinking labels

When compact controls exceed available width, their row SHALL scroll horizontally with an overflow cue and localized accessible scroll description. Controls SHALL retain full untruncated labels and minimum touch targets without wrapping or page-wide overflow. Touch, keyboard and assistive-technology navigation SHALL reveal each control; focused controls and focus indicators SHALL not remain obscured.

#### Scenario: French at enlarged text or large counts
- **WHEN** French labels, an expanded applied-count badge or 200% text exceed the row width
- **THEN** the row remains one line with an overflow cue and all controls remain fully reachable by horizontal scrolling
- **AND** no label is ellipsized, permanently clipped, reduced below the chosen readable type size or made smaller than a 48×48 CSS px target

#### Scenario: Keyboard reaches trailing Clear
- **WHEN** keyboard navigation moves from Filters through Similar to Clear in an overflowing row
- **THEN** the row reveals the newly focused control and its visible focus indicator without focusing the Search input or scrolling the whole page sideways

#### Scenario: Similar is inactive or Search is cleared
- **WHEN** no Similar criterion or active Search exists
- **THEN** absent controls take no space and the row updates its overflow cue without resetting other Search state or creating a blank reserved row

### Requirement: Enter Find Similar without requesting text input

Find Similar entry from Recipes, Planner or a supported Similar route SHALL NOT automatically focus the text input or summon the software keyboard. It SHALL provide visible accessible focus on a stable non-input control or heading. Explicit Search disclosure or intentional input activation SHALL retain normal text focus and keyboard behavior.

#### Scenario: Recipes or Planner Find Similar
- **WHEN** a person activates the existing Find Similar detail action in Recipes or Planner
- **THEN** current recipe identity drives Similar Search without automatic input focus, a text caret or software-keyboard request
- **AND** focus reaches a stable Filters/Search control or Search results heading with a localized accessible name

#### Scenario: Similar route and later explicit typing
- **WHEN** a supported Similar URL opens, then the person intentionally activates the text input or explicitly opens Search for typing
- **THEN** initial Similar entry avoids input autofocus and the later typing action focuses the input normally
- **AND** existing typed-text replacement of Similar, debounce and request semantics remain unchanged
