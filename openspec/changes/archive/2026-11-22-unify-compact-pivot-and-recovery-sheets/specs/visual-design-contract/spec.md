## ADDED Requirements

### Requirement: Unify compact pivot and recovery sheet geometry and affordances

`SkipRecoveryDialog`, `PlanningPivotSheet`, and `NonCookingDaySheet` SHALL share an opaque Era 3 `bg-cream` shell with a locked top-left title (`0px` shift), top-right `>= 48px` `[Back] [Close]` controls, an optional `4px` 2-step bar, and non-clickable terracotta-bar meal context above a hairline divider. All three SHALL fit without scrolling on `412 × 915` (EN/FR) and reflow cleanly at `320px` and `200%` text scale.

#### Scenario: Pixel 10 zero-scroll and locked header across Plan B Step 1 and Step 2

- **WHEN** `SkipRecoveryDialog` renders Step 1 and transitions to Step 2 for a long multi-word recipe title on a `412 × 915 CSS px` viewport in English or French
- **THEN** the entire sheet, including `Back`, `Close`, and all disposition choices, fits inside the viewport with zero vertical scrolling (`scrollHeight <= clientHeight`)
- **AND** the bounding box of the `Plan B` title remains locked at the same `x` and `y` coordinates across Step 1 and Step 2

#### Scenario: Planner options and Other plans match Era 3 opaque shell without scrolling

- **WHEN** `PlanningPivotSheet` (with a planned recipe and all 5 actions) or `NonCookingDaySheet` (with an active family note input) renders on a `412 × 915 CSS px` viewport
- **THEN** both render opaque `bg-cream` Era 3 surfaces (`backdrop-filter: none` on the sheet panel), expose `>= 48 × 48 CSS px` touch targets on `Close`, `Back`, and all options, fit without scrolling, and pass `assertCookbookVisualA11y` in both `'aa'` and `'aaa'` contrast modes

#### Scenario: Narrow 320px reflow and 200% text scaling remain usable

- **WHEN** `SkipRecoveryDialog` (including the 3-up `Not cooking tonight` row and inline `Made plans` input), `PlanningPivotSheet`, or `NonCookingDaySheet` renders at `320 CSS px` width or `200%` root font scaling in English or French
- **THEN** controls wrap without horizontal clipping or overflow (`scrollWidth <= clientWidth`) and remain reachable via internal sheet scrolling
