# Spec Delta

## Purpose

Govern state-responsive shell chrome, navigation salience, cognitive-load budgets, and visual transitions across the Four Household Energies so playful weekly voting and calm 5:00 PM execution reinforce each other without dashboard clutter.

## ADDED Requirements

### Requirement: Adapt navigation voting salience to household planning state

Navigation SHALL keep every primary destination reachable at `>= 48 CSS px` with `aria-current="page"`, preserve the pip-free Discovery control and converged `"Menu's in"` Planner link, and satisfy Standard AA (`>= 4.5:1`) and High Contrast AAA (`>= 7.0:1`, opaque bar). When voting is `collecting` or the week has zero planned suppers, Vote SHALL show warm sunlight prominence; when tonight is planned without open voting, navigation SHALL settle into level quiet parity.

#### Scenario: Active collecting round or empty week highlights Vote

- **WHEN** the household has an active `collecting` voting session or zero planned suppers on the current week while viewing Home, Planner, Recipes, or Profile in Standard AA or High Contrast AAA mode
- **THEN** the Vote navigation control presents its elevated warm-ochre invitation without a pip dot while retaining contrast (`>= 4.5:1` Standard AA, `>= 7.0:1` High Contrast AAA) and `>= 48 CSS px` target size

#### Scenario: Planned weeknight settles navigation into quiet parity

- **WHEN** tonight has a confirmed meal and no `collecting` voting round is active in Standard AA or High Contrast AAA mode
- **THEN** the navigation dock renders at uniform height without pulsing or oversized floating badges

### Requirement: Enforce the 5:00 PM Home cognitive load budget

Home in Depleted Execution energy SHALL render at most two top-level focal groups—the Capture a Recipe entry before Tonight's Supper or Pivot card—keeping global voting state and entry on the primary bottom-navigation control with zero below-the-fold Home voting cards, voting invitations, or Home Browse tiles (preserving `tonight-meal-decisions`). Home SHALL omit decorative operational headers and display at most one primary filled CTA per card.

#### Scenario: Confirmed weeknight Home remains calm

- **WHEN** a member opens Home with a confirmed recipe planned for tonight and no open voting round
- **THEN** Home displays only the Capture a Recipe entry followed by Tonight's Supper card (with one primary `Cook` CTA and quiet secondary controls), without below-the-fold voting cards, Home Browse tiles, decorative micro-subtitles, or competing filled buttons

### Requirement: Recede navigation chrome during active Cook's Mode

Entering Cook's Mode SHALL suppress persistent global navigation and top shell chrome so ingredients, instructions, `View Original`, view mode toggle, and exit controls occupy the full reading viewport within device safe areas.

#### Scenario: Cook opens instructions in Cook's Mode

- **WHEN** Cook's Mode opens from Home, Planner, or Recipe Detail
- **THEN** global bottom navigation and app headers are hidden and all cooking controls remain reachable within safe-area insets without overlapping steps

### Requirement: Present non-blocking background capture progress

After valid photo, link, PDF, or description capture submission resolves with pending work, the household SHALL be able to return immediately to Home or Planner while a non-blocking cookbook ribbon tracks background preparation and offers direct access or failure recovery when ready.

#### Scenario: Member saves a recipe photo and returns to planning

- **WHEN** a member submits a recipe capture and chooses to continue using the app immediately
- **THEN** navigation back to Home or Planner succeeds without a forced countdown wait while a quiet status ribbon tracks completion or opens recovery on failure

### Requirement: Provide high-contrast one-handed aisle shopping focus

In-Motion Utility grocery mode SHALL dedicate maximum horizontal width to item names, enforce `>= 7.0:1` item ink contrast on its card surface across both Standard AA and High Contrast AAA modes, maintain `>= 48 CSS px` checkbox and action targets, and apply live household updates without jumping the shopper's scroll offset.

#### Scenario: Partner checks an item off during live shopping

- **WHEN** a grocery checklist displays current-week items and an SSE update marks another item checked
- **THEN** the updated row reflects checked progress calmly while the active shopper's scroll position and focus remain undisturbed
