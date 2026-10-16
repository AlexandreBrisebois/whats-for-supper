# Demo household delta

## Purpose

Describe the existing resettable showcase, its access presentation, snapshot effects, scheduling and bounded AI suppression so operators and household visitors can distinguish supported behavior from unqualified guarantees.

Shared rule owners: [household identity](../../../../../specs/household-identity/spec.md) and
[background processing](../../../../../specs/background-processing/spec.md). Named
requirements below refer to those owners without changing their shared policy.

## ADDED Requirements

### Requirement: Accept demo snapshot capture as background work

An authorized POST /api/management/demo-capture SHALL trigger demo-capture with empty parameters and return 202 containing message Demo capture task enqueued. and taskId identifying the accepted workflow instance. Acceptance SHALL follow background-processing requirement `Persist initial workflow and task identities before returning` and SHALL NOT certify capture completion.

#### Scenario: Capture accepted
- **WHEN** shared household authorization and workflow acceptance succeed for demo-capture
- **THEN** 202 contains the enqueue message and accepted instance identity as taskId

#### Scenario: Capture outside automatic mode
- **WHEN** an authorized caller requests demo-capture with DEMO_MODE disabled and workflow acceptance succeeds
- **THEN** the management action still accepts capture; automatic demo activation is not an action-level prerequisite

### Requirement: Capture the core demo data set

A successful demo capture SHALL write family-members.json, recipes.json and recipe-search-documents.json beneath the resolved data root's demo directory. It SHALL capture all queried members and search documents and active recipe rows visible through ordinary recipe filtering, without exporting votes, weekly plans or calendar events as snapshot data.

#### Scenario: Core snapshot
- **WHEN** capture completes for members, active recipes and search documents
- **THEN** the three JSON artifacts contain those queried core records

#### Scenario: Activity omitted
- **WHEN** capture runs with votes, weekly plans and calendar events present
- **THEN** capture does not export these collections into snapshot artifacts

#### Scenario: Retired recipe fields
- **WHEN** recipe snapshot serialization encounters retired fields isHealthyChoice, dietaryProfile, fopFlags, fopClassification, healthProfile, healthEvent or balanceSummary
- **THEN** those fields are omitted from serialized recipe objects

### Requirement: Copy recipe-root files into the snapshot

A successful capture SHALL replace the demo/recipes directory with recursively copied files from the resolved active recipe root. It SHALL write manifest.json with schemaVersion 1, capture time, member/recipe/search-document counts and the copied recipe-file count.

#### Scenario: Recipe-root files
- **WHEN** capture completes with metadata, originals, hero images or source PDFs present beneath the active recipe root
- **THEN** those files retain relative paths beneath demo/recipes

#### Scenario: Configured roots
- **WHEN** DATA_ROOT or DataRoot and RECIPES_ROOT or RecipesRoot select configured roots
- **THEN** capture uses the resolved data root for demo artifacts and the resolved recipe root for file copying

#### Scenario: Manifest written
- **WHEN** capture reaches successful manifest publication
- **THEN** manifest.json records the capture time and counts after copying
