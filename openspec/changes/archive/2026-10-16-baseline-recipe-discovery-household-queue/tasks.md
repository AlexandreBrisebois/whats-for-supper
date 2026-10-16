# Tasks

## 1. Extract and reconcile documentation

- [x] 1.1 Trace the bounded journey through entry, client, approved OpenAPI, service and persistence; inspect actual assertions/substitutions and record BSL-recipe-discovery-001–005, 008–009 in the capability plan. Acceptance: named evidence entries and requirement/scenario mappings exist.
- [x] 1.2 Draft disjoint recipe-discovery requirements and scenarios; review every normative clause against those entries and keep disputed findings outside the delta. Acceptance: mapping covers every requirement/scenario and exclusions have reasons.

## 2. Validate documentation

- [x] 2.1 Run `openspec validate baseline-recipe-discovery-household-queue --strict --no-interactive` and reconcile all selected discovery deltas with `openspec validate --all --strict --no-interactive`. Acceptance: actual results recorded separately from runtime evidence.
- [x] 2.2 Review the complete task-owned file set, run `task verify -- <every changed/new discovery plan and artifact path>`, inspect `.task/agent-finish/last-run.json` and compare before-images for preservation. Acceptance: results and scope recorded in the capability plan or final response.

Behavior red/green, application unit/API/browser tests, generated-client checks and database qualification are not applicable to this documentation change; runtime observation is not-run under the user's restriction. No application implementation tasks are authorized or generated. Checkboxes record documentation work only, never human acceptance or promotion.
