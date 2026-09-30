# Recipe on one page — Design

**Status:** Approved for implementation on 2026-09-30

**Requirements:** [requirements.md](requirements.md)

## Verified baseline

`CooksMode` already provides a responsive cookbook-like shell. At medium widths it
places a 40% full-height hero beside the instruction surface. Preparation is step
zero, parsed instructions follow, and recipe progress is device-local. The current
editor persists a selected instruction through `updateRecipe` and reparses the
response locally.

## Component boundary

Keep fetching, parsing, preparation, issue reporting, editing state, persistence,
completion, celebration, and recipe detail ownership in `CooksMode`. Split only the
post-preparation instruction presentation:

```text
CooksMode
  ├─ GettingReadyChecklist (always shared)
  └─ CookingInstructionsBoundary
       ├─ FocusedStepView (flag false)
       └─ SinglePageStepsView (flag true)
```

The feature key occurs only at `CookingInstructionsBoundary`.

## Single-page presentation

The right-hand instruction surface becomes an ordered stack. Each step has a number,
title, instruction, contextual issue action where eligible, and a 44px edit action.
The established left hero, close action, colors, typography, and celebration remain.
The bottom control area contains a single prominent **Done** action after preparation.

On phone the stack uses one readable column. At tablet widths the existing hero and
content split remains; the implementation does not add a second text column.

## Editing model

Use stable source coordinates from the parser so a displayed step maps back to its
flat or structured instruction. Shared edit state contains the source coordinate,
confirmed text, draft, pending state, and error. Save updates only the selected
source step. Failure retains the draft and supplies inline Retry. Success reparses
the authoritative updated recipe and announces **Step saved**.

## Flag and failure behavior

The API-owned feature snapshot defaults false. If it is unavailable, the focused
view renders. The decision never delays preparation or cooking. Member changes are
available only from the progressively disclosed Settings section.

## Verification

- Parser/source-coordinate tests for flat strings, HowToStep objects, and sections.
- Component tests for shared preparation, both boundaries, all-step ordering,
  editing/save/cancel/failure/retry, completion, accessible names, and fallback.
- Provider/Settings tests for empty, opt-in, mutation, identity, and failure states.
- Playwright coverage and screenshots at phone and iPad landscape viewports.
