# Spec Delta

## MODIFIED Requirements

### Requirement: Clean failed-capture residue subject to the current recipe guard

For a failed-capture residue command, maintenance SHALL retain a recipe that is discoverable, has a nonblank name with images or synthesis, or retains persisted ingredient, instruction or canonical content (including explicit saved empty values). Otherwise, when the recipe exists, it SHALL delete its retained directory and remove the database recipe, recording the outcome.

#### Scenario: Safe residue
- **WHEN** the command targets a non-ready-shaped undiscoverable placeholder without persisted recipe content and successful persistence is possible
- **THEN** its directory and recipe are removed and the command completes

#### Scenario: Recipe became ready-shaped
- **WHEN** the target recipe has a nonblank name and positive image count
- **THEN** the recipe is retained and the command is skipped

#### Scenario: Missing recipe
- **WHEN** the target recipe no longer exists
- **THEN** the command completes with recipe-not-found

#### Scenario: Preserve accepted content corrections
- **WHEN** deferred cleanup encounters a recipe with persisted original content, including human-cleared ingredient or instruction collections
- **THEN** it retains the recipe, its files and reports instead of deleting accepted corrections
