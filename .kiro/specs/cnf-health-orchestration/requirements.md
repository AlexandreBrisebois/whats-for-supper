# Requirements Document: CNF Health Orchestration

## Introduction

This spec is an orchestration plan for the CNF, search, grocery, family-health, and dietitian work. It does not introduce new product behavior by itself. Its job is to keep implementation order, dependency gates, and cross-spec ownership clear while the related specs are built over multiple sessions.

The north star is simple: use deterministic food data to make search, grocery lists, recipe categorization, and health nudges more useful without translating recipes, nagging users, or making unsafe allergy claims.

---

## Requirements

### Requirement 1: Build sequence

**User Story:** As a maintainer, I want a single sequence for building the related specs, so I can move through the work without dependency drift.

#### Acceptance Criteria

1. `cnf-data-ingestion` SHALL be implemented before any downstream CNF search, grocery, family-health, or dietitian work depends on provider identity or nutrient lookup.
2. `cnf-search-augmentation` contract cleanup SHALL be completed before adding new search reason sources or nutrition-aware search filters.
3. Locale-aware grocery reconciliation SHALL be implemented after provider alias/identity lookup exists.
4. `family-health-profiles` SHALL own `HealthProfile`, allergies, intolerances, preferences, warning levels, and the first provider-backed ingredient-level allergy/intolerance reminder surface.
5. Health nudge explainability SHALL be implemented before user-facing health recommendations are expanded beyond simple deterministic warnings.
6. `dietitian-agent-phase2` SHALL be aligned to the provider strategy and current CNF schema before implementation.

---

### Requirement 2: Cross-spec ownership

**User Story:** As an implementer, I want each concern to have one owning spec, so I do not duplicate behavior or create contradictory contracts.

#### Acceptance Criteria

1. CNF/provider schema, seeding, nutrient lookup, and bilingual foundation SHALL be owned by `cnf-data-ingestion`.
2. Search alias expansion, pantry matching, nutrition search filters, grocery reconciliation, and health nudge explainability SHALL be owned by `cnf-search-augmentation`.
3. Family member health profile CRUD, deterministic health warnings, and non-blocking ingredient-level allergy/intolerance reminders SHALL be owned by `family-health-profiles`.
4. HEFI scoring, deeper dietitian scoring, and LLM weekly recommendations SHALL be owned by `dietitian-agent-phase2`.
5. If implementation discovers overlap, update the owning spec first, then implement.

---

### Requirement 3: Gates and safety checks

**User Story:** As a maintainer, I want explicit gates between waves, so unsafe or drifted behavior is caught before it becomes buried in later features.

#### Acceptance Criteria

1. Every wave SHALL pass `task agent:drift`, `task agent:test:impact`, and `task review` before the next dependent wave begins.
2. Any OpenAPI change SHALL be contract-first and followed by generated client/mock reconciliation.
3. Health guidance opt-out SHALL be verified before any health-facing search, planner, or recommendation behavior is considered complete.
4. Health-agent workflow tasks and LLM recommendation calls SHALL NOT run when health guidance is disabled.
5. Detailed justification metadata SHALL have a quiet UI home behind an information affordance, not inline on dense planner/search surfaces.
6. Allergy-safe claims SHALL NOT be introduced. Ingredient-level allergy matching SHALL produce member-specific "check ingredients" reminders, not safety assertions or planning blocks.
7. Recipe language lock SHALL be preserved throughout: recipe text remains in its source/import language, while grocery display may use provider aliases.

---

## Risks and Questions

- `dietitian-agent-phase2` still contains older ownership assumptions around ingredient-level allergy/intolerance matching. Basic matching is now pulled forward into `family-health-profiles`; dietitian work should reuse that seam instead of re-owning the first reminder surface.
- Grocery checked state is keyed by display name today. Locale-aware grocery reconciliation must preserve state before rollout.
- Health nudges can become stressful if they lack reason/source/confidence or use moralizing copy.

---

## Notes / Decisions

- **2026-05-11**: Orchestrator created to synchronize CNF data, search/grocery augmentation, family health profiles, and dietitian phase 2 implementation.
- **2026-05-11**: Added user guide, data flow, and user flow reference documents for future product documentation.
