# Design

## Context

See proposal.md. This is a documentation extraction at commit `04a1c4570f9bbb01b47436790d4248635ac3179a`; it does not implement a new interaction. The ownership gap is member-preferences X-MP03: effective mode selection is covered, while the mounted Planner gesture was excluded without a precise meal-planning owner requirement.

## Goals / Non-Goals

**Goals:** Connect existing handle activation to existing meal-planning drag-preview/drop coverage and retain exact test limits.

**Non-Goals:** Change pointer handling, calendar mutation, contracts, configuration, tests, accessibility policy or device guarantees; accept/promote/archive the draft.

## Decisions

Use ADDED requirements under meal-planning, not a new capability or duplicated member-preferences flag policy. The first observable slice is Planner recipe card → PlannerDragHandle → existing drag-controls start; no API request is submitted by the handle. Drop, optimistic schedule changes and persistence remain existing meal-planning requirements.

Evidence mapping (BSL-meal-planning-drag-activation-001):

| Requirement and scenarios | Source | Existing meaningful assertions |
| --- | --- | --- |
| Activate Planner dragging according to the effective hold preference; Immediate mode / Hold reaches activation / Ineligible pointer | `pwa/src/components/planner/PlannerDragHandle.tsx:10–44` | `PlannerDragHandle.test.tsx`: disabled mode starts immediately; at 249ms no start/vibration, at 250ms one start and vibration(15), grabbed true; secondary button ignored. Explicitly non-primary behavior is source-only. |
| Cancel pending Planner holds before drag activation; Scroll movement before activation / Release or interruption / Handle or mode changes | same source `:46–83` | Existing tests assert no start after pointerUp/pointerCancel/blur, >8px movement plus touchmove, second pointer, unmount, and flag change. PointerEvent is substituted, timers are fake. |
| Bound Planner grabbed feedback to the active pointer interaction; Touch movement after activation / Activated pointer ends | same source `:51–62,87–104` | Existing tests assert defaultPrevented only after activation and grabbed false after pointerUp. Other reset branches are source-supported. |

Integration is mounted from `pwa/src/app/(app)/planner/page.tsx` via PlannerDragHandle and existing drag controls. Existing main requirement `Preview a drag as a swap of dated Planner content` covers later preview/drop, not these activation/cancellation outcomes. The alternative of retaining only X-MP03 was rejected because it leaves a supported mobile interaction unowned.

## Risks / Trade-offs

[Mocked pointer delivery differs from physical touch browsers] → Record component tests separately from device/browser qualification; no universal scroll, vibration, keyboard or accessibility guarantee.

[Timer threshold can be misread as end-to-end drag completion] → Explicitly keep persistence under existing drop behavior. No reordering success is claimed from activation alone.

[Broader movement defects exist] → Preserve MP-U04/MP-U05 and Tonight limitations; this draft does not make contested collision, retry or grocery outcomes normative.

## Verification

Passed: `npm run test:unit -- src/components/planner/PlannerDragHandle.test.tsx` from pwa: one file, 11 tests, exit 0. Existing tests were run without source/test changes. Vite emitted a configuration-loader future-compatibility warning; no failed test. Browser/device/API/database checks not-run. TDD/new tests, generated-client changes and migrations not-applicable to this documentation extraction. Draft acceptance and promotion remain pending.
