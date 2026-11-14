# Design

## Context and Existing Ownership

RecipeDetailSheet currently renders a conditional original/planned toggle at the changed-preview area, another preview-return button, and the previewOnly paragraph. The original-count paragraph has its own recipe-original-yield marker. The 2/4/6 handlers clear a preview only when the selected number equals headingServings. ActionGearMenu currently hides original access while preview/original inspection is active. The parent detail owns reading state; the menu exposes callbacks.

## Decisions and Tradeoffs

Remove the requested inline controls and paragraph only. Preserve current count-label conditions and all preview computation, context ownership, stale-response guards and specific instruction-amount guidance. Preview portions plus pressed count still communicates temporary reading; no replacement warning or explanatory paragraph is added.

Deleting the links without another escape is unsafe: default five/seven, standalone basis three or unknown-basis dated original inspection cannot always return using 2/4/6. Keep progressive capabilities in the existing Recipe actions menu: View original ingredients from a non-original reading, and Reset view when preview/original inspection differs from default. Reset restores the current default rather than copying a potentially stale numeric value. Reuse existing parent state-reset handlers; no new projection endpoint, persisted state, general menu redesign or ingredient correction is needed. Keep unknown-yield correction, grocery-source original evidence, prepared occurrence facts and hero View original source access.

The tradeoff is one extra menu opening for original/reset, in exchange for less inline noise. This is a deliberate small design addition for review; no product change is authorized until Alex approves it. Removing original/reset capability entirely would contradict both the retained preview behavior and current grocery/prepared recovery contracts.

## First Observable Slice

Open a dated default five → preview six → see the unchanged original-count label without the inline links/message → Recipe actions Reset view → same list returns to five with zero writes. Then cover original inspection and failed-preview reset with the same menu/parent ownership. Standalone basis three and prepared seven prove reset is not accidentally tied to 2/4/6.

## State, Concurrency and Recovery

Reuse existing previewSelection/originalEvidenceScope and current default projection. Menu inspection/reset retires obsolete temporary responses and moves focus to Ingredients or the connected trigger. Pending/error states remain honest; reset must not label old preview lines as current default while a default read is unavailable. Preserve scoped error/retry and available original evidence rather than fabricate quantities. Background reads/resume retain deliberate preview intent until an explicit reset or existing identity boundary.

## User Experience

Keep 2/4/6, Preview portions, effective count and existing Original recipe: N servings conditions. Remove only the inline original/planned links and requested sentence. Use dedicated localized menu names View original ingredients / Reset view with equivalent French labels and existing 48 px targets. No persistent new label, tooltip, banner or warning replaces the removed sentence. Preserve specific instruction-amount guidance only in its existing applicable changed-preview state.
