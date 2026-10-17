# Tasks

Documentation-only extraction under A37 in the [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md). No application implementation tasks. BSL-018/019 maps all five requirements/12 scenarios; application TDD, API/client regeneration and runtime qualification are not applicable to this edit. Runtime observations remain not-run under A34.

## 1. Extract and reconcile the baseline

- [x] 1.1 Reconcile the shared editor → PUT/client → controller/service → existing EF row → returned-label path against BSL-018, current source and assertions. Verify unchanged discovery inputs and confirm the “Open”, “Cancel”, “Submit”, “Update and return” and “Display” requirements describe connected existing behavior only; record U23/U24, test substitutions and current runtime not-run in the plan.
- [x] 1.2 Create proposal, five ADDED requirements/12 scenarios and extraction design. Review every scenario against BSL-019 mapping; preserve shared access/selected-name owners, the user-requested historical status sentence and all existing main requirements. Exclude rename duplicate/error-recovery redesign and deferred implementation/database work.

## 2. Validate the documentation draft

- [x] 2.1 Run `openspec validate baseline-household-identity-member-renaming --strict --no-interactive`; confirm five ADDED requirements/12 scenarios, no MODIFIED/REMOVED blocks, no new capability or main-spec changes, and requirement descriptions within installed limits. Verify artifact status includes proposal/specs/design/tasks and reconcile draft versus acceptance statuses in the plan.
- [x] 2.2 Review the six task-owned paths (plan plus this change's metadata/proposal/spec/design/tasks), links and actual diff; run `task verify --` with exactly those paths after final edits. Require successful documentation/content checks, unchanged unrelated/index content, and report outcome/content identity. No application tests or live/SQL checks are claimed by these documentation results.

## Workflow follow-up

- A38: user requested promotion on 2026-10-15; all five additions/12 scenarios are now promoted unchanged into main household identity (30 requirements/82 scenarios). No separate acceptance statement was supplied; promotion was directly authorized.
- This change remains active. Archival is a separate later action; no application implementation or runtime qualification follows from completed extraction tasks or promotion.
- Next discovery is API member removal, then Profile switching. Recipe-library is queued after identity requirements coverage or explicit deferral. Implementation and database qualification remain deferred under A34.
