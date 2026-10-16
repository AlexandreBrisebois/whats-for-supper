# Spec Delta

## ADDED Requirements

### Requirement: Disable the restoring trash item during its request

After Restore starts for a trash item, that item's Restore control SHALL remain disabled until the request settles. The control SHALL be enabled again after rejection if its item remains displayed. Existing successful restore removal SHALL apply; this local control SHALL NOT imply serialization of all recipe mutations.

#### Scenario: Wait for an item restore
- **WHEN** a displayed trash item has an outstanding Restore request
- **THEN** that item Restore control is disabled while other item state is retained

#### Scenario: Reenable a failed restore control
- **WHEN** the Restore request rejects while its trash item remains mounted
- **THEN** the item remains displayed and its Restore control becomes enabled again

### Requirement: Display pending permanent-purge submission feedback

While a PIN purge submission is pending and its dialog remains displayed, the submit control SHALL be disabled and show Deleting…. The PIN input and Cancel SHALL remain available. This feedback SHALL NOT imply that cancellation retracts a dispatched request or that programmatic form submission is guarded.

#### Scenario: Display a pending purge request
- **WHEN** the PIN form has dispatched purge and its dialog is still open
- **THEN** the submit control displays Deleting… and is disabled while PIN editing and Cancel remain available
