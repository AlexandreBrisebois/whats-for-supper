## ADDED Requirements

### Requirement: Disable Share while a share operation is pending

After Share activation, the loaded detail sheet SHALL disable its Share control until bundle preparation and delivery settle. Repeated activation of that disabled control SHALL NOT initiate another export request. Once the operation settles, the control SHALL be enabled again if the loaded recipe remains eligible.

#### Scenario: Repeat activation during bundle preparation
- **WHEN** Share has been activated and the bundle request remains pending
- **THEN** the Share control is disabled and activating it again does not request another bundle

#### Scenario: Delivery completion releases the Share control
- **WHEN** the pending share delivery completes and the loaded recipe remains eligible
- **THEN** the preparation notice is dismissed and the Share control is enabled again

### Requirement: Show pending import acceptance on the review action

While a bundle acceptance request is pending and its review remains displayed, the capture view SHALL disable the Import recipe action and show a loading indicator in that action. Repeated activation of the disabled action SHALL NOT submit another import request.

#### Scenario: Import acceptance is pending in review
- **WHEN** a person activates Import recipe and the acceptance request remains pending with the review still displayed
- **THEN** the action displays a loading indicator, is disabled, and repeated activation does not submit another acceptance request
