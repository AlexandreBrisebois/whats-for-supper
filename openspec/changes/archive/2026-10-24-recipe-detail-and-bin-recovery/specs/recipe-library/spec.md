## ADDED Requirements

### Requirement: Recover failed detail reads
The detail sheet SHALL replace pending feedback with visible failure feedback and Retry when its current read fails. Retry SHALL read the selected recipe again and retain Close. A response for a departed recipe identity SHALL NOT replace current content or feedback, and content for a previous identity SHALL NOT remain visible.

#### Scenario: Retry a failed initial read
- **WHEN** an initial detail read rejects and the person selects Retry
- **THEN** the sheet shows failure feedback followed by pending feedback and the retry result

#### Scenario: Replace recipe identity
- **WHEN** the selected identity changes while an earlier read is pending or content is loaded
- **THEN** the old content and any late response for that identity do not appear as current detail
