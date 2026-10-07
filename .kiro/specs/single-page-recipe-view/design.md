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

The right-hand instruction surface becomes an ordered stack. Each step has a number, an optional meaningful title, instruction, contextual issue
action where eligible, and a 44px edit action. Generic “Step N” titles and titles
identical to the instruction are hidden in this presentation. The list has no
repeated page-level step or cooking headings. Instructions use the full card width.
The established left hero, close action, colors, typography, and celebration remain.
The compact bottom control area contains **Ingredients** and a prominent **Cooked**
action after preparation. Ingredients temporarily shows the existing checklist
without changing the stored step bookmark or checked items. Resume steps restores
the exact prior instruction scroll offset. Ingredient navigation is disabled while
an editor is open. The single-page dock uses 48px controls and 8px vertical padding,
plus the bottom device safe area. Scrolling updates
the reading-position indicator and device-local step bookmark without marking the
meal cooked. Reopening restores that step; scrolling does not remount the list or
editor. The focused-step path retains its headings, Next/Back navigation and Done
action. The phone cooking banner and list spacing are compact; tablet imagery
remains beside the instructions.

For scanning, meaningful section labels appear once above the first card in that
section; the parser retains its existing prefixed instruction for the focused view
and exposes the section label separately. The single-page body uses the unprefixed
editable source text. Cards without a meaningful supplied heading show their number
and instructions. Sentence segmentation changes layout only; instruction wording
stays plain and fully visible. If sentence segmentation is
unavailable, the full instruction remains readable as one block. No display change
rewrites saved recipe instructions or invents titles.

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
