# Grocery shopping delta

## Purpose

Describe existing household grocery derivation and shopping progress, with explicit compatibility and recovery boundaries.

## ADDED Requirements

### Requirement: Replace the weekly check map through the full-map API

For an existing weekly plan and supported dictionary body, successful PATCH /api/schedule/{weekOffset}/grocery SHALL replace its stored check map with the supplied string-to-boolean entries, preserving explicit false values and removing omitted prior entries.

#### Scenario: Replace populated map
- **WHEN** a successful request supplies Tomato false and the prior map also had Lettuce true
- **THEN** a subsequent successful read contains Tomato false without Lettuce

#### Scenario: Clear map
- **WHEN** a successful request supplies an empty dictionary
- **THEN** the stored check map is empty

### Requirement: Return the full-map result in the declared success envelope

After full-map persistence and its publication attempt complete, the bulk operation SHALL return 200 with the resulting dictionary under data. This operation SHALL leave the week's persisted grocery line items unchanged.

#### Scenario: Successful response
- **WHEN** a full-map replacement completes
- **THEN** the response is 200 with data equal to the submitted dictionary

#### Scenario: Checks without line mutation
- **WHEN** a full-map replacement completes for a week with existing grocery lines
- **THEN** only its checks change and the grocery lines remain stored
