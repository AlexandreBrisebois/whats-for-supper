# Home Recovery Flow Hardening

## Intent

Harden the Home skip-recovery flow so its state is explicit and parent-owned instead of depending on dialog remount timing. The user experience must remain exactly the same.

## Scope

In scope:
- `pwa/src/components/home/HomeCommandCenter.tsx`
- `pwa/src/components/home/SkipRecoveryDialog.tsx`
- focused Home flow tests under `pwa/e2e/` and, only if needed, a small local unit test near the Home components

Out of scope:
- `specs/openapi.yaml`
- generated Kiota client files
- `todayStore`, planner stores, planner drag/drop, or any API semantics
- visual redesign, copy changes, animation redesign, or modal behavior changes

## Problem Statement

The current flow splits authority across multiple seams:
- `HomeCommandCenter` owns whether the recovery dialog or Quick Find modal is mounted.
- `SkipRecoveryDialog` owns its own local `step` state.
- the `"Pick Something Else"` path relies on closing one surface, selecting a recipe in another surface, then reopening the original surface at the correct step.

This makes the flow correct only if mount/unmount timing happens in the expected order. That is the architectural weakness to remove.

## UX Invariants

These behaviors are fixed and must not change:

1. Skipping tonight's recipe still opens the same Recovery Flow dialog.
2. `Order In` still keeps the user inside the Recovery Flow and advances to `What about tonight's recipe?`.
3. `Pick Something Else` still closes the Recovery Flow dialog and opens Quick Find.
4. Selecting a recipe in Quick Find still closes Quick Find and reopens Recovery Flow at `What about tonight's recipe?`.
5. Closing Quick Find without selecting a recipe must preserve today's observable behavior exactly. Do not redesign this interaction as part of this work.
6. `Move to Tomorrow`, `Save for Next Week`, and `Drop It` must keep the same visible behavior and the same backend side-effect order.
7. Existing copy, test IDs, animations, layout, and modal layering must remain unchanged.

## Architectural Requirements

1. `HomeCommandCenter` must become the single owner of the authoritative recovery flow state.
2. `SkipRecoveryDialog` must become a controlled view. It may render a step, but it must not be the source of truth for that step.
3. The Quick Find handoff must be modeled explicitly in parent state rather than inferred from remount side effects.
4. Side effects must stay outside the dialog component. API calls and `todayStore` writes remain orchestrated by `HomeCommandCenter`.
5. Keep the touched code surface as small as possible. Prefer local types and local helpers over new global abstractions.

## Contract Constraints

No API contract changes are allowed in this work.

Do not edit:
- `specs/openapi.yaml`
- `pwa/src/lib/api/generated/**`

Continue using the existing Kiota calls already present in `HomeCommandCenter` for schedule move, assign, and remove operations.

## Seam Boundaries

1. Parent-child seam: `HomeCommandCenter` decides state; `SkipRecoveryDialog` renders it.
2. Overlay seam: only one recovery surface is active at a time, but the user-visible choreography must stay the same.
3. Side-effect seam: flow transitions and backend writes must be easy to reason about separately, even if they still live in the same parent component.

## Non-Goals

1. Do not introduce XState or any new state-management library.
2. Do not move this flow into a shared store.
3. Do not refactor unrelated Home features in the same slice.
4. Do not change any planner files, including `pwa/src/store/weekStore.ts`.

## Resolved Decisions

1. Preserve the exact current UX, even where it is awkward. This is a hard requirement.
2. Favor a small local refactor over a broad architectural rewrite.
3. Prefer sequential tracer-bullet slices over parallel work, because the same small set of files forms the seam.
