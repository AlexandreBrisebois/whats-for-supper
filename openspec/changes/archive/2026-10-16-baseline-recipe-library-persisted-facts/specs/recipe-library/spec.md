# Spec Delta

## ADDED Requirements

### Requirement: Represent persisted recipe attribution and readiness

Successful recipe DTO mapping SHALL carry the stored addedBy value, including null, creation timestamp, stored readiness, deletion timestamp, image count and finished-dish index. Readiness SHALL be read as a stored flag, not inferred from title, images or synthesis status. Existing list eligibility SHALL still govern which records appear.

#### Scenario: Read stored attribution and creation time
- **WHEN** a successful eligible list or available detail read maps a recipe
- **THEN** addedBy and createdAt reflect stored values, allowing null attribution

#### Scenario: Read stored readiness and image facts
- **WHEN** an available recipe is mapped to a response
- **THEN** isReady, imageCount and finishedDishIndex reflect stored flags/count/index and images enumerates zero-based indices up to count minus one

### Requirement: Derive represented source provenance and reimport availability

Recipe DTO mapping SHALL select sourceType url for a nonempty stored source URL, otherwise photos for positive image count, otherwise synthesized. canReimport SHALL be true exactly when a stored source URL is nonempty or image count is positive. This represented availability SHALL NOT guarantee successful acquisition or the presence of an executed synthesis workflow.

#### Scenario: Prefer source URL provenance
- **WHEN** a mapped recipe has a nonempty source URL and any supported image count
- **THEN** sourceType is url and canReimport is true

#### Scenario: Represent photo provenance
- **WHEN** a mapped recipe has no nonempty source URL and positive image count
- **THEN** sourceType is photos and canReimport is true

#### Scenario: Represent absent original sources
- **WHEN** a mapped recipe has no nonempty source URL and zero originals
- **THEN** sourceType is synthesized and canReimport is false

### Requirement: Represent the persisted vegetarian value without dietary inference

The persisted vegetarian field SHALL permit true, false or null. DTO mapping SHALL preserve explicit boolean values and represent a null stored value as false. This fallback SHALL describe the API representation only and SHALL NOT establish dietary accuracy, completed classification or semantic equivalence of unknown and confirmed false.

#### Scenario: Read an explicit vegetarian boolean
- **WHEN** a successful DTO read maps a stored true or false vegetarian value
- **THEN** the API represents the same boolean

#### Scenario: Read a legacy nullable vegetarian value
- **WHEN** a successful DTO read maps a recipe whose stored vegetarian value is null
- **THEN** the API represents isVegetarian false without changing the stored nullable value by this read
