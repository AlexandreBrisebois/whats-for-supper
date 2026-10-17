# Spec Delta

## ADDED Requirements

### Requirement: Reset aggregate history with demo state

Demo capture SHALL include aggregate history and operational round state consistent with its core snapshot. Successful demo restore SHALL replace history and invalidate stale close requests. A legacy demo snapshot without history SHALL reset demo history to empty, independently of ordinary legacy backup merge behavior.

#### Scenario: Legacy demo reset
- **WHEN** demo restore uses a core snapshot without history
- **THEN** all prior visitor history is cleared and no history is invented

#### Scenario: Captured demo history
- **WHEN** demo restore uses a valid snapshot containing history
- **THEN** that history is restored once without retaining prior visitor rows

#### Scenario: Stale browser after reset
- **WHEN** a pre-reset browser retries a close
- **THEN** it cannot clear new demo round votes or recreate old visitor history
