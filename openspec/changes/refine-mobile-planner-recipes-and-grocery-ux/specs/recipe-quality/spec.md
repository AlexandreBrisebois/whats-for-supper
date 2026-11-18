## MODIFIED Requirements

### Requirement: Apply the authoritative submission result in detail

After successful Save without launch failure, detail SHALL display the returned recipe and dismiss the form. A started attempt with an import ID SHALL show background re-import acknowledgement. Unchanged failed feedback SHALL explain that new detail is needed for another attempt, while ordinary manual-only saves SHALL update the inline issue indicator silently without a toast.

#### Scenario: Successful manual save
- **WHEN** a new or edited manual-only report submission succeeds in detail
- **THEN** the form closes and returned issue detail displays inline without showing `Marked for review` or `Changes saved` toast alerts

#### Scenario: Started attempt acknowledgement
- **WHEN** detail receives reimportStarted true and an import ID without launch failure
- **THEN** it closes the form and shows `Reimporting in background`

### Requirement: Apply successful resolution to the open detail

After a successful resolution response, detail SHALL replace its local recipe with the returned recipe and dismiss the issue form without showing a `Marked as resolved` toast. Returned cleared issue detail SHALL remove its inline issue indicator and change its gear action to Report issue. This outcome SHALL NOT imply that every already loaded parent result was refreshed.

#### Scenario: Apply the authoritative cleared response
- **WHEN** detail receives a successful resolution response with importIssue null
- **THEN** the form closes, local detail uses the returned recipe, its issue indicator disappears, and no `Marked as resolved` toast is shown

#### Scenario: Open the gear menu after resolution
- **WHEN** the person opens the detail gear menu after that cleared response
- **THEN** it offers Report issue instead of Review issue
