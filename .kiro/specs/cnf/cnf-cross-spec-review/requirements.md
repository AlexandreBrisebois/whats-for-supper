# Requirements Document: CNF Cross-Spec Review

## Introduction

This spec exists to preserve the remaining review intelligence from the coordinated CNF, search, grocery, family-health, and dietitian planning work. It is not a product feature and should not be implemented directly.

Its purpose is to break the large cross-spec review into independent decision branches that can be opened in separate conversations. Each branch should use the `shared-understanding` protocol: review the relevant specs/code, surface one blind spot, offer 2-3 solutions, recommend one, and wait for the human decision before moving on.

## Requirements

### Requirement 1: Preserve Review Branches

**User Story:** As the human planner, I want the remaining blind spots captured as a durable review backlog, so future conversations do not depend on one large context window.

#### Acceptance Criteria

1. The spec SHALL list each known cross-spec review branch.
2. Each branch SHALL name the impacted specs.
3. Each branch SHALL include a standalone kickoff prompt suitable for a fresh Codex conversation.
4. Each branch SHALL preserve the review style: one issue at a time, 2-3 solutions, recommended path, then wait for the human decision.
5. Branches SHALL avoid implementation instructions unless the human explicitly asks to patch specs or code.

### Requirement 2: Maintain Household-Utility Framing

**User Story:** As the product owner, I want every review to be judged by household usefulness, so the system reduces mealtime anxiety instead of adding clever-but-heavy health machinery.

#### Acceptance Criteria

1. Reviews SHALL use the Mère-Designer lens from `.agents/prompts/mere-designer.md`.
2. Reviews SHALL explicitly ask whether the behavior reduces cognitive load for a busy household.
3. Reviews SHALL flag any path that creates nagging, false certainty, hidden blocking behavior, or dense explanation UI.
4. Reviews SHALL keep core supper workflows intact: capture, search, planning, cooking, and grocery lists.

### Requirement 3: Protect Contract-First Boundaries

**User Story:** As a maintainer, I want every review branch to check contract and ownership boundaries, so the specs do not create schema drift or duplicated implementations.

#### Acceptance Criteria

1. Reviews SHALL check `specs/openapi.yaml` whenever DTOs, routes, warnings, filters, or schedule/search responses are discussed.
2. Reviews SHALL check ownership across:
   - `.kiro/specs/cnf-data-ingestion`
   - `.kiro/specs/cnf-search-augmentation`
   - `.kiro/specs/cnf-health-orchestration`
   - `.kiro/specs/family-health-profiles`
   - `.kiro/specs/dietitian-agent-phase2`
3. Reviews SHALL identify duplicated seams before recommending implementation.
4. Reviews SHALL prefer the smallest spec correction that prevents downstream drift.

## Notes / Decisions

- 2026-05-11: Created to externalize the remaining cross-spec review backlog from the large CNF health orchestration review conversation.
- 2026-05-11: Branch R0 resolved: ingredient-level allergy/intolerance matching is pulled forward into `family-health-profiles`; allergy output is a non-blocking, member-specific "check ingredients" / "possible match" reminder and never a planning block or safety assertion.
