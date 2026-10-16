# Household identity — capture attribution delta

## ADDED Requirements

<!--
**Evidence and status (non-normative):**

Draft for human review, implementation-supported only; no acceptance, promotion, archival or runtime qualification. A34 and BSL-household-identity-014–016/U22 remain deferred.

Historical BSL-015 review statement: “However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.” Subsequently the user reported later authorization and promised the original instruction/reference; that reference remains pending. This historical statement is not a product requirement or a new denial of the user-reported authority. No implementation acceptance or runtime qualification is inferred.
Non-normative review history is also rendered in design.md; comments are not promoted by archive.
-->

### Requirement: Attribute initial URL and photo captures to the bound member

For authorized ordinary-household URL or photo capture with an existing bound member, when initial persistence succeeds, the API SHALL record that member's ID as `addedBy` in both the recipe row and initial recipe metadata. This attribution SHALL identify the submitting member without establishing a personal account or exclusive ownership of the shared recipe. Capture acceptance, dispatch and readiness SHALL follow recipe-capture requirements.

#### Scenario: Attribute a successfully persisted URL intake
- **WHEN** POST `/api/recipes/capture-url` binds an existing member and initial persistence succeeds
- **THEN** the new recipe row and initial recipe metadata record that member as addedBy
- **AND** this records the submitter without certifying background completion

#### Scenario: Attribute a successfully persisted photo intake
- **WHEN** POST `/api/recipes` binds an existing member and initial photo persistence succeeds
- **THEN** the new recipe row and initial recipe metadata record that member as addedBy
- **AND** this records the submitter without certifying background completion
