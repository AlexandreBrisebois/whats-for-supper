# Overlay Design System — Requirements

## Purpose

Give every temporary surface in the PWA a predictable interaction model so Mom can understand where it came from, how to dismiss it, and where the primary action will be without reorienting at different screen sizes.

This feature standardizes presentation, accessibility, responsive behavior, motion, and stacking for existing overlays. It does not change the business behavior inside those overlays.

## Product language

- **Bottom sheet**: a contextual task surface attached to the bottom edge.
- **Dialog**: a compact, centered interruption that asks for a decision or enables a short sharing/confirmation task.
- **Full-screen mode**: an immersive surface that temporarily replaces the app workspace.
- **Lightbox**: a full-screen media viewer.
- Component names such as `Modal` or `Sheet` do not determine behavior; the interaction purpose does.

## R1 — One explicit overlay type

1. Every interactive overlay SHALL be classified as exactly one of: bottom sheet, centered dialog, full-screen mode, or lightbox.
2. An overlay SHALL NOT switch between bottom sheet and centered dialog only because the viewport crosses a breakpoint.
3. Responsive changes MAY adjust width, height, padding, or internal layout without changing the overlay's classified type.
4. A component that intentionally supports more than one type SHALL require an explicit type or variant prop; breakpoint utility classes alone SHALL NOT select its interaction model.
5. Loading and progress masks that contain no user decision SHALL remain outside this taxonomy.

## R2 — Bottom-sheet behavior

1. Contextual actions, short forms, filters, and task choices SHALL use a bottom sheet unless a documented exception applies.
2. A bottom sheet SHALL remain attached to the bottom edge at every supported viewport width.
3. On wide screens, a bottom sheet MAY use a constrained width, but SHALL remain bottom-anchored.
4. A bottom sheet SHALL use rounded top corners and SHALL NOT use rounded bottom corners that visually detach it from the viewport edge.
5. A bottom sheet SHALL respect the bottom safe-area inset.
6. The primary action SHALL remain in or near the lower thumb zone on a 6.7-inch mobile viewport.
7. Long content SHALL scroll inside the sheet while its header and critical actions remain available where practical.
8. Drag-to-dismiss is out of scope; the visual handle MAY remain as an affordance only where it already exists.

## R3 — Centered-dialog behavior

1. Confirmations, security challenges, and compact copy/share tasks MAY use a centered dialog.
2. A centered dialog SHALL remain centered at every supported viewport width.
3. A centered dialog SHALL have a bounded width, four rounded corners, and viewport-edge clearance on small screens.
4. A centered dialog SHALL NOT animate as though it is physically attached to the bottom edge.
5. Destructive confirmations SHALL remain visually and semantically distinct without introducing raw red or black values outside approved tokens.

## R4 — Full-screen and lightbox behavior

1. Cook Mode and other immersive workflows SHALL remain full-screen.
2. Media inspection MAY use a full-screen lightbox with a darkened media canvas.
3. Full-screen surfaces SHALL expose an accessible close or back action in a consistent top corner.
4. A full-screen surface SHALL preserve and restore the underlying workflow context when closed.
5. This feature SHALL NOT convert full-screen modes or lightboxes into sheets or dialogs.

## R5 — Canonical visual language

1. Standard overlays SHALL use Soft Cream or the repository's canonical Solar Earth glass surface; stark white SHALL NOT be the default outer surface.
2. Standard backdrops SHALL use one shared tokenized treatment per overlay type.
3. Bottom sheets and dialogs SHALL use shared radius, border, shadow, spacing, and maximum-width tokens rather than independent ad-hoc values.
4. Headings SHALL use Outfit through the existing `font-heading` token; body and control copy SHALL use the existing body font.
5. Terracotta SHALL identify primary action, Ochre SHALL identify discovery/highlight moments, and Sage SHALL identify success or resolution.
6. Color SHALL NOT be the only means of conveying status, selection, or destructive intent.
7. Existing `data-testid` attributes SHALL be preserved and SHALL NOT be used as styling hooks.
8. Lightboxes MAY retain a dark media canvas as an explicit exception to the cream surface rule.

## R6 — Motion

1. Bottom sheets SHALL enter from and exit toward the bottom edge.
2. Centered dialogs SHALL use a restrained opacity/scale transition and SHALL NOT travel from the bottom edge.
3. Full-screen modes and lightboxes SHALL use transitions suited to continuity of context, not sheet motion.
4. Standard overlay motion SHALL use the canonical spring profile where spring motion is appropriate.
5. All non-essential motion SHALL respect `prefers-reduced-motion`.
6. Opening or closing an overlay SHALL NOT cause the underlying page to jump.

## R7 — Accessibility and input behavior

1. Every bottom sheet and centered dialog SHALL expose `role="dialog"`, `aria-modal="true"`, and an accessible name using `aria-labelledby` or `aria-label`.
2. Every lightbox SHALL expose an appropriate dialog name or equivalent accessible full-screen viewer semantics.
3. Opening an interactive overlay SHALL move focus to a deliberate element within it.
4. Tab and Shift+Tab SHALL remain within the active modal surface.
5. Escape SHALL close the topmost dismissible overlay.
6. Closing SHALL restore focus to the element that opened the overlay when that element still exists.
7. Backdrop dismissal SHALL be supported where the current flow is safely dismissible.
8. Backdrop elements SHALL NOT be announced as interactive controls.
9. Close controls and other touch targets SHALL meet the existing 44-by-44-pixel minimum.
10. Body text and control labels SHALL meet WCAG AA contrast of at least 4.5:1; large text and meaningful graphical controls SHALL meet their applicable WCAG AA thresholds.
11. Background content SHALL not be operable by keyboard or assistive technology while an aria-modal surface is active.
12. When multiple overlays are temporarily required, only the topmost surface SHALL receive focus and dismissal input.

## R8 — Scroll, viewport, and safe areas

1. Opening a modal surface SHALL prevent background scrolling without losing the underlying scroll position.
2. Overlays SHALL use dynamic viewport sizing where browser chrome or virtual keyboards can otherwise obscure content.
3. Text inputs and primary actions SHALL remain reachable when the software keyboard is visible.
4. Content SHALL remain usable at 320 CSS pixels wide and at 200% browser zoom.
5. Scroll ownership SHALL be explicit: either the panel or a named inner content region scrolls, never both accidentally.

## R9 — Layering and composition

1. Overlay layers SHALL use a documented semantic scale instead of unrelated local z-index values.
2. A child overlay opened from another overlay SHALL appear above its parent and SHALL NOT be hidden behind it.
3. A workflow SHOULD close or suspend its parent overlay before opening an unrelated peer flow when preserving both surfaces is unnecessary.
4. Nested confirmation dialogs MAY remain above their owning sheet when the relationship is explicit and focus is isolated to the confirmation.
5. Toasts and persistent navigation SHALL NOT appear above a blocking modal surface unless the toast reports an action performed inside that surface.

## R10 — Existing-surface classification

1. `RecipeImportIssueSheet` SHALL be a bottom sheet at all widths.
2. `RecipeFiltersSheet` SHALL remain a mobile-only bottom sheet; desktop inline filters SHALL remain unchanged.
3. `RecycleBinSheet`, the Family GOTO chooser, and the Library Toast action drawer SHALL be bottom sheets at all widths.
4. `InviteLinkDialog`, the planner Nudge dialog, and the elevated PIN confirmation SHALL be centered dialogs at all widths.
5. `QuickFindModal` SHALL remain a centered, card-focused discovery experience.
6. `CooksMode`, `OriginalPhotosViewer`, and the capture image lightbox SHALL remain full-screen experiences.
7. `RecipeDetailSheet` SHALL be a bottom sheet at all widths, with a wider desktop maximum width and internal scrolling preserved.
8. `PlanningPivotSheet` and `SkipRecoveryDialog` SHALL be bottom sheets at all widths because they are contextual action choosers, not confirmations.
9. The unused generic `Modal` SHALL either become the accessible centered-dialog primitive or be removed after all references are rechecked; it SHALL NOT remain an alternative responsive hybrid.

## R11 — Behavioral preservation

1. Standardization SHALL NOT change API requests, DTOs, planner mutations, recipe mutations, or store contracts.
2. Existing form drafts, checked ingredients, active cooking steps, search queries, filters, scroll positions, and planner context SHALL survive overlay open/close exactly as they do before migration.
3. Existing close, save, resolve, restore, delete, share, select, and navigation outcomes SHALL remain unchanged.
4. Existing test IDs SHALL remain stable unless a separate approved test migration explicitly changes them.
5. No OpenAPI changes are required or permitted by this feature.

## Acceptance scenarios

1. At 375, 768, and 1440 CSS pixels wide, Report Import Issue opens from the bottom edge and remains visually attached to it.
2. At those same widths, Recipe Detail, Planning Pivot, and Skip Recovery remain bottom-anchored while allowing wider content on desktop.
3. Invite Link, Planner Nudge, elevated PIN, and Quick Find remain centered at all widths.
4. Recipe Filters, Recycle Bin, Family GOTO, and the Library Toast drawer share the canonical bottom-sheet surface, backdrop, safe-area spacing, and motion.
5. Keyboard focus enters every modal surface, cycles within it, Escape dismisses the topmost dismissible surface, and focus returns to the opener.
6. A report sheet opened above Recipe Detail is visible, is the only keyboard-active surface, and returns focus/context to Recipe Detail when closed.
7. Cook Mode and both media viewers remain full-screen and restore their previous context on exit.
8. Reduced-motion users receive no non-essential spring or scale movement.
9. Overlay behavior passes at 320-pixel width, 200% zoom, and with a mobile software keyboard covering part of the viewport.
10. Existing overlay business-flow tests continue to pass without API or domain changes.

