# Spec Delta

## ADDED Requirements

### Requirement: Select unnamed stored recipes for bulk import requests

POST `/api/recipes/imports/bulk` SHALL select nondeleted recipes whose name is null and request a recipe-import workflow for each selected identity. A nonnull name, including an empty name, SHALL exclude a recipe. Selection SHALL NOT require a saved issue, failed task or eligible contextual feedback. Shared household authentication SHALL retain household-identity ownership.

#### Scenario: Select unnamed recipes
- **WHEN** bulk import is requested with two nondeleted recipes whose names are null and orchestration succeeds
- **THEN** one recipe-import request is made for each selected recipe with its recipe identity

#### Scenario: Exclude named or deleted records
- **WHEN** stored recipes have nonnull names or have been soft-deleted
- **THEN** those recipes are excluded from bulk selection

#### Scenario: An unnamed recipe already has work
- **WHEN** an unnamed nondeleted recipe has an existing workflow and bulk import is requested again
- **THEN** that existing workflow does not exclude it from another import request

### Requirement: Return accepted bulk workflow identities without certifying repair

After all selected bulk import requests return successfully, the API SHALL return unwrapped 202 with queuedCount equal to the number of returned workflow identities and instanceIds containing those identities. An empty selection SHALL return zero and an empty list. This acknowledgement SHALL NOT certify worker execution, recipe readiness, corrected content or report resolution.

#### Scenario: Nonempty bulk acceptance
- **WHEN** every selected recipe's workflow trigger returns successfully
- **THEN** the response is 202 with queuedCount matching instanceIds and the returned identities describe workflows rather than recipe IDs

#### Scenario: No eligible unnamed records
- **WHEN** bulk selection is empty
- **THEN** the response is 202 with queuedCount zero and instanceIds empty

### Requirement: Count stored recipe-import workflows in the import summary

GET `/api/recipes/import-status` SHALL return unwrapped 200 with importedCount counting Completed recipe-import instances, queueCount counting Pending plus Processing recipe-import instances and failedCount counting Failed recipe-import instances. It SHALL count workflow instances rather than recipes or reports and SHALL exclude other workflow types and Paused instances from these counts.

#### Scenario: Count stored import states
- **WHEN** recipe-import instances exist in Completed, Pending, Processing, Failed and Paused states
- **THEN** the first four contribute to their specified counters and Paused contributes to none

#### Scenario: Other workflow types exist
- **WHEN** url-import or other workflow types have stored states
- **THEN** they contribute to none of these import-summary counters

#### Scenario: No counted instances exist
- **WHEN** no recipe-import instances occupy a counted state
- **THEN** all three counters are zero

### Requirement: Restrict import identity reads to attributed recipe context

GET `/api/recipe-imports/{importId}` SHALL require bindable existing member context and an existing nondeleted recipe identified by the workflow's recipeId parameter with matching added-by attribution. A permitted read SHALL return unwrapped 200 with stored workflow detail. Missing or inaccessible imports SHALL return 404. Shared identity transport and background-processing stored-state meanings SHALL retain their existing ownership.

#### Scenario: Read an attributed import
- **WHEN** an existing member requests an existing import whose recipeId names that member's nondeleted recipe
- **THEN** the API returns 200 with that stored instance's identity, status and workflow detail

#### Scenario: Another known member requests the import
- **WHEN** a known member requests an import whose associated recipe was added by another member
- **THEN** the API returns 404 rather than that workflow detail

#### Scenario: Import or recipe context is absent
- **WHEN** the import is absent or its recipeId does not identify an accessible nondeleted recipe
- **THEN** the API returns 404 without successful import detail
