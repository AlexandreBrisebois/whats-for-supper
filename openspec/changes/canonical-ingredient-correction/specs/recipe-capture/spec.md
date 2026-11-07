# Spec Delta

## MODIFIED Requirements

### Requirement: Background web acquisition and recipe extraction

Acquisition SHALL retain the source URL and acquired HTML after successful context processing and attempt a supplied hero URL without requiring its success. Extraction SHALL persist semantically valid normalized content and one canonical ingredient collection; legacy ingredient strings SHALL derive from that collection.

#### Scenario: Fetch webpage content and hero image
- **WHEN** the acquisition task executes for a recipe URL
- **THEN** after successful context processing it retains the source URL and HTML, uses a host-based title fallback if no title is returned, and attempts download only when a hero URL is supplied

#### Scenario: Scraping forbidden fallback
- **WHEN** fetching the source URL returns HTTP 403 Forbidden
- **THEN** the acquisition logs a warning and context processing proceeds with empty HTML and uses the URL host as a title fallback when no title is returned

#### Scenario: AI-assisted extraction and semantic validation
- **WHEN** recipe extraction runs against source HTML
- **THEN** it validates candidate structured content for a name, ingredients and usable instruction steps before normalizing and persisting it
- **AND** an invalid final candidate fails extraction rather than certifying successful capture

#### Scenario: Preserve coherent ingredient facts from web extraction
- **WHEN** a valid web candidate is published for a new recipe
- **THEN** exact ingredient text and optional quantity facts are published together under canonical ingredient validation
- **AND** unknown or intentionally unquantified amounts remain explicit rather than dropping their ingredients

### Requirement: Multimodal OCR vision recipe extraction and semantic validation

The background photo recipe-import workflow SHALL extract across all staged images, validate semantic completeness and publish normalized content with one canonical ordered ingredient collection. Ingredient text, optional numeric facts and source evidence SHALL have a common publication revision; derived legacy arrays SHALL NOT be independently authored current content.

#### Scenario: Extract recipe details from staged photos
- **WHEN** the recipe extraction task executes for a photo-based recipe
- **THEN** the agent submits staged image binaries to the multimodal model, parses structured recipe JSON, verifies required fields (name, ingredients, instructions), and saves normalized recipe content

#### Scenario: Refinement triggered on incomplete initial extraction
- **WHEN** initial vision extraction produces JSON missing required ingredients or instructions
- **THEN** the extractor triggers a refinement prompt to complete missing details before finalizing extraction

#### Scenario: Retain text when a quantity cannot be established
- **WHEN** otherwise complete photo or rendered-page extraction contains an ingredient without a trustworthy numeric amount
- **THEN** its exact ingredient text remains in the canonical collection with independently nullable quantity fields and retained evidence
- **AND** the absence of a number alone neither drops that ingredient nor changes household report membership

### Requirement: Generate recipe content from the submitted description

Description synthesis SHALL persist generated content and synthesized identity using one canonical ingredient collection. An unparseable response or absent usable name SHALL retain a minimal recipe named from the description with empty ingredients and instructions. Generated facts SHALL be identified as synthesized rather than verified original-source evidence.

#### Scenario: Persist generated recipe content
- **WHEN** synthesis receives parseable recipe content with a usable name
- **THEN** it persists that content and identifies the recipe as synthesized for subsequent processing

#### Scenario: Unusable synthesis response
- **WHEN** synthesis receives malformed recipe JSON or content with no usable name
- **THEN** it persists a minimal recipe named from the submitted description with empty ingredients and instructions
- **AND** this fallback alone does not establish a complete cookable recipe

#### Scenario: Publish synthesized ingredient facts coherently
- **WHEN** synthesis returns valid ingredient text and numeric facts
- **THEN** those facts are published together under canonical ingredient validation and legacy strings are derived from the saved collection
- **AND** synthesis does not claim retained original-source evidence for inferred amounts

## ADDED Requirements


### Requirement: Normalize supported ingredient inputs at capture publication
Supported legacy ingredient inputs SHALL be converted at the ingestion boundary into canonical lines without inventing quantity, unit or serving basis. Normalized extraction evidence SHALL be retained separately from current ownership and SHALL NOT be described as an immutable original provider response.

#### Scenario: Legacy extraction shape enters publication
- **WHEN** supported text and nested or flat legacy quantity facts enter canonical publication
- **THEN** only demonstrably associated facts populate the same ingredient line and uncertain facts remain unresolved with retained evidence
- **AND** unsupported provider properties do not silently become trusted canonical quantities
### Requirement: Preserve report-triggered repairs through protected reprocessing

Existing recipe reporting and eligible user-triggered reimports SHALL remain available with their eligibility, deduplication, source, quota and report-resolution safeguards. Reprocessing SHALL stage content and publish only against current content/source revisions while preserving protected human fields. Reads and migration SHALL NOT trigger repairs.

#### Scenario: Eligible report still launches
- **WHEN** eligible Ingredients or Steps feedback with a nonblank note requests repair
- **THEN** the existing contextual reimport may start and exposes its attempt without claiming a correction completed

#### Scenario: Delayed repair after correction
- **WHEN** a person clears a quantity after a repair captured its baseline
- **THEN** a late result cannot overwrite the clear, instructions or protected shopping name, and current content remains usable

#### Scenario: Reports stay separate
- **WHEN** controlled reprocessing publishes improved facts
- **THEN** it does not automatically resolve unrelated household feedback or claim uncertain bindings are validated
