# Overlay Design System — Design

## Design summary

Replace the PWA's implicit collection of overlay conventions with four explicit presentation types: bottom sheet, centered dialog, full-screen mode, and lightbox. Standardize the shared mechanics in small primitives, then migrate existing surfaces in bounded behavior-preserving slices.

The key design decision is that viewport size may change an overlay's dimensions but not its spatial model. A sheet remains attached to the bottom; a dialog remains centered. This prevents the same action from feeling like a different interaction when a tablet rotates or a browser window crosses a breakpoint.

No API, DTO, database, generated-client, or store contract changes are involved.

## Mère-Designer review

### The why

Spatial consistency creates recognition. When contextual actions always rise from the same edge, users understand that they are temporarily acting on the content beneath them. Centered surfaces are reserved for decisions that interrupt that context. Full-screen surfaces communicate an intentional mode change.

### The household payoff

Mom can open, act, and dismiss with one hand without first locating a panel that moved between breakpoints. Stable primary-action placement lowers cognitive load during meal planning, grocery work, and cooking.

### Sanity constraints

- Do not make every overlay visually identical; make the interaction categories predictable.
- Do not turn Quick Find into a sheet: its card is the task, not a compact form.
- Do not shrink Cook Mode or media viewers into floating surfaces.
- Do not use standardization as permission to rewrite business logic.

## Current-state audit

| Surface | Current behavior | Target type | Required correction |
|---|---|---|---|
| `RecipeImportIssueSheet` | Bottom below `sm`, centered at `sm+` | Bottom sheet | Remove breakpoint type-switch; apply canonical sheet primitive |
| `RecipeFiltersSheet` | Bottom; mobile only | Bottom sheet | Adopt shared mechanics while preserving `md:hidden` |
| `RecycleBinSheet` | Bottom at all widths | Bottom sheet | Replace white/black visual drift; add dialog and focus semantics |
| Family GOTO chooser | Bottom at all widths | Bottom sheet | Replace white surface; add dialog and focus semantics |
| Library Toast drawer | Bottom at all widths | Bottom sheet | Replace white surface; add dialog and focus semantics |
| `RecipeDetailSheet` | Bottom below `sm`, centered at `sm+` | Bottom sheet | Remain bottom-anchored; preserve wider desktop width and scrolling |
| `PlanningPivotSheet` | Bottom below `sm`, centered at `sm+` | Bottom sheet | Remove breakpoint type-switch; use sheet corners/motion |
| `SkipRecoveryDialog` | Bottom below `sm`, centered at `sm+` | Bottom sheet | Remove breakpoint type-switch; use sheet corners/motion |
| `InviteLinkDialog` | Centered at all widths | Centered dialog | Retain placement; adopt shared visuals and accessibility |
| Planner Nudge | Centered at all widths | Centered dialog | Retain placement; adopt shared visuals and accessibility |
| Elevated PIN confirmation | Centered above Recycle Bin | Centered dialog | Retain nesting; isolate focus; adopt tokens |
| `QuickFindModal` | Centered at all widths | Centered discovery dialog | Retain specialized card presentation; add shared dialog mechanics |
| `CooksMode` | Full-screen | Full-screen mode | Preserve; align close/focus semantics only |
| `OriginalPhotosViewer` | Full-screen dark viewer | Lightbox | Preserve intentional dark exception; add viewer semantics |
| Capture image viewer | Full-screen dark viewer | Lightbox | Preserve; align with original-photo viewer semantics |
| Generic `Modal` | Bottom below `sm`, centered at `sm+`; currently unused | Centered-dialog primitive or removal | Confirm no runtime consumers, then repurpose or delete |

Progress masks in `MinimalCapture` and the Cook Mode loading state are excluded because they present no user choice. The Browse All page shell and Grocery List are also excluded because they are full-screen pages/modes rather than modal windows.

## Target interaction matrix

| Property | Bottom sheet | Centered dialog | Full-screen mode | Lightbox |
|---|---|---|---|---|
| Position | Bottom edge | Viewport center | Entire viewport | Entire viewport |
| Width | Full mobile; constrained desktop | Constrained | Full | Full |
| Corners | Top only | All four | None | None |
| Entry motion | Translate from bottom | Fade + slight scale | Contextual fade/slide | Fade |
| Primary use | Contextual action/form | Confirmation/share/security | Immersive workflow | Media inspection |
| Backdrop | Canonical charcoal/blur | Canonical charcoal/blur | Opaque cream canvas | Dark media canvas |
| Safe area | Bottom required | Viewport padding | All applicable edges | All applicable edges |
| Focus containment | Required | Required | Required where modal | Required |

## Component architecture

### Shared mechanics

Introduce a small internal overlay layer under `pwa/src/components/ui/overlay/`:

- `OverlayRoot`: portal, active-layer registration, body scroll lock, Escape handling, opener capture, and focus restoration.
- `OverlayBackdrop`: canonical backdrop visuals and safe pointer dismissal.
- `BottomSheet`: bottom anchoring, panel semantics, internal scroll ownership, safe-area padding, and sheet motion.
- `CenteredDialog`: centered placement, panel semantics, viewport padding, and dialog motion.
- `OverlayTitle`: stable accessible-title wiring without repeated IDs.

Use existing dependencies where possible. Before adding a focus-management package or portal dependency, verify whether React, the current UI libraries, or an installed primitive already provides the required behavior. Do not add a dependency merely to standardize class names.

Full-screen modes and lightboxes do not need to share panel markup with sheets/dialogs. They should reuse only the accessibility and layer mechanics that fit their behavior.

### Proposed TypeScript surface

```ts
type OverlayDismissReason = 'close-button' | 'backdrop' | 'escape';

interface ModalSurfaceProps {
  open: boolean;
  title: ReactNode;
  accessibleLabel?: string;
  onDismiss: (reason: OverlayDismissReason) => void;
  dismissOnBackdrop?: boolean;
  dismissOnEscape?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

interface BottomSheetProps extends ModalSurfaceProps {
  width?: 'compact' | 'medium' | 'wide';
  scrollMode?: 'panel' | 'content';
}

interface CenteredDialogProps extends ModalSurfaceProps {
  width?: 'compact' | 'medium';
}
```

The concrete API may change during the first test-driven slice, but the primitives must make type selection explicit and must not expose a responsive `sheet-on-mobile/dialog-on-desktop` mode.

## Visual tokens

Use named CSS variables or Tailwind theme utilities instead of copying long class strings across consumers.

Proposed semantic tokens:

```css
--overlay-backdrop: color-mix(in srgb, var(--color-charcoal) 42%, transparent);
--overlay-surface: color-mix(in srgb, var(--color-cream) 94%, transparent);
--overlay-border: color-mix(in srgb, white 55%, transparent);
--overlay-radius-sheet: 2rem;
--overlay-radius-dialog: 2rem;
--overlay-shadow: 0 24px 80px -24px rgb(55 40 30 / 45%);
--overlay-blur: 12px;
```

Final values require visual review in both light-content and image-heavy contexts. The implementation SHALL use the repository's actual token mechanism; these names and values are design intent, not permission to add inline styles.

Width presets:

- `compact`: existing `max-w-sm` behavior.
- `medium`: existing `max-w-md` behavior.
- `wide`: existing `max-w-2xl` behavior for Recipe Detail.

Bottom sheets retain `w-full` at every width and use the selected maximum width only as a desktop constraint.

## Responsive behavior

### Bottom sheets

- Wrapper: `fixed inset-0 flex items-end justify-center` at every breakpoint.
- Mobile: edge-to-edge width, dynamic maximum height, safe-area bottom padding.
- Tablet/desktop: constrained maximum width is allowed; the panel still touches the bottom edge.
- Internal content may move from one column to multiple columns when doing so improves scanning.
- Rounded top corners remain stable; no `sm:rounded-*` rule may add bottom corners.

### Centered dialogs

- Wrapper: `fixed inset-0 flex items-center justify-center` at every breakpoint.
- Maintain at least 16 pixels of viewport clearance at the smallest width.
- Use `max-h-[calc(100dvh-2rem)]` or its tokenized equivalent and internal scrolling where needed.

### Full-screen modes and lightboxes

- Continue using `fixed inset-0` and dynamic viewport-safe sizing.
- Preserve specialized responsive layouts inside the surface.

## Accessibility design

### Focus lifecycle

```text
capture opener
  -> mount overlay
  -> mark background inert / modal
  -> focus explicit initial target or close/title-adjacent action
  -> trap Tab within topmost overlay
  -> dismiss topmost overlay
  -> unmount
  -> restore focus to opener if still connected
```

Nested confirmation behavior:

```text
Recycle Bin sheet
  -> open elevated PIN dialog
  -> suspend sheet focus trap
  -> PIN dialog owns Escape and Tab
  -> close PIN dialog
  -> restore focus to triggering Delete button
```

The report sheet above Recipe Detail follows the same stack behavior. Recipe Detail remains mounted to preserve its data and scroll context, but it is not keyboard-active while the report sheet is open.

### Naming

- Each surface receives a stable generated or explicit title ID.
- Visible titles are preferred over `aria-label`.
- Decorative backdrop nodes use `aria-hidden="true"` and are not buttons.
- Close controls include localized accessible names.

### Reduced motion

Framer Motion variants must use `useReducedMotion` or an equivalent shared mechanism. Reduced motion uses opacity-only transitions or immediate state changes.

## Scroll and viewport design

- `OverlayRoot` reference-counts body scroll locks so nested overlays cannot prematurely unlock the page.
- Capture the current body scroll position before locking and restore it after the final modal closes.
- Bottom sheets use `max-height` based on `100dvh`, not only `100vh`.
- Recipe Detail retains its current internal scroll region.
- Forms use `scroll-padding-bottom` or equivalent space so focused inputs and action buttons remain reachable above a software keyboard.

## Layer scale

Define semantic layers in one place. Proposed order:

| Layer | Purpose |
|---|---|
| App chrome | Navigation and ordinary sticky UI |
| Toast | Non-blocking feedback when no modal is active |
| Modal base | First blocking sheet/dialog |
| Modal nested | Child sheet or confirmation above a modal base |
| Full-screen mode | Cook Mode and equivalent modes |
| Critical nested modal | A permitted child over a full-screen mode |

Exact numeric values are implementation details, but consumers must not introduce new arbitrary `z-[N]` values after migration.

## Migration slices

### Slice 1 — Mechanics and reference surfaces

Build the primitive contract test-first. Migrate `RecipeImportIssueSheet` and `InviteLinkDialog` as the reference bottom sheet and centered dialog. This proves both categories and corrects the reported defect without waiting for the entire migration.

### Slice 2 — Remaining simple sheets and dialogs

Migrate Recipe Filters, Family GOTO, Library Toast drawer, Planner Nudge, and Quick Find. Preserve every action, state transition, and test ID.

### Slice 3 — Recipe overlay stack

Migrate Recipe Detail, Recycle Bin, and elevated PIN together because they exercise wide sheets and nested focus/layer behavior. Verify that Report Import Issue can stack above Recipe Detail without hiding or activating the parent.

### Slice 4 — Planner contextual sheets

Migrate Planning Pivot and Skip Recovery together. They already share a visual language and responsive hybrid, so one slice can align their bottom anchoring, motion, and accessibility without changing planner logic.

### Slice 5 — Full-screen semantics and cleanup

Align Cook Mode and both lightboxes with the shared accessibility/layer contract. Recheck generic `Modal` usage and either make it the centered-dialog compatibility wrapper or remove it. Remove obsolete copied overlay classes only after all consumers migrate.

## Test strategy

### Primitive component tests

- Explicit type does not change across viewport sizes.
- Accessible name and modal semantics are present.
- Initial focus, forward/reverse focus cycling, Escape, backdrop dismissal, and focus restoration work.
- Nested overlays transfer and restore focus correctly.
- Body scroll remains locked until the last nested overlay closes.
- Reduced-motion variants avoid translation/scale.
- Safe-area and max-height classes/tokens are applied.

### Consumer component tests

- Preserve existing action and state assertions.
- Assert the expected primitive/type for every migrated surface.
- Assert existing test IDs remain present.
- Add regression coverage for report-sheet and elevated-PIN nesting.

### Responsive E2E

Use a small matrix rather than duplicating every business-flow test:

| Viewport | Purpose |
|---|---|
| 320 × 700 | Minimum-width and overflow check |
| 390 × 844 | Common one-thumb mobile behavior |
| 768 × 1024 | Breakpoint regression that previously changed type |
| 1440 × 900 | Wide-screen anchoring and width constraint |

For one representative sheet and one representative dialog at each viewport, verify bounding-box placement rather than relying only on screenshots. Add visual snapshots only if the repository's existing snapshot workflow is stable.

### Accessibility validation

- Automated checks for role/name/focus basics.
- Keyboard-only manual pass for nested overlays.
- Contrast verification for final surface, backdrop-adjacent controls, disabled actions, and destructive confirmation styling.
- 200% zoom and software-keyboard/manual mobile checks recorded in the implementation task notes.

## Compatibility and risks

### Focus changes can expose latent test assumptions

Tests that currently query visible text without respecting the topmost overlay may need focused corrections. Do not loosen selectors globally; update only tests that encode the old inaccessible behavior.

### Portals can affect stacking and test queries

If a portal is introduced, verify that existing CSS variables, localization context, and React providers remain available. Avoid a portal if it adds no value over the current root layout.

### Bottom-anchored Recipe Detail can become too tall on desktop

Preserve its `max-w-2xl` and internal scroll region. Use a desktop maximum height and spacing that maintain visual breathing room above the sheet without detaching its bottom edge.

### Nested scroll locks can regress mobile Safari

Implement reference-counted locking and test restoration. Do not use a blanket `overflow: hidden` implementation without scroll-position verification.

### Broad visual migration risk

Migrate in slices and keep business behavior unchanged. Do not combine this work with copy, navigation, API, or domain refactors.

## Out of scope

- API, OpenAPI, database, DTO, or generated-client changes.
- Business-flow redesign or copywriting beyond accessible labels.
- Drag-to-dismiss gestures.
- New toast architecture.
- Navigation or page-layout redesign.
- Replacing Framer Motion.
- Converting Quick Find, Cook Mode, or lightboxes to bottom sheets.
- Changing which user actions require confirmation.

## Review gates

The following decisions require approval before implementation:

1. Confirm that Recipe Detail remains a bottom sheet on desktop rather than becoming an explicitly classified centered detail dialog.
2. Confirm that Planning Pivot and Skip Recovery remain bottom sheets on desktop.
3. Approve the canonical surface direction: cream glass for standard sheets/dialogs, with dark media canvases as the only broad exception.
4. Approve whether the unused generic `Modal` becomes a compatibility wrapper or is deleted after usage verification.

