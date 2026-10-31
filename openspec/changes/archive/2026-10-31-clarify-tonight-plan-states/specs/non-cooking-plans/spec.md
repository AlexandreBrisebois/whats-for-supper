## ADDED Requirements

### Requirement: Present saved recipe-free Tonight plans as full cards

For a recipe-free Skipped non-Mystery night, Home SHALL use the normal Tonight card shell with Tonight context, a generous plan-specific icon, saved title and an explicit Edit supper plan action. Take Out and Eating out SHALL keep optional notes separate from their localized headings. Custom plans SHALL retain the user title. Display SHALL NOT submit a mutation.

#### Scenario: Preset with or without a note
- **WHEN** Tonight is recipe-free Skipped with order_in or eating_out kind
- **THEN** Home shows Take Out or Eating out in the selected locale with the corresponding large icon and any saved note
- **AND** Edit supper plan navigates through the existing dated Planner handoff without saving or clearing

#### Scenario: Custom title or legacy skip
- **WHEN** Tonight holds a custom plan with long user-entered content, or a recipe-free legacy Skipped entry lacking explicit kind
- **THEN** the custom title is preserved in full, or the legacy entry uses the established Take Out fallback
- **AND** neither display truncates essential plan content or changes stored data

#### Scenario: Small viewport and enlarged text
- **WHEN** the card uses English, French, multiline content or 200 percent text on phone or iPad
- **THEN** it retains the normal card width cap, readable wrapping, keyboard focus and an action target of at least 48 by 48 CSS px
- **AND** normal vertical scrolling keeps the complete title, note and action reachable without horizontal overflow

#### Scenario: Other Tonight content
- **WHEN** Tonight has a planned or cooked recipe, a legacy recipe-backed skip, or saved Mystery context
- **THEN** existing content precedence and action effects remain governed by their existing Tonight requirements

## MODIFIED Requirements

### Requirement: Hand eligible Home plans back to Planner editing

Home SHALL offer Edit supper plan from its recipe-free skipped non-mystery card as navigation to /planner?weekOffset=0&planDate=<deployment-local-today>. Once not loading in selected week zero, Planner SHALL open the matching recipe-free status-three date's pivot once for that planDate value and select its planner tab. It SHALL NOT directly open the edit sheet from this handoff.

#### Scenario: Home summary activation
- **WHEN** a person activates the eligible Home plan summary
- **THEN** navigation carries week zero and the deployment-local current date

#### Scenario: Matching dated plan is loaded
- **WHEN** the handoff date is loaded as recipe-free status three in selected week zero and has not opened for that value
- **THEN** Planner opens Change supper plans, from which Edit supper plan opens the saved draft

#### Scenario: Handoff has no matching date
- **WHEN** loading ends without the handoff date as a recipe-free skipped entry in selected week zero
- **THEN** this handoff does not open the edit pivot

### Requirement: Initialize a date-specific supper-plan draft

A newly mounted sheet SHALL show its selected date, initialize kind and message from the captured plan, and default an absent kind to mystery and an absent message to empty. It SHALL present Mystery night, Take Out, Eating out and We made plans in that order. A new date/offset target SHALL initialize a separate draft.

#### Scenario: New plan
- **WHEN** a sheet opens without an existing plan
- **THEN** Mystery night is selected first and no message input is displayed

#### Scenario: Existing plan
- **WHEN** a sheet mounts with an existing kind and customLabel
- **THEN** it selects that kind and initializes the message to that label

### Requirement: Display the saved non-cooking choice and note

For recipe-free skipped content under the promoted day-rendering rules, Planner SHALL use the custom label as title for custom, localized Mystery night, Eating out or Take Out for presets, and the optional note beneath order_in/eating_out headings. Mystery night SHALL show We’ll figure out supper that day. Each choice SHALL use its corresponding non-cooking icon.

#### Scenario: Preset with a note
- **WHEN** a saved order_in or eating_out plan has a nonempty label
- **THEN** its localized preset heading and separate note are displayed

#### Scenario: Mystery or custom saved plan
- **WHEN** a recipe-free skipped mystery or custom plan is displayed
- **THEN** mystery shows its preset and hint, while custom uses its saved label as title
