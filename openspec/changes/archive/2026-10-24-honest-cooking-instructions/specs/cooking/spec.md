## ADDED Requirements

### Requirement: Explain unavailable cooking instructions honestly
Cooking SHALL distinguish a failed detail read from a successful read with no usable instructions and SHALL NOT substitute invented recipe steps. Both states SHALL offer Retry and retain Close, the presentation choices and hero detail access. Mark recipe as cooked SHALL remain available through existing completion pending and failure recovery.

#### Scenario: Detail read rejects
- **WHEN** the current cooking detail read rejects
- **THEN** cooking shows a read failure and Retry without invented instructions, retaining completion and detail access

#### Scenario: Stored instructions are absent or unusable
- **WHEN** the current detail read succeeds without usable instructions
- **THEN** cooking explains that steps are unavailable and retains Retry, completion and detail access

### Requirement: Report unavailable cooking steps through existing quality recovery
For a loaded recipe eligible for content reporting with no usable instructions, cooking SHALL offer Report steps using the shared quality form with steps context. Existing server-owned submission and reimport policy SHALL apply. Cooking SHALL apply returned instructions and acknowledge a started reimport as background work, without claiming readiness. Retry SHALL reread current content explicitly.

#### Scenario: Flag missing steps and start reimport
- **WHEN** an eligible recipe has no usable steps and a report submission starts reimport
- **THEN** the shared form submits the report, cooking applies its returned recipe and acknowledges background work while Retry remains available

#### Scenario: Read recovered instructions
- **WHEN** Retry subsequently returns usable instructions
- **THEN** cooking presents those instructions using the selected reading mode

#### Scenario: Departed recipe response
- **WHEN** the cooking identity changes before its old detail read settles
- **THEN** the old response does not replace current content or failure feedback
