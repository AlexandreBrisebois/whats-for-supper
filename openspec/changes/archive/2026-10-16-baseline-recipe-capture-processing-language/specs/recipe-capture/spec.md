# Recipe capture processing language delta

## ADDED Requirements

### Requirement: Request the configured processing language without certifying output language

When IMPORT_TARGET_LANGUAGE contains a nonblank value other than case-insensitive NONE, capture processing SHALL request that language for recipe extraction, description synthesis and generated recipe descriptions. Missing, whitespace-only or NONE values SHALL add no target-language override. This request SHALL NOT certify the language or accuracy of persisted provider output.

#### Scenario: Extract recipe content with an enabled target
- **WHEN** photo, rendered PDF or web-content extraction executes with an enabled target-language value
- **THEN** the provider request asks for the recipe name, ingredients, instructions and sections in that language
- **AND** ordinary semantic validation still governs whether extracted recipe content can be persisted

#### Scenario: Synthesize from a description with an enabled target
- **WHEN** description synthesis executes with an enabled target-language value
- **THEN** the provider request includes the target-language request alongside the submitted description
- **AND** the existing synthesis parsing and fallback rules remain in effect without a language-conformance guarantee

#### Scenario: Generate a recipe description with an enabled target
- **WHEN** generated recipe-description processing executes with an enabled target-language value
- **THEN** the provider request asks for that description in the configured language

#### Scenario: Target override disabled
- **WHEN** processing configuration is absent, whitespace-only, or equals NONE without regard to case
- **THEN** processing adds no configured target-language override to those requests
- **AND** this absence does not certify preservation of the source language
