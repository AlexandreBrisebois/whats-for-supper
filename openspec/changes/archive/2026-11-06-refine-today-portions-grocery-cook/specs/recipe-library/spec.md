## MODIFIED Requirements

### Requirement: Make detail actions reflect their entry context

Detail SHALL preserve dated planning/recovery and source-date identity. Dated Plan and icon-only Change day SHALL remain adjacent with localized accessible name/tooltip and at least 48 CSS px targets. Where Cook exists, one Cook SHALL span the footer content width on its own row below planning controls, retaining its instructions icon/name. Planner detail retains Plan another day. Reading/previews SHALL not assign or complete a meal; no Steps action returns.

#### Scenario: Read from a saved Planner meal
- **WHEN** a planned recipe opens from its dated Planner card
- **THEN** detail identifies the date, offers one full-width Cook on its own row and retains quieter Plan another day; closing returns to the same week without schedule mutation

#### Scenario: Plan for a day
- **WHEN** a valid dated assignment is available
- **THEN** Plan for the explicit date and Change day appear beside each other, with only ArrowRightLeft visible on Change day, its localized accessible name and at least 48 CSS px target intact, and one full-width Cook remains a distinct secondary action on the next row
- **AND** narrow/large-text layouts reflow within the action area without shrinking targets below 48 CSS px
- **AND** Plan another day retains Home's quieter Change Plan treatment where applicable

#### Scenario: Pending or recovery footer
- **WHEN** checking, assignment, uncertain persistence, conflict or staged recovery is active
- **THEN** existing loading, retry, review and recovery actions remain reachable without duplicate writes or a misleading enabled Plan
- **AND** changing the visual arrangement does not permit the target to change during an operation that owns it

#### Scenario: Prepared or legacy completed occurrence
- **WHEN** a completed occurrence opens
- **THEN** instructions remain readable without another completion prompt, only known preparation metadata is shown and a preview does not replace frozen context

#### Scenario: Edit, read-only review or unavailable recipe
- **WHEN** editing, original review, loading or failed detail is active
- **THEN** Save/Cancel, source review, retry and close retain their roles; a grocery-source Plan transition requires deliberate activation before normal planning is exposed

#### Scenario: Browse and grocery-source cooking layout
- **WHEN** detail in ordinary recipe browsing or grocery-source original review already offers Cook
- **THEN** that same Cook spans its footer content width without duplicating or inventing a cooking entry
- **AND** any original-review Plan transition remains separate and cannot assign merely by opening Cook

#### Scenario: Responsive full-width means the current footer
- **WHEN** English/French detail is read on phone, bounded tablet, a short viewport or with 200% text
- **THEN** Cook spans the available footer content width inside its gutters, stays at least 48 CSS px tall and remains keyboard reachable
- **AND** the taller footer and safe areas are reserved once so notes, original evidence and final reading content remain reachable without overlap
