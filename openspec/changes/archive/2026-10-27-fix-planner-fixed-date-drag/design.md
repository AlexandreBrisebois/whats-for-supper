# Design

## Context and Existing Ownership

See [proposal](proposal.md) for scope and [delta](specs/meal-rescheduling/spec.md) for behavior. This design is necessary because separating dates from moving content changes gesture identity and target geometry, not just CSS placement.

Source-inspected path: `PlannerDragHandle` → page `Reorder.Item` / `handleReorder` → `weekStore.reorderLocally` and `commitMove` → `lib/api/planner.moveRecipe` → generated schedule move client → `POST /api/schedule/move`. The request carries weekOffset, recipeId, fromIndex and toIndex, with the existing calendar reference and move sequence. Backend same-week swap rules already implement the chosen occupied-destination behavior.

`reorderLocally` swaps from the captured arrangement and restores day/date fields. `_uiId` currently follows moved content to support Framer's list reordering. The row's date is rendered inside that reordered item. The page also defers incoming snapshots during drag using `isDragActive`, `deferredWeekSnapshot` and move-sequence guards. Existing tests simulate the reorder algorithm in places; they cannot establish real gesture correctness.

## Decisions and Tradeoffs

- **Fixed rows with separate content surfaces.** Render date-keyed row wrappers containing a left date label and a right meal slot. Only the recipe surface lifts/translates. Preserve `day-card-<index>` and `data-date` on the fixed slot wrapper where practical; use separate date/content selectors for movement assertions. Keep recipe detail and change-plan actions inside the content surface.
- **Explicit destination instead of list insertion.** Use the installed motion/pointer facilities to track a lifted recipe against fixed slot rectangles. Replace whole-row `Reorder.Group` ordering as the target signal: merely putting labels beside reordered children still couples target positions to animated list order. Retain ordinary page scrolling before the existing hold activates. Measure candidate slots against current viewport coordinates, including scroll; do not assume equal heights or a cached row pitch. Keep a source placeholder and a stable drag representation so preview changes cannot unmount the active pointer owner.
- **Reuse movement policy.** Track original source index, final target index, week identity and pre-drag content explicitly. Reuse `reorderLocally(from, candidate, snapshot)` for previews; returning to source restores the original preview. Call `commitMove` once on a valid changed drop. No insertion, push, cross-week drag or API replacement. Do not infer movement identity from recipe ID because the same recipe can occur on several dates.
- **Keep interaction state local.** A small Planner-local component/hook may own session geometry and lifetime if it keeps the page readable. Do not add a generic drag framework, dependency or second schedule store. Existing pending-recipe eligibility is preserved; preview must not promote suggestions into saved assignments. Recipe-free non-cooking plans remain non-draggable but can exchange with a recipe under the existing same-week rules.

## First Observable Slice

Open a loaded Draft week with recipe A on Monday and an empty Tuesday. Hold A's handle, move into Tuesday and release. Date labels stay outside the lifted surface; Tuesday highlights; only one request identifies Monday→Tuesday. The actual page/store/API wrapper and generated client execute; the browser mock is the HTTP boundary. Read the mocked schedule again and verify A on Tuesday and empty Monday. Extend this working path to occupied destinations, cancellation and touch/keyboard parity.

## State, Concurrency and Recovery

Session progression: idle → pending hold → active(source, snapshot, candidate) → committed or cancelled. The existing handle owns hold timing and pre-activation jitter cancellation. The Planner session owns active cancellation, target validity and a single terminal action. Pointer end, cancellation and component cleanup must not each submit the same move.

Set `isDragActive` before preview writes and release it on every exit. Preserve the existing deferred-snapshot and move-sequence handshake after a committed drop. Cancellation restores only the uncommitted preview for the captured week, then releases deferred snapshots through the existing guards. On week navigation/unmount, retire the old session before it can write to the newly selected week. Losing window focus also cancels the active session. Do not advertise a stronger concurrent rollback guarantee than the existing store supplies.

Request rejection uses existing pre-drag restoration. Record request failure distinctly from a visual snap-back or authoritative live update. No automatic repeat of a movement request is introduced. Browser acceptance must exercise a deferred snapshot during drag and after a committed move so a refactor cannot silently bypass those guards.

## User Experience

Dates form a stable left gutter, with content-sized rows rather than fixed-height cards. Only the recipe card gets the lifted treatment; date labels do not scale, lift or slide with it. A restrained existing-token edge and source placeholder identify the candidate and origin, with a non-color cue distinguishing an exchange from placing into an empty slot. Keep the established Solar Earth surfaces and motion; honor reduced motion.

Retain hold instructions, keyboard Up/Down movement and focus on the moved recipe's handle. Hide a purely visual drag duplicate from assistive technology and avoid duplicate operable controls. Empty/non-cooking slots retain their existing actions. Check long recipe names, French expansion, 320 CSS px reflow, phone/iPad layouts and actual-background contrast for the affected handle and destination cues. Reuse existing readable token variants rather than extending the palette. Broader Planner typography/contrast work remains separate.

## Operational Diagnosis

Before production edits, exercise the current mouse and held-touch paths and capture source/destination dates, activation, request count/body, immediate dated content and subsequent schedule content. Distinguish failure to activate, wrong hit target, wrong request, rejection and later snapshot overwrite. The generic current drag test proves only visibility; the current touch test substitutes a constant success response and proves request count, not saved swap state.

If baseline movement works, record the human report as unreproduced; still implement and test the accepted layout. If a defect is reproduced, retain its focused failing regression and fix only the implicated gesture/session integration. Backend-policy or unrelated live reconciliation defects require separate scope rather than silently extending this change. Emulated browser touch does not qualify physical iOS/Android gestures; report device evidence separately.


## Implemented details and observed qualification (2026-10-27)

- The Planner-local `usePlannerDrag` owns a native pointer session after the existing 250 ms hold. Date-keyed rows remain stable; viewport hit testing measures current rectangles on move, release and scroll. The original source index and arrangement drive every preview and one terminal commit. The existing store/API policy and snapshot handshake remain the owners of movement and reconciliation.
- The decorative, non-interactive preview is portalled to `document.body`, stays on the original vertical content track, and follows pointer Y without page-transition containing-block offsets. Source outlines are dashed; occupied/empty candidates have distinct EN/FR text plus a solid destination outline. Keeping the active source handle mounted outside conditional meal content avoids implicit touch capture cancellation when the source becomes empty/non-cooking.
- Rows retain content height; below 360 CSS px the controls sit below the recipe so long names and a 44px handle fit. The lifted representation introduces no animation; existing page/tap motion remains. Keyboard focus follows the moved content handle; no-op boundary keys and pointer-session keys send no movement.
- Inspected Chromium screenshots in EN and FR at 320×740, 390×844, 768×1024 (iPad portrait dimensions), and 1024×768 (iPad landscape dimensions), all with reduced-motion preference; 320px checks used 125% root text. Date/content alignment, long-name wrapping, source/destination cues and reachable recipe/pivot/handle actions passed. This is viewport/browser emulation, not hardware qualification; physical iOS/Android and other text-size settings are **not run**.
- Raster samples on the actual cream background measured the changed sage-700 destination outline as RGB 82/91/55 versus 253/252/240 (7.00:1), dark cue text 31/41/55 (14.23:1), and the resting handle around 98/104/110 (about 5.46:1). The grabbed handle measured 91/99/102 on 230/233/210 (4.95:1). These are affected-cue checks, not a claim of blanket accessibility compliance.
- Original held mouse and touch occupied-day movement both passed dated-content/request/re-read checks, so the reported pre-existing movement failure remains **unreproduced**. During implementation, added regressions caught Escape cue cleanup, transformed-ancestor offset, horizontal preview drift, 40px handle width, 320px text overflow and source-handle unmount during held touch to an empty day; each was corrected within the local gesture/presentation scope.
- Stateful `mockNonCookingSchedule` already agrees with this same-week swap contract. No shared mock, API, generated client, production store or backend policy changes were needed. Browser re-reads establish mock-boundary state only; live persistence/database/model qualification is not applicable to this unchanged-contract UI increment.

## Approved regression follow-up

The source client is excluded from its own SSE broadcasts, so HTTP completion must settle its captured move sequence on success or rejection. Keep in-flight snapshot protection and failure restoration. Read a fresh schedule after successful committed moves rather than replaying snapshots captured before completion; reject old-week reads. Preserve guards while a later move is pending.

Keep the date gutter dimensions and row positions unchanged. Paint a tinted rounded background and outline on the existing destination date; position a decorative arrow absolutely in the existing date/card gap. Move the existing EN/FR swap/move cue into the floating overlay, preserving the full title. No valid changed destination means no highlight, arrow or cue. Remove Planner's duplicate full-screen minimum/padding; retain shell navigation and safe-area clearance. Earlier SSE-only completion acceptance is superseded by HTTP-or-SSE acknowledgement checks below.

## Approved Planner review implementation

The review reproduced four failures using controlled store promises and browser events; probes and logs are retained outside the repository in `/tmp/wfs-planner-review`. Existing 221 focused unit and 95 Planner browser tests passed; this does not qualify live persistence or physical devices.

1. The server excludes the originating SSE connection and broadcasts an optional `echoSeq` to other devices. The receiving client cannot infer ownership from this number. HTTP completion owns local acknowledgement; incoming schedule events, with or without sequence metadata, follow the ordinary authoritative snapshot/defer path and must not settle another local request. Keep the wire contract and backend publisher unchanged.
2. `weekStore` owns movement reconciliation. Concurrent moves must settle before a final fresh read is eligible to replace their preview. Capture operation/read ownership rather than borrowing the latest sequence at response time; retire superseded reads and guard the captured week. Accepted later authoritative events must not be undone by an older read.
3. A valid authoritative empty week clears saved recipes. Preserve only supported pending-suggestion metadata; remove the heuristic that treats an entirely recipe-free snapshot as incomplete.
4. Rejection may restore a pre-drag snapshot only while that operation still owns the displayed schedule. A newer edit or active drag must survive; reconcile server state after outstanding moves and store-owned assignments/removals settle without retrying movement. Starting those slot writes invalidates an older movement read. The selected Planner offset also guards the navigation frame before week loading catches up. If reconciliation fails, retain newer local state and show localized refresh-failure feedback rather than claiming server confirmation.

These refine the original unconditional restoration/SSE acknowledgement assumptions. Earlier execution records remain evidence for their original content only. No new dependency, business-policy duplication, API shape, backend or persistence change is planned. Each slice requires a focused observed red before production edits, green unit/store acceptance and browser event/network coverage; the combined implementation receives preparation, scope review and final repository verification.
