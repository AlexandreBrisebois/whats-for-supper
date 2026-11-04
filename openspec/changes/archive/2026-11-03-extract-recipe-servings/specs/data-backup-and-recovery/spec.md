# Spec Delta

## ADDED Requirements

### Requirement: Preserve recipe servings without extending recipe info

Recipe exports SHALL preserve the database serving count, including null, in their recipe.json envelope and retain raw recipeYield metadata. Export SHALL NOT add either field to recipe.info. Current-format disk sync and merge restore SHALL honor an explicitly exported count or null; legacy content without that field SHALL derive its count from unambiguous raw serving-yield metadata.

#### Scenario: Current export and restore
- **WHEN** a recipe with database servings 4 and raw recipeYield “4 portions” is exported and successfully restored or synchronized from that export
- **THEN** the database has servings 4, raw yield and ingredients remain retained, and recipe.info has no added yield/count field

#### Scenario: Manually corrected count
- **WHEN** a recipe corrected through editing to servings 3 still has raw recipeYield “4 portions” and is exported, merge-restored or synchronized from that export
- **THEN** its authoritative count remains 3, raw yield and ingredient quantities remain unchanged, and recipe.info gains no yield/count field

#### Scenario: Explicit unknown count
- **WHEN** a current recipe export explicitly has servings null despite retaining older yield text
- **THEN** restore and disk sync retain null rather than treating it as a legacy missing field

#### Scenario: Legacy exported envelope
- **WHEN** an older recipe.json envelope lacks servings but its rawMetadata string contains recipeYield “2 portions”
- **THEN** restore and disk sync derive database servings 2 from the decoded raw metadata, without treating the outer envelope as source recipe content

#### Scenario: Legacy direct recipe content
- **WHEN** a legacy recipe.json directly contains recipeYield “4 portions” without an export envelope
- **THEN** restore and disk sync derive database servings 4 without changing the printed ingredient quantities

#### Scenario: Invalid exported count
- **WHEN** a present exported servings field is negative, zero, fractional, out of integer range, or of the wrong JSON type
- **THEN** that record is reported as invalid through existing recipe-load failure handling rather than silently inferring a replacement count

### Requirement: Preserve servings in compatible exact recovery

Compatible exact snapshots SHALL include the serving column as an authoritative recipe-table fact and restore it with the rest of that row. Existing exact schema compatibility checks SHALL remain applicable; an incompatible pre-column snapshot SHALL be rejected before live publication rather than implicitly migrated during exact restore.

#### Scenario: Compatible exact round trip
- **WHEN** an exact snapshot containing recipes with servings 4 and null is restored into a compatible schema
- **THEN** the restored counts are exactly 4 and null, independent of yield parsing

#### Scenario: Exact recovery of a manual correction
- **WHEN** a compatible exact snapshot contains manually corrected servings 3 and raw recipeYield “4 portions”
- **THEN** exact restore retains servings 3 independently of the raw yield

#### Scenario: Schema mismatch
- **WHEN** a pre-column exact snapshot is selected against the changed schema
- **THEN** existing preflight rejects the mismatch without changing live state
